/**
 * 워크플로우 입력 → FinalReportData 매핑.
 *
 * 사용자가 입력 가능한 영역(기업 정보, 모델 정보, 환경, 데이터셋, 메트릭 선택)만 여기서 채운다.
 * 백엔드가 산출하는 영역(검증 결과·KPI 값·차트·LLM 서술)은 **빈 값으로 두고**
 * `useReportData` 가 실제 응답으로 채운다 — 각 섹션이 빈 값을 "생성 예정"·"검증 미수행"
 * 안내로 처리한다.
 *
 * **fallback MOCK 은 존재하지 않는다.** 종전 이 주석은 `mockReport` 를 fallback 으로
 * 쓴다고 적었으나 그 심볼은 저장소에 없다 — 성적서에 가짜 수치가 남아 있다고 오인하게
 * 만드는 서술이었다(ISSUES.md H-11).
 */
import {
  METRICS,
  TASK_TYPE_LABELS,
  getMetricDisplayId,
  type TaskType,
  resolveTaskType,
} from "../../data/evaluationData";

import type {
  ApplicantInfo,
  ClassLabelInfo,
  DatasetInfo,
  EvalEnvironment,
  EvalScope,
  FinalReportData,
  FinalReportMeta,
  MaterialCheckAck,
  MetricFormula,
  ReportPurposeKey,
  SignatureData,
  MetricItem,
  TrainingDatasetInfo,
} from "../../types/finalReport.types";
import type { MappingRow } from "../../types/mapping.types";
import { normalizeIsoDate } from "../../utils/domain/isoDate";
import type { ValidateDataResponseData } from "../../types/validation.types";
import { mapValidationResultToReport } from "./mapValidationResultToReport";
import { buildConclusion } from "./computeVerdict";
import { REPORT_CONTENT_SCHEMA } from "./normalizeReportContent";
import { resolveBeta, resolveTargetValue, TARGET_DIGITS } from "../../utils/domain/validation";
import { formatTargetCriteria } from "./metricValueFormat";
import { checkMaterialSelection } from "./materialCheck";
import { imbalanceRatioOf } from "./buildDatasetDiagnosis";
import type {
  BasicInfoFormData,
  MetricDetailStateMap,
  UploadedFileInfo,
} from "../../types/workflow.types";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import { NOT_PROVIDED, buildReportMaterials, type ReportComposerInput } from "./reportMaterials";
import type {
  ComposerCardId,
  ComposerSelection,
  ComposerValueMap,
  MaterialPicks,
} from "../../types/reportComposer.types";
import {
  getCard,
  isEntryUnknown,
  isFieldPicked,
  isFieldReceived,
  isLeafReceived,
  isPartPicked,
} from "../../data/reportComposer";
import { buildLegacyPatch } from "../../utils/domain/composerLegacyMirror";
import {
  currentClassEntries,
  currentClassVolume,
  evaluationClassNames,
  type ClassMetadata,
} from "../../utils/domain/evaluationClasses";
import {
  DEFAULT_EVAL_ENV_CONSTANTS,
  DEFAULT_EVAL_PURPOSE_TEXT,
  DEFAULT_EVAL_SCOPE_TEXT,
  DEFAULT_PERFORMER,
  REPORT_PURPOSE_OVERVIEW,
} from "./reportConstants";

