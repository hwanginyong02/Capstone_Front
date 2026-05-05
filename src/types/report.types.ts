export type ReportVerdict = "PASS" | "CONDITIONAL_PASS" | "FAIL";

export interface ReportMeta {
  reportId: string;
  title: string;
  issuedAt: string;
  evaluationPeriod: {
    from: string;
    to: string;
  };
  taskTypeLabel: string;
  purpose: string;
  projectName: string;
  projectAgency: string;
  companyName: string;
  representative: string;
  businessNumber: string;
  modelName: string;
  versionName: string;
  modelPurpose: string;
  environment: {
    os: string;
    cpu: string;
    gpu: string;
    memory: string;
    software: string;
  };
  sourceFileName: string;
}

export interface ReportDataset {
  format: string;
  sourceName: string;
  totalSamples: number;
  trainingSamples: number;
  evaluationSamples: number;
  classLabels: string[];
  notes: string[];
}

export interface ReportTestItem {
  id: string;
  name: string;
  subtitle: string;
  formula: string;
  thresholdLabel: string;
  description: string;
}

export interface PerClassMetric {
  className: string;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
  status: "pass" | "warning";
}

export interface ReportMetricResult {
  metricId: string;
  metricName: string;
  value: number;
  threshold: number;
  summary: string;
  status: "pass" | "warning";
  perClass?: PerClassMetric[];
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
  totalSamples: number;
}

export interface DiagnosticInsight {
  className: string;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
  severity: "good" | "warning";
  topConfusion: {
    confusedWith: string;
    count: number;
    rate: number;
  };
  observation: string;
}

export interface ReportSummary {
  verdict: ReportVerdict;
  overallScore: number;
  headline: string;
  narrative: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ReportRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  action: string;
  expectedImpact: string;
}

export interface EvaluationReportData {
  meta: ReportMeta;
  dataset: ReportDataset;
  testItems: ReportTestItem[];
  metricResults: ReportMetricResult[];
  confusionMatrix: ConfusionMatrixData | null;
  diagnostics: DiagnosticInsight[];
  summary: ReportSummary;
  recommendations: ReportRecommendation[];
}
