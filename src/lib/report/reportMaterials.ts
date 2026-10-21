/**
 * 고객이 제공한 재료 → 성적서에 찍을 줄, 그리고 AI 에 넘길 값.
 *
 * 무엇을 어디에 찍는지는 입력 재료 목록의 "인쇄 위치"가 정한다(필드별 위치는 레지스트리의 `reportSection`).
 * 종전에는 성적서 구성 카드(⑤~⑨)와 ② 의 지표 선택 이유가 **저장만 되고** 성적서에도 AI 에도
 * 가지 않았다.
 *
 * 빈 값 표기는 재료 선택 점검 4.2 를 따른다.
 * - 2층 보고 항목인데 카드를 껐거나 "모름"이면 `null` → 성적서에 "제공되지 않음".
 * - 선택 항목이 비었으면 줄을 만들지 않는다.
 * - 이 작업 유형에 원래 없는 선언·지표 선택 이유는 줄을 만들지 않는다.
 * - 2층 항목 안에서 원래 필요 없는 칸(신뢰성이 복수 라벨러가 아닐 때의 라벨러 수·일치도)은 "해당 없음"
 *   줄이다(서술 설계 D15). AI 고객 입력에서는 뺀다.
 *
 * 덧붙이는 글의 셈 규칙(서술 라운드 B, 점검 표 2.0 — 표는 `reportMaterials.test.ts` 가 고정한다):
 * - 1층 선언(⑤)은 선택지를 골라야 답이다. 글만 쓰면 제공되지 않음 + 의뢰자 글.
 * - 2층 항목은 글만 써도 제공이다("의뢰자 제공: …").
 * - "모름 + 글"은 제공되지 않음이지만 글은 싣는다(`MaterialRow.note` → "제공되지 않음 (의뢰자 제공: …)").
 * - "기타"를 고르고 내용을 비웠으면 제공되지 않음(글이 있으면 글만 싣는다).
 *
 * 선택지는 영어 저장값으로 남고 화면·성적서는 한국어다. 성적서에 찍을 이름은 레지스트리의
 * `reportLabels` 가 정한다 — 매핑표를 여기 또 적으면 두 벌이 된다.
 */
import { getCard, isEntryUnknown } from "../../data/reportComposer";
import { chosenText, completeEntryRows, isOtherChosen, noteAnswers } from "../../utils/domain/composerFieldGate";
import { josaEuroRo } from "./koreanJosa";
import type { TaskType } from "../../data/evaluationData";
import {
  MONTH_RANGE_KEYS,
  type ComposerCardId,
  type ComposerFieldValue,
  type ComposerSelection,
  type ComposerValueMap,
} from "../../types/reportComposer.types";
import type {
  MaterialRow,
  MaterialValue,
  ReportMaterials,
} from "../../types/finalReport.types";

/** 성적서 구성 카드의 값 전부. 성적서 입력 스냅샷에 실린다(`MapWorkflowToReportInput.composer`). */
export interface ReportComposerInput {
  cards: ComposerSelection;
  metrics: ComposerValueMap;
  perspective: ComposerValueMap;
  trainingData: ComposerValueMap;
  testData: ComposerValueMap;
  groundTruth: ComposerValueMap;
  modelEnv: ComposerValueMap;
}

/** `null` 을 성적서와 AI 에 적을 때 쓰는 말(재료 선택 점검 4.2). */
export const NOT_PROVIDED = "제공되지 않음";

/** 원래 필요 없는 칸에 찍는 말(서술 설계 D15, 고정 문구 1). */
export const NOT_APPLICABLE = "해당 없음";

/** 의뢰자가 쓴 글 앞에 붙이는 표시(입력 설계 › 재료 선택 점검 5절 — 고치지 않고 싣되 "의뢰자 제공"으로). */
export function clientNote(note: string): string {
  return `의뢰자 제공: ${note}`;
}

/**
 * 재료 한 칸을 성적서·AI 에 적는 글. 값이 없으면 "제공되지 않음", 따로 실린 의뢰자 글(`note`)이 있으면 괄호로
 * 붙인다. 성적서 표(`toTableRows`)와 AI 고객 입력(`rowsToObject`)이 이 함수 하나를 쓴다.
 */
