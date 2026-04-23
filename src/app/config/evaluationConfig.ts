export type TaskType = "binary" | "multiclass" | "multilabel";

export type AdditionalInputField = "beta" | "positiveClass";

export interface TestCaseDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  supportedTaskTypes: TaskType[];
  additionalFields?: AdditionalInputField[];
  probabilityRequiredFor?: TaskType[];
}

export interface UploadColumnGuide {
  alwaysRequired: string[];
  conditionallyRequired: string[];
  optional: string[];
  notes: string[];
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  binary: "Binary",
  multiclass: "Multi-class",
  multilabel: "Multi-label",
};

export const TEST_CASES: TestCaseDefinition[] = [
  { id: "TC1", name: "Accuracy", subtitle: "Overall correctness", description: "Measures how often the classifier predicts the correct result.", supportedTaskTypes: ["binary", "multiclass", "multilabel"] },
  { id: "TC2", name: "Precision", subtitle: "Positive predictive value", description: "Among predicted positives, measures how many are actually positive.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"] },
  { id: "TC3", name: "Recall", subtitle: "Sensitivity", description: "Measures how many true positives are successfully detected.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"] },
  { id: "TC4", name: "F1 Score", subtitle: "Harmonic mean", description: "Balances precision and recall in a single metric.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"] },
  { id: "TC5", name: "F-beta Score", subtitle: "Weighted F score", description: "Adjusts the balance between precision and recall using beta.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["beta", "positiveClass"] },
  { id: "TC6", name: "KL Divergence", subtitle: "Distribution divergence", description: "Compares the true distribution and predicted probability distribution.", supportedTaskTypes: ["binary", "multiclass"], probabilityRequiredFor: ["binary", "multiclass"] },
  { id: "TC7", name: "Specificity", subtitle: "True negative rate", description: "Measures how many true negatives are correctly predicted.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"] },
  { id: "TC8", name: "FPR", subtitle: "False positive rate", description: "Measures how often negatives are incorrectly marked positive.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"] },
  { id: "TC9", name: "AUROC", subtitle: "ROC area", description: "Measures ranking quality across classification thresholds.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"] },
  { id: "TC10", name: "AUPRC", subtitle: "PR area", description: "Measures precision-recall tradeoff across thresholds.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"] },
  { id: "TC11", name: "Macro Average", subtitle: "Unweighted class average", description: "Averages class metrics equally across classes.", supportedTaskTypes: ["multiclass"] },
  { id: "TC12", name: "Micro Average", subtitle: "Global average", description: "Computes metrics over the full set of samples.", supportedTaskTypes: ["multiclass"] },
  { id: "TC13", name: "Weighted Average", subtitle: "Support-weighted average", description: "Averages class metrics using class support as weights.", supportedTaskTypes: ["multiclass"] },
  { id: "TC14", name: "Distribution Diff (MC)", subtitle: "Class distribution gap", description: "Compares actual and predicted class distributions.", supportedTaskTypes: ["multiclass"] },
  { id: "TC15", name: "Hamming Loss", subtitle: "Label mismatch ratio", description: "Measures label-wise disagreement in multi-label classification.", supportedTaskTypes: ["multilabel"] },
  { id: "TC16", name: "Exact Match Ratio", subtitle: "Strict set match", description: "Counts samples where all labels exactly match.", supportedTaskTypes: ["multilabel"] },
  { id: "TC17", name: "Jaccard Index", subtitle: "Set overlap score", description: "Measures intersection over union of predicted and actual labels.", supportedTaskTypes: ["multilabel"] },
  { id: "TC18", name: "Distribution Diff (ML)", subtitle: "Label distribution gap", description: "Compares actual and predicted label distributions.", supportedTaskTypes: ["multilabel"] },
  { id: "TC19", name: "Log Loss", subtitle: "Probabilistic error", description: "Penalizes confident but wrong probabilistic predictions.", supportedTaskTypes: ["binary"], probabilityRequiredFor: ["binary"] },
  { id: "TC20", name: "MCC", subtitle: "Balanced correlation", description: "A robust binary metric that considers all confusion matrix cells.", supportedTaskTypes: ["binary"] },
  { id: "TC21", name: "Confusion Matrix", subtitle: "Prediction matrix", description: "Shows actual versus predicted counts by class or label.", supportedTaskTypes: ["binary", "multiclass", "multilabel"] },
  { id: "TC22", name: "Class-wise Metric", subtitle: "Per-class detail", description: "Breaks down metrics for each class or label.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"] },
  { id: "TC23", name: "Imbalance Ratio", subtitle: "Class balance check", description: "Measures the balance of the evaluation dataset itself.", supportedTaskTypes: ["binary", "multiclass", "multilabel"] },
];

