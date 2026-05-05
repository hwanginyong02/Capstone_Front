import {
  TASK_TYPE_LABELS,
  TEST_CASES,
  getRecommendedTestCaseIds,
  getSelectedTestCases,
  type TaskType,
} from "@/data/evaluationData";
import type {
  BasicInfoFormData,
  DatasetInfoFormData,
  TcDetailStateMap,
  UploadedFileInfo,
} from "@/types/workflow.types";
import type {
  ConfusionMatrixData,
  DiagnosticInsight,
  EvaluationReportData,
  PerClassMetric,
  ReportMetricResult,
  ReportRecommendation,
  ReportTestItem,
  ReportVerdict,
} from "@/types/report.types";

interface CreateEvaluationReportParams {
  basicInfo: BasicInfoFormData;
  datasetInfo: DatasetInfoFormData;
  taskType: TaskType | "";
  selectedTCIds: string[];
  tcDetails: TcDetailStateMap;
  uploadedFile: UploadedFileInfo | null;
}

const REPORT_ITEM_TEMPLATES: Record<
  string,
  Pick<ReportTestItem, "formula" | "thresholdLabel" | "description">
> = {
  TC1: {
    formula: "(TP + TN) / Total",
    thresholdLabel: ">= 85%",
    description: "Measures overall correctness across the evaluation dataset.",
  },
  TC2: {
    formula: "TP / (TP + FP)",
    thresholdLabel: ">= 80%",
    description: "Measures how reliable positive predictions are.",
  },
  TC3: {
    formula: "TP / (TP + FN)",
    thresholdLabel: ">= 80%",
    description: "Measures how often actual positives are recovered.",
  },
  TC4: {
    formula: "2PR / (P + R)",
    thresholdLabel: ">= 82%",
    description: "Balances precision and recall into a single score.",
  },
  TC5: {
    formula: "(1 + beta^2)PR / (beta^2P + R)",
    thresholdLabel: "Custom by beta",
    description: "Adjusts the precision/recall tradeoff with the selected beta.",
  },
  TC9: {
    formula: "Area under ROC curve",
    thresholdLabel: ">= 80%",
    description: "Evaluates ranking quality across operating thresholds.",
  },
  TC10: {
    formula: "Area under PR curve",
    thresholdLabel: ">= 75%",
    description: "Highlights precision and recall tradeoffs for positives.",
  },
  TC11: {
    formula: "Mean of class-wise metrics",
    thresholdLabel: ">= 80%",
    description: "Treats each class equally regardless of support.",
  },
  TC12: {
    formula: "Global TP/FP/FN aggregation",
    thresholdLabel: ">= 80%",
    description: "Computes a dataset-wide average over all predictions.",
  },
  TC13: {
    formula: "Support-weighted class mean",
    thresholdLabel: ">= 82%",
    description: "Weights class metrics by sample support.",
  },
  TC15: {
    formula: "Average label mismatch",
    thresholdLabel: "<= 12%",
    description: "Measures how frequently labels differ for multi-label samples.",
  },
  TC16: {
    formula: "Exact set match / total",
    thresholdLabel: ">= 70%",
    description: "Counts samples where the full label set matches exactly.",
  },
  TC17: {
    formula: "Intersection / Union",
    thresholdLabel: ">= 75%",
    description: "Measures overlap between predicted and actual label sets.",
  },
  TC19: {
    formula: "-1/N * sum(log p(y))",
    thresholdLabel: "<= 0.45",
    description: "Penalizes confident but incorrect probability outputs.",
  },
  TC20: {
    formula: "(TP*TN - FP*FN) / sqrt(...)",
    thresholdLabel: ">= 0.70",
    description: "A balanced correlation metric for binary classification.",
  },
  TC21: {
    formula: "Counts by actual x predicted label",
    thresholdLabel: "Informational",
    description: "Provides a structured breakdown of prediction errors.",
  },
  TC22: {
    formula: "Per-class precision / recall / F1",
    thresholdLabel: "Informational",
    description: "Breaks the evaluation down by class or label.",
  },
  TC23: {
    formula: "max class count / min class count",
    thresholdLabel: "<= 1.50",
    description: "Checks how balanced the evaluation data is.",
  },
};