export function materialRowText(row: { value: MaterialValue; note?: string }): string {
  const base = row.value ?? NOT_PROVIDED;
  return row.note ? `${base} (${clientNote(row.note)})` : base;
}

function fieldOf(cardId: ComposerCardId, fieldId: string) {
  const field = getCard(cardId).fields.find((item) => item.id === fieldId);
  if (!field) throw new Error(`Unknown composer field: ${cardId}.${fieldId}`);
  return field;
}

/** 고른 선택지 하나를 성적서 이름으로. "기타"면 적은 내용을 괄호로 붙인다. */
export function choiceLabel(
  cardId: ComposerCardId,
  fieldId: string,
  choice: string,
  otherText?: string,
): string {
  const field = fieldOf(cardId, fieldId);
  const label = field.reportLabels?.[choice] ?? choice;
  const other = otherText?.trim();
  return field.otherChoice === choice && other ? `${label}(${other})` : label;
}

/** 칸 하나의 값. 비었거나 그 칸을 "모름"으로 골랐으면(필드·칸별 — W3) "". */
function entryOf(value: ComposerFieldValue | undefined, key: string): string {
  if (isEntryUnknown(value, key)) return "";
  return value?.entries?.find((entry) => entry.key === key)?.value.trim() ?? "";
}

/** 숫자 칸의 값. 쉼표·공백은 걷어 낸다. 숫자가 아니거나 음수면 null. */
function countOf(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** 한 필드의 값을 성적서에 적을 모양. `note` 는 값이 없는데 의뢰자가 덧붙인 글(`MaterialRow.note`). */
export interface DescribedAnswer {
  value: MaterialValue;
  note?: string;
}

/**
 * 한 필드의 값을 성적서 문장으로(셈 규칙은 파일 머리). 비었거나 "모름"이면 값은 null.
 *
 * 덧붙이는 글(`note`)은 우리 문장과 섞지 않도록 "의뢰자 제공"으로 표시한다(재료 선택 점검 5절). 선택지와 함께
 * 쓰면 값 뒤 괄호에, 글이 선택지를 대신하면(2층) 값 자체가, 값이 제공되지 않음이면 `note` 로 따로 간다.
 */
export function describeAnswer(
  cardId: ComposerCardId,
  fieldId: string,
  value: ComposerFieldValue | undefined,
): DescribedAnswer {
  if (!value) return { value: null };
  const field = fieldOf(cardId, fieldId);
  const note = field.allowsNote ? value.note?.trim() || undefined : undefined;
  const withNote = (main: MaterialValue): DescribedAnswer => (note ? { value: main, note } : { value: main });
  // "모름"은 제공되지 않음으로 센다 — 함께 쓴 글은 싣는다.
  if (value.unknown) return withNote(null);

  // "기타"를 고르고 무엇인지 적지 않았으면 내용이 없다 — 그 선택지는 답으로 세지 않는다.
  const emptyOther = (choice: string) => field.otherChoice === choice && !value.otherText?.trim();

  let main: string | null = null;
  if (field.input === "single") {
    main = value.text && !emptyOther(value.text) ? choiceLabel(cardId, fieldId, value.text, value.otherText) : null;
  } else if (field.input === "multi") {
    const chosen = (value.choices ?? []).filter((choice) => !emptyOther(choice));
    main = chosen.length
      ? chosen.map((choice) => choiceLabel(cardId, fieldId, choice, value.otherText)).join(", ")
      : null;
  } else if (field.input === "monthRange") {
    const from = entryOf(value, MONTH_RANGE_KEYS.from);
    const to = entryOf(value, MONTH_RANGE_KEYS.to);
    main = from && to ? `${from} ~ ${to}` : null;
  } else if (field.input === "entries") {
    const rows = (value.entries ?? []).filter(
      (entry) => entry.value.trim() !== "" && !isEntryUnknown(value, entry.key),
    );
    main = rows.length ? rows.map((entry) => `${entry.key} ${entry.value.trim()}`).join(" / ") : null;
  } else {
    main = value.text?.trim() || null;
  }

  if (!note) return { value: main };
  if (main) return { value: `${main} (${clientNote(note)})` };
  // 글이 선택지를 대신하는 것은 2층 칸뿐이다(`noteAnswers`). 빈 "기타"를 고른 채 쓴 글은 진행 점검과 같이 답으로
  // 세지 않는다 — 점검은 그 상태를 막지만, 옛 저장값이 와도 둘이 어긋나지 않게 한다.
  if (noteAnswers(field, value) && !(isOtherChosen(field, value) && !value.otherText?.trim())) {
    return { value: clientNote(note) };
  }
  return { value: null, note };
}

/** `describeAnswer` 의 값만. 따로 실린 글은 버린다 — 줄(`MaterialRow`)을 만들지 않는 자리(알고리즘 등)용. */
export function describeValue(
  cardId: ComposerCardId,
  fieldId: string,
  value: ComposerFieldValue | undefined,
): string | null {
  return describeAnswer(cardId, fieldId, value).value;
}

/**
 * 2층 보고 항목 — 카드를 껐거나 값이 없으면 "제공되지 않음". `item` 은 그 줄이 속한 TS 4213 보고
 * 항목 번호(재료 선택 점검 4.2)다.
 */
function required(item: number, label: string, included: boolean, answer: DescribedAnswer | string | null): MaterialRow {
  if (!included) return { label, value: null, item };
  const { value, note } = asAnswer(answer);
  return note ? { label, value, item, note } : { label, value, item };
}

/**
 * 선택 항목 — 값이 있을 때만 줄을 만든다. 값 없이 의뢰자 글만 있으면 그 글을 값으로 싣는다(선택 항목은 제공
 * 여부를 세지 않으므로 "제공되지 않음"을 찍을 까닭이 없다).
 */
function optional(label: string, included: boolean, answer: DescribedAnswer | string | null): MaterialRow[] {
  if (!included) return [];
  const { value, note } = asAnswer(answer);
  if (value) return [{ label, value }];
  return note ? [{ label, value: clientNote(note) }] : [];
}

function asAnswer(answer: DescribedAnswer | string | null): DescribedAnswer {
  return answer !== null && typeof answer === "object" ? answer : { value: answer };
}

function trainingRows(c: ReportComposerInput): MaterialRow[] {
  const on = c.cards.trainingData;
  const v = c.trainingData;
  const describe = (fieldId: string) => describeAnswer("trainingData", fieldId, v[fieldId]);
  // 학습 수만 알고 검증을 모름으로 골랐으면 검증 줄만 "제공되지 않음"이다(W3, `entryOf`).
  const count = (key: string) => {
    const parsed = countOf(entryOf(v.trainingVolume, key));
    return parsed === null ? null : `${parsed.toLocaleString()}개`;
  };
  // 클래스마다 칸이 따로 있다. 한 줄로 적는다("정상 8,400 / 이탈 3,600").
  const classRows = v.trainingClassVolume?.unknown ? [] : v.trainingClassVolume?.entries ?? [];
  const classDistribution =
    classRows
      .filter((entry) => entry.value.trim() !== "")
      .map((entry) => {
        const parsed = countOf(entry.value);
        return `${entry.key} ${parsed === null ? entry.value.trim() : parsed.toLocaleString()}`;
      })
      .join(" / ") || null;

  return [
    required(1, "학습 데이터셋명", on, describe("trainingDatasetName")),
    required(1, "학습 데이터 출처", on, describe("trainingDataSource")),
    required(1, "학습 샘플 수", on, count("Training")),
    required(1, "검증 샘플 수", on, count("Validation")),
    required(1, "학습 클래스 분포", on, classDistribution),
    required(9, "채널 효과", on, describe("channelEffects")),
    required(3, "편향 감소 노력", on, describe("imbalanceHandling")),
    ...optional("수집 기간", on, describe("trainingPeriod")),
    // 학습·평가 전처리 일치(서술 설계 D44) — 점검 밖 선택 항목. 3절에 찍고, 같은 줄이 AI 로 간다.
    ...optional("학습·평가 전처리 일치", on, describe("preprocessingMatch")),
    ...optional("학습 데이터 형식", on, describe("trainingDataFormat")),
    ...optional("학습 데이터 설명", on, describe("trainingDescription")),
    ...optional("비고", on, describe("trainingNotes")),
  ];
}

function testRows(c: ReportComposerInput): MaterialRow[] {
  const on = c.cards.testData;
  const describe = (fieldId: string) => describeAnswer("testData", fieldId, c.testData[fieldId]);
  return [
    required(2, "평가 데이터 출처", on, describe("testDataSource")),
    // 목록 밖 권장 필드라 2번(테스트 데이터의 출처)에 합친다(세션 2 점검 표 1.0).
    required(2, "학습 데이터와의 관계", on, describe("testSourceRelation")),
    ...optional("평가 데이터 수집 기간", on, describe("testPeriod")),
  ];
}

function groundTruthRows(c: ReportComposerInput): MaterialRow[] {
  const on = c.cards.groundTruth;
  const v = c.groundTruth;
  const describe = (fieldId: string) => describeAnswer("groundTruth", fieldId, v[fieldId]);
  const rows = [
    required(4, "정답 라벨 구축 방법", on, describe("labelAuthor")),
    required(5, "정답 라벨 신뢰성", on, describe("labelReview")),
  ];

  // 라벨러 수·일치도는 "복수 라벨러 합의"일 때만 받는다(신뢰성의 일부). 판정은 조건부 칸을 여는 점검과 같은
  // 선택값(`chosenText`)이다 — 글만 쓴 답은 선택값이 없어 칸이 열리지 않는다.
  const review = on ? chosenText(v.labelReview) : null;
  if (review === null) return rows;
  if (review !== "Several reviewers") {
    // 단일 라벨러·검토 없음 — 두 칸은 원래 필요 없다. 줄을 지우지 않고 "해당 없음"을 찍는다(서술 설계 D15).
    rows.push(
      { label: "라벨러 수", value: NOT_APPLICABLE, item: 5, notApplicable: true },
      { label: "라벨 일치도", value: NOT_APPLICABLE, item: 5, notApplicable: true },
    );
    return rows;
  }

  const count = countOf(v.labelReviewerCount?.text ?? "");
  rows.push({ label: "라벨러 수", value: count === null ? null : `${count}명`, item: 5 });

  const kind = v.labelAgreementKind;
  const kindText = chosenText(kind);
  let agreement: string | null = null;
  if (kindText === "Not measured") {
    agreement = "측정 안 함"; // 제공된 답이다(서술 설계 D42).
  } else if (kindText) {
    const value = v.labelAgreementValue?.text?.trim();
    const name = choiceLabel("groundTruth", "labelAgreementKind", kindText, kind!.otherText);
    if (value) {
      agreement =
        kindText === "Percent agreement" ? `${name} ${percentToRatio(value)}` : `${name} ${value}`;
    }
  }
  // 일치도 종류에 덧붙인 글 — `describeAnswer` 와 같은 셈이다(선택과 함께면 괄호, 글만이면 제공, 값이 없으면 따로).
  const note = kind?.note?.trim();
  if (!note) {
    rows.push({ label: "라벨 일치도", value: agreement, item: 5 });
  } else if (agreement) {
    rows.push({ label: "라벨 일치도", value: `${agreement} (${clientNote(note)})`, item: 5 });
  } else if (kindText === null && !kind?.unknown) {
    rows.push({ label: "라벨 일치도", value: clientNote(note), item: 5 });
  } else {
    rows.push({ label: "라벨 일치도", value: null, item: 5, note });
  }
  return rows;
}

/**
 * 단순 일치율은 화면에서 %로 받고 성적서와 AI 에는 0~1 로 적는다(재료 목록 5절 "단순 일치율 0~1,
 * 화면에는 %"). 82 → "0.82". 숫자가 아니면 받은 글을 그대로 둔다.
 */
function percentToRatio(text: string): string {
  const percent = Number(text);
  if (!Number.isFinite(percent)) return text;
  return String(Number((percent / 100).toFixed(4)));
}

function environmentRows(c: ReportComposerInput): MaterialRow[] {
  const on = c.cards.modelEnv;
  const gpu = c.modelEnv.gpuUsage;
  // "모름" 선택지(`unknownChoice`)는 제공되지 않음으로 센다(재료 선택 점검 5절, N8). 옛 필드 모름은 v15 가
  // 두 칸 "모름"으로 옮겼고, 옮기기 전 스냅샷의 필드 모름도 `entryOf` 가 빈 값으로 본다.
  const unknownAnswer = fieldOf("modelEnv", "gpuUsage").unknownChoice;
  const accel = (key: string) => {
    if (!on) return null;
    const answer = entryOf(gpu, key);
    if (!answer || answer === unknownAnswer) return null;
    return choiceLabel("modelEnv", "gpuUsage", answer);
  };
  // 덧붙이는 글은 두 줄 아래 한 줄로 싣는다 — 줄마다 붙이면 같은 글이 두 번 찍힌다. 제공 여부는 두 줄의 선택으로만
  // 센다(`noteNeedsChoice`). 그래서 이 줄에는 보고 항목 번호가 없다.
  const note = on ? gpu?.note?.trim() : undefined;
  return [
    { label: "학습 가속", value: accel("Training"), item: 11 },
    { label: "추론 가속", value: accel("Inference"), item: 11 },
    ...(note ? [{ label: "가속 사용 덧붙임", value: clientNote(note) }] : []),
  ];
}

function hyperparameters(c: ReportComposerInput): ReportMaterials["hyperparameters"] {
  const on = c.cards.modelEnv;
  const algorithm = on ? describeValue("modelEnv", "algorithm", c.modelEnv.algorithm) : null;
  const table = c.modelEnv.hyperparameters;
  const rows =
    on && table && !table.unknown
      ? completeEntryRows(table.entries).map((entry) => ({ name: entry.key.trim(), value: entry.value.trim() }))
      : [];
  return { algorithm, rows: rows.length > 0 ? rows : null };
}

function declarationRows(c: ReportComposerInput, taskType: TaskType): MaterialRow[] {
  // 선언은 1층 필수라 늘 골라져 있다(글만으로는 답이 아니다 — `noteNeedsChoice`). 이 유형에 없는 선언은 줄을
  // 만들지 않는다.
  const row = (label: string, fieldId: string): MaterialRow => {
    const { value, note } = describeAnswer("perspective", fieldId, c.perspective[fieldId]);
    return note ? { label, value, note } : { label, value };
  };
  return [
    ...(taskType === "binary" ? [row("위험 방향", "criticalErrorType")] : []),
    ...(taskType !== "binary" ? [row("클래스 중요도", "classPriority")] : []),
    row("사용 방식", "usageMode"),
  ];
}

/**
 * 클래스 중요도 → 평균 방식(서술 설계 D28: 동등 = 매크로, 다수 우선 = 가중, 샘플 단위 = 마이크로).
 * 5절 평균 방식 문장과 재료 선택 점검(3번 줄)이 같은 표를 쓴다.
 */
export const AVERAGING_BY_PRIORITY: Record<string, string> = {
  "All equal": "매크로 평균",
  "Larger classes first": "가중 평균",
  "Individual samples first": "마이크로 평균",
};

/**
 * 고정 문구 4 — "다중 클래스 지표의 평균 방식은 {평균 방식}을 기준으로 한다. 의뢰자가 클래스
 * 중요도를 "{선언 값}"으로 밝혔기 때문이다." 다중 클래스에서 클래스 중요도를 답했을 때만.
 */
function averagingSentence(c: ReportComposerInput, taskType: TaskType): string | undefined {
  if (taskType !== "multiclass") return undefined;
  // 글만 쓴 답은 선택값이 없어 문장을 만들지 않는다(`chosenText`).
  const answer = chosenText(c.perspective.classPriority);
  const averaging = answer === null ? undefined : AVERAGING_BY_PRIORITY[answer];
  if (!averaging) return undefined;
  // 따옴표 안에는 선언 값(선택지의 성적서 이름)만 — 덧붙인 글은 의뢰자 선언 표에 있다.
  const declared = choiceLabel("perspective", "classPriority", answer!);
  return `다중 클래스 지표의 평균 방식은 ${averaging}을 기준으로 한다. 의뢰자가 클래스 중요도를 "${declared}"${josaEuroRo(declared)} 밝혔기 때문이다.`;
}

/** 성적서 구성 카드의 값 → 성적서 자리별 줄. */
export function buildReportMaterials(
  composer: ReportComposerInput,
  taskType: TaskType,
): ReportMaterials {
  const rationale =
    taskType === "multilabel" ? describeAnswer("metrics", "metricRationale", composer.metrics.metricRationale) : null;
  return {
    declarations: declarationRows(composer, taskType),
    averagingSentence: averagingSentence(composer, taskType),
    metricRationale: rationale ? rationale.value : undefined,
    ...(rationale?.note ? { metricRationaleNote: rationale.note } : {}),
    training: trainingRows(composer),
    test: testRows(composer),
    groundTruth: groundTruthRows(composer),
    environment: environmentRows(composer),
    hyperparameters: hyperparameters(composer),
  };
}

/**
 * 줄 목록 → { 이름: 값 }. 제공되지 않은 값은 그 말로, 따로 실린 의뢰자 글은 괄호로 적는다(`materialRowText`).
 * "해당 없음" 줄은 뺀다 — 원래 필요 없는 칸이라 AI 가 쓸 사실이 아니다(서술 라운드 B).
 */
function rowsToObject(rows: MaterialRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((row) => !row.notApplicable).map((row) => [row.label, materialRowText(row)]));
}

