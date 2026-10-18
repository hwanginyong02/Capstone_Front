/**
 * 넣은 카드의 필수 입력 점검.
 *
 * 규칙은 `docs/MATERIAL_PICKER.md` §5·§6 에서 온다(종전 규칙은 `docs/COMPOSER_COMPONENTS.md`
 * "구분 규칙").
 *
 * - **넣지 않은 카드는 아무것도 검사하지 않는다.** 그 카드의 표준 보고 항목은 성적서에
 *   "제공되지 않음"으로 찍힌다.
 * - **재료 고르기에서 체크하지 않은 권장·선택 필드는 그리지도 검사하지도 않는다**(`picks`).
 *   체크하지 않은 권장 항목은 성적서에 "제공되지 않음"으로 찍힌다.
 * - **받기로 한 필수·권장 필드는 비운 채 진행할 수 없다.** 모르면 "모름"을 고른다.
 * - **"알려진 것 없음"은 "모름"과 다르다.** 원문이 요구하는 답이라 **제공된 것으로 센다**.
 *   그래서 ⑥ 수집 환경 차이에는 "모름"이 없고, 대신 다른 선택지와 함께 고를 수 없다.
 *
 * 순수 함수다 — 스토어를 읽지 않고 값을 인자로 받는다. 화면은 결과로 `nextDisabled` 를
 * 만들어 `WorkflowShell` 에 넘긴다(가이드라인 §2 규칙 3).
 */
import { getCardFields, isFieldReceived } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import {
  MONTH_RANGE_KEYS,
  type ComposerCard,
  type ComposerField,
  type ComposerFieldValue,
  type ComposerValueMap,
  type FieldCondition,
  type NumberRange,
} from "../../types/reportComposer.types";

export interface FieldIssue {
  cardId: ComposerCard["id"];
  fieldId: string;
  label: string;
  /**
   * `missing` — 필수인데 비어 있다(Other 를 고르고 내용을 비운 것 포함).
   * `exclusive` — 배타 선택지를 다른 선택지와 함께 골랐다.
   * `outOfRange` — 숫자가 아니거나 허용 범위 밖이다.
   * `invalidPeriod` — 기간의 한쪽만 적었거나 시작이 끝보다 늦다.
   * `incompatible` — 고른 선택지가 다른 칸의 값과 맞지 않는다(⑧ 라벨러 2명인데 Fleiss의 카파).
   * `incompleteRow` — 줄을 추가하는 칸(⑨ 하이퍼파라미터)에 이름과 값 중 하나만 적은 줄이 있다(B6②).
   *
   * `missing`·`incompleteRow` 말고는 **지금 당장 틀린 값**이라 다음을 누르기 전부터 표시한다. 이 둘은
   * 아직 덜 적은 것이라(이름을 적고 값으로 넘어가는 중일 수 있다) 넘어가려 한 뒤에야 표시한다.
   */
  reason: "missing" | "exclusive" | "outOfRange" | "invalidPeriod" | "incompatible" | "incompleteRow";
  /** 화면에 그대로 적을 설명. `incompatible` 처럼 이유가 선택지마다 다른 경우에 쓴다. */
  message?: string;
  /**
   * 이 필드에 "모름" 이 있는가. 안내 문구가 "모르면 모름을 고르세요" 를 붙일지 정한다 —
   * ⑤ 평가 관점처럼 모름이 없는 필드에 그 말을 하면 있지도 않은 길을 알려주는 셈이다.
   */
  allowsUnknown: boolean;
}

/** 줄을 사용자가 추가하는 칸인가(⑨ 하이퍼파라미터) — 줄마다 이름과 값을 둘 다 적는다. */
export function isFreeEntriesField(field: ComposerField): boolean {
  return field.input === "entries" && !field.entryKeys && !field.entryKeysFrom;
}

/** 이름과 값을 둘 다 적은 줄만(B6②). 필수 점검과 성적서·AI(`reportMaterials` 의 하이퍼파라미터)가 같이 쓴다. */
export function completeEntryRows(
  entries: ReadonlyArray<{ key: string; value: string }> | undefined,
): Array<{ key: string; value: string }> {
  return (entries ?? []).filter((entry) => entry.key.trim() !== "" && entry.value.trim() !== "");
}

/** 이름과 값 중 하나만 적은 줄이 있는가. 둘 다 빈 줄은 아직 쓰지 않은 줄이라 세지 않는다. */
export function hasIncompleteRow(entries: ReadonlyArray<{ key: string; value: string }> | undefined): boolean {
  return (entries ?? []).some((entry) => (entry.key.trim() === "") !== (entry.value.trim() === ""));
}

/** `incompleteRow` 의 안내 — 칸 아래와 하단 한 줄이 같은 글을 쓴다. */
export const INCOMPLETE_ROW_MESSAGE = "이름과 값을 모두 적어 주세요.";

