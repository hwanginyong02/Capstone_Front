import type { TaskType } from "../data/evaluationData";
import type { ConfusionMatrixData, ReportRecommendation } from "./report.types";
import type { ValidationGroup } from "./validation.types";
import type { UploadedFileInfo } from "./workflow.types";
export type { UploadedFileInfo };

export type ReportPurposeKey = "internal" | "external" | "project";

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
}

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

/** 서술 출처 — 추적성 배지용. llm: LLM 생성, fallback: 규칙 기반, error: 호출 실패(빈 서술). */
export type NarrativeSource = "llm" | "fallback" | "error";

/** 7절 정밀 분석 서술 (LLM /api/generate-narrative 의 interpretation). */
export interface InterpretationData {
  /** 혼동 행렬 기반 클래스 간 간섭 분석 */
  confusionAnalysis: string;
  /** 데이터 분포 유의성 및 클래스 편향성 평가 */
  distributionAnalysis: string;
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
   */
  contentSchema?: number;
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
  signature: SignatureData;
}

/**
 * 고객 재료 한 칸의 값. `null` 은 **제공되지 않음**이다 — 2층 보고 항목인데 카드를 껐거나
 * "모름"을 골랐다(재료 선택 점검 4.2). 선택 항목이 비었으면 줄 자체를 만들지 않는다.
 */
export type MaterialValue = string | null;

export interface MaterialRow {
  label: string;
  value: MaterialValue;
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
