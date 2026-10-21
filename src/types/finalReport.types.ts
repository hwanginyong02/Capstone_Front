import type { NarrativeFacts } from "../lib/report/narrativeFacts";
import type { TaskType } from "../data/evaluationData";
import type { ConfusionMatrixData, ReportRecommendation } from "./report.types";
import type { ValidationGroup } from "./validation.types";
import type { UploadedFileInfo } from "./workflow.types";
export type { UploadedFileInfo };

export type ReportPurposeKey = "internal" | "external" | "project";

/** 핵심 지표의 출처(W8). */
export type CoreMetricsSource = "client" | "default";

export interface FinalReportMeta {
  reportId: string;
  title: string;
  issuedAt: string;
  evaluationPeriod: { from: string; to: string };
  taskType: TaskType;
  taskTypeLabel: string;
  contractDate?: string;
  positiveClass?: string;
  /**
   * 하드 예측 없이 확률·점수에서 예측을 파생한 경우의 사실 기재(ISSUES.md A-01).
   * SPEC §0 — "argmax·threshold 로 만든 예측은 모델의 실제 출력이 아니라 파생값이므로,
   * 성적서에 파생 사실과 사용한 임계값을 반드시 기재해야 한다."
   * 백엔드 `results.success_metrics.derived_prediction` 을 그대로 받는다.
   */
  derivedPrediction?: DerivedPredictionFact;
}

/** 확률에서 예측을 파생한 방법·임계값·출처 컬럼. */
export interface DerivedPredictionFact {
  method: "threshold" | "argmax" | "threshold_per_label";
  threshold: number | Record<string, number> | null;
  source_columns: string[];
  target_role: string;
  positive_class?: string;
  negative_class?: string;
  class_order?: string[];
  label_order?: string[];
}

export interface ApplicantInfo {
  companyName: string;
  representative: string;
  businessNumber: string;
  contact: string;
  /** 선택 항목. 비었으면 "" 이고 1절 신청인 표에 줄을 만들지 않는다. 이전 보관본은 "—" 를 적었다. */
  fax: string;
  homepage: string;
  address: string;
}

export interface PerformerInfo {
  orgName: string;
  evaluator: string;
  contact: string;
}

export interface EvalScope {
  purpose: string;
  targetModel: string;
  version: string;
  scope: string;
  reportPurposeKey: ReportPurposeKey;
  modelPurpose?: string;
  modelCategory?: string;
  /** 성적서 용도에 덧붙인 글. 1.3 개요 칸에 "의뢰자 제공"으로 싣는다(서술 설계 D26). */
  purposeNote?: string;
  /** 과제 번호 — 용도와 무관한 선택 항목(재료 목록 1절). 1.3 용도 표에 값이 있을 때 찍는다. */
  projectNumber?: string;
  /** 과제명·과제 기관 — 용도가 과제 산출물일 때만. */
  projectInfo?: {
    name: string;
    agency: string;
    /** 이 키 이전(evalScope.projectNumber 가 생기기 전) 보관본 전용. 새 성적서는 위 칸에 적는다. */
    projectNumber?: string;
  };
}

export interface EvalEnvironment {
  method: string;
  outputFormat: string;
  tools: string[];
  systemSpec: {
    os: string;
    cpu: string;
    gpu: string;
    memory: string;
    software: string;
  };
  /**
   * 평가를 실제로 수행한 환경(백엔드 `EvaluateResponse.environment`).
   * **옵셔널이다** — 이 필드가 생기기 전에 발급된 성적서 스냅샷에는 없어서,
   * 없으면 종전 상수로 폴백한다(ISSUES.md F-09, 결정 4).
   */
  environment?: { libraries: Record<string, string>; evaluated_at: string };
}

export interface ClassLabelInfo {
  label: string;
  description: string;
}

export interface DatasetInfo {
  format: string;
  inputColumns: string[];
  sampleCount: number;
  taskTypeLabel: string;
  classCount: number;
  classLabels: string[];
  classLabelDescriptions?: ClassLabelInfo[];
  fileName: string;
}

export interface DatasetSampleRow {
  id: number;
  y_true: number;
  y_pred: number;
  score: number;
}

