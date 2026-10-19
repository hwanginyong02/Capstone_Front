/**
 * 흐름도의 단계 섹션 하나와 그 안의 놓인 블록(docs/MATERIAL_PICKER.md §12.3).
 *
 * - 단계 머리 전체를 끌거나 앞/뒤 버튼으로 단계 순서를 바꾼다. 여러 열이면 좌우, 한 열이면 위아래로
 *   본다(아이콘도 ◀▶ / ▲▼ 로 바뀐다).
 * - 놓인 블록이 없으면 점선 빈 자리가 흐름에 끼어 있다.
 * - 트리에서 항목을 끄는 동안 그 항목의 단계는 강조되고 다른 단계는 흐려진다. 흐름도 위에 올리면 새
 *   블록이 나타날 자리에 점선 유령 블록이 보인다(`ghostIndex`). 엉뚱한 단계에 놓아도 제 단계로 간다.
 * - "다음"을 누른 뒤에는 이 단계에서 아예 놓지 않은 필수 블록 수를 머리에 적는다(N7) — 블록이 하나라도
 *   있으면 빈 자리가 사라져 빠진 필수 블록이 보이지 않기 때문이다.
 * - 단계 맨 아래 빈 자리에 같은 단계의 블록을 놓으면 맨 뒤로 간다.
 */
import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  MaterialCategory,
  MaterialCategoryId,
} from "../../types/reportComposer.types";
import { categoryOf, getCard } from "../../data/reportComposer";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { slotId } from "../../utils/domain/flowChart";
import type { TreeBlock } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { CardNode } from "./CardNode";
import { DND, dropPosition, type CardDragItem, type LaneDragItem, type PickerActions } from "./dnd";
import { IconAction } from "./IconAction";

/** 섹션 폭이 격자 폭의 이만큼 이상이면 한 열로 본다 — 단계 끌기를 위아래 절반으로 가른다. */
const SINGLE_COLUMN_RATIO = 0.9;

interface DiagramLaneProps {
  lane: MaterialCategory;
  /** 이 단계에 놓인 블록, 입력 순서대로. */
  cards: ComposerCard[];
  /** 블록의 입력 순서 번호. */
  numberOf: (cardId: ComposerCardId) => number;
  blocks: ReadonlyMap<ComposerCardId, TreeBlock>;
  previousLaneId?: MaterialCategoryId;
  nextLaneId?: MaterialCategoryId;
  /** 트리에서 끌고 있는 항목의 블록. 끌고 있지 않으면 null. */
  dragCardId: ComposerCardId | null;
  /** 끌고 있는 항목이 흐름도 위에 있는가. */
  dragOverFlow: boolean;
  /** 끌고 있는 블록이 이 단계에 새로 나타날 자리(`ghostIndex`). 없으면 -1. */
  ghostAt: number;
  /** 이 단계에서 아예 놓지 않은 필수 블록 수(N7). */
  missingBlocks: number;
  showMissing: boolean;
  taskType: TaskType | "";
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}

