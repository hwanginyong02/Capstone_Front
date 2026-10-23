/**
 * 평가 흐름 만들기의 끌어 놓기 종류와, 화면이 페이지에 알리는 동작(docs/MATERIAL_PICKER.md §12.3).
 *
 * 끌어 놓기는 react-dnd(HTML5 백엔드)로 한다. 모든 끌기에는 같은 일을 하는 버튼이 있다 — HTML5
 * 백엔드는 키보드·터치로 끌 수 없고, 테스트도 버튼으로 같은 함수를 부른다.
 *
 * | 끄는 것 | 놓는 곳 | 하는 일 | 같은 일을 하는 버튼 |
 * |---|---|---|---|
 * | 트리의 항목 | 흐름도 | 그 항목을 넣는다 | 트리 ＋, 이름 두 번 누르기, 팝업 [넣기] |
 * | 흐름도의 블록 | 같은 단계의 블록 / 단계 아래 | 순서를 바꾼다 | 블록 ▲▼ |
 * | 단계 머리 | 다른 단계 | 단계 순서를 바꾼다 | 단계 ◀▶ |
 * | 흐름도의 블록·칩 | 트리 | 뺀다 | 블록 ✕, 칩 ✕ |
 */
import type { ComposerCardId, MaterialCategoryId } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";

export const DND = {
  paletteItem: "palette-item",
  node: "diagram-node",
  chip: "diagram-chip",
  lane: "diagram-lane",
} as const;

export interface CardDragItem {
  cardId: ComposerCardId;
}

/** 트리의 항목·흐름도의 칩. */
export interface LeafDragItem {
  cardId: ComposerCardId;
  leafId: string;
  label: string;
}

export interface LaneDragItem {
  laneId: MaterialCategoryId;
}

/** 트리·흐름도·팝업이 페이지에 알리는 동작. 페이지가 규칙을 적용하고 스토어에 쓴다. */
export interface PickerActions {
  /** 항목을 넣거나 뺀다(＋·✓·칩 ✕·팝업 버튼). */
  onToggleLeaf: (cardId: ComposerCardId, leafId: string) => void;
  /** 항목을 넣는다. 이미 넣었으면 그대로다(두 번 누르기·끌어 놓기·빠진 항목 보기). */
  onPlaceLeaf: (cardId: ComposerCardId, leafId: string) => void;
  /** 블록째 넣기 — 필수·권장 항목 전부(`blockFillIds`). */
  onPlaceBlock: (cardId: ComposerCardId) => void;
  /** 블록을 흐름에서 뺀다 — 필수 블록도 뺄 수 있다(다시 "다음"이 막힐 뿐). */
  onRemoveBlock: (cardId: ComposerCardId) => void;
  onMoveCard: (cardId: ComposerCardId, targetCardId: ComposerCardId, position: DropPosition) => void;
  onMoveLane: (laneId: MaterialCategoryId, targetLaneId: MaterialCategoryId, position: DropPosition) => void;
  /** 흐름도 블록 이름을 누르면 — 트리에서 그 블록을 펼치고 보이게 한다. */
  onRevealBlock: (cardId: ComposerCardId) => void;
  /** 트리에서 끌기를 시작했을 때 — 열린 설명 팝업을 닫는다(놓을 자리를 가리지 않게). */
  onDragBegin: () => void;
}

/**
 * 놓은 자리가 대상의 앞쪽 절반이면 앞, 아니면 뒤. 세로(블록)는 위아래, 가로(단계)는 좌우로 본다.
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