export interface MapWorkflowToReportInput {
  basicInfo: BasicInfoFormData;
  taskType: TaskType | "";
  selectedMetricIds: string[];
  metricDetails: MetricDetailStateMap;
  uploadedFile: UploadedFileInfo | null;
  trainingExampleFiles: UploadedFileInfo[];
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  columnMapping: MappingRow[];
  classLabelDescriptions: Record<string, string>;
  /**
   * 컬럼 매핑 단계 메타데이터(사용자가 고른 positive_class 등). 성적서 표시용 소스.
   *
   * `class_distribution` 은 y_true 기준 클래스별 개수다 — 버전 간 비교 화면이
   * "같은 데이터로 잰 건가"를 사용자가 직접 판단하도록 그대로 보여준다
   * (멀티레이블에서는 레이블 등장 횟수라 샘플 수와 합이 다르다).
   * 스토어의 실제 값은 이보다 넓지만(`metadata: any`), 소비처가 읽는 키만 적는다.
   */
  metadata?: {
    positive_class?: string;
    detected_classes?: string[];
    detected_labels?: string[];
    class_distribution?: Record<string, number>;
  } | null;
  /**
   * 성적서 구성 카드의 값과 켜짐 여부. 성적서의 고객 재료 줄(`materials`)과 학습 데이터 절이
   * 여기서 온다. 학습 데이터는 종전에 Details 의 폼(`datasetInfo`)이 따로 받았는데 ⑥ 하나로
   * 합쳤다(persist v10).
   *
   * 선택적인 이유: 이 키가 생기기 전에 저장된 run 의 스냅샷(`workflowSnapshot`)에는 없다.
   * 없으면 카드를 모두 끈 것과 같다.
   */
  composer?: ReportComposerInput;
  /**
   * 생성 전 안내를 보고도 진행한 기록(검증 화면 "다음"이 남김). 재료 선택 점검이 이 기록을 인정할지
   * 정해 6.0 에 찍는다. 이 키가 생기기 전 스냅샷에는 없다.
   */
  materialCheckAck?: MaterialCheckAck | null;
}

/** `buildReportInput` 이 읽는 워크플로우 상태. 스토어를 그대로 넘겨도 된다. */
export type ReportInputSource = Omit<MapWorkflowToReportInput, "composer"> & {
  composerCards: ComposerSelection;
  composerMetrics: ComposerValueMap;
  composerPerspective: ComposerValueMap;
  composerTrainingData: ComposerValueMap;
  composerTestData: ComposerValueMap;
  composerGroundTruth: ComposerValueMap;
  composerModelEnv: ComposerValueMap;
  /** 재료 고르기에서 카드마다 고른 항목. 없으면(재료 고르기 이전 상태) 모든 값을 싣는다. */
  materialPicks?: MaterialPicks;
};

/**
 * 재료 고르기에서 받지 않기로 한 권장·선택 필드의 값을 뺀다(docs/MATERIAL_PICKER.md §6).
 *
 * 체크를 끄기 전에 적어 둔 값이 저장소에 남아 있을 수 있다. 그 값을 성적서에 찍으면 "끈 항목은
 * 제공되지 않음"이 깨진다 — 권장 항목은 빠지면 성적서가 "제공되지 않음"으로 찍는다. 조건부 필드는
 * 조건을 정하는 필드를 받을 때만 남긴다(`isFieldReceived` — ⑧ 검수 방식을 빼면 라벨러 수도 빠진다).
 */
function pickedValues(
  cardId: ComposerCardId,
  values: ComposerValueMap,
  picks: MaterialPicks | undefined,
): ComposerValueMap {
  const saved = picks?.[cardId];
  if (!saved) return values;
  const card = getCard(cardId);
  return Object.fromEntries(
    Object.entries(values).filter(([fieldId]) => {
      const field = card.fields.find((item) => item.id === fieldId);
      return !field || isFieldReceived(card, field, saved);
    }),
  );
}

/** ③ 의 선택 항목은 `basicInfo` 에 담긴다. 받지 않기로 한 것을 비운다. */
function pickedBasicInfo(basicInfo: BasicInfoFormData, picks: MaterialPicks | undefined): BasicInfoFormData {
  const saved = picks?.clientInfo;
  if (!saved) return basicInfo;
  const card = getCard("clientInfo");
  const fieldOf = (id: string) => card.fields.find((item) => item.id === id)!;
  return {
    ...basicInfo,
    website: isPartPicked(fieldOf("contactExtra"), "website", saved) ? basicInfo.website : "",
    fax: isPartPicked(fieldOf("contactExtra"), "fax", saved) ? basicInfo.fax : "",
    projectNumber: isFieldPicked(card, fieldOf("projectNumber"), saved) ? basicInfo.projectNumber : "",
  };
}

/**
 * 전용 화면이 받는 선택 항목 중 평가 흐름에 놓지 않은 것의 값을 뺀다(docs/MATERIAL_PICKER.md §12.4).
 *
 * ① 클래스 레이블 설명(매핑 화면의 설명 카드)과 ⑥ 예시 파일 두 칸은 카드 값 그룹이 아니라 스토어의
 * 따로 된 키에 있어 `pickedValues` 가 거르지 못한다. 빼기 전에 적어 둔 값이 남아 있어도 성적서·AI 에
 * 싣지 않는다. 그 카드의 picks 가 없으면(평가 흐름 이전) 그대로 싣는다.
 */