/**
 * 값이 채워져 있는가. "모름"은 채운 것으로 센다.
 *
 * `classNames` 는 클래스마다 칸을 만드는 필드(`entryKeysFrom: "classes"` — ⑥ 클래스별 데이터 양)가
 * 쓸 지금 클래스 목록이다(`evaluationClassNames`). 그 필드는 **지금 클래스를 모두** 채워야 한다(B5②) —
 * 옛 파일·옛 정답 컬럼의 키는 세지 않는다. 목록이 비면(클래스를 아직 모름) "모름"만 통과한다(N6:
 * 빈 목록의 `every` 는 참이라 빈칸이 통과하던 함정).
 */
export function hasValue(
  field: ComposerField,
  value: ComposerFieldValue | undefined,
  classNames: readonly string[] = [],
): boolean {
  if (!value) return false;
  // "모름" 은 성적서에 "제공되지 않음" 으로 찍히지만, 진행은 막지 않는다.
  if (value.unknown) return true;

  // "Other" 를 골랐으면 무엇인지 적어야 답한 것이다. 선택지만으로는 내용이 없다.
  if (isOtherChosen(field, value) && (value.otherText ?? "").trim() === "") return false;

  // 덧붙이는 글을 받는 필드는 맞는 선택지가 없을 때 글만 써도 답한 것이다(서술 설계 D26).
  if (field.allowsNote && (value.note ?? "").trim() !== "") return true;

  if (field.input === "multi") return (value.choices?.length ?? 0) > 0;

  if (field.input === "monthRange") {
    // 기간은 양 끝이 다 있어야 기간이다. 한쪽만 있는 것은 `invalidPeriod` 가 따로 잡는다.
    return Boolean(monthOf(value, MONTH_RANGE_KEYS.from) && monthOf(value, MONTH_RANGE_KEYS.to));
  }

  if (field.input === "entries") {
    const entries = value.entries ?? [];
    const filled = entries.filter((entry) => entry.value.trim() !== "");
    // 칸이 정해진 필드(⑥ 데이터 양, ⑨ GPU 사용 여부)는 **전부** 채워야 한다.
    if (field.entryKeys) {
      return field.entryKeys.every((key) =>
        filled.some((entry) => entry.key === key),
      );
    }
    // 클래스마다 칸이 있는 필드는 지금 클래스를 모두 채워야 한다(B5②). 목록이 비면 모름만 통과(N6).
    if (field.entryKeysFrom === "classes") {
      return (
        classNames.length > 0 &&
        classNames.every((name) => filled.some((entry) => entry.key === name))
      );
    }
    // 줄을 사용자가 추가하는 필드(⑨ 하이퍼파라미터)는 이름과 값을 다 적은 줄이 하나는 있어야 한다(B6②).
    // 종전에는 값만 적은 줄도 채운 것으로 세고, 성적서는 그 줄을 버려 '제공되지 않음'이 찍혔다.
    if (isFreeEntriesField(field)) return completeEntryRows(entries).length > 0;
    return filled.length > 0;
  }

  return (value.text ?? "").trim() !== "";
}

/** `otherChoice` 가 골라져 있는가. 하나 고르기·여럿 고르기 모두 본다. */
export function isOtherChosen(field: ComposerField, value: ComposerFieldValue | undefined): boolean {
  if (!field.otherChoice || !value) return false;
  if (field.input === "multi") return (value.choices ?? []).includes(field.otherChoice);
  return value.text === field.otherChoice;
}

/** `monthRange` 한쪽 끝의 값("YYYY-MM"). 비어 있으면 "". */
export function monthOf(value: ComposerFieldValue | undefined, key: string): string {
  return (value?.entries ?? []).find((entry) => entry.key === key)?.value.trim() ?? "";
}

/**
 * 이 숫자 칸에 지금 적용할 허용 범위. 없으면 `null`(검사하지 않음).
 *
 * `numberRangeBy` 는 같은 카드의 다른 답에 따라 범위를 고른다 — ⑧ 라벨 일치도 값은 단순
 * 일치율이면 0~100(%), 카파·알파면 −1~1 이다. 화면의 안내 문구도 이 값을 쓴다.
 */
export function rangeFor(field: ComposerField, values: ComposerValueMap): NumberRange | null {
  if (field.numberRangeBy) {
    const chosen = values[field.numberRangeBy.field]?.text ?? "";
    return field.numberRangeBy.ranges[chosen] ?? null;
  }
  return field.numberRange ?? null;
}

/**
 * 값이 **있는데 틀렸는가.** 비어 있는 것은 여기서 보지 않는다 — 그건 필수 점검의 몫이고,
 * 선택 필드를 비워 두는 것은 허용된다.
 */
