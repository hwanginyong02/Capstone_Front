export type TaskType = "binary" | "multiclass" | "multilabel";

export type AdditionalInputField = "beta" | "positiveClass";

export interface MetricDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  supportedTaskTypes: TaskType[];
  additionalFields?: AdditionalInputField[];
  probabilityRequiredFor?: TaskType[];
  formula?: string;
  isCommon?: boolean;
  /**
   * 지표 방향성(합·불 판정·기준 표기의 단일 출처). 미지정/true = 높을수록 좋음(값 ≥ 목표 → 합격),
   * false = 낮을수록 좋음(값 ≤ 목표 → 합격). 낮을수록 좋은 지표: M6/8/14/15/18/19/23.
   */
  higherIsBetter?: boolean;
}

export interface UploadColumnGuide {
  alwaysRequired: string[];
  conditionallyRequired: string[];
  optional: string[];
  notes: string[];
}

export type RequiredColumnCode =
  | "id"
  | "y_true"
  | "y_pred"
  | "score"
  | "prob_class_*"
  | "prob_label_*"
  | "latency";

export interface RequiredColumnDisplay {
  code: RequiredColumnCode;
  label: string;
  description: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  binary: "Binary",
  multiclass: "Multi-class",
  multilabel: "Multi-label",
};

export const METRICS: MetricDefinition[] = [
  { id: "M1", name: "Accuracy", subtitle: "Overall correctness", description: "Measures how often the classifier predicts the correct result.", supportedTaskTypes: ["binary", "multiclass"], formula: "(TP + TN) / Total", isCommon: true },
  { id: "M2", name: "Precision", subtitle: "Positive predictive value", description: "Among predicted positives, measures how many are actually positive.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "TP / (TP + FP)", isCommon: true },
  { id: "M3", name: "Recall", subtitle: "Sensitivity", description: "Measures how many true positives are successfully detected.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "TP / (TP + FN)", isCommon: true },
  { id: "M4", name: "F1 Score", subtitle: "Harmonic mean", description: "Balances precision and recall in a single metric.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "2 * (Precision * Recall) / (Precision + Recall)", isCommon: true },
  { id: "M5", name: "F-beta Score", subtitle: "Weighted F score", description: "Adjusts the balance between precision and recall using beta.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["beta", "positiveClass"], formula: "(1 + β²) * (P * R) / (β² * P + R)", isCommon: true },
  { id: "M6", higherIsBetter: false, name: "KL Divergence", subtitle: "Distribution divergence", description: "정답 레이블의 분포와 모델이 예측한 클래스 레이블의 분포 간의 차이(Target Drift)를 계산합니다.", supportedTaskTypes: ["binary", "multiclass"], formula: "∑ P(x) * log(P(x) / Q(x))", isCommon: true },
  { id: "M7", name: "Specificity", subtitle: "True negative rate", description: "Measures how many true negatives are correctly predicted.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], formula: "TN / (TN + FP)" },
  { id: "M8", higherIsBetter: false, name: "FPR", subtitle: "False positive rate", description: "Measures how often negatives are incorrectly marked positive.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], formula: "FP / (FP + TN)" },
  { id: "M9", name: "AUROC", subtitle: "ROC area", description: "Measures ranking quality across classification thresholds.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"], formula: "Area under ROC Curve" },
  { id: "M10", name: "AUPRC", subtitle: "PR area", description: "Measures precision-recall tradeoff across thresholds.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"], formula: "Area under PR Curve" },
  { id: "M11", name: "Macro Average", subtitle: "Unweighted class average", description: "Averages class metrics equally across classes.", supportedTaskTypes: ["multiclass", "multilabel"], formula: "(Class1_Metric + ... + ClassN_Metric) / N" },
  { id: "M12", name: "Micro Average", subtitle: "Global average", description: "Computes metrics over the full set of samples.", supportedTaskTypes: ["multiclass", "multilabel"], formula: "∑ TP / ∑ (TP+FP+FN)" },
  { id: "M13", name: "Weighted Average", subtitle: "Support-weighted average", description: "Averages class metrics using class support as weights.", supportedTaskTypes: ["multiclass", "multilabel"], formula: "∑ (Class_Metric * Support) / Total Support" },
  { id: "M14", higherIsBetter: false, name: "Distribution Diff (MC)", subtitle: "Class distribution gap", description: "Compares actual and predicted class distributions.", supportedTaskTypes: ["multiclass"], formula: "0.5 * ∑ |P(x) - Q(x)|" },
  { id: "M15", higherIsBetter: false, name: "Hamming Loss", subtitle: "Label mismatch ratio", description: "Measures label-wise disagreement in multi-label classification.", supportedTaskTypes: ["multilabel"], formula: "∑ (y_true ≠ y_pred) / (Samples * Labels)" },
  { id: "M16", name: "Exact Match Ratio", subtitle: "Strict set match", description: "Counts samples where all labels exactly match.", supportedTaskTypes: ["multilabel"], formula: "∑ (All_labels_match) / Samples" },
  { id: "M17", name: "Jaccard Index", subtitle: "Set overlap score", description: "Measures intersection over union of predicted and actual labels.", supportedTaskTypes: ["multilabel"], formula: "|y_true ∩ y_pred| / |y_true ∪ y_pred|" },
  { id: "M18", higherIsBetter: false, name: "Distribution Diff (ML)", subtitle: "Label distribution gap", description: "Compares actual and predicted label distributions.", supportedTaskTypes: ["multilabel"], formula: "0.5 * ∑ |P(l) - Q(l)|" },
  { id: "M19", higherIsBetter: false, name: "Log Loss", subtitle: "Probabilistic error", description: "Penalizes confident but wrong probabilistic predictions.", supportedTaskTypes: ["binary"], probabilityRequiredFor: ["binary"], formula: "- (y * log(p) + (1-y) * log(1-p))" },
  { id: "M20", name: "MCC", subtitle: "Balanced correlation", description: "A robust binary metric that considers all confusion matrix cells.", supportedTaskTypes: ["binary"], formula: "(TP*TN - FP*FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))" },
  { id: "M21", name: "Confusion Matrix", subtitle: "Prediction matrix", description: "Shows actual versus predicted counts by class or label.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], formula: "실제/예측 클래스의 교차 분포를 행렬로 산출", isCommon: true },
  { id: "M22", name: "Class-wise Metric", subtitle: "Per-class detail", description: "Breaks down metrics for each class or label.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "개별 클래스별 P/R/F1 산출", isCommon: true },
  { id: "M23", higherIsBetter: false, name: "Imbalance Ratio", subtitle: "Class balance check", description: "Measures the balance of the evaluation dataset itself.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], formula: "max(class count) / min(class count)", isCommon: true },
];

const RECOMMENDED_METRICS: Record<TaskType, string[]> = {
  binary: ["M1", "M2", "M3", "M4", "M9", "M21", "M22", "M23"],
  multiclass: ["M1", "M2", "M3", "M4", "M11", "M21", "M22", "M23"],
  multilabel: ["M1", "M2", "M3", "M4", "M15", "M21", "M22", "M23"],
};

const REQUIRED_COLUMNS_BY_METRIC: Record<TaskType, Partial<Record<string, RequiredColumnCode[]>>> = {
  binary: {
    M1: ["id", "y_true", "y_pred"],
    M2: ["id", "y_true", "y_pred"],
    M3: ["id", "y_true", "y_pred"],
    M4: ["id", "y_true", "y_pred"],
    M5: ["id", "y_true", "y_pred"],
    M6: ["id", "y_true", "y_pred"],
    M7: ["id", "y_true", "y_pred"],
    M8: ["id", "y_true", "y_pred"],
    M9: ["id", "y_true", "score"],
    M10: ["id", "y_true", "score"],
    M19: ["id", "y_true", "score"],
    M20: ["id", "y_true", "y_pred"],
    M21: ["id", "y_true", "y_pred"],
    M22: ["id", "y_true", "y_pred"],
    M23: ["id", "y_true"],
  },
  multiclass: {
    M1: ["id", "y_true", "y_pred"],
    M2: ["id", "y_true", "y_pred"],
    M3: ["id", "y_true", "y_pred"],
    M4: ["id", "y_true", "y_pred"],
    M5: ["id", "y_true", "y_pred"],
    M6: ["id", "y_true", "y_pred"],
    M11: ["id", "y_true", "y_pred"],
    M12: ["id", "y_true", "y_pred"],
    M13: ["id", "y_true", "y_pred"],
    M14: ["id", "y_true", "y_pred"],
    M21: ["id", "y_true", "y_pred"],
    M22: ["id", "y_true", "y_pred"],
    M23: ["id", "y_true"],
  },
  multilabel: {
    M1: ["id", "y_true", "y_pred"],
    M2: ["id", "y_true", "y_pred"],
    M3: ["id", "y_true", "y_pred"],
    M4: ["id", "y_true", "y_pred"],
    M5: ["id", "y_true", "y_pred"],
    M11: ["id", "y_true", "y_pred"],
    M12: ["id", "y_true", "y_pred"],
    M13: ["id", "y_true", "y_pred"],
    M15: ["id", "y_true", "y_pred"],
    M16: ["id", "y_true", "y_pred"],
    M17: ["id", "y_true", "y_pred"],
    M18: ["id", "y_true", "y_pred"],
    M21: ["id", "y_true", "y_pred"],
    M22: ["id", "y_true", "y_pred"],
    M23: ["id", "y_true"],
  },
};

/**
 * task_type 별로 매핑 가능한 역할 (백엔드 app/core/schemas.py 의 VALID_ROLES_BY_TASK 와 대응).
 *
 * 매핑 화면 드롭다운의 선택지가 여기서 나온다. 여기에 없는 역할을 고르면
 * translateRoleToBackend 가 조용히 "ignore" 로 강등해버려서, 사용자는 매핑했다고 믿는데
 * 그 컬럼이 평가에서 통째로 빠진다. 그래서 애초에 선택지로 노출하지 않는다.
 * ("ignore" 는 모든 task 공통이라 여기 넣지 않고 드롭다운에서 따로 붙인다.)
 */
export const MAPPABLE_ROLES_BY_TASK: Record<TaskType, RequiredColumnCode[]> = {
  binary: ["id", "y_true", "y_pred", "score", "latency"],
  // multiclass/multilabel 은 확률 컬럼을 받지 않는다. 두 task 의 지표 중 확률을 읽는 것이
  // 하나도 없어 값을 주지 못하면서, 매핑되면 그 컬럼의 결측이 평가 표본을 깎고
  // 범위 이탈은 평가를 중단시킨다. 확률 기반 파생·지표가 생기면 그때 다시 넣는다.
  multiclass: ["id", "y_true", "y_pred", "latency"],
  multilabel: ["id", "y_true", "y_pred", "latency"],
};

const COLUMN_ORDER: RequiredColumnCode[] = [
  "id",
  "y_true",
  "y_pred",
  "score",
  "prob_class_*",
  "prob_label_*",
  "latency",
];

const COLUMN_DISPLAY: Record<RequiredColumnCode, RequiredColumnDisplay> = {
  id: {
    code: "id",
    label: "Sample ID",
    description: "A unique identifier for each sample.",
  },
  y_true: {
    code: "y_true",
    label: "Ground truth label",
    description: "The actual target value. For multi-label data, store the full set of true labels in one consistent format.",
  },
  y_pred: {
    code: "y_pred",
    label: "Predicted label",
    description: "The label predicted by the model. For multi-label data, store the full set of predicted labels in the same format as y_true.",
  },
  score: {
    code: "score",
    label: "Positive class score",
    description: "A model confidence score between 0 and 1.",
  },
  "prob_class_*": {
    code: "prob_class_*",
    label: "Per-class probabilities",
    description: "One probability column per class, for example prob_cat or prob_dog.",
  },
  "prob_label_*": {
    code: "prob_label_*",
    label: "Per-label probabilities",
    description: "One probability column per label.",
  },
  latency: {
    code: "latency",
    label: "Inference latency (ms)",
    description: "Optional. Per-sample inference time in milliseconds; used to report latency statistics (mean/p50/p95/p99).",
  },
};

export function getAvailableMetrics(taskType?: string): MetricDefinition[] {
  if (!taskType || !isTaskType(taskType)) {
    return METRICS;
  }

  return METRICS.filter((m) => m.supportedTaskTypes.includes(taskType));
}

export function getMetricDisplayId(metricId: string): string {
  return metricId;
}

export function getRecommendedMetricIds(taskType?: string): string[] {
  if (!taskType || !isTaskType(taskType)) {
    return [];
  }

  return RECOMMENDED_METRICS[taskType];
}

export function getSelectedMetrics(taskType: TaskType, selectedIds: string[]): MetricDefinition[] {
  const selectedSet = new Set(selectedIds);
  return getAvailableMetrics(taskType).filter((m) => selectedSet.has(m.id));
}

export function selectionRequiresProbability(taskType: TaskType, selectedIds: string[]): boolean {
  return getSelectedMetrics(taskType, selectedIds).some((m) => m.probabilityRequiredFor?.includes(taskType));
}

export function selectionNeedsField(taskType: TaskType, selectedIds: string[], field: AdditionalInputField): boolean {
  return getSelectedMetrics(taskType, selectedIds).some((m) => {
    if (!m.additionalFields?.includes(field)) {
      return false;
    }
    return field !== "positiveClass" || taskType === "binary";
  });
}

export function getUploadColumnGuide(taskType: TaskType, selectedIds: string[]): UploadColumnGuide {
  const onlyM23 = selectedIds.length > 0 && selectedIds.every((id) => id === "M23");
  const requiresProbability = selectionRequiresProbability(taskType, selectedIds);

  const probabilityColumn =
    taskType === "binary" ? "score" : taskType === "multiclass" ? "prob_class_*" : "prob_label_*";

  const alwaysRequired = ["id", "y_true"];
  const conditionallyRequired = onlyM23 ? [] : ["y_pred"];
  const optional = requiresProbability ? [] : [probabilityColumn];
  const notes = ["id values must be unique.", "Probability values must be between 0 and 1."];

  if (requiresProbability) {
    conditionallyRequired.push(probabilityColumn);
  }
  if (taskType === "multiclass") {
    notes.push("For multiclass probabilities, the per-row probability sum should be close to 1.");
  }
  if (taskType === "multilabel") {
    notes.push("Use a consistent label separator or one-hot label columns for multi-label data.");
  }
  if (onlyM23) {
    notes.push("M23 can be computed with dataset distribution only, so prediction columns are optional.");
  }

  return { alwaysRequired, conditionallyRequired, optional, notes };
}

export function getProbabilityColumnLabel(taskType: TaskType): string {
  if (taskType === "binary") {
    return "positive class score column";
  }
  if (taskType === "multiclass") {
    return "per-class probability columns (prob_class_*)";
  }
  return "per-label probability columns (prob_label_*)";
}

export function getRequiredColumnsForSelection(taskType: TaskType, selectedIds: string[]): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>();
  const mapping = REQUIRED_COLUMNS_BY_METRIC[taskType];

  for (const id of selectedIds) {
    for (const column of mapping[id] ?? []) {
      columns.add(column);
    }
  }

  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

export function getRequiredColumnsForMetric(taskType: TaskType, metricId: string): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>(REQUIRED_COLUMNS_BY_METRIC[taskType][metricId] ?? []);
  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

export function getRequiredColumnsForTaskType(taskType: TaskType): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>();
  const mapping = REQUIRED_COLUMNS_BY_METRIC[taskType];

  for (const metricColumns of Object.values(mapping)) {
    for (const column of metricColumns ?? []) {
      columns.add(column);
    }
  }

  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

function isTaskType(value: string): value is TaskType {
  return value === "binary" || value === "multiclass" || value === "multilabel";
}