export function pickedDedicatedValues(
  state: Pick<
    ReportInputSource,
    "classLabelDescriptions" | "trainingExampleFiles" | "trainingUnsuitableExampleFiles" | "materialPicks"
  >,
): Pick<MapWorkflowToReportInput, "classLabelDescriptions" | "trainingExampleFiles" | "trainingUnsuitableExampleFiles"> {
  const picks = state.materialPicks;
  return {
    classLabelDescriptions: isLeafReceived("evalData", "classLabelDescriptions", picks?.evalData)
      ? state.classLabelDescriptions
      : {},
    trainingExampleFiles: isLeafReceived("trainingData", "trainingExamples", picks?.trainingData)
      ? state.trainingExampleFiles
      : [],
    trainingUnsuitableExampleFiles: isLeafReceived("trainingData", "trainingUnsuitableExamples", picks?.trainingData)
      ? state.trainingUnsuitableExampleFiles
      : [],
  };
}

/**
 * ⑨ 실행 환경을 넣었으면 그 값으로 `basicInfo.env*` 를 채운다. 성적서 4절 환경 표와 AI 입력이 그
 * 칸을 읽는다. 어느 칸이 어디로 가는지는 레지스트리의 `legacy.byKey` 가 정한다.
 *
 * 종전에는 Details 의 "시험 환경" 폼이 같은 값을 따로 받았다. 그 폼을 없애고 ⑨ 하나로 받는다
 * (docs/MATERIAL_PICKER.md §5). ⑨ 를 넣지 않은 옛 run 은 그 폼에 적었던 값을 그대로 쓴다.
 */
function withRuntimeFromCard(
  basicInfo: BasicInfoFormData,
  cards: ComposerSelection,
  modelEnv: ComposerValueMap,
): BasicInfoFormData {
  const value = modelEnv.runtimeEnv;
  if (!cards.modelEnv || !value) return basicInfo;
  const field = getCard("modelEnv").fields.find((item) => item.id === "runtimeEnv")!;
  return { ...basicInfo, ...(buildLegacyPatch(field, value).basicInfo ?? {}) };
}

/**
 * 워크플로우 상태에서 성적서 입력을 고른다.
 *
 * 종전에는 같은 객체를 세 곳(`useReportData` 두 곳, `useDataValidation`)이 키를 하나씩 적어
 * 따로 조립했다. 키가 늘 때 한 곳만 빠뜨리면 그 경로의 성적서에서만 값이 조용히 사라진다.
 * 필요한 키만 골라 담는다 — 스냅샷이 run 에 저장되므로 스토어 전체를 싣지 않는다.
 */
export function buildReportInput(state: ReportInputSource): MapWorkflowToReportInput {
  const picks = state.materialPicks;
  const modelEnv = pickedValues("modelEnv", state.composerModelEnv, picks);
  const dedicated = pickedDedicatedValues(state);
  // 지금 클래스 목록 — 3절 클래스 설명·학습 클래스 분포·AI·9절 분포 차이가 모두 이 목록으로 거른 값을 쓴다.
  const classNames = evaluationClassNames(state.taskType, state.columnMapping, state.metadata as ClassMetadata | null);
  return {
    basicInfo: withRuntimeFromCard(
      pickedBasicInfo(state.basicInfo, picks),
      state.composerCards,
      modelEnv,
    ),
    taskType: state.taskType,
    selectedMetricIds: state.selectedMetricIds,
    metricDetails: state.metricDetails,
    uploadedFile: state.uploadedFile,
    // 클래스 레이블 설명·예시 파일 — 놓지 않았으면 비운다. 매핑 역할은 스토어 불변식이 이미 걸렀다.
    ...dedicated,
    // 설명은 지금 클래스의 것만 — 옛 파일·옛 정답 컬럼의 키가 AI 에 가지 않게(N1). 3절과 같은 목록이다.
    classLabelDescriptions: currentClassEntries(dedicated.classLabelDescriptions, classNames),
    columnMapping: state.columnMapping,
    metadata: state.metadata,
    materialCheckAck: state.materialCheckAck ?? null,
    composer: {
      cards: state.composerCards,
      metrics: pickedValues("metrics", state.composerMetrics, picks),
      perspective: pickedValues("perspective", state.composerPerspective, picks),
      // 학습 클래스 분포도 지금 클래스의 칸만(B5③) — 옛 클래스 칸이 거짓 '분포 차이'를 내지 않게.
      trainingData: currentClassVolume(pickedValues("trainingData", state.composerTrainingData, picks), classNames),
      testData: pickedValues("testData", state.composerTestData, picks),
      groundTruth: pickedValues("groundTruth", state.composerGroundTruth, picks),
      modelEnv,
    },
  };
}