/** AI 에 넘기는 고객 입력. 키 이름은 백엔드 `NarrativeRequest.client_inputs` 와 맞춘다. */
export type ClientInputs = Record<string, unknown>;

export interface ClientInputsSource {
  composer: ReportComposerInput;
  materials: ReportMaterials;
  model: { name: string; version: string; purpose: string; category: string };
  reportPurposeNote: string;
  /**
   * 의뢰자가 고른 핵심 지표 이름. 고르지 않아 유형별 기본값을 썼으면 null — 그때는 보내지 않는다. 이 묶음은
   * "의뢰자가 제공한 정보"라 기본값을 넣으면 AI 가 "의뢰자가 지정한 핵심 지표"라고 쓴다(재-7). 출처는 사실 시트
   * `facts.core_metrics_source` 가 따로 알린다.
   */
  coreMetrics: string[] | null;
  classLabelDescriptions: Record<string, string>;
  /**
   * 실행 환경 다섯 칸(운영체제·CPU·GPU·메모리·소프트웨어). 성적서 4절이 찍는 값과 같은 출처다 —
   * ⑨ 실행 환경을 넣었으면 그 값, 아니면 옛 시험 환경 폼에 적었던 값(`buildReportInput`).
   * 빈 칸은 제공되지 않음으로 넘긴다.
   */
  runtime: Record<string, string>;
}

