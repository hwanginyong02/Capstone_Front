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

export type RequiredColumnCode =
  | "id"
  | "y_true"
  | "y_pred"
  | "score"
  | "prob_class_*"
  | "true_labels"
  | "pred_labels"
  | "prob_label_*";

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

const REQUIRED_COLUMNS_BY_TC: Record<TaskType, Partial<Record<string, RequiredColumnCode[]>>> = {
  binary: {
    TC1: ["id", "y_true", "y_pred"],
    TC2: ["id", "y_true", "y_pred"],
    TC3: ["id", "y_true", "y_pred"],
    TC4: ["id", "y_true", "y_pred"],
    TC5: ["id", "y_true", "y_pred"],
    TC6: ["id", "y_true", "score"],
    TC7: ["id", "y_true", "y_pred"],
    TC8: ["id", "y_true", "y_pred"],
    TC9: ["id", "y_true", "score"],
    TC10: ["id", "y_true", "score"],
    TC19: ["id", "y_true", "score"],
    TC20: ["id", "y_true", "y_pred"],
    TC21: ["id", "y_true", "y_pred"],
    TC22: ["id", "y_true", "y_pred"],
    TC23: ["id", "y_true"],
  },
  multiclass: {
    TC1: ["id", "y_true", "y_pred"],
    TC2: ["id", "y_true", "y_pred"],
    TC3: ["id", "y_true", "y_pred"],
    TC4: ["id", "y_true", "y_pred"],
    TC5: ["id", "y_true", "y_pred"],
    TC6: ["id", "y_true", "prob_class_*"],
    TC11: ["id", "y_true", "y_pred"],
    TC12: ["id", "y_true", "y_pred"],
    TC13: ["id", "y_true", "y_pred"],
    TC14: ["id", "y_true", "y_pred"],
    TC21: ["id", "y_true", "y_pred"],
    TC22: ["id", "y_true", "y_pred"],
    TC23: ["id", "y_true"],
  },
  multilabel: {
    TC1: ["id", "true_labels", "pred_labels"],
    TC2: ["id", "true_labels", "pred_labels"],
    TC3: ["id", "true_labels", "pred_labels"],
    TC4: ["id", "true_labels", "pred_labels"],
    TC5: ["id", "true_labels", "pred_labels"],
    TC15: ["id", "true_labels", "pred_labels"],
    TC16: ["id", "true_labels", "pred_labels"],
    TC17: ["id", "true_labels", "pred_labels"],
    TC18: ["id", "true_labels", "pred_labels"],
    TC21: ["id", "true_labels", "pred_labels"],
    TC22: ["id", "true_labels", "pred_labels"],
    TC23: ["id", "true_labels"],
  },
};

const COLUMN_ORDER: RequiredColumnCode[] = [
  "id",
  "y_true",
  "true_labels",
  "y_pred",
  "pred_labels",
  "score",
  "prob_class_*",
  "prob_label_*",
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
    description: "The actual target value.",
  },
  y_pred: {
    code: "y_pred",
    label: "Predicted label",
    description: "The label predicted by the model.",
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
  true_labels: {
    code: "true_labels",
    label: "Ground truth labels",
    description: "Actual labels for multi-label data, for example sports|news.",
  },
  pred_labels: {
    code: "pred_labels",
    label: "Predicted labels",
    description: "Predicted labels for multi-label data, for example sports|news.",
  },
  "prob_label_*": {
    code: "prob_label_*",
    label: "Per-label probabilities",
    description: "One probability column per label.",
  },
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
  return getSelectedTestCases(taskType, selectedIds).some((tc) => tc.probabilityRequiredFor?.includes(taskType));
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
    taskType === "binary" ? "score" : taskType === "multiclass" ? "prob_class_*" : "prob_label_*";

  const alwaysRequired = taskType === "multilabel" ? ["id", "true_labels"] : ["id", "y_true"];
  const conditionallyRequired = onlyTc23 ? [] : [taskType === "multilabel" ? "pred_labels" : "y_pred"];
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
  if (onlyTc23) {
    notes.push("TC23 can be computed with dataset distribution only, so prediction columns are optional.");
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
  const mapping = REQUIRED_COLUMNS_BY_TC[taskType];

  for (const id of selectedIds) {
    for (const column of mapping[id] ?? []) {
      columns.add(column);
    }
  }

  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

export function getRequiredColumnsForTc(taskType: TaskType, tcId: string): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>(REQUIRED_COLUMNS_BY_TC[taskType][tcId] ?? []);
  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

function isTaskType(value: string): value is TaskType {
  return value === "binary" || value === "multiclass" || value === "multilabel";
}
