/**
 * 재료 고르기 다이어그램의 끌어 놓기 종류와, 화면이 페이지에 알리는 동작(docs/MATERIAL_PICKER.md §11).
 *
 * 끌어 놓기는 react-dnd(HTML5 백엔드)로 한다. 모든 끌기에는 같은 일을 하는 버튼이 있다 — HTML5
 * 백엔드는 키보드로 끌 수 없고, 테스트도 버튼으로 같은 함수를 부른다.
 *
 * | 끄는 것 | 놓는 곳 | 하는 일 |
 * |---|---|---|
 * | 팔레트의 카드 | 다이어그램 | 그 카드를 넣는다(권장 항목 전부) |
 * | 팔레트의 항목 | 다이어그램 | 그 항목을 넣는다(카드가 빠져 있었으면 카드도) |
 * | 다이어그램의 카드 | 같은 레인의 카드 / 레인 아래 | 순서를 바꾼다 |
 * | 레인 머리 | 다른 레인 | 레인 순서를 바꾼다 |
 * | 다이어그램의 카드·칩 | 팔레트 | 뺀다 |
 */
import type { ComposerCardId, MaterialCategoryId } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";

export const DND = {
  paletteCard: "palette-card",
  paletteItem: "palette-item",
  node: "diagram-node",
  chip: "diagram-chip",
  lane: "diagram-lane",
} as const;

export interface CardDragItem {
  cardId: ComposerCardId;
}

export interface ItemDragItem {
  cardId: ComposerCardId;
  pickId: string;
}

export interface LaneDragItem {
  laneId: MaterialCategoryId;
}

/** 다이어그램과 팔레트가 페이지에 알리는 동작. 페이지가 규칙을 적용하고 스토어에 쓴다. */
export interface PickerActions {
  onTogglePick: (cardId: ComposerCardId, pickId: string) => void;
  onIncludeCard: (cardId: ComposerCardId) => void;
  onExcludeCard: (cardId: ComposerCardId) => void;
  onMoveCard: (cardId: ComposerCardId, targetCardId: ComposerCardId, position: DropPosition) => void;
  onMoveLane: (laneId: MaterialCategoryId, targetLaneId: MaterialCategoryId, position: DropPosition) => void;
}

/**
 * 놓은 자리가 대상의 앞쪽 절반이면 앞, 아니면 뒤. 세로(카드)는 위아래, 가로(레인)는 좌우로 본다.
 */
export function dropPosition(
  element: Element | null,
  pointer: { x: number; y: number } | null,
  axis: "x" | "y",
): DropPosition {
  if (!element || !pointer) return "after";
  const rect = element.getBoundingClientRect();
  const middle = axis === "y" ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
  return (axis === "y" ? pointer.y : pointer.x) < middle ? "before" : "after";
}