function invalidReason(
  field: ComposerField,
  value: ComposerFieldValue | undefined,
  values: ComposerValueMap,
  classNames: readonly string[],
): { reason: "outOfRange" | "invalidPeriod" | "incompatible"; message?: string } | null {
  if (!value || value.unknown) return null;

  const range = field.input === "number" ? rangeFor(field, values) : null;
  if (range) {
    const raw = (value.text ?? "").trim();
    if (raw === "") return null;
    const parsed = Number(raw);
    const { min, max, integer } = range;
    if (!Number.isFinite(parsed)) return { reason: "outOfRange" };
    if (parsed < min || (max !== undefined && parsed > max)) return { reason: "outOfRange" };
    if (integer && !Number.isInteger(parsed)) return { reason: "outOfRange" };
    return null;
  }

  // 숫자 칸 묶음(⑥ 학습·검증 표본 수, 클래스별 데이터 양)은 건수라 0 이상의 정수만 받는다.
  // 종전에는 숫자 키패드만 띄우고 검사하지 않아 글자를 넣어도 통과했다(재료 목록 6절).
  if (field.input === "entries" && field.numeric) {
    // 클래스마다 칸이 있는 필드는 지금 클래스의 칸만 본다 — 옛 클래스 칸은 화면에 없어 고칠 수 없다.
    const shown =
      field.entryKeysFrom === "classes"
        ? (value.entries ?? []).filter((entry) => classNames.includes(entry.key))
        : (value.entries ?? []);
    const wrong = shown.some((entry) => {
      const raw = entry.value.trim();
      if (raw === "") return false;
      const count = Number(raw.replace(/,/g, ""));
      return !Number.isInteger(count) || count < 0;
    });
    return wrong ? { reason: "outOfRange", message: "0 이상의 정수로 적어 주세요." } : null;
  }

  // 고른 선택지가 다른 칸의 숫자와 맞는가(⑧ Cohen의 카파는 2명, Fleiss의 카파는 3명 이상).
  const rule = value.text ? field.choiceRequires?.[value.text] : undefined;
  if (rule) {
    const raw = (values[rule.field]?.text ?? "").trim();
    const count = Number(raw);
    // 조건 칸이 비었거나 숫자가 아니면 여기서 따지지 않는다 — 그 칸의 점검이 따로 잡는다.
    if (raw !== "" && Number.isFinite(count)) {
      const tooFew = rule.min !== undefined && count < rule.min;
      const tooMany = rule.max !== undefined && count > rule.max;
      if (tooFew || tooMany) return { reason: "incompatible", message: rule.message };
    }
  }

  if (field.input === "monthRange") {
    const from = monthOf(value, MONTH_RANGE_KEYS.from);
    const to = monthOf(value, MONTH_RANGE_KEYS.to);
    if (from === "" && to === "") return null;
    if (from === "" || to === "") return { reason: "invalidPeriod" };
    // "YYYY-MM" 은 글자 순서가 곧 시간 순서다.
    if (from > to) return { reason: "invalidPeriod" };
    return null;
  }

  return null;
}

/**
 * 조건 하나가 성립하는가.
 *
 * 조건이 걸린 답에 "모름"을 체크했으면 성립하지 않는다. 종전에는 "복수 검수"를 고른 뒤 모름을
 * 체크해도 고른 글자가 남아 있어 라벨러 수 칸이 계속 필수였다.
 */
function conditionHolds(condition: FieldCondition, values: ComposerValueMap): boolean {
  const trigger = values[condition.field];
  if (!trigger || trigger.unknown) return false;
  const text = trigger.text ?? "";
  if (condition.equals !== undefined && text !== condition.equals) return false;
  if (condition.in !== undefined && !condition.in.includes(text)) return false;
  return condition.equals !== undefined || condition.in !== undefined;
}

/** 조건부 필드가 지금 필수인가. 조건을 기계가 읽을 수 없는 필드는 여기서 강제하지 않는다. */
function isConditionalRequired(field: ComposerField, values: ComposerValueMap): boolean {
  if (!field.requiredWhen) return false;
  const conditions = Array.isArray(field.requiredWhen) ? field.requiredWhen : [field.requiredWhen];
  return conditions.every((condition) => conditionHolds(condition, values));
}

/** 이 필드를 지금 반드시 입력해야 하는가. */
export function isFieldRequired(field: ComposerField, values: ComposerValueMap): boolean {
  if (field.kind === "required") return true;
  if (field.kind === "conditional") return isConditionalRequired(field, values);
  return false;
}