export function DiagramLane({
  lane,
  cards,
  numberOf,
  blocks,
  previousLaneId,
  nextLaneId,
  dragCardId,
  dragOverFlow,
  ghostAt,
  missingBlocks,
  showMissing,
  taskType,
  openLeafKey,
  onOpenLeaf,
  actions,
}: DiagramLaneProps) {
  const ref = useRef<HTMLLIElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);
  const fits = dragCardId !== null && categoryOf(dragCardId).id === lane.id;
  const ghost = fits && dragOverFlow && ghostAt >= 0 ? getCard(dragCardId) : null;

  /** 한 열 배치면 위아래, 여러 열이면 좌우 절반으로 앞/뒤를 가른다. */
  const axis = (): "x" | "y" => {
    const grid = ref.current?.parentElement;
    if (!ref.current || !grid || grid.clientWidth === 0) return "x";
    return ref.current.clientWidth >= grid.clientWidth * SINGLE_COLUMN_RATIO ? "y" : "x";
  };

  const [{ isDragging }, drag, preview] = useDrag<LaneDragItem, unknown, { isDragging: boolean }>({
    type: DND.lane,
    item: () => {
      actions.onDragBegin();
      return { laneId: lane.id };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<LaneDragItem, unknown, { isOver: boolean }>({
    accept: DND.lane,
    canDrop: (item) => item.laneId !== lane.id,
    hover: (_item, monitor) => {
      if (!monitor.canDrop()) return;
      const next = dropPosition(ref.current, monitor.getClientOffset(), axis());
      if (next !== hoverPosition) setHoverPosition(next);
    },
    drop: (item, monitor) => {
      actions.onMoveLane(item.laneId, lane.id, dropPosition(ref.current, monitor.getClientOffset(), axis()));
      setHoverPosition(null);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  preview(drop(ref));
  drag(headerRef);
  const showIndicator = isOver ? hoverPosition : null;

  const ghostNode = ghost && (
    <li
      key="ghost"
      aria-hidden="true"
      className="flex min-h-14 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary-subtle px-3 text-center text-sm text-primary"
    >
      놓으면 ‘{ghost.name}’ 블록이 생겨요
    </li>
  );
  const items = cards.map((card, index) => (
    <CardNode
      key={card.id}
      card={card}
      number={numberOf(card.id)}
      block={blocks.get(card.id)}
      previousCardId={cards[index - 1]?.id}
      nextCardId={cards[index + 1]?.id}
      dropTarget={dragOverFlow && dragCardId === card.id}
      showMissing={showMissing}
      taskType={taskType}
      openLeafKey={openLeafKey}
      onOpenLeaf={onOpenLeaf}
      actions={actions}
    />
  ));
  if (ghostNode && cards.length > 0) items.splice(ghostAt, 0, ghostNode);

  return (
    <li
      ref={ref}
      data-flow-lane={lane.id}
      aria-label={`${lane.name} 단계`}
      className={cn(
        "group/lane relative flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/50 p-3 transition-[opacity,background-color]",
        fits && "bg-primary-subtle/60 ring-2 ring-primary/60",
        dragCardId !== null && !fits && "opacity-60",
        isDragging && "opacity-40",
      )}
    >
      {showIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-full bg-primary",
            axis() === "y"
              ? cn("inset-x-0 h-0.5", showIndicator === "before" ? "-top-6" : "-bottom-6")
              : cn("inset-y-0 w-0.5", showIndicator === "before" ? "-left-5" : "-right-5"),
          )}
        />
      )}
      <div ref={headerRef} className="flex min-h-7 cursor-grab items-center gap-1 active:cursor-grabbing">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{lane.name}</h2>
        <IconAction
          label={`${lane.name} 단계 앞으로`}
          reveal="lane"
          disabled={!previousLaneId}
          onClick={() => previousLaneId && actions.onMoveLane(lane.id, previousLaneId, "before")}
        >
          <ChevronLeft className="hidden size-4 @min-[30rem]/flow:block" />
          <ChevronUp className="size-4 @min-[30rem]/flow:hidden" />
        </IconAction>
        <IconAction
          label={`${lane.name} 단계 뒤로`}
          reveal="lane"
          disabled={!nextLaneId}
          onClick={() => nextLaneId && actions.onMoveLane(lane.id, nextLaneId, "after")}
        >
          <ChevronRight className="hidden size-4 @min-[30rem]/flow:block" />
          <ChevronDown className="size-4 @min-[30rem]/flow:hidden" />
        </IconAction>
      </div>
      {showMissing && missingBlocks > 0 && (
        <p data-missing="true" className="-mt-2 text-xs leading-[18px] text-destructive">
          필수 블록 {missingBlocks}개가 빠졌어요
        </p>
      )}

      {cards.length === 0 && (
        <p
          data-flow-node={slotId(lane.id)}
          className={cn(
            "flex min-h-20 items-center justify-center rounded-lg border-2 border-dashed px-3 text-center text-sm",
            ghost ? "border-primary bg-primary-subtle text-primary" : "border-border-strong text-muted-foreground",
          )}
        >
          {ghost ? `놓으면 ‘${ghost.name}’ 블록이 생겨요` : `여기에 ${lane.name} 항목을 끌어 놓으세요`}
        </p>
      )}
      {cards.length > 0 && (
        <ol aria-label={`${lane.name} 블록`} className="flex flex-col gap-6">
          {items}
        </ol>
      )}

      <LaneEnd laneId={lane.id} lastCardId={cards[cards.length - 1]?.id} actions={actions} />
    </li>
  );
}

/** 단계 맨 아래 빈 자리. 같은 단계의 블록을 놓으면 맨 뒤로 보낸다. */
function LaneEnd({
  laneId,
  lastCardId,
  actions,
}: {
  laneId: MaterialCategoryId;
  lastCardId?: ComposerCardId;
  actions: PickerActions;
}) {
  const [{ isOver, active }, drop] = useDrop<CardDragItem, unknown, { isOver: boolean; active: boolean }>({
    accept: DND.node,
    canDrop: (item) => categoryOf(item.cardId).id === laneId && item.cardId !== lastCardId,
    drop: (item) => {
      if (lastCardId) actions.onMoveCard(item.cardId, lastCardId, "after");
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
      active: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={(element) => {
        drop(element);
      }}
      aria-hidden="true"
      className={cn(
        "-mt-1 rounded-lg border border-dashed transition-colors",
        active ? "min-h-10" : "min-h-0",
        isOver ? "border-primary bg-primary-subtle" : active ? "border-border-strong" : "border-transparent",
      )}
    />
  );
}