export interface MetricItem {
  metricId: string;
  name: string;
  /** 합격 목표값. 없으면 `null` — 0 은 목표값 0 이다(`resolveTargetValue`). */
  threshold: number | null;
  passCriteria: string;
}

export interface ValidationResult {
  checkName: string;
  status: "pass" | "fail" | "warning";
  detail: string;
  group: ValidationGroup;
}

/** 데이터 검증 수행 요약 (백엔드 /api/validate-data 의 execution_summary 에서 도출) */
export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  excludedRows: number;
}

export interface MetricFormula {
  metricId: string;
  name: string;
  formula: string;
  description: string;
  isCommon: boolean;
}

/** TP·TN·FP·FN 건수 한 줄. */
export interface ConfusionCountRow {
  label: string;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

/** TP·TN·FP·FN 건수(재료 목록 9절). 이진은 양성 클래스 한 줄, 다중·멀티는 클래스마다 일대다. */
export interface ConfusionCounts {
  kind: "binary" | "perClass";
  rows: ConfusionCountRow[];
}

/** 경계·확신 오류 한 칸 — 건수와 오분류 대비 비율(오분류가 0이면 null). */
export interface ErrorRatioCount {
  count: number;
  ratio: number | null;
}

/**
 * 경계·확신 오류 비율(서술 설계 D30, 재료 목록 9절). 백엔드 `success_metrics.error_ratios` 를
 * 그대로 받는다 — AI 사실 시트에도 같은 모양(snake_case)으로 실어 보낸다.
 * 분모는 확률이 있는 오분류(멀티레이블은 틀린 레이블 칸)다.
 */
export interface ErrorRatios {
  unit: "sample" | "label_cell";
  misclassified: number;
  /** 임계값을 모르면(예측값을 직접 제출) null — 그 이유가 boundary_note 다. */
  boundary: ErrorRatioCount | null;
  boundary_note: "threshold_unknown" | null;
  confident: ErrorRatioCount;
  boundary_margin: number;
  confident_level: number;
  /** 경계 판정에 쓴 임계값. 이진은 숫자, 멀티레이블은 컬럼별 값 또는 숫자, 다중은 null. */
  threshold: number | Record<string, number> | null;
}

/**
 * 임계값 조정 여지(서술 설계 D40) — 백엔드 `success_metrics.f1_threshold_gain` 그대로. 이진이고 점수가
 * 있을 때만 온다. 원본 PR 곡선의 최대 F1 과 실제 예측의 F1 차이(음수면 0, 4자리 반올림).
 */
export interface F1ThresholdGain {
  max_f1: number;
  current_f1: number;
  gain: number;
  best_threshold: number;
  /**
   * 엔진이 반올림 전 gain 으로 정한 '임계값 부적합'(≥ 0.10, S2). 9절 문제가 이 값을 따른다 — 실제 0.09996 은
   * 4자리로 0.1 이지만 부적합이 아니다. 이 키가 없는 응답(옛 백엔드)은 4자리 gain 으로 판정한다.
   */
  notable?: boolean;
  /** gain 의 표시 문자열 — 판정과 같은 쪽으로 읽히게 자릿수를 늘림(S2). 옛 응답에는 없다. */
  gain_text?: string;
}

/**
 * 불균형 영향(서술 설계 D20) — 백엔드 `success_metrics.imbalance_effect` 그대로. affected(영향 있음) /
 * no_distortion(불균형 있으나 성능 왜곡 미관찰) / mild(경미). 멀티레이블은 accuracy_minus_macro_f1 이 null.
 */
export interface ImbalanceEffect {
  level: "affected" | "no_distortion" | "mild";
  imbalance_ratio: number;
  accuracy_minus_macro_f1: number | null;
  majority_minus_minority_f1: number;
  majority_class: string;
  minority_class: string;
  /**
   * 차이를 만든 값 넷(서술 설계 D20 세 갈래 문장 — 서술 라운드 세션 B). 정확도·매크로 F1·다수·소수 클래스 F1.
   * 멀티레이블은 정확도가 없어 null. 이 칸이 생기기 전 엔진 응답에는 없다 — 그때 3절 문장은 차이만 찍는다.
   */
  accuracy?: number | null;
  macro_f1?: number;
  majority_f1?: number;
  minority_f1?: number;
  /**
   * 값들의 표시 문자열(S2) — 엔진이 판정과 같은 쪽으로 읽히게 자릿수를 늘렸다(IR 1.49996 은 넷째 자리로 1.5 지만
   * '경미'라 "1.49996"). 사실 시트로 서술에 간다. 옛 응답에는 없다. 아래 넷(accuracy …)은 세션 B 엔진부터.
   */
  display?: {
    imbalance_ratio: string;
    accuracy_minus_macro_f1: string | null;
    majority_minus_minority_f1: string;
    accuracy?: string | null;
    macro_f1?: string;
    majority_f1?: string;
    minority_f1?: string;
  };
}

/** 문제 종류 9종(서술 설계 D22). 이 순서가 번호 순서다(우선순위 순, 같은 우선순위는 표 순서). */
export type ProblemKind =
  | "core_fail"
  | "inconclusive"
  | "noncore_fail"
  | "core_near_target"
  | "threshold_tuning"
  | "imbalance_effect"
  | "weakest_class"
  | "distribution_shift"
  | "label_caution";

/**
 * 9절 권고가 대응하는 문제 하나(`problemList.ts`). 생성 때 만들어 저장한다 — AI 사실 시트에도 이 모양
 * (snake_case) 그대로 실어 보낸다(백엔드 ProblemFact).
 */
export interface Problem {
  /** "P1"… 번호 순서 그대로. */
  id: string;
  kind: ProblemKind;
  priority: "HIGH" | "MEDIUM" | "LOW";
  /** 문제 이름 — 지표·클래스 이름을 괄호에 쉼표로("핵심 지표 미달 (F1 Score, Recall)"). */
  title: string;
  /** 문제가 드러난 절과 권고를 쓰는 절. */
  source_section: string;
  recommend_section: string;
  /** 근거 수치. 숫자는 AI 서술의 허용 목록에 들어간다. */
  evidence: Record<string, unknown>;
  /** 덧붙임(예: 불균형 영향 + 편향 감소 노력 "수행 안 함"). 없으면 null. */
  note: string | null;
}

/** 8.1 벤치마크 비교 한 줄 — 서버가 계산한 값 그대로(내부 참조 기준치). */
export interface BenchmarkRef {
  metric: string;
  modelValue: number;
  refLow: number;
  refHigh: number;
  /** 방향을 반영한 우열 — better(우수) / within(범위 내) / worse(미흡). */
  quality: string;
  /** higher(높을수록 좋음) / lower(낮을수록 좋음). */
  direction: string;
  sourceNote: string;
  /**
   * 목표값과 그 위치(설계 D31, 서버 계산). 목표값이 없는 지표는 null.
   * 키 자체가 없으면 이 필드가 생기기 전에 만든 성적서다 — 8.1 표에 열을 그리지 않는다.
   */
  targetValue?: number | null;
  /** 목표값이 참조 범위의 어디에 있는지 — 단순 수치 위치(방향 반영 안 함). below / within / above. */
  targetPosition?: BenchmarkTargetPosition | null;
}

export type BenchmarkTargetPosition = "below" | "within" | "above";

/** 클래스별 표(M22)의 한 줄 — 클래스 하나 또는 평균 하나. */
export interface ClassReportRow {
  label: string;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  support: number | null;
}

/** 클래스별 표(M22). 클래스 줄과 평균 줄(매크로·가중·마이크로·샘플). */
export interface ClassReportTable {
  rows: ClassReportRow[];
  averages: ClassReportRow[];
}

/** 지표별 클래스 판정. 클래스별 표(`classReport`)가 생기기 전에 발급된 성적서에만 있다. */
export interface PerClassKpi {
  label: string;
  value: number;
  status: "pass" | "fail" | "warning";
}

export interface KpiResult {
  metricId: string;
  name: string;
  value: number;
  /**
   * 합격 목표값. 없으면 `null` 이고 판정 대상이 아니다. 0 이나 음수도 그 지표의 허용 범위 안이면
   * 목표값이다(MCC 등). 종전에는 0 이 "없음"을 뜻했다 — `contentSchema` 참고.
   */
  threshold: number | null;
  /** unavailable = 백엔드 계산 실패(측정 불가). 판정/집계에서 제외하고 '측정 불가'로 표기. */
  status: "pass" | "fail" | "warning" | "unavailable";
  /** 방향성(합격 기준 표기 ≥/≤). 미지정=높을수록 좋음. */
  higherIsBetter?: boolean;
  /** status=unavailable 일 때 백엔드가 준 계산 실패 사유(디버그/안내용). */
  errorMessage?: string;
  perClass?: PerClassKpi[];
  /** M11/12/13 등 dict 반환 메트릭의 세부 수치 (Precision / Recall / F1) */
  subMetrics?: { precision: number; recall: number; f1Score: number };
  /** 핵심 지표 — 미달하면 최종 불합격이다(`resolveCoreMetricIds`). 성적서에 표시해 판정 근거를 보인다. */
  isCore?: boolean;
  /**
   * 95% 신뢰구간(서술 설계 D29). 판정 대상 지표(`isJudged`)에만 붙는다. 백엔드가 계산을 생략한 지표와
   * 이 키가 생기기 전 성적서에는 없다.
   */
  ci?: KpiConfidenceInterval;
  /**
   * 목표값과의 차이(높을수록 좋은 지표는 값 − 목표, 낮을수록 좋은 지표는 목표 − 값)와 아슬아슬 여부
   * (서술 설계 D12, `computeVerdict.ts` 의 `computeMargin`·`isNearTarget`). 판정 대상 지표에만 붙는다.
   * **이 키가 있는 성적서만** 6.1 판정 규칙에 3% 문장을 찍는다. 이 키가 생기기 전 성적서에는 없다.
   */
  margin?: number;
  nearTarget?: boolean;
}

/** 지표 하나의 95% 신뢰구간. method 는 백엔드 표기 그대로(wilson·bootstrap_multinomial·bootstrap·delong·logit·normal). */
export interface KpiConfidenceInterval {
  low: number;
  high: number;
  method: string;
}

export interface LatencyStats {
  mean: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  unit: "ms" | "s";
}

export interface ConclusionData {
  /** INCONCLUSIVE = 판정 불가(핵심 지표 미산출 또는 판정 대상 없음, 서술 설계 D19). */
  verdict: "PASS" | "CONDITIONAL_PASS" | "FAIL" | "INCONCLUSIVE";
  /** 통과율(%). 참고 수치일 뿐 판정 근거가 아니다(D19). */
  score: number;
  /** 판정 대상 지표 수. 0 이면 통과율을 셀 수 없다. 이 키가 생기기 전 저장된 성적서에는 없다. */
  judgedCount?: number;
  benchmark: string;
  /** 8.1 에 숫자로 찍는 벤치마크 비교(서버 계산). 이 키가 생기기 전 성적서에는 없다. */
  benchmarkRefs?: BenchmarkRef[];
  narrative: string;
  risks: string;
}

export interface IssuanceRecord {
  version: string;
  issuedAt: string;
  note: string;
}

export interface SignatureData {
  issuer: string;
  signedAt: string;
  history: IssuanceRecord[];
}

export interface RecommendationNarrative {
  dataQuality: string;
  modelOps: string;
}

/**
 * 서술 출처 — 추적성 배지용. llm: LLM 생성, fallback: 규칙 기반, error: 호출 실패(빈 서술 — 옛 저장본에만 있다).
 * pending·failed 는 **화면 전용**이다(서술 라운드 S3b): 서술을 기다리는 중·만들지 못함일 때 성적서 훅이 그리기 직전에
 * 얹는 값으로, 저장하지 않는다. 섹션은 이 값으로 빈 서술 자리의 안내 문구를 고른다.
 */
export type NarrativeSource = "llm" | "fallback" | "error" | "pending" | "failed";

/** 칸(소절 번호) 하나의 출처 — 서술 작업 응답의 section_sources. fixed 는 고정 문구. */
export type NarrativeSectionSource = "llm" | "fallback" | "fixed";

/** 7절 정밀 분석 서술 (LLM /api/generate-narrative 의 interpretation). */
export interface InterpretationData {
  /** 혼동 행렬 기반 클래스 간 간섭 분석 */
  confusionAnalysis: string;
  /** 데이터 분포 유의성 및 클래스 편향성 평가 */
  distributionAnalysis: string;
  /**
   * 7.3 추가 관찰(작업 응답 interpretation.additional_observations). AI 가 쓸 것이 없으면 빈 글 — 판 3 은 그때
   * 고정 문구 15 "해당 없음"을 찍는다. 이 칸이 생기기 전 저장본에는 없다.
   */
  additionalObservations?: string;
}

export interface TrainingDatasetInfo {
  name: string;
  trainingSampleCount: number;
  validationSampleCount: number;
  format?: string;
  classDistribution?: string;
  /** ⑥ 학습 데이터 설명. ⑥ 을 켰을 때만 있다. */
  description?: string;
  /** ⑥ 비고. ⑥ 을 켰을 때만 있다. */
  notes?: string;
  validExamples: UploadedFileInfo[];
  edgeExamples: UploadedFileInfo[];
}

export interface FinalReportData {
  /**
   * 성적서 데이터 형식의 판. 발급된 성적서는 이 데이터를 통째로 보관하고 번호로 다시 그리므로,
   * 뜻이 바뀐 칸을 옛 판에서 읽을 때 옮겨 읽는다(`normalizeReportContent`).
   *
   * - 없음(1): 목표값 없음을 `threshold: 0` 으로 적었다. 파생 예측 사실을 6.0 일러두기에 찍었다.
   * - 2: 목표값 없음을 `threshold: null` 로 적는다. 파생 예측 사실은 7.1 앞에 찍는다(재료 목록
   *   4절 "결정 임계값 — 7.1 앞 고정 문구").
   * - 3: 칸 뜻은 2 와 같다. 소절 번호(1.1~9.2)·칸별 "규칙 기반 문장" 배지(화면만)·7.3·고정 문구 16·
   *   본문의 AI/LLM 표현 제거 같은 새 모양을 이 판에만 그린다(`usesSchema3`). 판은 run 을 만들 때 매퍼가 찍는다.
   */
  contentSchema?: number;
  /**
   * 합격 목표값을 찍는 소수 자릿수(B10). 새 성적서는 3 — 목표값 입력이 셋째 자리까지라 인쇄값이 판정값과
   * 같다. 5절 문자열(`MetricItem.passCriteria`)은 생성 때 이 자릿수로 만들어 저장하고, 6.1·6.2 표는 그릴 때
   * 이 값을 읽는다. 이 키가 생기기 전 성적서에는 없고, 없으면 종전 둘째 자리(`LEGACY_TARGET_DIGITS`)다.
   */
  targetDigits?: number;
  /**
   * 판정 대상 지표 값을 판정과 같은 쪽으로 읽히게 찍는가(S2, 사용자 결정 "판정 자릿수"). 새 성적서는 true —
   * 셋째 자리 반올림이 판정과 어긋나 보이면(실제 미달 0.7996 이 "0.800 / ≥ 0.800 / 불합격") 6.1·6.2 표가
   * 자릿수를 늘려 찍는다(`judgedNumber.formatJudgedValue`). 이 키가 없는 옛 발급본은 발급 당시처럼 셋째 자리다.
   */
  judgedValueDigits?: boolean;
  /**
   * 핵심 지표를 의뢰자가 정했나(client), 유형별 기본값을 그대로 썼나(default) — W8, `coreMetricsSource`.
   * 6.1 판정 규칙 문장이 두 갈래로 읽는다. 이 키가 생기기 전 성적서에는 없고 종전 문장("의뢰자가 지정")이다.
   */
  coreMetricsSource?: CoreMetricsSource;
  meta: FinalReportMeta;
  applicant: ApplicantInfo;
  performer: PerformerInfo;
  evalScope: EvalScope;
  datasetInfo: DatasetInfo;
  datasetSamples: DatasetSampleRow[];
  datasetDiagnosis: string;
  trainingDatasetInfo?: TrainingDatasetInfo;
  evalEnv: EvalEnvironment;
  metricList: MetricItem[];
  metricFormulas: MetricFormula[];
  dataValidation: ValidationResult[];
  /** 검증 수행 요약 수치 (없으면 섹션이 fallback 처리) */
  validationSummary?: ValidationSummary;
  kpiResults: KpiResult[];
  /**
   * 클래스별 표(M22). M22 를 골랐을 때만 있다. 이 키가 생기기 전 발급된 성적서는 지표별
   * 클래스 판정(`KpiResult.perClass`)을 대신 찍는다.
   */
  classReport?: ClassReportTable | null;
  /** TP·TN·FP·FN 건수. 7.1 에 찍는다(재료 목록 9절). 이 키가 생기기 전 성적서에는 없다. */
  confusionCounts?: ConfusionCounts | null;
  /**
   * 경계·확신 오류 비율과 그 7.1 문장(서술 설계 D30). 문장은 생성 때 만들어 저장한다 — 발급본은
   * 나중에 문안을 바꿔도 그대로다. 이 키가 생기기 전 성적서와 확률이 없는 평가에는 없다.
   */
  errorRatios?: ErrorRatios;
  errorRatioSentence?: string;
  /**
   * 6.0 에 찍는 신뢰구간 산출 방식 한 줄(서술 설계 D29). 생성 때 실제로 쓴 방식으로 만들어 저장한다.
   * **이 키가 있는 성적서만** 6.1·6.2 에 "95% 신뢰구간" 열을, 1.4 에 고정 문구 3 을 찍는다.
   * 판정 대상 지표에 구간이 하나도 없으면 두지 않는다.
   */
  confidenceIntervalNote?: string;
  /**
   * 8.3 에 찍는 아슬아슬 지표 한 줄(서술 설계 D12). 생성 때 만들어 저장한다. 아슬아슬 지표가 없거나
   * 이 키가 생기기 전 성적서에는 없다.
   */
  nearTargetNote?: string;
  /**
   * 8.1 표 아래 고정 문구 16(서술 설계, 사용자 결정 5) — 고른 서술 지표 중 내부 참조 기준치가 없는 것.
   * 조립 때 만들어 저장한다(`benchmarkBaselines.noBenchmarkSentence`). 모두 기준이 있거나 서술 지표가 없으면,
   * 그리고 이 키가 생기기 전 성적서에는 없다.
   */
  noBenchmarkSentence?: string;
  /**
   * 7.2 정답 라벨 주의 고정 문구 12(`dataCautionPhrases.ts`). 9절 문제 "정답 라벨 주의"와 같은 판정으로
   * 생성 때 만들어 저장한다. 걸리지 않았거나 이 키가 생기기 전 성적서에는 없다.
   */
  labelCautionSentence?: string;
  /**
   * 8.2 일반화 고정 문구 11a(같은 출처)·11b(다른 출처). 의뢰자가 학습 데이터와의 출처 관계를 답했을 때만
   * 생성 때 만들어 저장한다. 답이 없거나 "모름"이거나 이 키가 생기기 전 성적서에는 없다.
   */
  sourceRelationSentence?: string;
  /**
   * 9절 권고가 대응하는 문제 목록(서술 설계 D22, `problemList.ts`). 생성 때 만들어 저장한다.
   * **이 키가 있는 성적서만** 9절을 문제 번호 표로 그린다 — 0개면 고정 문구 6. 이 키가 생기기 전
   * 성적서는 종전 표(우선순위·분류·권고 내용·기대 효과)다.
   */
  problems?: Problem[];
  /**
   * AI 에 보낸 서술용 파생값(S4a, 계약 facts-1 — `lib/report/narrativeFacts.ts`). 자른 뒤 값(보낸 것과 같음).
   * S7 D6 표(최약 클래스·최다 오분류 쌍)와 /report/:id 가 이 값을 그린다. 이 키가 생기기 전 성적서에는 없다.
   */
  narrativeFacts?: NarrativeFacts;
  charts: {
    confusionMatrix: ConfusionMatrixData | null;
    rocCurve: { fpr: number[]; tpr: number[]; auroc?: number } | null;
    prCurve: { recall: number[]; precision: number[]; auprc?: number } | null;
  };
  /** 지연시간 통계. latency 컬럼이 매핑/측정된 경우만 채워지며, 미측정이면 null. */
  latency: LatencyStats | null;
  interpretation: InterpretationData;
  conclusion: ConclusionData;
  recommendationNarrative: RecommendationNarrative;
  recommendations: ReportRecommendation[];
  /** 7·8·9절 서술의 출처(추적성 배지). 미평가/미생성 시 undefined. */
  narrativeSource?: NarrativeSource;
  /**
   * 칸(소절 번호 7.1·7.2·8.1·8.2·8.3·9 …)마다 서술 출처(서술 라운드 S3b, 작업 응답 section_sources).
   * 칸별 표시는 S7 에서 그린다. 이 칸이 생기기 전 저장본에는 없다.
   */
  narrativeSections?: Record<string, NarrativeSectionSource>;
  /**
   * 칸마다 서술을 쓴 모델 이름(작업 응답 section_models, 사용자 결정 4 — "작성 기록"). llm 칸만 이름이 있고
   * 규칙 기반·고정 칸은 null. 서비스 화면(`/report/:id`·`/report/no/:번호`)에만 보이고 인쇄 본문에는 없다.
   * 이 칸이 생기기 전 저장본과 모델을 알려 주지 않는 서버 응답에는 없다.
   */
  narrativeModels?: Record<string, string | null>;
  /**
   * 서술까지 끝난 완성본인가. 이것이 true 일 때만 발급·PDF·인쇄가 열린다(서술 라운드 S3b — 끝나지 않은 서술은
   * 완성본이 아니다). 성적서 훅이 서술 작업이 끝났을(done) 때만 세운다.
   */
  isEvaluated?: boolean;
  /**
   * 평가 전처리가 만든 경고(백엔드 `EvaluateResponse.warnings`).
   * 종전에는 프론트에 소비처가 없어 그대로 버려졌다(ISSUES.md D-16).
   * **검증 단계가 아니라 성적서 화면에서 도착한다** — evaluate 를 호출하는 곳이 여기다.
   */
  evaluationWarnings?: string[];
  /**
   * 고객이 제공한 재료 — 성적서의 정해진 자리에 찍는 줄(재료 목록의 인쇄 위치).
   * 이 키가 생기기 전 저장된 성적서에는 없다. 없으면 각 절이 종전처럼 그린다.
   */
  materials?: ReportMaterials;
  /**
   * 재료 선택 점검 결과(입력 설계 › 재료 선택 점검). 표지·1.4·5절·6.0 이 읽는다. 이 키가 생기기 전
   * 성적서(와 옛 입력 스냅샷으로 만든 성적서)에는 없고, 없으면 각 절이 종전처럼 그린다.
   */
  materialCheck?: MaterialCheckResult;
  signature: SignatureData;
}

/**
 * 생성 전 안내를 보고도 진행한 기록(재료 선택 점검 6절 "경고를 보고도 진행한 사실을 결과 파일에
 * 남긴다"). 검증 화면의 "다음"이 남긴다.
 */
export interface MaterialCheckAck {
  /** 진행한 시각(ISO). */
  at: string;
  /** 그때의 점검 표 버전. */
  version: string;
  /** 그때 보여 준 경고 id(`MaterialCheckResult.warningIds`). */
  warningIds: string[];
}

/** 2층 보고 항목 하나의 판정(재료 선택 점검 4.2). */
export interface MaterialCheckItem {
  /** TS 4213 보고 항목 번호(4.2 표의 #). */
  item: number;
  /** 성적서에 적는 항목 이름. */
  name: string;
  provided: boolean;
  /** 빠진 줄의 이름(성적서 표의 이름표). 제공이면 빈 배열. */
  missing: string[];
  /** 빠졌을 때 판단할 수 없게 되는 것(고정 문구 2.2). */
  impact: string;
}

/** 3층 목적별 점검 줄(재료 선택 점검 4.3). 이 성적서에 적용되는 줄만 담는다. */
export interface MaterialCheckLine {
  id: "latency" | "riskDirection" | "averaging" | "curveImbalance";
  met: boolean;
  /** 화면에 보이는 짧은 이름. */
  title: string;
  /** 고객 선언(성적서 이름) 또는 조건 값. */
  declared: string;
  /** 넣으면 이 줄이 충족되는 지표. 지표로 채울 수 없는 줄(지연시간)은 빈 배열. */
  recommended: string[];
  /** 미충족일 때 1.4 에 찍는 문장. */
  shortfall: string;
}

/**
 * 재료 선택 점검 결과(입력 설계 › 재료 선택 점검). 성적서 생성 때 만들어 성적서 데이터에 저장한다 —
 * 발급본은 나중에 문안이나 규칙이 바뀌어도 그대로다. AI·심판에는 보내지 않는다.
 */
export interface MaterialCheckResult {
  /** 점검 표 버전("주.부"). */
  version: string;
  /** 2층 — 분모는 이진·다중 11, 멀티레이블 12. */
  reporting: { total: number; provided: number; items: MaterialCheckItem[] };
  /** 3층 — 분모는 적용되는 줄 수(0 이면 해당 없음). */
  purpose: { applicable: number; met: number; lines: MaterialCheckLine[] };
  /** 지금 판정의 경고 id. `reporting:<번호>`·`purpose:<줄 id>`. */
  warningIds: string[];
  /** 4번 줄에 쓴 불균형 비율(3절과 같은 자릿수 전의 값)과 그 분포의 출처. */
  imbalanceRatio: number | null;
  distributionSource: "validation" | "upload" | null;
  /** 생성 전 안내 확인 기록. 버전이 같고 지금 경고를 모두 담은 기록만 인정한다. */
  acknowledgement: { at: string; version: string } | null;
  /** 성적서에 찍는 문구(고정 문구 14 · 2절). */
  printed: {
    /** 표지 표준 문구(2.3). */
    cover: string;
    /** 1.4 "제공되지 않은 정보" 문장. 다 제공됐으면 없음. */
    notProvided?: string;
    /** 1.4 영향 문장 — 빠진 항목마다 한 줄(2.2). */
    impacts: string[];
    /** 1.4 목적별 점검 미충족 줄. */
    purposeShortfalls: string[];
    /** 6.0 세 줄. */
    summary: Array<{ label: string; value: string; note: string }>;
    /** 5절 평균 방식 문장을 바꿔 찍을 때(3번 줄 미충족, 다중 클래스). */
    averagingSentence?: string;
  };
}

/**
 * 고객 재료 한 칸의 값. `null` 은 **제공되지 않음**이다 — 2층 보고 항목인데 카드를 껐거나
 * "모름"을 골랐다(재료 선택 점검 4.2). 선택 항목이 비었으면 줄 자체를 만들지 않는다.
 */
export type MaterialValue = string | null;

export interface MaterialRow {
  label: string;
  value: MaterialValue;
  /**
   * 이 줄이 속한 TS 4213 보고 항목 번호(재료 선택 점검 4.2 의 표, 2층). 재료 선택 점검이 이 번호로
   * 항목별 제공 여부를 센다 — 한 항목에 줄이 여럿이면 모든 줄이 있어야 제공이다. 선택 항목 줄과
   * 선언 줄에는 없다. 이 키가 생기기 전 성적서에는 없다.
   */
  item?: number;
}

/** 고객 재료를 성적서 자리별로 모은 것. 같은 값을 AI 에도 넘긴다(서술 설계 D25). */
export interface ReportMaterials {
  /** 5절 의뢰자 선언 표 — 이 작업 유형에 해당하는 선언만. */
  declarations: MaterialRow[];
  /** 5절 선택 기준 문장. 멀티레이블에서만 있다(그 밖은 해당 없음). */
  metricRationale?: MaterialValue;
  /**
   * 5절 평균 방식 문장(고정 문구 4, 서술 설계 D28). 다중 클래스에서 클래스 중요도를 답했을 때만
   * 있다. 이 키가 생기기 전 성적서에는 없다.
   */
  averagingSentence?: string;
  /** 3절 학습 데이터셋 표. */
  training: MaterialRow[];
  /** 3절 평가 데이터셋 표에 덧붙이는 줄(출처, 학습 데이터와의 관계, 수집 기간). */
  test: MaterialRow[];
  /** 3절 정답 라벨 표. */
  groundTruth: MaterialRow[];
  /** 4절 환경 표에 덧붙이는 줄(학습·추론 가속). */
  environment: MaterialRow[];
  /** 4절 환경 표 아래 — 알고리즘과 "이름 = 값" 표. `rows` 가 null 이면 제공되지 않음. */
  hyperparameters: {
    algorithm: MaterialValue;
    rows: Array<{ name: string; value: string }> | null;
  };
}