/**
 * 이 필드를 지금 화면에 그릴 것인가.
 *
 * 조건부 필드는 "특정 조건에서만 **나타나고**, 나타나면 필수"다
 * (docs/MATERIAL_PICKER.md §6, 종전 docs/COMPOSER_COMPONENTS.md "구분 규칙"). 조건이 성립하기
 * 전에 보여주면 사용자가 왜 비어 있는 칸이 있는지 알 수 없다.
 *
 * 조건을 기계가 읽을 수 없는 필드(② 의 β 는 지표 선택에 달려 있다)는 늘 그린다 — 그 조건을
 * 아는 화면이 따로 다룬다.
 */
export function isFieldVisible(
  field: ComposerField,
  values: ComposerValueMap,
  picked = true,
): boolean {
  // 재료 고르기에서 받지 않기로 한 필드는 그리지 않는다(docs/MATERIAL_PICKER.md §5).
  if (!picked) return false;
  if (field.kind !== "conditional" || !field.requiredWhen) return true;
  return isConditionalRequired(field, values);
}

/**
 * 필드 하나의 문제. 없으면 `null`.
 *
 * 카드 전체가 아니라 필드 하나만 검사해야 하는 화면이 있다 — ② 카드는 지표·β·지표 선택
 * 이유·합격 기준이 각각 다른 화면에서 받아, 지표 화면이 카드 전체를 검사하면 다른 화면의
 * 칸까지 걸린다. `values` 는 같은 카드의 값 전체다(조건부 필드의 조건을 읽는다).
 */
export function getFieldIssue(
  card: ComposerCard,
  field: ComposerField,
  values: ComposerValueMap,
  picks?: readonly string[],
  classNames: readonly string[] = [],
): FieldIssue | null {
  // 전용 화면이 받는 필드는 그 화면이 검사한다 — 값이 카드 값 모음 밖에 있어 여기서는 늘 빈칸으로 보인다.
  if (field.dedicatedScreen) return null;
  // 그려지지 않은 필드(받지 않기로 했거나, 조건을 정하는 필드를 받지 않거나, 조건이 성립하지 않음)에
  // 남은 값은 따지지 않는다 — 사용자가 고칠 수 없다(B2: ⑧ 검수 방식을 뺐는데 남은 'Several
  // reviewers' 때문에 라벨러 수가 필수로 남던 문제).
  if (!isFieldVisible(field, values, isFieldReceived(card, field, picks))) return null;

  const value = values[field.id];
  const issue = (reason: FieldIssue["reason"]): FieldIssue => ({
    cardId: card.id,
    fieldId: field.id,
    label: field.label,
    reason,
    allowsUnknown: Boolean(field.allowsUnknown),
  });

  const invalid = invalidReason(field, value, values, classNames);
  if (invalid) {
    const base = issue(invalid.reason);
    return invalid.message ? { ...base, message: invalid.message } : base;
  }

  if (field.exclusiveChoice) {
    const chosen = value?.choices ?? [];
    if (chosen.includes(field.exclusiveChoice) && chosen.length > 1) return issue("exclusive");
  }

  // 이름만, 또는 값만 적은 줄 — 성적서는 이 줄을 버리므로 받지 않는다(B6②). 모름이면 따지지 않는다.
  if (isFreeEntriesField(field) && !value?.unknown && hasIncompleteRow(value?.entries)) {
    return { ...issue("incompleteRow"), message: INCOMPLETE_ROW_MESSAGE };
  }

  if (isFieldRequired(field, values) && !hasValue(field, value, classNames)) return issue("missing");

  return null;
}

/**
 * 카드 하나의 문제 목록. 넣지 않은 카드면 빈 배열이다.
 *
 * `picks` 는 재료 고르기에서 이 카드에 고른 항목이다. 없으면 모든 필드를 받는 것으로 본다.
 * 받기로 한 선택 필드는 비어 있어도 걸리지 않지만, 값을 **틀리게** 적은 것(범위 밖 숫자,
 * 뒤집힌 기간)은 걸린다. `classNames` 는 클래스마다 칸이 있는 필드가 쓸 지금 클래스 목록이다(`hasValue`).
 */
export function getCardIssues(
  card: ComposerCard,
  taskType: TaskType | "",
  values: ComposerValueMap,
  included: boolean,
  picks?: readonly string[],
  classNames: readonly string[] = [],
): FieldIssue[] {
  if (!included) return [];

  return getCardFields(card.id, taskType)
    .map((field) => getFieldIssue(card, field, values, picks, classNames))
    .filter((issue): issue is FieldIssue => issue !== null);
}

/** 넣은 카드의 필수 입력이 모두 채워졌는가. */
export function isCardComplete(
  card: ComposerCard,
  taskType: TaskType | "",
  values: ComposerValueMap,
  included: boolean,
  picks?: readonly string[],
  classNames: readonly string[] = [],
): boolean {
  return getCardIssues(card, taskType, values, included, picks, classNames).length === 0;
}