const METRIC_TEMPLATE_VALUES: Record<string, { value: number; threshold: number; summary: string }> = {
  TC1: { value: 0.944, threshold: 0.85, summary: "Overall predictions are consistently correct." },
  TC2: { value: 0.931, threshold: 0.8, summary: "Positive predictions remain reliable across sampled outputs." },
  TC3: { value: 0.919, threshold: 0.8, summary: "Most positive cases are successfully detected." },
  TC4: { value: 0.925, threshold: 0.82, summary: "Precision and recall stay balanced without a major tradeoff." },
  TC5: { value: 0.917, threshold: 0.8, summary: "The configured beta-weighted score stays above the target band." },
  TC9: { value: 0.962, threshold: 0.8, summary: "Ranking quality remains stable across binary thresholds." },
  TC10: { value: 0.947, threshold: 0.75, summary: "Precision-recall behavior is strong for the positive class." },
  TC11: { value: 0.928, threshold: 0.8, summary: "Class-to-class performance variation stays controlled." },
  TC12: { value: 0.941, threshold: 0.8, summary: "The global aggregate remains strong at evaluation scale." },
  TC13: { value: 0.936, threshold: 0.82, summary: "Weighted performance stays strong on higher-support classes." },
  TC15: { value: 0.088, threshold: 0.12, summary: "Label mismatch remains within the acceptable band." },
  TC16: { value: 0.781, threshold: 0.7, summary: "Exact label-set matches are acceptable for the current dataset." },
  TC17: { value: 0.824, threshold: 0.75, summary: "Predicted label overlap stays comfortably above target." },
  TC19: { value: 0.318, threshold: 0.45, summary: "Probability outputs are reasonably calibrated." },
  TC20: { value: 0.812, threshold: 0.7, summary: "Balanced binary agreement remains solid." },
  TC23: { value: 1.14, threshold: 1.5, summary: "Evaluation samples are not heavily imbalanced." },
};

const FALLBACK_HIGHLIGHTED_METRICS: Record<TaskType, string[]> = {
  binary: ["TC1", "TC2", "TC3", "TC4"],
  multiclass: ["TC1", "TC2", "TC3", "TC4"],
  multilabel: ["TC1", "TC15", "TC16", "TC17"],
};

const HIGHLIGHTABLE_METRIC_IDS = new Set(Object.keys(METRIC_TEMPLATE_VALUES));

