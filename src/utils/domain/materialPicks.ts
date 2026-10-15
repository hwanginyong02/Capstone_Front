/**
 * 재료 고르기 화면의 규칙(docs/MATERIAL_PICKER.md §4·§7) — 순수 함수만 둔다.
 *
 * 저장은 "그 카드에서 무엇을 받을지 확정"하는 것이고 값 입력이 아니다. 화면에 남은 체크(초안)와
 * 저장한 체크(`materialPicks`)를 따로 들고, 아래 함수들은 저장한 쪽만 보고 판단한다 — 저장하지
 * 않은 체크는 반영되지 않는다(§7).
 *
 * 쓰는 곳: `pages/MaterialPicker.tsx`, `components/material-picker/*`.
 */
import type { TaskType } from "../../data/evaluationData";
import {
  catalogCards,
  getCard,
  getCardFields,
  isFieldPicked,
  pickKind,
  pickableIds,
} from "../../data/reportComposer";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerField,
  MaterialCategory,
  MaterialPicks,
} from "../../types/reportComposer.types";

/** 그 카드를 저장했는지. 빈 배열로 저장한 것도 저장이다("넣지 않기로 확정"). */
export function isCardSaved(picks: MaterialPicks, cardId: ComposerCardId): boolean {
  return picks[cardId] !== undefined;
}

/** 저장한 체크 수. 저장하지 않았으면 0. */
export function savedPickCount(picks: MaterialPicks, cardId: ComposerCardId): number {
  return picks[cardId]?.length ?? 0;
}

/**
 * 화면의 체크가 저장한 것과 다른지. 순서는 보지 않는다.
 * 저장하지 않은 카드는 "아무것도 고르지 않음"과 비교한다.
 */
export function isDraftDirty(draft: string[], saved: string[] | undefined): boolean {
  const a = [...draft].sort().join("|");
  const b = [...(saved ?? [])].sort().join("|");
  return a !== b;
}

/** 저장할 체크 — 이 유형에서 고를 수 있는 항목만, 화면 순서로. */
export function picksToSave(
  cardId: ComposerCardId,
  taskType: TaskType | "",
  draft: string[],
): string[] {
  return pickableIds(cardId, taskType).filter((id) => draft.includes(id));
}

/**
 * 오른쪽 "입력 순서"에 나오는 카드(§4) — 필수 카드와, 항목을 하나 이상 골라 저장한 선택 카드를
 * 카탈로그 순서로. 이 순서가 그대로 입력 순서다(§1).
 */
export function inputOrderCards(taskType: TaskType | "", picks: MaterialPicks): ComposerCard[] {
  return catalogCards(taskType).filter((card) => card.locked || savedPickCount(picks, card.id) > 0);
}

/** 아직 저장하지 않은 필수 카드. 하나라도 있으면 다음으로 넘어가지 않는다(§7). */
export function unsavedRequiredCards(taskType: TaskType | "", picks: MaterialPicks): ComposerCard[] {
  return catalogCards(taskType).filter((card) => card.locked && !isCardSaved(picks, card.id));
}

/** 필수 카드 수와 그중 저장한 수 — "필수 5개 중 N개 저장"(§4). */
export function requiredProgress(
  taskType: TaskType | "",
  picks: MaterialPicks,
): { total: number; saved: number } {
  const required = catalogCards(taskType).filter((card) => card.locked);
  return {
    total: required.length,
    saved: required.filter((card) => isCardSaved(picks, card.id)).length,
  };
}

/**
 * 대분류 안의 필수 카드를 모두 저장했는지(§7). 필수 카드가 없는 대분류는 저장 표시를 하지
 * 않는다 — 지금은 네 대분류 모두 필수 카드가 있다.
 */
export function isCategoryComplete(category: MaterialCategory, picks: MaterialPicks): boolean {
  const required = category.cardIds.filter((id) => getCard(id).locked);
  return required.length > 0 && required.every((id) => isCardSaved(picks, id));
}

/** 카드 하나에서 고르지 않은 권장 항목. */
export interface MissingRecommended {
  card: ComposerCard;
  fields: ComposerField[];
}

/**
 * 고르지 않은 권장 항목을 카드별로, 카탈로그 순서로(docs/MATERIAL_PICKER.md §5·§6).
 *
 * 권장 항목은 선택 카드 안의 표준 보고 항목이다. 고르지 않으면 성적서에 "제공되지 않음"으로 찍히므로
 * 확인과 생성 단계에서 앞에 알린다. 저장하지 않은 선택 카드는 아무것도 고르지 않은 것으로 본다.
 */
export function missingRecommended(taskType: TaskType | "", picks: MaterialPicks): MissingRecommended[] {
  return catalogCards(taskType)
    .filter((card) => !card.locked)
    .map((card) => ({
      card,
      fields: getCardFields(card.id, taskType).filter(
        (field) =>
          pickKind(card, field) === "recommended" && !isFieldPicked(card, field, picks[card.id] ?? []),
      ),
    }))
    .filter((item) => item.fields.length > 0);
}
