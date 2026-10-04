/**
 * 재료 레지스트리 — 성적서 구성 화면의 단일 출처.
 *
 * `docs/COMPOSER_COMPONENTS.md` 의 카드 9개(필수 5개, 선택 4개)와 그 안의 필드를 코드가 읽는
 * 설정으로 옮긴 것이다. 구성 화면의 카드·상세 영역·하단 요약, 단계 목록 계산, 필수 입력
 * 점검이 전부 이 파일 하나를 읽는다 — 같은 표를 여러 군데 베껴 두면 문서와 화면이 조용히
 * 어긋난다.
 *
 * 쓰는 곳: `components/report-composer/*`(구성 화면), `data/workflowSteps.ts`·
 * `utils/domain/workflowSteps.ts`(단계 목록), `utils/domain/composerFieldGate.ts`(필수 점검).
 *
 * **지표 목록은 여기 두지 않는다.** ② 의 "고를 수 있는 지표"는 `getAvailableMetrics` 가
 * 유일한 출처다(`data/evaluationData.ts`). SPEC.md 와 두 벌이 되면 한쪽만 고쳐질 수 있다.
 */
import { getAvailableMetrics, type MetricDefinition, type TaskType } from "./evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerField,
  ComposerPreset,
  ComposerSelection,
  OptionalCardId,
} from "../types/reportComposer.types";

/**
 * 카드 9개. 배열 순서가 화면 순서다(필수 ①~⑤ 한 줄, 선택 ⑥~⑨ 한 줄).
 *
 * 카드와 필드를 나눈 기준(COMPOSER_COMPONENTS "카드를 나눈 기준"):
 * 성적서의 절이나 표가 생기고 사라지면 **카드**, 같은 칸의 내용만 바뀌면 **필드**다.
 */
