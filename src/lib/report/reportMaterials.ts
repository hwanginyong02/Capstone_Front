/**
 * 고객이 제공한 재료 → 성적서에 찍을 줄, 그리고 AI 에 넘길 값.
 *
 * 무엇을 어디에 찍는지는 재료 목록이 정한다(capstone_md_file/1_입력_재료목록.md 의 "인쇄 위치").
 * 종전에는 성적서 구성 카드(⑤~⑨)와 ② 의 지표 선택 이유가 **저장만 되고** 성적서에도 AI 에도
 * 가지 않았다.
 *
 * 빈 값 표기는 재료 선택 점검 4.2 를 따른다.
 * - 2층 보고 항목인데 카드를 껐거나 "모름"이면 `null` → 성적서에 "제공되지 않음".
 * - 선택 항목이 비었으면 줄을 만들지 않는다.
 * - 이 작업 유형에 원래 없는 항목(해당 없음)도 줄을 만들지 않는다.
 *
 * 선택지는 영어 저장값으로 남고 화면·성적서는 한국어다. 성적서에 찍을 이름은 레지스트리의
 * `reportLabels` 가 정한다 — 매핑표를 여기 또 적으면 두 벌이 된다.
 */
import { getCard } from "../../data/reportComposer";
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

function entryOf(value: ComposerFieldValue | undefined, key: string): string {
  return value?.entries?.find((entry) => entry.key === key)?.value.trim() ?? "";
}

/** 숫자 칸의 값. 쉼표·공백은 걷어 낸다. 숫자가 아니거나 음수면 null. */
function countOf(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * 한 필드의 값을 성적서 문장으로. 비었거나 "모름"이면 null.
 *
 * 덧붙이는 글(`note`)은 우리 문장과 섞지 않도록 "의뢰자 덧붙임"으로 표시한다(재료 선택 점검 5절).
 */
export function describeValue(
  cardId: ComposerCardId,
  fieldId: string,
  value: ComposerFieldValue | undefined,
): string | null {
  if (!value || value.unknown) return null;
  const field = fieldOf(cardId, fieldId);

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
    const rows = (value.entries ?? []).filter((entry) => entry.value.trim() !== "");
    main = rows.length ? rows.map((entry) => `${entry.key} ${entry.value.trim()}`).join(" / ") : null;
  } else {
    main = value.text?.trim() || null;
  }

  const note = field.allowsNote ? value.note?.trim() : undefined;
  if (note) return main ? `${main} (의뢰자 덧붙임: ${note})` : `의뢰자 제공: ${note}`;
  return main;
}

/**
 * 2층 보고 항목 — 카드를 껐거나 값이 없으면 "제공되지 않음". `item` 은 그 줄이 속한 TS 4213 보고
 * 항목 번호(재료 선택 점검 4.2)다.
 */
function required(item: number, label: string, included: boolean, value: string | null): MaterialRow {
  return { label, value: included ? value : null, item };
}

/** 선택 항목 — 값이 있을 때만 줄을 만든다. */
function optional(label: string, included: boolean, value: string | null): MaterialRow[] {
  return included && value ? [{ label, value }] : [];
}