export function mapWorkflowToFinalReport(
  input: MapWorkflowToReportInput,
  validationResult?: ValidateDataResponseData | null,
): FinalReportData {
  const resolvedTaskType: TaskType = resolveTaskType(input.taskType);

  // 데이터 검증 결과: 백엔드 /api/validate-data 응답이 있으면 실제 값으로 채우고,
  // 없으면 빈 배열(가짜 MOCK 8항목을 노출하지 않음 — 섹션이 "검증 미수행" 안내로 처리).
  //
  // 표본 수 폴백은 0 이다. 종전에는 학습 데이터 폼의 **검증 샘플 수**를 폴백으로 썼다 —
  // 모델 학습 때 쓴 검증 세트 크기라 평가 파일의 행 수와 무관한데 평가 표본 수 칸에
  // 인쇄되는 버그였다. 평가 표본 수는 검증 응답의 실제 행 수만 쓴다.
  const mappedValidation = validationResult
    ? mapValidationResultToReport(validationResult, 0)
    : null;

  const evalEnv = buildEvalEnv(input.basicInfo);
  const materials = input.composer ? buildReportMaterials(input.composer, resolvedTaskType) : undefined;
  const materialCheck = materials && input.composer ? runMaterialCheck(input, validationResult, materials, evalEnv) : undefined;
  // 3번 줄(클래스 중요도 → 평균 방식)이 미충족이면 5절 평균 방식 문장을 점검 결과의 문장으로 바꿔 찍는다.
  const printedMaterials =
    materials && materialCheck?.printed.averagingSentence
      ? { ...materials, averagingSentence: materialCheck.printed.averagingSentence }
      : materials;

  return {
    contentSchema: REPORT_CONTENT_SCHEMA,
    // 목표값을 찍는 자릿수(B10). 이 키가 없는 성적서는 종전 둘째 자리로 그린다.
    targetDigits: TARGET_DIGITS,
    // 판정과 어긋나 보이는 지표 값은 자릿수를 늘려 찍는다(S2). 이 키가 없는 성적서는 종전 셋째 자리로 그린다.
    judgedValueDigits: true,
    meta: buildMeta(input, resolvedTaskType),
    applicant: buildApplicant(input.basicInfo),
    performer: DEFAULT_PERFORMER,
    evalScope: buildEvalScope(input.basicInfo),
    datasetInfo: buildDatasetInfo(input, resolvedTaskType, mappedValidation?.summary.totalRows),
    // 데이터 예시 행: 가짜 MOCK 10행 제거. 실제 샘플 렌더링은 백엔드 샘플 반환 + 타입 일반화 후속 작업(P1-7) 필요.
    datasetSamples: [],
    // datasetDiagnosis 는 실제 클래스 분포 기반으로 useReportData 에서 채운다(가짜 MOCK 제거).
    datasetDiagnosis: "",
    trainingDatasetInfo: buildTrainingDatasetInfo(input),
    evalEnv,
    metricList: buildMetricList(resolvedTaskType, input.selectedMetricIds, input.metricDetails),
    metricFormulas: buildMetricFormulas(resolvedTaskType, input.selectedMetricIds),
    dataValidation: mappedValidation ? mappedValidation.dataValidation : [],
    validationSummary: mappedValidation ? mappedValidation.summary : undefined,
    kpiResults: [],
    // 차트는 백엔드 평가 결과(useReportData)에서 채운다. 미평가 경로에서는 가짜 곡선/행렬 대신 null.
    charts: { confusionMatrix: null, rocCurve: null, prCurve: null },
    // latency 는 평가 결과에서 latency 컬럼이 매핑된 경우만 채운다(useReportData). 가짜 MOCK 대신 null.
    latency: null,
    // 7·9절 서술은 LLM 서술 모듈(useReportData → /api/generate-narrative)에서 채운다.
    // 그 전까지는 가짜 MOCK 대신 빈 값(섹션이 "생성 예정" 안내 표시).
    interpretation: { confusionAnalysis: "", distributionAnalysis: "" },
    // verdict/score 는 규칙으로 산출(MOCK 가짜 PASS/94.4 제거). 서술(benchmark/narrative/risks)은 LLM 모듈 전까지 빈 값.
    conclusion: buildConclusion([], resolvedTaskType),
    recommendationNarrative: { dataQuality: "", modelOps: "" },
    recommendations: [],
    // 서명/발급 이력은 발급 시점에 백엔드 IssuanceOut 으로 채운다(초안은 빈 값 → "미발급" 표기).
    signature: { issuer: "", signedAt: "", history: [] },
    // 고객 재료 — 재료 목록의 인쇄 위치대로 각 절이 찍는다. 옛 스냅샷에는 카드 값이 없다.
    materials: printedMaterials,
    // 재료 선택 점검 — 표지·1.4·5절·6.0 이 읽는다. 옛 스냅샷(카드 값 없음)에는 없다.
    ...(materialCheck ? { materialCheck } : {}),
  };
}

