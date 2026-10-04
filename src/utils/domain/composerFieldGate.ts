/**
 * 켠 카드의 필수 입력 점검.
 *
 * 규칙은 `docs/COMPOSER_COMPONENTS.md` "구분 규칙"과 그 문서의 열린 결정에서 온다.
 *
 * - **카드를 끄면 아무것도 검사하지 않는다.** 끄는 것은 허용된 선택이고, 그때 그 카드의
 *   표준 보고 항목은 성적서에 "제공되지 않음"으로 찍힌다.
 * - **카드를 켰으면 그 안의 필수 필드는 비운 채 진행할 수 없다.** 모르면 "모름"을 고른다.
 * - **"알려진 것 없음"은 "모름"과 다르다.** 원문이 요구하는 답이라 **제공된 것으로 센다**.
 *   그래서 ⑥ 수집 환경 차이에는 "모름"이 없고, 대신 다른 선택지와 함께 고를 수 없다.
 *
 * 순수 함수다 — 스토어를 읽지 않고 값을 인자로 받는다. 화면은 결과로 `nextDisabled` 를
 * 만들어 `WorkflowShell` 에 넘긴다(가이드라인 §2 규칙 3).
 */
import { getCardFields } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerField,
  ComposerFieldValue,
  ComposerValueMap,
} from "../../types/reportComposer.types";

export interface FieldIssue {
  cardId: ComposerCard["id"];
  fieldId: string;
  label: string;
  /**
   * `missing` — 필수인데 비어 있다.
   * `exclusive` — 배타 선택지를 다른 선택지와 함께 골랐다.
   */
  reason: "missing" | "exclusive";
  /**
   * 이 필드에 "모름" 이 있는가. 안내 문구가 "모르면 모름을 고르세요" 를 붙일지 정한다 —
   * ⑤ 평가 관점처럼 모름이 없는 필드에 그 말을 하면 있지도 않은 길을 알려주는 셈이다.
   */
  allowsUnknown: boolean;
}

/** 값이 채워져 있는가. "모름"은 채운 것으로 센다. */
export function hasValue(field: ComposerField, value: ComposerFieldValue | undefined): boolean {
  if (!value) return false;
  // "모름" 은 성적서에 "제공되지 않음" 으로 찍히지만, 진행은 막지 않는다.
  if (value.unknown) return true;

  if (field.input === "multi") return (value.choices?.length ?? 0) > 0;

  if (field.input === "entries") {
    const entries = value.entries ?? [];
    const filled = entries.filter((entry) => entry.value.trim() !== "");
    // 칸이 정해진 필드(⑥ 데이터 양, ⑨ GPU 사용 여부)는 **전부** 채워야 한다.
    if (field.entryKeys) {
      return field.entryKeys.every((key) =>
        filled.some((entry) => entry.key === key),
      );
    }
    // 줄을 사용자가 추가하거나(⑨ 하이퍼파라미터) 업로드한 클래스에서 만드는 필드는
    // 적어도 한 줄이 채워져 있으면 된다 — 클래스 수를 여기서 알 수 없다.
    return filled.length > 0;
  }

  return (value.text ?? "").trim() !== "";
}

/** 조건부 필드가 지금 필수인가. 조건을 기계가 읽을 수 없는 필드는 여기서 강제하지 않는다. */
function isConditionalRequired(field: ComposerField, values: ComposerValueMap): boolean {
  if (!field.requiredWhen) return false;
  const trigger = values[field.requiredWhen.field];
  return (trigger?.text ?? "") === field.requiredWhen.equals;
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
 * (docs/COMPOSER_COMPONENTS.md "구분 규칙"). 조건이 성립하기 전에 보여주면 사용자가 왜 비어
 * 있는 칸이 있는지 알 수 없다.
 *
 * 조건을 기계가 읽을 수 없는 필드(② 의 β 는 지표 선택에 달려 있다)는 늘 그린다 — 그 조건을
 * 아는 화면이 따로 다룬다.
 */
export function isFieldVisible(field: ComposerField, values: ComposerValueMap): boolean {
  if (field.kind !== "conditional" || !field.requiredWhen) return true;
  return isConditionalRequired(field, values);
}

/**
 * 카드 하나의 문제 목록. 카드를 끄면 빈 배열이다.
 *
 * 더보기로 접히는 필드도 검사 대상이다 — 접혀 있다고 면제되면 사용자가 그 필드의 존재를
 * 모른 채 막히게 된다. 다만 더보기 필드는 전부 `optional` 이라 실제로는 걸리지 않는다.
 */
export function getCardIssues(
  card: ComposerCard,
  taskType: TaskType | "",
  values: ComposerValueMap,
  included: boolean,
): FieldIssue[] {
  if (!included) return [];

  const issues: FieldIssue[] = [];

  for (const field of getCardFields(card.id, taskType)) {
    const value = values[field.id];

    if (field.exclusiveChoice) {
      const chosen = value?.choices ?? [];
      if (chosen.includes(field.exclusiveChoice) && chosen.length > 1) {
        issues.push({
          cardId: card.id,
          fieldId: field.id,
          label: field.label,
          reason: "exclusive",
          allowsUnknown: Boolean(field.allowsUnknown),
        });
        continue;
      }
    }

    if (isFieldRequired(field, values) && !hasValue(field, value)) {
      issues.push({
        cardId: card.id,
        fieldId: field.id,
        label: field.label,
        reason: "missing",
        allowsUnknown: Boolean(field.allowsUnknown),
      });
    }
  }

  return issues;
}

/** 켠 카드의 필수 입력이 모두 채워졌는가. */
export function isCardComplete(
  card: ComposerCard,
  taskType: TaskType | "",
  values: ComposerValueMap,
  included: boolean,
): boolean {
  return getCardIssues(card, taskType, values, included).length === 0;
}
