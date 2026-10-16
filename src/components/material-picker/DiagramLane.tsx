/**
 * 다이어그램의 레인 하나 — 대분류 하나와 그 안의 들어간 카드(docs/MATERIAL_PICKER.md §11).
 *
 * 레인 머리를 좌우로 끌거나 ◀▶ 버튼으로 대분류 순서를 바꾼다. 레인 사이의 순서는 머리 오른쪽의
 * 화살표로, 레인 안의 순서는 세로축을 따라 위에서 아래로 보인다. 레인 맨 아래의 빈 자리에 같은
 * 레인의 카드를 놓으면 맨 뒤로 간다.
 */
import { useRef, useState, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ArrowRight, ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  MaterialCategory,
  MaterialCategoryId,
  MaterialPicks,
} from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { cn } from "../../utils/styling/styles";
import { CardNode } from "./CardNode";
import { DND, dropPosition, type CardDragItem, type LaneDragItem, type PickerActions } from "./dnd";

interface DiagramLaneProps {
  lane: MaterialCategory;
  /** 이 레인의 들어간 카드, 입력 순서대로. */
  cards: ComposerCard[];
  /** 카드의 입력 순서 번호. */
  numberOf: (cardId: ComposerCardId) => number;
  taskType: TaskType | "";
  picks: MaterialPicks;
  /** 필드 패널에 열려 있는 카드. */
  selectedCardId: ComposerCardId;
  /** 필드 패널에 그 카드를 연다. */
  onSelectCard: (cardId: ComposerCardId) => void;
  previousLaneId?: MaterialCategoryId;
  nextLaneId?: MaterialCategoryId;
  actions: PickerActions;
}

export function DiagramLane({
  lane,
  cards,
  numberOf,
  taskType,
  picks,
  selectedCardId,
  onSelectCard,
  previousLaneId,
  nextLaneId,
  actions,
}: DiagramLaneProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);

  const [{ isDragging }, drag, preview] = useDrag<LaneDragItem, unknown, { isDragging: boolean }>({
    type: DND.lane,
    item: { laneId: lane.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<LaneDragItem, unknown, { isOver: boolean }>({
    accept: DND.lane,
    canDrop: (item) => item.laneId !== lane.id,
    hover: (_item, monitor) => {
      if (!monitor.canDrop()) return;
      const next = dropPosition(ref.current, monitor.getClientOffset(), "x");
      if (next !== hoverPosition) setHoverPosition(next);
    },
    drop: (item, monitor) => {
      actions.onMoveLane(item.laneId, lane.id, dropPosition(ref.current, monitor.getClientOffset(), "x"));
      setHoverPosition(null);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  preview(drop(ref));
  const showIndicator = isOver ? hoverPosition : null;

  return (
    <li
      ref={ref}
      aria-label={`${lane.name} 레인`}
      className={cn("relative flex min-w-0 flex-col gap-3", isDragging && "opacity-40")}
    >
      {showIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 w-0.5 rounded-full bg-primary",
            showIndicator === "before" ? "-left-[15px]" : "-right-[15px]",
          )}
        />
      )}
      {/* 다음 레인으로 가는 화살표 — 대분류 사이의 입력 순서. 레인 사이 틈(gap-7)에 둔다. */}
      {nextLaneId && (
        <span
          aria-hidden="true"
          className="absolute -right-7 top-0 flex h-10 w-7 items-center justify-center text-foreground-secondary"
        >
          <ArrowRight className="size-5" strokeWidth={2} />
        </span>
      )}
      <div className="flex h-10 items-center gap-1 rounded-lg bg-muted px-2">
        <span
          ref={(element) => {
            drag(element);
          }}
          title="끌어서 대분류 순서 바꾸기"
          className="cursor-grab text-foreground-subtle active:cursor-grabbing"
        >
          <GripHorizontal className="size-4" aria-hidden="true" />
        </span>
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-foreground">{lane.name}</h2>
        <LaneButton
          label={`${lane.name} 왼쪽으로`}
          disabled={!previousLaneId}
          onClick={() => previousLaneId && actions.onMoveLane(lane.id, previousLaneId, "before")}
        >
          <ChevronLeft className="size-4" />
        </LaneButton>
        <LaneButton
          label={`${lane.name} 오른쪽으로`}
          disabled={!nextLaneId}
          onClick={() => nextLaneId && actions.onMoveLane(lane.id, nextLaneId, "after")}
        >
          <ChevronRight className="size-4" />
        </LaneButton>
      </div>

      <ol aria-label={`${lane.name} 카드`} className="flex flex-col gap-3">
        {cards.map((card, index) => (
          <CardNode
            key={card.id}
            card={card}
            number={numberOf(card.id)}
            taskType={taskType}
            picks={picks[card.id] ?? []}
            selected={card.id === selectedCardId}
            onSelect={() => onSelectCard(card.id)}
            previousCardId={cards[index - 1]?.id}
            nextCardId={cards[index + 1]?.id}
            actions={actions}
          />
        ))}
      </ol>

      <LaneEnd laneId={lane.id} lastCardId={cards[cards.length - 1]?.id} actions={actions} />
    </li>
  );
}

/** 레인 맨 아래 빈 자리. 같은 레인의 카드를 놓으면 맨 뒤로 보낸다. */
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
        "min-h-12 flex-1 rounded-lg border border-dashed transition-colors",
        isOver ? "border-primary bg-primary-subtle" : active ? "border-border-strong" : "border-transparent",
      )}
    />
  );
}

function LaneButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-foreground-subtle hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