/**
 * 지연시간(보고 항목 8)이 성적서 6.4 에 실제로 찍힐지. latency 를 매핑했어도 값이 하나도 숫자가 아니면
 * 평가가 통계를 내지 않아 6.4 는 "제공되지 않음"이다. 검증 응답의 "Latency statistics (ms)" 항목은
 * 평가와 같은 프레임·같은 조건(숫자 값 1개 이상)으로 나오므로 그것으로 본다. 검증 전(지표 화면
 * 미리보기)에는 매핑만 본다.
 */
function latencyWillBeMeasured(
  input: MapWorkflowToReportInput,
  validationResult: ValidateDataResponseData | null | undefined,
): boolean {
  const mapped = input.columnMapping.some((row) => row.confirmedRole === "latency");
  if (!mapped || !validationResult) return mapped;
  return validationResult.validation_details.some((item) => item.name === LATENCY_STATS_CHECK);
}

/** 백엔드 `validation_checks.check_latency` 가 숫자 지연시간이 있을 때만 내는 항목 이름. */
const LATENCY_STATS_CHECK = "Latency statistics (ms)";

/**
 * 재료 선택 점검을 이 성적서의 값으로 부른다(판정은 `checkMaterialSelection` 한 곳).
 *
 * 불균형 비율은 검증 응답의 분포(평가와 같은 프레임)를 먼저 쓰고, 없으면 업로드 분석의 분포를 쓴다.
 * 어느 쪽을 썼는지 결과에 남는다.
 */
function runMaterialCheck(
  input: MapWorkflowToReportInput,
  validationResult: ValidateDataResponseData | null | undefined,
  materials: ReturnType<typeof buildReportMaterials>,
  evalEnv: EvalEnvironment,
) {
  const taskType: TaskType = resolveTaskType(input.taskType);
  const fromValidation = validationResult?.class_distribution;
  const fromUpload = input.metadata?.class_distribution;
  const [distribution, distributionSource] =
    fromValidation && Object.keys(fromValidation).length > 0
      ? [fromValidation, "validation" as const]
      : fromUpload && Object.keys(fromUpload).length > 0
        ? [fromUpload, "upload" as const]
        : [null, null];
  return checkMaterialSelection({
    taskType,
    materials,
    systemSpec: evalEnv.systemSpec,
    latencyMapped: latencyWillBeMeasured(input, validationResult),
    perspective: input.composer!.perspective,
    selectedMetricIds: input.selectedMetricIds,
    beta: resolveBeta(input.metricDetails),
    imbalanceRatio: distribution ? imbalanceRatioOf(distribution) : null,
    distributionSource: distribution ? distributionSource : null,
    ack: input.materialCheckAck ?? null,
  });
}

// ---------- helpers ----------