function trainingRows(c: ReportComposerInput): MaterialRow[] {
  const on = c.cards.trainingData;
  const v = c.trainingData;
  const describe = (fieldId: string) => describeValue("trainingData", fieldId, v[fieldId]);
  const volume = v.trainingVolume?.unknown ? undefined : v.trainingVolume;
  const count = (key: string) => {
    const parsed = countOf(entryOf(volume, key));
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
  const describe = (fieldId: string) => describeValue("testData", fieldId, c.testData[fieldId]);
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
  const describe = (fieldId: string) => describeValue("groundTruth", fieldId, v[fieldId]);
  const rows = [
    required(4, "정답 라벨 구축 방법", on, describe("labelAuthor")),
    required(5, "정답 라벨 신뢰성", on, describe("labelReview")),
  ];

  // 라벨러 수·일치도는 "복수 라벨러 합의"일 때만 받는다(신뢰성의 일부).
  const several = on && !v.labelReview?.unknown && v.labelReview?.text === "Several reviewers";
  if (!several) return rows;

  const count = countOf(v.labelReviewerCount?.text ?? "");
  rows.push({ label: "라벨러 수", value: count === null ? null : `${count}명`, item: 5 });

  const kind = v.labelAgreementKind;
  let agreement: string | null = null;
  if (kind?.text === "Not measured") {
    agreement = "측정 안 함"; // 제공된 답이다(서술 설계 D42).
  } else if (kind?.text) {
    const value = v.labelAgreementValue?.text?.trim();
    const name = choiceLabel("groundTruth", "labelAgreementKind", kind.text, kind.otherText);
    if (value) {
      agreement =
        kind.text === "Percent agreement" ? `${name} ${percentToRatio(value)}` : `${name} ${value}`;
    }
  }
  rows.push({ label: "라벨 일치도", value: agreement, item: 5 });
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
  // "모름"은 제공되지 않음으로 센다(재료 선택 점검 5절).
  const accel = (key: string) => {
    if (!on || gpu?.unknown) return null;
    const answer = entryOf(gpu, key);
    if (!answer || answer === "Unknown") return null;
    return choiceLabel("modelEnv", "gpuUsage", answer);
  };
  return [
    { label: "학습 가속", value: accel("Training"), item: 11 },
    { label: "추론 가속", value: accel("Inference"), item: 11 },
  ];
}

function hyperparameters(c: ReportComposerInput): ReportMaterials["hyperparameters"] {
  const on = c.cards.modelEnv;
  const algorithm = on ? describeValue("modelEnv", "algorithm", c.modelEnv.algorithm) : null;
  const table = c.modelEnv.hyperparameters;
  const rows =
    on && table && !table.unknown
      ? (table.entries ?? [])
          .filter((entry) => entry.key.trim() !== "" && entry.value.trim() !== "")
          .map((entry) => ({ name: entry.key.trim(), value: entry.value.trim() }))
      : [];
  return { algorithm, rows: rows.length > 0 ? rows : null };
}

function declarationRows(c: ReportComposerInput, taskType: TaskType): MaterialRow[] {
  const describe = (fieldId: string) =>
    describeValue("perspective", fieldId, c.perspective[fieldId]);
  // 선언은 1층 필수라 늘 채워져 있다. 이 유형에 없는 선언은 줄을 만들지 않는다(해당 없음).
  return [
    ...(taskType === "binary" ? [{ label: "위험 방향", value: describe("criticalErrorType") }] : []),
    ...(taskType !== "binary" ? [{ label: "클래스 중요도", value: describe("classPriority") }] : []),
    { label: "사용 방식", value: describe("usageMode") },
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
  const answer = c.perspective.classPriority;
  const averaging = answer?.unknown ? undefined : AVERAGING_BY_PRIORITY[answer?.text ?? ""];
  if (!averaging) return undefined;
  // 따옴표 안에는 선언 값(선택지의 성적서 이름)만 — 덧붙인 글은 의뢰자 선언 표에 있다.
  const declared = choiceLabel("perspective", "classPriority", answer!.text!);
  return `다중 클래스 지표의 평균 방식은 ${averaging}을 기준으로 한다. 의뢰자가 클래스 중요도를 "${declared}"${josaEuroRo(declared)} 밝혔기 때문이다.`;
}

/** 성적서 구성 카드의 값 → 성적서 자리별 줄. */
export function buildReportMaterials(
  composer: ReportComposerInput,
  taskType: TaskType,
): ReportMaterials {
  return {
    declarations: declarationRows(composer, taskType),
    averagingSentence: averagingSentence(composer, taskType),
    metricRationale:
      taskType === "multilabel"
        ? describeValue("metrics", "metricRationale", composer.metrics.metricRationale)
        : undefined,
    training: trainingRows(composer),
    test: testRows(composer),
    groundTruth: groundTruthRows(composer),
    environment: environmentRows(composer),
    hyperparameters: hyperparameters(composer),
  };
}

/** 줄 목록 → { 이름: 값 }. 제공되지 않은 값은 그 말로 적는다. */
function rowsToObject(rows: MaterialRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.label, row.value ?? NOT_PROVIDED]));
}

/** AI 에 넘기는 고객 입력. 키 이름은 백엔드 `NarrativeRequest.client_inputs` 와 맞춘다. */
export type ClientInputs = Record<string, unknown>;

export interface ClientInputsSource {
  composer: ReportComposerInput;
  materials: ReportMaterials;
  model: { name: string; version: string; purpose: string; category: string };
  reportPurposeNote: string;
  coreMetrics: string[];
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
      ? { metric_rationale: materials.metricRationale ?? NOT_PROVIDED }
      : {}),
    core_metrics: source.coreMetrics,
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
 * 프론트가 맞추는 길이 — 상한의 90%. 백엔드는 `json.dumps` 의 기본 구분자(", "·": ")로 재어 프론트의
 * `JSON.stringify` 보다 공백만큼 길게 센다. 그 차이와 배포 순서를 이 여유가 덮는다.
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
