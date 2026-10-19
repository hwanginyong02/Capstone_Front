/**
 * 입력 순서 — 사용자가 재료 고르기 다이어그램에서 정한 카드 순서(docs/MATERIAL_PICKER.md §11).
 *
 * 다이어그램은 대분류 4열 레인이다. 레인을 좌우로 끌면 대분류 순서가, 레인 안의 카드를 위아래로
 * 끌면 그 대분류 안의 카드 순서가 바뀐다. 입력 순서는 왼쪽 레인부터, 레인 안에서는 위부터 읽은
 * 순서다. 그래서 대분류끼리는 섞이지 않는다 — 순서는 평탄한 카드 목록 하나로 들되, 같은 대분류의
 * 카드가 늘 붙어 있게 맞춘다(`normalizeCardOrder`).
 *
 * 넣지 않은 선택 카드도 목록에 자리를 갖는다. 다이어그램에는 보이지 않고, 넣으면 그 레인 맨
 * 아래로 온다(`placeAtLaneEnd`).
 *
 * 순서는 마음대로지만 앞 카드의 답으로 그려지는 카드가 셋 있다(`ORDER_RULES`). 그 규칙을 깨는
 * 자리에 놓으면 화면이 원래 자리로 돌리고 이유를 보인다.
 *
 * 여기 함수들은 전부 순수하다 — 스토어를 읽지 않는다. 드래그 앤 드롭과 키보드 이동 버튼이 같은
 * 함수를 부른다.
 */
import { MATERIAL_CATEGORIES, categoryOf, getCard } from "../../data/reportComposer";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerSelection,
  MaterialCategory,
  MaterialCategoryId,
  OptionalCardId,
} from "../../types/reportComposer.types";

/** 처음 순서 — 카탈로그 순서(의뢰 정보 → 모델 → 데이터 → 평가 기준). */
export const DEFAULT_CARD_ORDER: ComposerCardId[] = MATERIAL_CATEGORIES.flatMap(
  (category) => category.cardIds,
);

const KNOWN = new Set<string>(DEFAULT_CARD_ORDER);

/**
 * 저장된 순서를 쓸 수 있는 모양으로 맞춘다.
 *
 * - 모르는 id 와 중복은 버리고, 빠진 카드는 기본 순서대로 그 레인 끝에 더한다.
 * - 같은 대분류의 카드가 붙어 있게 모은다. 레인 순서는 그 대분류 카드가 처음 나온 자리다.
 */
