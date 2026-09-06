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
  { id: "M18", higherIsBetter: false, name: "Distribution Diff (ML)", subtitle: "Label distribution gap", description: "Compares actual and predicted label distributions.", supportedTaskTypes: ["multilabel"], formula: "1 - cos(freq(y_true), freq(y_pred))" },
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

/**
 * 지표별 요구 컬럼 — 백엔드 `METRIC_REQUIREMENTS`(app/core/schemas.py)와 대응한다.
 *
 * **`id`(sample_id)는 여기 들어가지 않는다.** SPEC §0 이 '선택(권장)'으로 규정하고
 * 백엔드 요구표에도 sample_id 가 한 번도 없는데, 종전에는 43개 항목이 전부 "id" 로
 * 시작해 매핑 화면이 '다음'을 하드 차단했다 — id 컬럼이 없는 데이터셋은 백엔드까지
 * 가보지도 못했다(ISSUES.md A-13). id 는 여전히 매핑 **가능**하고 중복 검사에 쓰인다.
 */
const REQUIRED_COLUMNS_BY_METRIC: Record<TaskType, Partial<Record<string, RequiredColumnCode[]>>> = {
  binary: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M7: ["y_true", "y_pred"],
    M8: ["y_true", "y_pred"],
    M9: ["y_true", "score"],
    M10: ["y_true", "score"],
    M19: ["y_true", "score"],
    M20: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multiclass: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M11: ["y_true", "y_pred"],
    M12: ["y_true", "y_pred"],
    M13: ["y_true", "y_pred"],
    M14: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multilabel: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M11: ["y_true", "y_pred"],
    M12: ["y_true", "y_pred"],
    M13: ["y_true", "y_pred"],
    M15: ["y_true", "y_pred"],
    M16: ["y_true", "y_pred"],
    M17: ["y_true", "y_pred"],
    M18: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
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
  // 확률 컬럼은 세 task 모두에서 정식 입력이다(2026-09-07 결정 1). 하드 예측이 없으면
  // 백엔드가 확률에서 예측을 파생한다 — binary 는 임계값, multiclass 는 argmax,
  // multilabel 은 레이블별 임계값. PREDICTION_ROLE_ALTERNATIVES 참조.
  multiclass: ["id", "y_true", "y_pred", "prob_class_*", "latency"],
  multilabel: ["id", "y_true", "y_pred", "prob_label_*", "latency"],
};

/**
 * 예측 역할을 대신할 수 있는 확률 역할 — 백엔드 `PREDICTION_ROLES_BY_TASK`
 * (Capstone_Back/app/core/schemas.py)의 거울이다. 두 표가 어긋나면 화면이 허용한
 * 매핑을 백엔드가 거절하거나 그 반대가 된다(metricColumnContract.test.ts 가 고정).
 *
 * **왜 별도 표인가.** `REQUIRED_COLUMNS_BY_METRIC` 의 값은 배열(AND 의미)이라
 * SPEC §1~§3 이 규정한 "y_pred **또는** 확률"이라는 택일을 담을 수 없다. 택일을
 * 이 표 하나로 분리해 요구표는 그대로 두고, 누락 판정만 이 규칙을 통과시킨다.
 */
export const PREDICTION_ROLE_ALTERNATIVES: Record<
  TaskType,
  { primary: RequiredColumnCode; alternatives: RequiredColumnCode[] }
> = {
  binary: { primary: "y_pred", alternatives: ["score"] },
  multiclass: { primary: "y_pred", alternatives: ["prob_class_*"] },
  multilabel: { primary: "y_pred", alternatives: ["prob_label_*"] },
};

/**
 * 요구 역할 중 실제로 배정되지 않은 것.
 *
 * 예측 역할은 확률 역할이 배정돼 있으면 충족된 것으로 본다 — 백엔드가 확률에서
 * 예측을 파생하기 때문이다(ISSUES.md A-01·A-02). 종전에는 단순히 개수 0 만 봐서,
 * 확률만 가진 사용자가 '다음' 버튼이 눌리지 않아 백엔드까지 가보지도 못했다.
 */
export function resolveMissingRoleCodes(
  taskType: TaskType,
  requiredCodes: readonly RequiredColumnCode[] | readonly string[],
  roleCounts: Record<string, number>,
): string[] {
  const { primary, alternatives } = PREDICTION_ROLE_ALTERNATIVES[taskType];
  const has = (code: string) => (roleCounts[code] ?? 0) > 0;

  return requiredCodes.filter((code) => {
    if (has(code)) return false;
    if (code === primary && alternatives.some(has)) return false;
    return true;
  }) as string[];
}

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