export function createEvaluationReport({
  basicInfo,
  datasetInfo,
  taskType,
  selectedTCIds,
  tcDetails,
  uploadedFile,
}: CreateEvaluationReportParams): EvaluationReportData {
  const resolvedTaskType = taskType || "multiclass";
  const resolvedSelectedIds =
    selectedTCIds.length > 0 ? selectedTCIds : getRecommendedTestCaseIds(resolvedTaskType);
  const selectedCases = getSelectedTestCases(resolvedTaskType, resolvedSelectedIds);
  const testItems = selectedCases.map((tc) => toReportTestItem(tc.id, tc.name, tc.subtitle));

  const classLabels = getClassLabels(resolvedTaskType, tcDetails);
  const trainingSamples = parseCount(datasetInfo.trainingSampleCount, 8715);
  const evaluationSamples = parseCount(datasetInfo.evaluationSampleCount, 1868);
  const totalSamples = trainingSamples + evaluationSamples;
  const highlightedMetricIds = resolveHighlightedMetricIds(resolvedTaskType, resolvedSelectedIds);
  const perClass = buildPerClassMetrics(classLabels, evaluationSamples);
  const metricResults = highlightedMetricIds.map((id) => buildMetricResult(id, perClass));
  const overallScore = getAverage(metricResults.map((metric) => normalizeMetricValue(metric)));
  const verdict = getVerdict(overallScore);
  const confusionMatrix = buildConfusionMatrix(resolvedTaskType, classLabels, evaluationSamples);
  const diagnostics = buildDiagnostics(perClass);
  const selectedMetricNames = selectedCases.map((tc) => tc.name);
  const summaryHeadline =
    verdict === "PASS"
      ? "The selected evaluation set is ready to be packaged into a report."
      : "The report is usable, but a few metrics still need closer review.";

  return {
    meta: {
      reportId: buildReportId(),
      title: basicInfo.projectName || "ML Evaluation Report",
      issuedAt: "2026-05-05",
      evaluationPeriod: {
        from: "2026-04-21",
        to: "2026-05-05",
      },
      taskTypeLabel: TASK_TYPE_LABELS[resolvedTaskType],
      purpose: basicInfo.reportPurpose || "Internal evaluation and deliverable review",
      projectName: basicInfo.projectName || "Untitled evaluation project",
      projectAgency: basicInfo.projectAgency || "Unassigned program owner",
      companyName: basicInfo.companyName || "Client company",
      representative: basicInfo.representative || "Representative pending",
      businessNumber: basicInfo.businessNumber || "Not provided",
      modelName: basicInfo.modelName || "Model name pending",
      versionName: basicInfo.versionName || "v1.0.0",
      modelPurpose: basicInfo.modelPurpose || "Model purpose pending",
      environment: {
        os: basicInfo.envOS || "Not recorded",
        cpu: basicInfo.envCPU || "Not recorded",
        gpu: basicInfo.envGPU || "Not recorded",
        memory: basicInfo.envMemory || "Not recorded",
        software: basicInfo.envSoftware || "Not recorded",
      },
      sourceFileName: uploadedFile?.name || "No source file attached yet",
    },
    dataset: {
      format: datasetInfo.datasetFormat || "CSV",
      sourceName: uploadedFile?.name || "Uploaded evaluation dataset",
      totalSamples,
      trainingSamples,
      evaluationSamples,
      classLabels,
      notes: [
        `${selectedMetricNames.length} selected test case(s) are included in this draft report.`,
        `Task type is configured as ${TASK_TYPE_LABELS[resolvedTaskType]}.`,
        uploadedFile
          ? `Source file ${uploadedFile.name} is connected to the evaluation flow.`
          : "A dataset file has not been attached yet, so this report uses fallback preview values.",
      ],
    },
    testItems,
    metricResults,
    confusionMatrix,
    diagnostics,
    summary: {
      verdict,
      overallScore,
      headline: summaryHeadline,
      narrative: buildNarrative(verdict, selectedMetricNames, resolvedTaskType),
      strengths: buildStrengths(metricResults, selectedMetricNames),
      weaknesses: buildWeaknesses(diagnostics, selectedCases.length === 0),
    },
    recommendations: buildRecommendations(resolvedTaskType, uploadedFile !== null, selectedCases.length),
  };
}

function toReportTestItem(id: string, name: string, subtitle: string): ReportTestItem {
  const template = REPORT_ITEM_TEMPLATES[id];

  return {
    id,
    name,
    subtitle,
    formula: template?.formula || "Defined by selected evaluation protocol",
    thresholdLabel: template?.thresholdLabel || "Defined during setup",
    description: template?.description || subtitle,
  };
}

function resolveHighlightedMetricIds(taskType: TaskType, selectedTCIds: string[]) {
  const selectedMetricIds = selectedTCIds.filter((id) => HIGHLIGHTABLE_METRIC_IDS.has(id));
  if (selectedMetricIds.length > 0) {
    return selectedMetricIds.slice(0, 4);
  }
  return FALLBACK_HIGHLIGHTED_METRICS[taskType];
}