export function normalizeCardOrder(order: readonly unknown[] | null | undefined): ComposerCardId[] {
  const seen = new Set<ComposerCardId>();
  const known: ComposerCardId[] = [];
  for (const id of Array.isArray(order) ? order : []) {
    if (typeof id !== "string" || !KNOWN.has(id) || seen.has(id as ComposerCardId)) continue;
    seen.add(id as ComposerCardId);
    known.push(id as ComposerCardId);
  }
  for (const id of DEFAULT_CARD_ORDER) {
    if (!seen.has(id)) known.push(id);
  }

  const lanes: MaterialCategoryId[] = [];
  for (const id of known) {
    const lane = categoryOf(id).id;
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  return lanes.flatMap((lane) => known.filter((id) => categoryOf(id).id === lane));
}

/** 레인(대분류) 순서. */
export function laneOrder(order: readonly ComposerCardId[]): MaterialCategory[] {
  const lanes: MaterialCategory[] = [];
  for (const id of normalizeCardOrder(order)) {
    const lane = categoryOf(id);
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  return lanes;
}

/** 한 레인의 카드를 순서대로. 넣지 않은 카드도 들어 있다. */
export function laneCards(order: readonly ComposerCardId[], laneId: MaterialCategoryId): ComposerCardId[] {
  return normalizeCardOrder(order).filter((id) => categoryOf(id).id === laneId);
}

export type DropPosition = "before" | "after";

/**
 * 레인 하나를 다른 레인의 앞이나 뒤로 옮긴다. 같은 레인이면 그대로 돌려준다.
 */
export function moveLane(
  order: readonly ComposerCardId[],
  laneId: MaterialCategoryId,
  targetLaneId: MaterialCategoryId,
  position: DropPosition,
): ComposerCardId[] {
  const current = normalizeCardOrder(order);
  if (laneId === targetLaneId) return current;
  const lanes = laneOrder(current)
    .map((lane) => lane.id)
    .filter((id) => id !== laneId);
  const at = lanes.indexOf(targetLaneId) + (position === "after" ? 1 : 0);
  lanes.splice(at, 0, laneId);
  return lanes.flatMap((lane) => laneCards(current, lane));
}

/**
 * 카드 하나를 **같은 레인의** 다른 카드 앞이나 뒤로 옮긴다. 다른 레인의 카드면 그대로 돌려준다 —
 * 대분류끼리는 섞이지 않는다.
 */
export function moveCard(
  order: readonly ComposerCardId[],
  cardId: ComposerCardId,
  targetCardId: ComposerCardId,
  position: DropPosition,
): ComposerCardId[] {
  const current = normalizeCardOrder(order);
  if (cardId === targetCardId || categoryOf(cardId).id !== categoryOf(targetCardId).id) {
    return current;
  }
  const rest = current.filter((id) => id !== cardId);
  const at = rest.indexOf(targetCardId) + (position === "after" ? 1 : 0);
  rest.splice(at, 0, cardId);
  return rest;
}

/**
 * 카드를 그 레인의 맨 끝으로 보낸다. 선택 카드를 새로 넣을 때 쓴다 — 넣은 카드는 레인 맨 아래에
 * 나타난다. 레인 끝은 그 레인의 어떤 카드보다 뒤라 `ORDER_RULES` 를 새로 깨지 않는다.
 */
export function placeAtLaneEnd(order: readonly ComposerCardId[], cardId: ComposerCardId): ComposerCardId[] {
  const current = normalizeCardOrder(order);
  const lane = laneCards(current, categoryOf(cardId).id);
  const last = lane[lane.length - 1];
  return last === cardId ? current : moveCard(current, cardId, last, "after");
}

/**
 * 블록을 흐름에 처음 놓은 뒤의 순서. 스토어(`applyMaterialPicks`)와 흐름도의 놓을 자리 미리보기가
 * 이 함수 하나를 쓴다 — 미리 보인 자리와 실제로 놓이는 자리가 갈리지 않게.
 *
 * - 꺼져 있던 선택 블록은 레인 끝으로 간다(`placeAtLaneEnd`).
 * - 잠긴 블록과 이미 켜진 선택 블록은 제자리다. 잠긴 블록을 레인 끝으로 보내면 ⑥ 을 먼저 놓고 ① 을
 *   놓을 때 ① 이 ⑥ 뒤로 가 `ORDER_RULES` 를 깬다. 잠긴 블록은 순서 목록에 늘 들어 있어 제자리가
 *   이미 규칙을 지킨다.
 */
export function orderAfterPlacing(
  order: readonly ComposerCardId[],
  selection: ComposerSelection,
  cardId: ComposerCardId,
): ComposerCardId[] {
  const card = getCard(cardId);
  if (card.locked || selection[cardId as OptionalCardId]) return normalizeCardOrder(order);
  return placeAtLaneEnd(order, cardId);
}

/** 들어간 카드인지 — 필수 카드는 늘, 선택 카드는 넣었을 때. */
export function isCardIncluded(card: ComposerCard, selection: ComposerSelection): boolean {
  return card.locked || Boolean(selection[card.id as OptionalCardId]);
}

/** 들어간 카드를 입력 순서대로. 이 순서가 그대로 단계 순서다(`buildStepList`). */
export function includedCardsInOrder(
  order: readonly ComposerCardId[],
  selection: ComposerSelection,
): ComposerCard[] {
  return normalizeCardOrder(order)
    .map(getCard)
    .filter((card) => isCardIncluded(card, selection));
}

/** "앞 카드가 뒤 카드보다 먼저 와야 한다"는 규칙 하나. */
export interface OrderRule {
  first: ComposerCardId;
  then: ComposerCardId;
  message: string;
}

/**
 * 깨면 놓지 못하는 순서 규칙. 뒤 카드의 입력 화면이 앞 카드에서 받은 답으로 그려진다.
 *
 * - 지표와 합격 기준은 컬럼 매핑 결과로 계산할 수 있는 지표를 정한다(`metricAvailability`).
 * - 학습 데이터의 클래스별 데이터 양은 평가 데이터에서 찾은 클래스 목록으로 칸을 만든다.
 * - 지표 화면의 목적별 점검·추천 지표는 평가 관점의 답을 읽는다. 종전에는 막지 않는 권고였지만,
 *   관점이 뒤면 추천 없이 지표를 고르게 돼 규칙으로 올렸다(D4, 2026-10-18).
 *
 * 레인으로 보면 '평가 기준' 레인은 '데이터' 레인 뒤에만 올 수 있다. 판정은 잠긴 카드를 늘 포함한
 * 들어간 카드 집합으로 한다 — 흐름도에 아직 놓이지 않은 블록도 자리를 지킨다.
 */
export const ORDER_RULES: OrderRule[] = [
  {
    first: "evalData",
    then: "metrics",
    message:
      "평가 기준 단계는 데이터 단계보다 앞에 둘 수 없어요. 지표와 합격 기준 블록이 평가 데이터 블록의 컬럼 매핑 결과로 계산할 수 있는 지표를 정하기 때문이에요.",
  },
  {
    first: "evalData",
    then: "trainingData",
    message:
      "학습 데이터 블록은 평가 데이터 블록 뒤에 둬야 해요. 클래스별 데이터 양을 평가 데이터의 클래스 목록으로 받기 때문이에요.",
  },
  {
    first: "perspective",
    then: "metrics",
    message:
      "지표와 합격 기준 블록은 평가 관점 블록 뒤에 둬야 해요. 평가 관점의 답으로 지표를 추천하기 때문이에요.",
  },
];

/** 들어간 카드의 순서가 깬 규칙의 안내. 깬 것이 없으면 null. 둘 중 하나라도 빠진 규칙은 보지 않는다. */
export function orderViolation(cards: readonly ComposerCardId[]): string | null {
  const broken = ORDER_RULES.find((rule) => {
    const first = cards.indexOf(rule.first);
    const then = cards.indexOf(rule.then);
    return first >= 0 && then >= 0 && then < first;
  });
  return broken?.message ?? null;
}