export const COMPOSER_CARDS: ComposerCard[] = [
  // ─── 필수 카드 ①~⑤ — 잠겨 있어 뺄 수 없다 ────────────────────────────────
  {
    id: "evalData",
    number: "①",
    name: "Evaluation data",
    description: "Upload the file your model produced.",
    locked: true,
    viewer: "csvExample",
    // 파일은 1단계에서 받고, 컬럼 매핑·양성 클래스·결정 임계값은 4단계에서 확인한다.
    steps: ["upload", "mapping"],
    fields: [
      {
        id: "resultFile",
        label: "Result file",
        inputExample: "predictions.csv (CSV or JSON, up to 20 MiB)",
        kind: "required",
        input: "file",
        mono: true,
        step: "upload",
        reportSection: "4절",
      },
    ],
  },
  {
    id: "metrics",
    number: "②",
    name: "Metrics and pass criteria",
    description: "What to measure, and the target each measure must reach.",
    locked: true,
    viewer: "metricList",
    steps: ["metrics"],
    fields: [
      {
        id: "selectedMetrics",
        label: "Metrics",
        inputExample: "See the metric list below",
        kind: "required",
        input: "metricSelect",
        reportSection: "3절",
        sentToAi: true,
      },
      {
        id: "passCriteria",
        label: "Pass criteria",
        inputExample: "Accuracy ≥ 0.85",
        kind: "required",
        input: "entries",
        entryKeysFrom: "metrics",
        mono: true,
        reportSection: "6절",
        sentToAi: true,
      },
      {
        id: "beta",
        label: "β",
        inputExample: "1.0",
        kind: "conditional",
        conditionLabel: "When Fβ is chosen",
        input: "number",
        mono: true,
        reportSection: "6절",
      },
      {
        // 멀티레이블에서만 묻는다. 세 지표군의 뜻이 서로 달라 고른 이유를 성적서에 적는다.
        id: "metricRationale",
        label: "Reason for this choice",
        inputExample: "Errors weighted evenly / Every label must match / Degree of overlap",
        kind: "required",
        taskTypes: ["multilabel"],
        input: "single",
        choices: ["Errors weighted evenly", "Every label must match", "Degree of overlap"],
        reportSection: "3절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "clientInfo",
    number: "③",
    name: "Client information",
    description: "Who the report is for, and what it is for.",
    locked: true,
    steps: ["clientInfo"],
    fields: [
      {
        id: "companyInfo",
        label: "Company",
        inputExample:
          "Company: Test Corp · Representative: Hong Gil-dong · " +
          "Business number: 123-45-67890 · Phone: 02-1234-5678 · Address: Seoul …",
        kind: "required",
        input: "text",
        reportSection: "1절",
      },
      {
        id: "reportPurpose",
        label: "Report purpose",
        inputExample: "Internal review / External submission / Project submission",
        kind: "required",
        input: "single",
        choices: ["Internal review", "External submission", "Project submission"],
        reportSection: "1절",
      },
      {
        id: "projectInfo",
        label: "Project",
        inputExample: "Project name · Project agency",
        kind: "conditional",
        conditionLabel: "When submitting to a project",
        requiredWhen: { field: "reportPurpose", equals: "Project submission" },
        input: "text",
        reportSection: "1절",
      },
      {
        id: "contactExtra",
        label: "Website and fax",
        inputExample: "https://example.com · 02-1234-5679",
        kind: "optional",
        input: "text",
        advanced: true,
        reportSection: "1절",
      },
      {
        id: "projectNumber",
        label: "Project number",
        inputExample: "2026-PRJ-001",
        kind: "optional",
        input: "text",
        advanced: true,
        mono: true,
        reportSection: "1절",
      },
      {
        id: "requestDate",
        label: "Request date",
        inputExample: "Today by default",
        kind: "optional",
        input: "date",
        advanced: true,
        reportSection: "1절",
      },
    ],
  },
  {
    id: "model",
    number: "④",
    name: "Model under test",
    description: "What the model is called, and what it is for.",
    locked: true,
    // 이름·버전은 평가 결과를 식별하는 이름표라 1단계에서, 용도는 성적서 서식용이라 9단계에서.
    steps: ["upload", "clientInfo"],
    fields: [
      {
        id: "modelNameVersion",
        label: "Model name and version",
        inputExample: "Name: ChurnPredictor · Version: v1.0.0 (defaults to v1.0.0)",
        kind: "required",
        input: "text",
        mono: true,
        step: "upload",
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "modelPurpose",
        label: "Model purpose",
        inputExample: "Predicts telecom customer churn",
        kind: "required",
        input: "text",
        step: "clientInfo",
        reportSection: "2절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "perspective",
    number: "⑤",
    name: "Evaluation perspective",
    description: "What matters most for this model.",
    locked: true,
    // 단계가 따로 없다 — 지표 선택 화면 맨 위에서 받는다(docs/WORKFLOW_REDESIGN.md §10).
    steps: ["metrics"],
    help:
      "Your answers suggest suitable metrics, and the metric step warns you if the metrics you " +
      "picked do not match. It never blocks you from moving on.",
    // 유형에 따라 필드가 갈리지만 사용자는 **항상 두 개**를 받는다.
    fields: [
      {
        id: "criticalErrorType",
        label: "Critical error type",
        inputExample: "Missed (FN) / False alarm (FP) / Similar",
        kind: "required",
        taskTypes: ["binary"],
        input: "single",
        choices: ["Missed (FN)", "False alarm (FP)", "Similar"],
        help:
          "Picking Missed suggests Recall or Fβ with β greater than 1; picking False alarm " +
          "suggests Precision or Fβ with β less than 1.",
        standardClause: "6.2.6",
        reportSection: "5절",
        sentToAi: true,
      },
      {
        id: "classPriority",
        label: "Class priority",
        inputExample: "All equal / Larger classes first / Individual samples first",
        kind: "required",
        taskTypes: ["multiclass", "multilabel"],
        input: "single",
        choices: ["All equal", "Larger classes first", "Individual samples first"],
        help: "These map to macro, weighted, and micro averaged metrics in that order.",
        standardClause: "6.4.3",
        reportSection: "5절",
        sentToAi: true,
      },
      {
        id: "usageMode",
        label: "Usage mode",
        inputExample: "Real-time / Batch",
        kind: "required",
        input: "single",
        choices: ["Real-time", "Batch"],
        help: "Picking Real-time checks whether your file has a latency column.",
        standardClause: "6.6.2",
        reportSection: "5절",
        sentToAi: true,
      },
    ],
  },

  // ─── 선택 카드 ⑥~⑨ — 끄면 안의 필수 항목이 "제공되지 않음"으로 찍힌다 ─────────
  {
    id: "trainingData",
    number: "⑥",
    name: "Training data",
    description: "The data the model learned from.",
    locked: false,
    steps: ["dataInfo"],
    help:
      "Collection differences ask whether data of the same class was gathered with different " +
      "equipment, processing, people or surroundings (TS 4213 5.3.8, channel effects). " +
      "Imbalance handling asks what you did about classes with far more samples than others " +
      "(TS 4213 clause 8).",
    fields: [
      {
        id: "trainingDatasetName",
        label: "Dataset name",
        inputExample: "Customer logs 2024",
        kind: "required",
        input: "text",
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
        legacy: { target: "datasetInfo", field: "trainingDatasetName" },
      },
      {
        /**
         * ⑦ 의 데이터 출처와 **다른 데이터셋**이다 — 이쪽은 모델을 훈련할 때 쓴 데이터,
         * 저쪽은 성능을 잰 테스트 데이터다. 둘이 같은지는 ⑦ 의 "학습 데이터와 출처 관계"가
         * 따로 묻는다(같으면 점수가 실제보다 좋게 나올 수 있다).
         */
        id: "trainingDataSource",
        label: "Data source",
        inputExample: "Internal CRM logs (free text)",
        kind: "required",
        input: "text",
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingVolume",
        label: "Sample counts",
        inputExample: "Training 12,000 · Validation 3,000",
        kind: "required",
        input: "entries",
        entryKeys: ["Training", "Validation"],
        mono: true,
        numeric: true,
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
        legacy: {
          target: "datasetInfo",
          byKey: { Training: "trainingSampleCount", Validation: "validationSampleCount" },
        },
      },
      {
        id: "trainingClassVolume",
        label: "Samples per class",
        inputExample: "Normal 8,400 / Churn 3,600 (one box per class found in the file)",
        kind: "required",
        input: "entries",
        entryKeysFrom: "classes",
        mono: true,
        numeric: true,
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
        // 칸이 클래스마다 생기므로 byKey 로 짝지을 수 없다. 한 줄로 합쳐 넘긴다.
        legacy: { target: "datasetInfo", field: "trainingClassDistribution" },
      },
      {
        id: "channelEffects",
        label: "Collection differences",
        inputExample:
          "None known / Equipment / Processing / Collectors / Surroundings / Other (choose any)",
        kind: "required",
        input: "multi",
        choices: [
          "None known",
          "Different equipment",
          "Different processing",
          "Different collectors",
          "Different surroundings",
          "Other (free text)",
        ],
        // "None known" 은 원문이 요구하는 답이라 **제공된 것으로 센다**. "모름"과 다르다.
        exclusiveChoice: "None known",
        help:
          "Whether data of the same class was gathered with different equipment, processing, " +
          "people or surroundings. There can be more than one.",
        standardClause: "5.3.8",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "imbalanceHandling",
        label: "Imbalance handling",
        inputExample: "Balanced the counts / Widened the sources / Did nothing",
        kind: "required",
        input: "single",
        choices: ["Balanced the counts", "Widened the sources", "Did nothing"],
        allowsUnknown: true,
        help: "What you did about classes that held far more samples than others.",
        standardClause: "8절",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingPeriod",
        label: "Collection period",
        inputExample: "2023-01 ~ 2024-12",
        kind: "optional",
        input: "date",
        advanced: true,
        mono: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "preprocessing",
        label: "Preprocessing",
        inputExample: "Dropped missing values, normalized (free text)",
        kind: "optional",
        input: "text",
        advanced: true,
        reportSection: "7절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "testData",
    number: "⑦",
    name: "Test data",
    description: "Where the data you measured on came from.",
    locked: false,
    steps: ["dataInfo"],
    // 건수와 클래스별 건수는 올린 파일에서 시스템이 세므로 사용자에게 묻지 않는다.
    help:
      "If it came from the same place as the training data the scores can look better than " +
      "they are, so the report says so.",
    fields: [
      {
        id: "testDataSource",
        label: "Data source",
        inputExample: "Q1 2025 customer logs (free text)",
        kind: "required",
        input: "text",
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testSourceRelation",
        label: "Relation to the training data",
        inputExample: "Same source / Different source",
        kind: "required",
        input: "single",
        choices: ["Same source", "Different source"],
        allowsUnknown: true,
        help: "Scores can look better than they are when both came from the same place.",
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testPeriod",
        label: "Collection period",
        inputExample: "2025-01 ~ 2025-03",
        kind: "optional",
        input: "date",
        advanced: true,
        mono: true,
        reportSection: "4절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "groundTruth",
    number: "⑧",
    name: "Ground truth",
    description: "Who labelled the test data, and how.",
    locked: false,
    steps: ["dataInfo"],
    help:
      "Wrong labels make every score untrustworthy, so the report records where they came " +
      "from. Recorded outcomes means you used what actually happened later (for example, " +
      "whether the customer really did leave) as the answer.",
    fields: [
      {
        id: "labelAuthor",
        label: "Who labelled it",
        inputExample: "Domain experts / Outside workers / A program or rule / Recorded outcomes",
        kind: "required",
        input: "single",
        choices: ["Domain experts", "Outside workers", "A program or rule", "Recorded outcomes"],
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "labelReview",
        label: "How labels were checked",
        inputExample: "Several reviewers / One reviewer / No review",
        kind: "required",
        input: "single",
        choices: ["Several reviewers", "One reviewer", "No review"],
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "labelAgreement",
        label: "Reviewers and agreement",
        inputExample: "3 people · 82%",
        kind: "conditional",
        conditionLabel: "When several reviewers checked",
        requiredWhen: { field: "labelReview", equals: "Several reviewers" },
        input: "text",
        mono: true,
        reportSection: "4절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "modelEnv",
    number: "⑨",
    name: "Model settings and runtime",
    description: "How the model was configured, and what it ran on.",
    locked: false,
    steps: ["modelEnv"],
    fields: [
      {
        id: "algorithm",
        label: "Algorithm",
        inputExample: "XGBoost",
        kind: "required",
        input: "text",
        mono: true,
        allowsUnknown: true,
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "hyperparameters",
        label: "Hyperparameters",
        inputExample: "max_depth = 6, n_estimators = 300 (one row each)",
        kind: "required",
        input: "entries",
        mono: true,
        allowsUnknown: true,
        reportSection: "2절",
        sentToAi: true,
      },
      {
        /**
         * 문서의 예시는 한 줄("Ubuntu 22.04 · A100 · 64GB · Python 3.11")이지만 칸을 다섯으로
         * 나눈다. 성적서가 OS·CPU·GPU·메모리·소프트웨어를 **따로 인쇄**하기 때문이다
         * (`evalEnv.systemSpec`). 한 줄로 받으면 그걸 다시 다섯으로 쪼개야 하는데, 쪼개는
         * 규칙을 만들면 틀릴 수 있다.
         *
         * 칸 이름은 화면 문구고, 성적서가 무엇으로 인쇄할지는 아래 `legacy.byKey` 가 정한다
         * (성적서는 한국어로 "운영체제"라 찍는다). 둘을 같은 글자로 묶어 둘 필요가 없다.
         */
        id: "runtimeEnv",
        label: "Runtime environment",
        inputExample: "Ubuntu 22.04 · A100 · 64GB · Python 3.11",
        kind: "required",
        input: "entries",
        entryKeys: ["Operating system", "CPU", "GPU", "Memory", "Software"],
        mono: true,
        allowsUnknown: true,
        reportSection: "8절",
        sentToAi: true,
        legacy: {
          target: "basicInfo",
          byKey: {
            "Operating system": "envOS",
            CPU: "envCPU",
            GPU: "envGPU",
            Memory: "envMemory",
            Software: "envSoftware",
          },
        },
      },
      {
        id: "gpuUsage",
        label: "GPU used",
        inputExample: "Training yes / no · Inference yes / no",
        kind: "required",
        input: "entries",
        entryKeys: ["Training", "Inference"],
        choices: ["Yes", "No", "Unknown"],
        allowsUnknown: true,
        reportSection: "8절",
        sentToAi: true,
      },
    ],
  },
];

/** 필수 카드 — 항상 성적서에 들어간다. */
export const REQUIRED_CARD_IDS: ComposerCardId[] = COMPOSER_CARDS.filter((card) => card.locked).map(
  (card) => card.id,
);

/** 선택 카드 — 켜고 끌 수 있다. 배열 순서가 화면 순서다. */
export const OPTIONAL_CARD_IDS: OptionalCardId[] = COMPOSER_CARDS.filter(
  (card) => !card.locked,
).map((card) => card.id as OptionalCardId);

/** 카드 하나를 찾는다. */
export function getCard(id: ComposerCardId): ComposerCard {
  const card = COMPOSER_CARDS.find((item) => item.id === id);
  if (!card) throw new Error(`Unknown composer card: ${id}`);
  return card;
}

/** 이 분류 유형에서 보여줄 카드. 지금은 9개 모두 전 유형이지만 분기 지점을 남겨 둔다. */
export function getVisibleCards(taskType: TaskType | ""): ComposerCard[] {
  if (!taskType) return COMPOSER_CARDS;
  return COMPOSER_CARDS.filter((card) => !card.taskTypes || card.taskTypes.includes(taskType));
}

/**
 * 이 분류 유형에서 보여줄 필드.
 *
 * `includeAdvanced` 가 거짓이면 더보기로 접히는 필드를 뺀다 — 상세 영역이 처음 보여주는
 * 목록이 그것이다.
 */
export function getCardFields(
  id: ComposerCardId,
  taskType: TaskType | "",
  options: { includeAdvanced?: boolean } = {},
): ComposerField[] {
  const { includeAdvanced = true } = options;
  return getCard(id).fields.filter((field) => {
    if (!includeAdvanced && field.advanced) return false;
    if (!taskType || !field.taskTypes) return true;
    return field.taskTypes.includes(taskType);
  });
}

/** 더보기로 접히는 필드 수 — "선택 항목 N개 더 보기" 버튼 문구에 쓴다. */
export function countAdvancedFields(id: ComposerCardId, taskType: TaskType | ""): number {
  return getCardFields(id, taskType).filter((field) => field.advanced).length;
}

/**
 * "필수 (표준 보고)" 인지 — TS 4213 이 성적서에 적으라고 요구하는 항목.
 *
 * 문서가 네 번째 구분으로 적지만 어느 필드가 그것인지는 **카드가 선택 카드인지로 정해진다**:
 * 선택 카드를 켜면 그 안의 필수 필드는 반드시 입력해야 하고, 모르면 "모름"을 고른다. 카드를
 * 끄거나 "모름"을 고르면 성적서에 "제공되지 않음"으로 찍힌다
 * (COMPOSER_COMPONENTS "구분 규칙" + 열린 결정).
 */
export function isStandardReportingField(card: ComposerCard, field: ComposerField): boolean {
  return !card.locked && field.kind === "required";
}

/** 켜져 있는 선택 카드 수. 하단 요약의 "선택 카드 n/4" 에 쓴다. */
export function countOptionalOn(selection: ComposerSelection): number {
  return OPTIONAL_CARD_IDS.filter((id) => selection[id]).length;
}

/** 프리셋이 만드는 선택 상태. 최소 구성은 필수 5개만, 전체는 선택 4개까지 켠다. */
export function presetSelection(preset: ComposerPreset): ComposerSelection {
  const on = preset === "full";
  return OPTIONAL_CARD_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: on }),
    {} as ComposerSelection,
  );
}

/**
 * 현재 상태가 어느 프리셋과 같은지. 어느 쪽도 아니면 `null` —
 * 그때 프리셋 토글은 두 칸 모두 선택 해제로 보인다(COMPOSER_DESIGN "프리셋").
 */
export function matchPreset(selection: ComposerSelection): ComposerPreset | null {
  const onCount = countOptionalOn(selection);
  if (onCount === 0) return "minimal";
  if (onCount === OPTIONAL_CARD_IDS.length) return "full";
  return null;
}

/**
 * ② 에서 고를 수 있는 지표.
 *
 * 레지스트리가 목록을 들지 않고 `getAvailableMetrics` 에 그대로 넘긴다 — 그쪽이 SPEC.md 와
 * 백엔드 노출 규칙의 단일 출처다(멀티레이블에서 M1·M11·M12·M13 을 빼는 결정 포함).
 */
export function getSelectableMetrics(taskType: TaskType | ""): MetricDefinition[] {
  return getAvailableMetrics(taskType || undefined);
}