const RECOMMENDED_TCS: Record<TaskType, string[]> = {
  binary: ["TC1", "TC2", "TC3", "TC4", "TC9", "TC21", "TC22", "TC23"],
  multiclass: ["TC1", "TC2", "TC3", "TC4", "TC11", "TC21", "TC22", "TC23"],
  multilabel: ["TC1", "TC2", "TC3", "TC4", "TC15", "TC21", "TC22", "TC23"],
};

export function getAvailableTestCases(taskType?: string): TestCaseDefinition[] {
  if (!taskType || !isTaskType(taskType)) {
    return TEST_CASES;
  }

  return TEST_CASES.filter((tc) => tc.supportedTaskTypes.includes(taskType));
}

export function getRecommendedTestCaseIds(taskType?: string): string[] {
  if (!taskType || !isTaskType(taskType)) {
    return [];
  }

  return RECOMMENDED_TCS[taskType];
}

export function getSelectedTestCases(taskType: TaskType, selectedIds: string[]): TestCaseDefinition[] {
  const selectedSet = new Set(selectedIds);
  return getAvailableTestCases(taskType).filter((tc) => selectedSet.has(tc.id));
}

export function selectionRequiresProbability(taskType: TaskType, selectedIds: string[]): boolean {
  return getSelectedTestCases(taskType, selectedIds).some(
    (tc) => tc.probabilityRequiredFor?.includes(taskType),
  );
}

export function selectionNeedsField(taskType: TaskType, selectedIds: string[], field: AdditionalInputField): boolean {
  return getSelectedTestCases(taskType, selectedIds).some((tc) => {
    if (!tc.additionalFields?.includes(field)) {
      return false;
    }

    return field !== "positiveClass" || taskType === "binary";
  });
}

export function getUploadColumnGuide(taskType: TaskType, selectedIds: string[]): UploadColumnGuide {
  const onlyTc23 = selectedIds.length > 0 && selectedIds.every((id) => id === "TC23");
  const requiresProbability = selectionRequiresProbability(taskType, selectedIds);

  const probabilityColumn =
    taskType === "binary"
      ? "score"
      : taskType === "multiclass"
        ? "prob_class_*"
        : "prob_label_*";

  const alwaysRequired = ["id", "y_true"];
  const conditionallyRequired = onlyTc23 ? [] : ["y_pred"];
  const optional = requiresProbability ? [] : [probabilityColumn];
  const notes = [
    "id values must be unique.",
    "Probability values must be between 0 and 1.",
  ];

  if (requiresProbability) {
    conditionallyRequired.push(probabilityColumn);
  }

  if (taskType === "multiclass") {
    notes.push("For multiclass probabilities, the per-row probability sum should be close to 1.");
  }

  if (taskType === "multilabel") {
    notes.push("Use a consistent label separator or one-hot label columns for multi-label data.");
  }

  if (onlyTc23) {
    notes.push("TC23 can be computed with dataset distribution only, so y_pred is optional.");
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

function isTaskType(value: string): value is TaskType {
  return value === "binary" || value === "multiclass" || value === "multilabel";
}