/**
 * AI 에 넘길 고객 입력(서술 설계 D25 — 고객 입력은 모두 넘긴다).
 *
 * 식별 정보는 모델명과 버전만 넘긴다. 회사 정보와 과제 정보는 넘기지 않는다(D34).
 * 학습 데이터는 3절에 찍는 줄을 그대로 넘긴다 — 학습·평가 전처리 일치도 그 줄에 있다.
 */
export function buildClientInputs(source: ClientInputsSource): ClientInputs {
  return fitClientInputs(rawClientInputs(source));
}

function rawClientInputs(source: ClientInputsSource): ClientInputs {
  const { materials } = source;
  const descriptions = Object.fromEntries(
    Object.entries(source.classLabelDescriptions).filter(([, text]) => text.trim() !== ""),
  );

  return {
    model: {
      모델명: source.model.name,
      버전: source.model.version,
      ...(source.model.purpose.trim() ? { "모델 용도": source.model.purpose.trim() } : {}),
      ...(source.model.category.trim() ? { "모델 분류": source.model.category.trim() } : {}),
    },
    ...(source.reportPurposeNote.trim()
      ? { report_purpose_note: source.reportPurposeNote.trim() }
      : {}),
    declarations: rowsToObject(materials.declarations),
    ...(materials.metricRationale !== undefined
      ? { metric_rationale: materialRowText({ value: materials.metricRationale, note: materials.metricRationaleNote }) }
      : {}),
    ...(source.coreMetrics ? { core_metrics: source.coreMetrics } : {}),
    training_data: rowsToObject(materials.training),
    test_data: rowsToObject(materials.test),
    ground_truth: rowsToObject(materials.groundTruth),
    environment: {
      ...Object.fromEntries(
        Object.entries(source.runtime).map(([label, text]) => [label, text.trim() || NOT_PROVIDED]),
      ),
      ...rowsToObject(materials.environment),
      알고리즘: materials.hyperparameters.algorithm ?? NOT_PROVIDED,
      하이퍼파라미터: materials.hyperparameters.rows
        ? Object.fromEntries(materials.hyperparameters.rows.map((row) => [row.name, row.value]))
        : NOT_PROVIDED,
    },
    ...(Object.keys(descriptions).length > 0 ? { class_label_descriptions: descriptions } : {}),
  };
}