function buildMeta(input: MapWorkflowToReportInput, taskType: TaskType): FinalReportMeta {
  const today = formatDate(new Date());
  // contractDate 는 이미 "YYYY-MM-DD" 문자열이다(ISSUES.md E-09 — 직렬화 왕복 안전).
  // 저장소에 남아 있는 구 형식(Date 의 toJSON 결과)도 정규화해 받는다.
  const contractDate = normalizeIsoDate(input.basicInfo.contractDate);

  return {
    // 미발급(초안). 발급 시 백엔드 IssuanceOut 의 report_no / issued_at(KST)으로 채운다(P2-11).
    reportId: "",
    title: "기계학습 분류 성능 시험결과서",
    issuedAt: "",
    evaluationPeriod: {
      from: contractDate ?? today,
      to: today,
    },
    taskType,
    taskTypeLabel: TASK_TYPE_LABELS[taskType],
    contractDate,
    // 사용자가 매핑 단계에서 고른 값은 metadata.positive_class 에 저장됨(metricDetails 는 미기입).
    positiveClass:
      input.metadata?.positive_class ||
      input.metricDetails["M2"]?.positiveClass ||
      undefined,
  };
}

/** 다듬은 값, 비면 "—"(B11 — 공백만 있는 칸을 그대로 찍지 않는다). */
function trimmedOrDash(value: string | undefined): string {
  return value?.trim() || "—";
}

function buildApplicant(basicInfo: BasicInfoFormData): ApplicantInfo {
  return {
    companyName: trimmedOrDash(basicInfo.companyName),
    representative: trimmedOrDash(basicInfo.representative),
    businessNumber: trimmedOrDash(basicInfo.businessNumber),
    contact: trimmedOrDash(basicInfo.phone),
    // 팩스·홈페이지는 점검 밖 선택 항목 — 비면 "—" 줄 대신 줄을 빼도록 빈 문자열로 둔다(재료 목록 1절).
    fax: basicInfo.fax?.trim() ?? "",
    homepage: basicInfo.website?.trim() ?? "",
    address: trimmedOrDash(basicInfo.address),
  };
}

function buildEvalScope(basicInfo: BasicInfoFormData): EvalScope {
  const purposeKey = normalizeReportPurpose(basicInfo.reportPurpose);
  const projectName = basicInfo.projectName?.trim();
  const projectInfo =
    purposeKey === "project" && projectName
      ? { name: projectName, agency: trimmedOrDash(basicInfo.projectAgency) }
      : undefined;

  return {
    purpose: REPORT_PURPOSE_OVERVIEW[purposeKey] || DEFAULT_EVAL_PURPOSE_TEXT,
    targetModel: basicInfo.modelName || "—",
    // 버전의 기본값은 여기 한 곳에서 정한다 — 성적서(2절·4절·서명란), AI, 실행 기록이 모두 이 값을
    // 쓴다(DESIGN_GAPS R5). 입력 칸은 기본값이 미리 채워진 1층 필수지만, 끝난 단계로 돌아가 지울 수 있다.
    version: basicInfo.versionName?.trim() || DEFAULT_BASIC_INFO.versionName,
    scope: DEFAULT_EVAL_SCOPE_TEXT,
    reportPurposeKey: purposeKey,
    modelPurpose: basicInfo.modelPurpose || undefined,
    modelCategory: basicInfo.modelCategory || undefined,
    purposeNote: basicInfo.reportPurposeNote?.trim() || undefined,
    projectNumber: basicInfo.projectNumber?.trim() || undefined,
    projectInfo,
  };
}

/**
 * 평가 데이터 절. 표본 수는 서버가 검증에서 센 행 수다 — 평가 결과가 오면 `useReportData` 가
 * 평가에 실제로 쓴 표본 수로 다시 덮는다. 둘 다 없으면 0 이다(학습 데이터의 건수를 빌려 쓰지
 * 않는다).
 */
