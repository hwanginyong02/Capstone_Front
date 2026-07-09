import type { TaskType } from "../data/evaluationData";
import type { ConfusionMatrixData, ReportRecommendation } from "./report.types";
import type { ValidationGroup } from "./validation.types";
import type { UploadedFileInfo } from "./workflow.types";

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
}

export interface ApplicantInfo {
  companyName: string;
  representative: string;
  businessNumber: string;
  contact: string;
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
  projectInfo?: {
    name: string;
    agency: string;
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
  threshold: number;
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

export interface PerClassKpi {
  label: string;
  value: number;
  status: "pass" | "fail" | "warning";
}

export interface KpiResult {
  metricId: string;
  name: string;
  value: number;
  threshold: number;
  /** unavailable = 백엔드 계산 실패(측정 불가). 판정/집계에서 제외하고 '측정 불가'로 표기. */
  status: "pass" | "fail" | "warning" | "unavailable";
  /** 방향성(합격 기준 표기 ≥/≤). 미지정=높을수록 좋음. */
  higherIsBetter?: boolean;
  /** status=unavailable 일 때 백엔드가 준 계산 실패 사유(디버그/안내용). */
  errorMessage?: string;
  perClass?: PerClassKpi[];
  /** M11/12/13 등 dict 반환 메트릭의 세부 수치 (Precision / Recall / F1) */
  subMetrics?: { precision: number; recall: number; f1Score: number };
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
  verdict: "PASS" | "CONDITIONAL_PASS" | "FAIL";
  score: number;
  benchmark: string;
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
  description?: string;
  validExamples: UploadedFileInfo[];
  edgeExamples: UploadedFileInfo[];
}

export interface FinalReportData {
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
  signature: SignatureData;
}