/**
 * 백엔드가 받는 고객 입력의 직렬화 길이 상한 — `Capstone_Back/app/narrative/schemas.py` 의
 * `MAX_CLIENT_INPUTS_CHARS`(테스트가 대조한다). 넘으면 서술 요청이 422 로 통째로 거절되어 성적서에
 * AI 서술이 하나도 실리지 않는다(B7).
 */
export const CLIENT_INPUTS_MAX_CHARS = 20_000;

/**
 * 프론트가 맞추는 길이 — 상한의 90%. 백엔드는 이제 공백 없는 JSON 으로 잰다(`client_inputs_length`, B7)라
 * 보통은 `JSON.stringify` 길이와 같다. 남은 10% 는 두 가지 차이를 덮는 여유다: 배포 순서(공백을 넣어 재던 옛
 * 백엔드가 아직 떠 있을 때)와 지수 표기 실수(파이썬 `1e-07` 이 JS `1e-7` 보다 한 자 길다).
 */
export const CLIENT_INPUTS_TARGET_CHARS = Math.floor(CLIENT_INPUTS_MAX_CHARS * 0.9);

/** 잘린 글 끝에 붙이는 표시. */
export const TRUNCATED_MARK = "…(이하 생략)";

/** 잘라도 남기는 앞부분 — 무슨 내용인지 알아볼 만큼. */
const MIN_KEPT_CHARS = 40;