function buildMetricResult(metricId: string, perClass: PerClassMetric[]): ReportMetricResult {
  const template = METRIC_TEMPLATE_VALUES[metricId] || {
    value: 0.9,
    threshold: 0.8,
    summary: "The selected metric remains within the expected operating band.",
  };

  return {
    metricId,
    metricName: TEST_CASES.find((tc) => tc.id === metricId)?.name || metricId,
    value: template.value,
    threshold: template.threshold,
    summary: template.summary,
    status: meetsThreshold(metricId, template.value, template.threshold) ? "pass" : "warning",
    perClass: metricId === "TC1" || metricId === "TC4" || metricId === "TC11" || metricId === "TC13" ? perClass : undefined,
  };
}

function buildPerClassMetrics(classLabels: string[], evaluationSamples: number): PerClassMetric[] {
  const baseSupports = distributeSupport(evaluationSamples || 1800, classLabels.length);

  return classLabels.map((className, index) => {
    const precision = Math.max(0.84, 0.95 - index * 0.013);
    const recall = Math.max(0.82, 0.94 - index * 0.016);
    const f1Score = Number((((precision + recall) / 2) * 100)) / 100;

    return {
      className,
      precision,
      recall,
      f1Score,
      support: baseSupports[index],
      status: recall >= 0.88 ? "pass" : "warning",
    };
  });
}

function buildConfusionMatrix(
  taskType: TaskType,
  classLabels: string[],
  totalSamples: number,
): ConfusionMatrixData | null {
  if (taskType === "multilabel") {
    return null;
  }

  if (taskType === "binary") {
    return {
      labels: ["Negative", "Positive"],
      matrix: [
        [864, 41],
        [57, 906],
      ],
      totalSamples: totalSamples || 1868,
    };
  }

  const labels = classLabels.slice(0, 4);
  return {
    labels,
    matrix: [
      [402, 14, 9, 6],
      [17, 388, 11, 8],
      [9, 18, 365, 12],
      [7, 10, 15, 392],
    ],
    totalSamples: totalSamples || 1868,
  };
}

function buildDiagnostics(perClass: PerClassMetric[]): DiagnosticInsight[] {
  return perClass.map((metric, index) => ({
    className: metric.className,
    precision: metric.precision,
    recall: metric.recall,
    f1Score: metric.f1Score,
    support: metric.support,
    severity: metric.recall >= 0.88 ? "good" : "warning",
    topConfusion: {
      confusedWith: perClass[(index + 1) % perClass.length]?.className || perClass[0]?.className || "N/A",
      count: 8 + index * 3,
      rate: 0.017 + index * 0.005,
    },
    observation:
      metric.recall >= 0.88
        ? `${metric.className} remains stable and does not show a notable recall drop in this preview dataset.`
        : `${metric.className} shows the lowest recall in the preview set, so it is the best candidate for deeper class-level review.`,
  }));
}

function buildStrengths(metricResults: ReportMetricResult[], selectedMetricNames: string[]) {
  const passedMetrics = metricResults.filter((metric) => metric.status === "pass");
  return [
    `${passedMetrics.length} highlighted metric(s) are above their configured threshold in this draft.`,
    selectedMetricNames.length > 0
      ? `The report is aligned with the selected evaluation scope: ${selectedMetricNames.slice(0, 4).join(", ")}.`
      : "The report still renders a coherent structure even before metric selection is completed.",
    "Sectioned report components are now separated from workflow state, which makes future API binding safer.",
  ];
}

function buildWeaknesses(diagnostics: DiagnosticInsight[], usedFallbackSelection: boolean) {
  const lowestRecall = [...diagnostics].sort((a, b) => a.recall - b.recall)[0];

  return [
    lowestRecall
      ? `${lowestRecall.className} has the weakest recall in the current preview and should be checked against data balance or labeling quality.`
      : "Class-level weaknesses are not available yet.",
    usedFallbackSelection
      ? "No explicit test case selection was present, so the report relies on the recommended default metric set."
      : "The current report still uses preview values for final metric computation until backend integration is connected.",
    "Dataset counts and report narrative are partially synthesized from workflow inputs, so final export should still be verified against the API response.",
  ];
}