function buildDatasetInfo(
  input: MapWorkflowToReportInput,
  taskType: TaskType,
  validatedRows?: number,
): DatasetInfo {
  const sampleCount = validatedRows && validatedRows > 0 ? validatedRows : null;

  // 클래스 목록은 매핑 화면·학습 데이터 화면과 같은 한 함수다(B5①).
  const classValues = evaluationClassNames(taskType, input.columnMapping, input.metadata as ClassMetadata | null);

  const classLabels = classValues.length
    ? classValues
    : inferClassLabels(taskType, input.metricDetails);

  // 설명을 적은 클래스만 싣는다(B14). 하나도 없으면 표를 만들지 않는다 — 빈 설명을 "설명 미입력"
  // 줄로 찍으면 클래스 레이블 설명을 받지 않은(평가 흐름에 놓지 않은) 성적서에도 표가 생긴다.
  const described = classValues
    .map((value) => ({ label: value, description: (input.classLabelDescriptions[value] ?? "").trim() }))
    .filter((item) => item.description !== "");
  const classLabelDescriptions: ClassLabelInfo[] | undefined = described.length ? described : undefined;

  return {
    format: inferFormat(input.uploadedFile),
    inputColumns: inferInputColumns(taskType, input.selectedMetricIds, input.columnMapping),
    sampleCount: sampleCount ?? 0,
    taskTypeLabel: TASK_TYPE_LABELS[taskType],
    classCount: classLabels.length,
    classLabels,
    classLabelDescriptions,
    fileName: input.uploadedFile?.name ?? "—",
  };
}

/**
 * 학습 데이터 절 — ⑥ 카드에서만 온다. ⑥ 을 끄면 절이 빠진다.
 *
 * 종전에는 Details 의 학습 데이터 폼(`datasetInfo`)을 읽었고, 그 폼과 ⑥ 이 같은 것을 따로
 * 받았다. 설명 칸에는 Details 의 "Report notes"(평가에 대한 메모)가 찍히기도 했다.
 *
 * "모름"을 고른 칸은 빈 칸과 같이 다룬다 — 이 절은 빈 칸을 그리지 않는다.
 */
function buildTrainingDatasetInfo(input: MapWorkflowToReportInput): TrainingDatasetInfo | undefined {
  if (!input.composer?.cards.trainingData) return undefined;

  const { trainingExampleFiles, trainingUnsuitableExampleFiles } = input;
  const values = input.composer.trainingData;
  const known = (fieldId: string) => (values[fieldId]?.unknown ? undefined : values[fieldId]);
  const text = (fieldId: string) => (known(fieldId)?.text ?? "").trim();
  // 칸별 "모름"(W3)인 칸도 빈 칸으로 — 3절 표와 같은 규칙(`reportMaterials` 의 `entryOf`).
  const entry = (fieldId: string, key: string) =>
    isEntryUnknown(values[fieldId], key)
      ? ""
      : (known(fieldId)?.entries?.find((item) => item.key === key)?.value ?? "");

  const name = text("trainingDatasetName");
  const training = parseCount(entry("trainingVolume", "Training"));
  const validation = parseCount(entry("trainingVolume", "Validation"));
  const format = text("trainingDataFormat");
  // 클래스마다 칸이 따로 있다. 성적서에는 한 줄로 적는다("정상 8,400 / 이탈 3,600").
  const classDistribution = (known("trainingClassVolume")?.entries ?? [])
    .filter((item) => item.value.trim() !== "")
    .map((item) => `${item.key} ${item.value.trim()}`)
    .join(" / ");
  const description = text("trainingDescription");
  const notes = text("trainingNotes");

  const hasName = name !== "";
  const hasCounts = training !== null || validation !== null;
  const hasExamples =
    trainingExampleFiles.length > 0 || trainingUnsuitableExampleFiles.length > 0;
  const hasMeta = format !== "" || classDistribution !== "" || description !== "" || notes !== "";

  if (!hasName && !hasCounts && !hasExamples && !hasMeta) {
    return undefined;
  }

  return {
    name: name || "—",
    trainingSampleCount: training ?? 0,
    validationSampleCount: validation ?? 0,
    format: format || undefined,
    classDistribution: classDistribution || undefined,
    description: description || undefined,
    notes: notes || undefined,
    validExamples: trainingExampleFiles,
    edgeExamples: trainingUnsuitableExampleFiles,
  };
}

/**
 * 4절 환경 표. 실행 환경은 2층 보고 항목이라 비었거나 "모름"이면 "제공되지 않음"으로 적는다
 * (재료 선택 점검 4.2 — "—"는 쓰지 않는다. "해당 없음"과 구분된다).
 */
function buildEvalEnv(basicInfo: BasicInfoFormData): EvalEnvironment {
  return {
    ...DEFAULT_EVAL_ENV_CONSTANTS,
    systemSpec: {
      os: basicInfo.envOS || NOT_PROVIDED,
      cpu: basicInfo.envCPU || NOT_PROVIDED,
      gpu: basicInfo.envGPU || NOT_PROVIDED,
      memory: basicInfo.envMemory || NOT_PROVIDED,
      software: basicInfo.envSoftware || NOT_PROVIDED,
    },
  };
}