/**
 * 고객 입력이 `target` 자를 넘으면 **가장 긴 글부터** 잘라 맞춘다. 같은 입력에는 늘 같은 결과다
 * (길이가 같으면 먼저 나온 글부터 자른다). 넘지 않으면 그대로 돌려준다.
 *
 * 입력 칸마다 글자 수 상한이 있어(`maxLength`) 보통은 자를 일이 없다. 상한이 생기기 전에 적어 둔 글,
 * 클래스가 아주 많은 파일의 클래스 설명처럼 칸 상한으로 막을 수 없는 경우의 마지막 안전장치다. 모든
 * 글을 줄여도 넘으면 클래스 설명을 통째로 빼고, 그래도 넘으면 그대로 보낸다(백엔드가 거절한다).
 */
export function fitClientInputs(
  inputs: ClientInputs,
  target: number = CLIENT_INPUTS_TARGET_CHARS,
): ClientInputs {
  if (JSON.stringify(inputs).length <= target) return inputs;
  const fitted = structuredClone(inputs) as Record<string, unknown>;

  for (;;) {
    const excess = JSON.stringify(fitted).length - target;
    if (excess <= 0) return fitted;
    const longest = longestCuttable(fitted);
    if (!longest) break;
    const { holder, key, text } = longest;
    const keep = Math.max(MIN_KEPT_CHARS, text.length - excess - TRUNCATED_MARK.length);
    holder[key] = text.slice(0, keep) + TRUNCATED_MARK;
  }

  if ("class_label_descriptions" in fitted) {
    delete fitted.class_label_descriptions;
    if (JSON.stringify(fitted).length <= target) return fitted;
  }
  return fitted;
}

/** 아직 줄일 수 있는 글 중 가장 긴 것. 배열 안의 글(지표 이름 등)은 건드리지 않는다. */
function longestCuttable(
  node: Record<string, unknown>,
): { holder: Record<string, unknown>; key: string; text: string } | null {
  let best: { holder: Record<string, unknown>; key: string; text: string } | null = null;
  const visit = (holder: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(holder)) {
      if (typeof value === "string") {
        if (value.length <= MIN_KEPT_CHARS + TRUNCATED_MARK.length) continue;
        if (!best || value.length > best.text.length) best = { holder, key, text: value };
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        visit(value as Record<string, unknown>);
      }
    }
  };
  visit(node);
  return best;
}
