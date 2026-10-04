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
    name: "평가 데이터",
    description: "예측 결과 파일 올리기.",
    locked: true,
    viewer: "csvExample",
    // 파일은 1단계에서 받고, 컬럼 매핑·양성 클래스·결정 임계값은 4단계에서 확인한다.
    steps: ["upload", "mapping"],
    fields: [
      {
        id: "resultFile",
        label: "결과 파일",
        inputExample: "predictions.csv 업로드 (CSV·JSON, 20 MiB 이하)",
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
    name: "지표와 합격 기준",
    description: "평가 지표와 목표 기준.",
    locked: true,
    viewer: "metricList",
    steps: ["metrics"],
    fields: [
      {
        id: "selectedMetrics",
        label: "지표",
        inputExample: "하단 지표 참조",
        kind: "required",
        input: "metricSelect",
        reportSection: "3절",
        sentToAi: true,
      },
      {
        id: "passCriteria",
        label: "합격 기준",
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
        conditionLabel: "Fβ 선택 시",
        input: "number",
        mono: true,
        reportSection: "6절",
      },
      {
        // 멀티레이블에서만 묻는다. 세 지표군의 뜻이 서로 달라 고른 이유를 성적서에 적는다.
        id: "metricRationale",
        label: "지표 선택 이유",
        inputExample: "오차를 고르게 봄 / 모든 레이블 일치 / 겹치는 정도",
        kind: "required",
        taskTypes: ["multilabel"],
        input: "single",
        choices: ["오차를 고르게 봄", "모든 레이블 일치", "겹치는 정도"],
        reportSection: "3절",
        sentToAi: true,
      },
    ],
  },
  {
    id: "clientInfo",
    number: "③",
    name: "의뢰자 정보",
    description: "성적서를 받는 회사와 용도.",
    locked: true,
    steps: ["clientInfo"],
    fields: [
      {
        id: "companyInfo",
        label: "회사 정보",
        inputExample:
          "회사명: (주)테스트기업 · 대표자: 홍길동 · 사업자 번호: 123-45-67890 · " +
          "전화번호: 02-1234-5678 · 주소: 서울시 …",
        kind: "required",
        input: "text",
        reportSection: "1절",
      },
      {
        id: "reportPurpose",
        label: "성적서 용도",
        inputExample: "내부 검증 / 외부 제출 / 과제 제출",
        kind: "required",
        input: "single",
        choices: ["내부 검증", "외부 제출", "과제 제출"],
        reportSection: "1절",
      },
      {
        id: "projectInfo",
        label: "과제 정보",
        inputExample: "과제명 · 과제 기관",
        kind: "conditional",
        conditionLabel: "과제 제출 시",
        requiredWhen: { field: "reportPurpose", equals: "과제 제출" },
        input: "text",
        reportSection: "1절",
      },
      {
        id: "contactExtra",
        label: "홈페이지·팩스",
        inputExample: "https://example.com · 02-1234-5679",
        kind: "optional",
        input: "text",
        advanced: true,
        reportSection: "1절",
      },
      {
        id: "projectNumber",
        label: "과제 번호",
        inputExample: "2026-과제-001",
        kind: "optional",
        input: "text",
        advanced: true,
        mono: true,
        reportSection: "1절",
      },
      {
        id: "requestDate",
        label: "평가 의뢰일",
        inputExample: "기본 오늘",
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
    name: "평가 대상 모델",
    description: "모델 이름과 쓰임새.",
    locked: true,
    // 이름·버전은 평가 결과를 식별하는 이름표라 1단계에서, 용도는 성적서 서식용이라 9단계에서.
    steps: ["upload", "clientInfo"],
    fields: [
      {
        id: "modelNameVersion",
        label: "모델 이름·버전",
        inputExample: "모델명: ChurnPredictor · 버전: v1.0.0 (버전 기본 v1.0.0)",
        kind: "required",
        input: "text",
        mono: true,
        step: "upload",
        reportSection: "2절",
        sentToAi: true,
      },
      {
        id: "modelPurpose",
        label: "모델 용도",
        inputExample: "통신사 고객 이탈 예측",
        kind: "required",
        input: "text",
        step: "clientInfo",
        reportSection: "2절",
        sentToAi: true,
      },
    ],
  },
  {
    /**
     * **이 카드만 영어다.** 입력 화면이 평가 구간(업로드·지표·매핑·검증)에 끼어 있고 그
     * 구간은 전부 영어라, 이 화면만 한국어면 혼자 튄다.
     *
     * 그 대가로 구성 화면의 카드 줄에서는 ⑤ 하나만 영어로 보인다 — 레지스트리가 두 화면의
     * 단일 출처라 한쪽만 바꿀 수 없다. 문구 전면 정리 때 함께 풀 문제다.
     */
    id: "perspective",
    number: "⑤",
    name: "Evaluation perspective",
    description: "What matters most for this model.",
    locked: true,
    steps: ["perspective"],
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
    name: "학습 데이터",
    description: "모델을 훈련할 때 쓴 데이터.",
    locked: false,
    steps: ["dataInfo"],
    help:
      "수집 환경 차이는 같은 클래스의 데이터가 서로 다른 장비, 처리 방식, 사람, 환경에서 " +
      "모였는지를 묻는다(TS 4213 5.3.8 채널 효과). 불균형 보정은 한쪽 클래스에 몰린 데이터를 " +
      "보정했는지를 묻는다(TS 4213 8절).",
    fields: [
      {
        id: "trainingDatasetName",
        label: "데이터 이름",
        inputExample: "고객 로그 2024",
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
        label: "데이터 출처",
        inputExample: "사내 CRM 로그 (직접 입력)",
        kind: "required",
        input: "text",
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingVolume",
        label: "데이터 양",
        inputExample: "학습 12,000건 · 검증 3,000건",
        kind: "required",
        input: "entries",
        entryKeys: ["학습", "검증"],
        mono: true,
        numeric: true,
        allowsUnknown: true,
        reportSection: "7절",
        sentToAi: true,
        legacy: {
          target: "datasetInfo",
          byKey: { 학습: "trainingSampleCount", 검증: "validationSampleCount" },
        },
      },
      {
        id: "trainingClassVolume",
        label: "클래스별 데이터 양",
        inputExample: "정상 8,400 / 이탈 3,600 (업로드한 클래스 목록으로 칸 생성)",
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
        label: "수집 환경 차이",
        inputExample:
          "알려진 것 없음 / 장비 차이 / 전처리 차이 / 수집자 차이 / 수집 환경 차이 / 기타(직접 입력) (복수 선택)",
        kind: "required",
        input: "multi",
        choices: [
          "알려진 것 없음",
          "장비 차이",
          "전처리 차이",
          "수집자 차이",
          "수집 환경 차이",
          "기타(직접 입력)",
        ],
        // "알려진 것 없음" 은 원문이 요구하는 답이라 **제공된 것으로 센다**. "모름"과 다르다.
        exclusiveChoice: "알려진 것 없음",
        help:
          "같은 클래스의 데이터가 서로 다른 장비·처리 방식·사람·환경에서 모였는지 고른다. " +
          "차이가 여러 개일 수 있다.",
        standardClause: "5.3.8",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "imbalanceHandling",
        label: "불균형 보정",
        inputExample: "클래스 수 맞춤 / 출처 다양화 / 보정 안 함 / 모름",
        kind: "required",
        input: "single",
        choices: ["클래스 수 맞춤", "출처 다양화", "보정 안 함", "모름"],
        allowsUnknown: true,
        help: "한쪽 클래스에 몰린 데이터를 보정했는지 고른다.",
        standardClause: "8절",
        reportSection: "7절",
        sentToAi: true,
      },
      {
        id: "trainingPeriod",
        label: "수집 기간",
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
        label: "전처리 여부",
        inputExample: "결측치 제거, 정규화 (직접 입력)",
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
    name: "테스트 데이터",
    description: "성능을 잰 테스트 데이터의 출처.",
    locked: false,
    steps: ["dataInfo"],
    // 건수와 클래스별 건수는 올린 파일에서 시스템이 세므로 사용자에게 묻지 않는다.
    help: "학습 데이터와 출처가 같으면 점수가 실제보다 좋게 나올 수 있어 성적서에 함께 적는다.",
    fields: [
      {
        id: "testDataSource",
        label: "데이터 출처",
        inputExample: "2025년 1분기 고객 로그 (직접 입력)",
        kind: "required",
        input: "text",
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testSourceRelation",
        label: "학습 데이터와 출처 관계",
        inputExample: "같음 / 다름 / 모름",
        kind: "required",
        input: "single",
        choices: ["같음", "다름", "모름"],
        allowsUnknown: true,
        help: "출처가 같으면 점수가 실제보다 좋게 나올 수 있다.",
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "testPeriod",
        label: "수집 기간",
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
    name: "정답 라벨",
    description: "테스트 데이터의 정답을 누가, 어떻게 붙였는지.",
    locked: false,
    steps: ["dataInfo"],
    help:
      "정답이 틀리면 점수도 믿을 수 없어서 정답의 출처를 성적서에 적는다. 실제 결과 기록은 " +
      "사후에 확인된 결과(예: 실제 해지 여부)를 정답으로 쓴 경우다.",
    fields: [
      {
        id: "labelAuthor",
        label: "라벨 작성 주체",
        inputExample: "전문가 / 외부 작업자 / 프로그램·규칙 / 실제 결과 기록",
        kind: "required",
        input: "single",
        choices: ["전문가", "외부 작업자", "프로그램·규칙", "실제 결과 기록"],
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "labelReview",
        label: "라벨 검수 방식",
        inputExample: "복수 교차 검수 / 1인 검수 / 검수 없음 / 모름",
        kind: "required",
        input: "single",
        choices: ["복수 교차 검수", "1인 검수", "검수 없음", "모름"],
        allowsUnknown: true,
        reportSection: "4절",
        sentToAi: true,
      },
      {
        id: "labelAgreement",
        label: "검수 인원·일치율",
        inputExample: "3명 · 82%",
        kind: "conditional",
        conditionLabel: "복수 교차 검수일 때",
        requiredWhen: { field: "labelReview", equals: "복수 교차 검수" },
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
    name: "모델 설정과 실행 환경",
    description: "모델 설정값과 실행한 컴퓨터.",
    locked: false,
    steps: ["modelEnv"],
    fields: [
      {
        id: "algorithm",
        label: "알고리즘",
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
        label: "하이퍼파라미터",
        inputExample: "max_depth = 6, n_estimators = 300 (줄 추가)",
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
         */
        id: "runtimeEnv",
        label: "실행 환경",
        inputExample: "Ubuntu 22.04 · A100 · 64GB · Python 3.11",
        kind: "required",
        input: "entries",
        entryKeys: ["운영체제", "CPU", "GPU", "메모리", "소프트웨어"],
        mono: true,
        allowsUnknown: true,
        reportSection: "8절",
        sentToAi: true,
        legacy: {
          target: "basicInfo",
          byKey: {
            운영체제: "envOS",
            CPU: "envCPU",
            GPU: "envGPU",
            메모리: "envMemory",
            소프트웨어: "envSoftware",
          },
        },
      },
      {
        id: "gpuUsage",
        label: "GPU 사용 여부",
        inputExample: "학습 예 / 아니오 / 모름 · 추론 예 / 아니오 / 모름",
        kind: "required",
        input: "entries",
        entryKeys: ["학습", "추론"],
        choices: ["예", "아니오", "모름"],
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