function buildMetricList(
  taskType: TaskType,
  selectedMetricIds: string[],
  metricDetails: MetricDetailStateMap,
): MetricItem[] {
  if (selectedMetricIds.length === 0) {
    return [];
  }

  return selectedMetricIds
    .map((metricId) => {
      const metric = METRICS.find((m) => m.id === metricId);
      if (!metric || !metric.supportedTaskTypes.includes(taskType)) return null;

      const detail = metricDetails[metricId];
      const target = resolveTargetValue(metricId, detail?.targetValue);


      // β 를 입력받는 지표(F-beta 등)는 사용자가 지정한 β 를 지표명에 함께 표기(입력값이 성적서에 드러나도록).
      const betaVal = detail?.beta?.trim();
      const showsBeta = metric.additionalFields?.includes("beta") && betaVal;
      const displayName = showsBeta ? `${metric.name} (β=${betaVal})` : metric.name;

      return {
        metricId: getMetricDisplayId(metricId),
        name: displayName,
        threshold: target,
        // 방향성(낮을수록 좋은 지표는 ≤)과 자릿수를 6절 표(MetricRow)와 같은 함수로 — 저장 문자열이라
        // 발급본은 그때 자릿수 그대로 남는다.
        passCriteria: target !== null ? formatTargetCriteria(target, metric.higherIsBetter, TARGET_DIGITS) : "정보 제공",
      };
    })
    .filter((item): item is MetricItem => item !== null);
}

function buildMetricFormulas(taskType: TaskType, selectedMetricIds: string[]): MetricFormula[] {
  const ids = selectedMetricIds.length > 0 ? selectedMetricIds : [];
  if (ids.length === 0) return [];

  return ids
    .map((metricId) => {
      const metric = METRICS.find((m) => m.id === metricId);
      if (!metric || !metric.supportedTaskTypes.includes(taskType)) return null;

      const displayId = getMetricDisplayId(metricId);

      return {
        metricId: displayId,
        name: metric.name,
        formula: metric.formula || "—",
        description: metric.description,
        isCommon: !!metric.isCommon,
      };
    })
    .filter((item): item is MetricFormula => item !== null);
}

// ---------- pure helpers ----------

function normalizeReportPurpose(value: string): ReportPurposeKey {
  if (value === "internal" || value === "external" || value === "project") return value;
  return "external";
}

function inferFormat(file: UploadedFileInfo | null): string {
  if (!file) return "정형 데이터 (CSV)";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "정형 데이터 (CSV)";
  if (ext === "json") return "정형 데이터 (JSON)";
  return file.type && file.type !== "unknown" ? file.type : "정형 데이터";
}

function inferInputColumns(
  taskType: TaskType,
  selectedMetricIds: string[],
  columnMapping: MappingRow[],
): string[] {
  // 사용자가 매핑한 컬럼이 있으면 그것을 그대로 사용 (ignore 역할 제외)
  const assigned = columnMapping.filter(
    (r) => r.confirmedRole && r.confirmedRole !== "ignore",
  );
  if (assigned.length > 0) {
    return assigned.map((r) => r.originalName);
  }

  // 매핑 정보가 없을 때만 taskType 기반 기본 컬럼 셋으로 fallback
  const base = ["id", "y_true", "y_pred"];
  if (taskType === "binary") base.push("score");
  if (taskType === "multiclass" && selectedMetricIds.length > 0) base.push("prob_class_*");
  if (taskType === "multilabel") base.push("prob_label_*");
  return base;
}

function inferClassLabels(taskType: TaskType, metricDetails: MetricDetailStateMap): string[] {
  if (taskType === "binary") {
    const positive = Object.values(metricDetails).find((d) => d.positiveClass)?.positiveClass;
    return ["Negative (0)", positive ? `${positive} (1)` : "Positive (1)"];
  }
  // 다중 클래스/레이블은 사전에 라벨 목록을 알 수 없으므로,
  // 실제 업로드된 데이터(y_true)에서 추출될 때까지 빈 배열을 반환합니다.
  return [];
}

function parseCount(value: string): number | null {
  const num = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}
