/**
 * 랜딩 페이지 정적 콘텐츠 데이터.
 * LandingPage 및 하위 landing 컴포넌트(ReportPreview, ScreenShowcase)에서 사용한다.
 */
export const reportHighlights = [
  {
    title: "Evaluation overview",
    description:
      "Model information, evaluation purpose, dataset summary, and test environment are organized at the top of the report.",
  },
  {
    title: "Metric results",
    description:
      "Selected metrics show target criteria, measured values, pass status, and charts reviewers can inspect quickly.",
  },
  {
    title: "Validation and recommendations",
    description:
      "Data validation results, interpretation, conclusions, and recommended actions are included in the same document.",
  },
];

export const showcaseScreens = [
  {
    step: "01",
    title: "Evaluation setup",
    description:
      "Start by defining the model, evaluation purpose, task type, and environment so every following step uses the right context.",
    route: "/app/basic-info",
    highlight: "Task type and model information shape the metric set and report structure.",
  },
  {
    step: "02",
    title: "Metric selection",
    description:
      "Choose the performance metrics that matter for the model, from Accuracy and Precision to Recall, F1 Score, AUROC, and class-wise checks.",
    route: "/app/metrics",
    highlight: "Selected metrics become the evaluation criteria used throughout validation and reporting.",
  },
  {
    step: "03",
    title: "Data upload",
    description:
      "Upload evaluation data with fields like id, y_true, y_pred, and score so the system can compare the correct answer with the model prediction.",
    route: "/app/data-upload",
    highlight: "The same step also records the training dataset used to build the model, including sample counts and representative examples.",
  },
  {
    step: "04",
    title: "Data validation",
    description:
      "Check whether the uploaded data is ready for evaluation before any score is calculated.",
    route: "/app/data-validation",
    highlight: "Validation reviews required columns, missing values, label formats, prediction values, score ranges, and metric-specific rules.",
  },
] as const;

export type ShowcaseScreen = (typeof showcaseScreens)[number];