function buildRecommendations(
  taskType: TaskType,
  hasUploadedFile: boolean,
  selectedCount: number,
): ReportRecommendation[] {
  return [
    {
      priority: "HIGH",
      category: "Data Binding",
      action: hasUploadedFile
        ? "Replace the draft metric payload with the real backend evaluation response for export."
        : "Attach the evaluation dataset and connect this step to the uploaded source file before export.",
      expectedImpact: "Moves the report from preview mode into a verifiable deliverable.",
    },
    {
      priority: "MEDIUM",
      category: "Workflow Consistency",
      action:
        selectedCount > 0
          ? "Preserve the selected test case list as the single source of truth for both preview and report rendering."
          : "Prompt the reviewer to confirm the recommended default test case set before final export.",
      expectedImpact: "Keeps preview cards and final report sections aligned.",
    },
    {
      priority: taskType === "binary" ? "LOW" : "MEDIUM",
      category: "Diagnostic Depth",
      action:
        taskType === "multilabel"
          ? "Add label-frequency and threshold diagnostics tailored to multi-label evaluation."
          : "Add API-driven per-class error slices so the diagnostic narrative is evidence-backed.",
      expectedImpact: "Improves confidence in the qualitative review section.",
    },
  ];
}

function getClassLabels(taskType: TaskType, tcDetails: TcDetailStateMap) {
  if (taskType === "binary") {
    const positiveClass = Object.values(tcDetails).find((detail) => detail.positiveClass)?.positiveClass;
    return ["Negative", positiveClass || "Positive"];
  }

  if (taskType === "multilabel") {
    return ["Label A", "Label B", "Label C", "Label D"];
  }

  return ["Class A", "Class B", "Class C", "Class D"];
}

function buildNarrative(verdict: ReportVerdict, selectedMetricNames: string[], taskType: TaskType) {
  const metricText =
    selectedMetricNames.length > 0 ? selectedMetricNames.join(", ") : "the recommended default metric set";
  const verdictText =
    verdict === "PASS"
      ? "The draft report is internally consistent and ready for final data binding."
      : verdict === "CONDITIONAL_PASS"
      ? "The report is structurally ready, but some values should be verified before export."
      : "The report needs additional review before it should be shared externally.";

  return `${verdictText} This ${TASK_TYPE_LABELS[taskType]} workflow currently reflects ${metricText}, and the final wording can be kept while swapping preview metrics for backend results.`;
}

function getVerdict(score: number): ReportVerdict {
  if (score >= 0.9) {
    return "PASS";
  }
  if (score >= 0.82) {
    return "CONDITIONAL_PASS";
  }
  return "FAIL";
}

function normalizeMetricValue(metric: ReportMetricResult) {
  return toMetricScore(metric.metricId, metric.value, metric.threshold);
}

function meetsThreshold(metricId: string, value: number, threshold: number) {
  if (metricId === "TC15" || metricId === "TC19" || metricId === "TC23") {
    return value <= threshold;
  }
  return value >= threshold;
}

function toMetricScore(metricId: string, value: number, threshold: number) {
  if (metricId === "TC15" || metricId === "TC19" || metricId === "TC23") {
    return Math.max(0, Math.min(1, threshold / Math.max(value, threshold)));
  }
  return Math.max(0, Math.min(1, value));
}

function parseCount(value: string, fallback: number) {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function distributeSupport(totalSamples: number, bucketCount: number) {
  const base = Math.floor(totalSamples / bucketCount);
  const remainder = totalSamples % bucketCount;

  return Array.from({ length: bucketCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function buildReportId() {
  return "REP-20260505-01";
}
