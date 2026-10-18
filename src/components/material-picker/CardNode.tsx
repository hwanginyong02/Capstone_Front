/**
 * 흐름도의 블록 하나(docs/MATERIAL_PICKER.md §12.3).
 *
 * 왼쪽 세로축 위에 입력 순서 번호가 있고, 같은 단계의 다음 블록 번호까지 선으로 잇는다. 블록에는
 * **넣은 모든 항목**(필수 포함)이 칩으로 붙는다. 함께 들어감 항목은 조건 항목 바로 뒤에 점선 칩으로
 * 붙고 ✕가 없다. 칩은 ✕로 빼거나 트리로 끌어 뺀다.
 *
 * 블록 이름을 누르면 트리에서 그 블록을 펼쳐 보인다. 같은 단계 안에서는 끌거나 ▲▼로 순서를 바꾸고,
 * ✕로 블록째 뺀다(필수 블록도 — 다시 "다음"이 막힐 뿐이다).
 */
import { useRef, useState, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { ComposerCard, ComposerCardId, FlowLeaf } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { categoryOf } from "../../data/reportComposer";
import type { TreeBlock } from "../../utils/domain/materialPicks";
import { FOCUS_RING, cn } from "../../utils/styling/styles";
import { DND, dropPosition, type CardDragItem, type LeafDragItem, type PickerActions } from "./dnd";
import { KindMarker } from "./KindMarker";

interface CardNodeProps {
  card: ComposerCard;
  /** 입력 순서 번호(1부터). */
  number: number;
  /** 이 블록의 트리 모델. 놓인 항목이 칩이 된다. */
  block: TreeBlock | undefined;
  /** 같은 단계의 위·아래 카드. 없으면 그쪽으로 옮기는 버튼을 끈다. */
  previousCardId?: ComposerCardId;
  nextCardId?: ComposerCardId;
  actions: PickerActions;
}

export function CardNode({
  card,
  number,
  block,
  previousCardId,
  nextCardId,
  actions,
}: CardNodeProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);
  // 넣은 항목과, 그 뒤에 함께 들어간 항목.
  const chips = (block?.leaves ?? [])
    .filter((leaf) => leaf.placed)
    .flatMap((leaf) => [
      { leaf, companion: false },
      ...leaf.companions.filter((item) => item.placed).map((item) => ({ leaf: item, companion: true })),
    ]);

  const [{ isDragging }, drag, preview] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.node,
    item: { cardId: card.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<CardDragItem, unknown, { isOver: boolean }>({
    accept: DND.node,
    canDrop: (item) => item.cardId !== card.id && categoryOf(item.cardId).id === categoryOf(card.id).id,
    hover: (_item, monitor) => {
      if (!monitor.canDrop()) return;
      const next = dropPosition(ref.current, monitor.getClientOffset(), "y");
      if (next !== hoverPosition) setHoverPosition(next);
    },
    drop: (item, monitor) => {
      actions.onMoveCard(item.cardId, card.id, dropPosition(ref.current, monitor.getClientOffset(), "y"));
      setHoverPosition(null);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  preview(drop(ref));
  const showIndicator = isOver ? hoverPosition : null;

  return (
    <li ref={ref} aria-label={card.name} className={cn("relative flex gap-2", isDragging && "opacity-40")}>
      {showIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 h-0.5 rounded-full bg-primary",
            showIndicator === "before" ? "-top-1.5" : "-bottom-1.5",
          )}
        />
      )}

      {/* 세로축 — 번호 아래로 다음 카드까지 선을 긋는다. 화살표는 레인 사이에만 쓴다. */}
      <div className="relative flex w-6 shrink-0 justify-center pt-2.5">
        <span
          aria-label={`입력 순서 ${number}번`}
          className="relative z-10 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
        >
          {number}
        </span>
        {nextCardId && (
          <span aria-hidden="true" className="absolute -bottom-[22px] left-1/2 top-8 w-px -translate-x-1/2 bg-border-strong" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-lg border border-border-strong bg-card p-3">
        <div className="flex items-start gap-1.5">
          <span
            ref={(element) => {
              drag(element);
            }}
            title="끌어서 순서 바꾸기"
            className="mt-0.5 cursor-grab text-foreground-subtle active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={() => actions.onRevealBlock(card.id)}
            className={cn("min-w-0 flex-1 rounded-sm pt-px text-left text-sm font-medium leading-5 text-foreground", FOCUS_RING)}
          >
            {card.name}
          </button>
          <span className="-mr-1 -mt-1 flex shrink-0 items-center">
            <IconButton
              label={`${card.name} 위로`}
              disabled={!previousCardId}
              onClick={() => previousCardId && actions.onMoveCard(card.id, previousCardId, "before")}
            >
              <ChevronUp className="size-4" />
            </IconButton>
            <IconButton
              label={`${card.name} 아래로`}
              disabled={!nextCardId}
              onClick={() => nextCardId && actions.onMoveCard(card.id, nextCardId, "after")}
            >
              <ChevronDown className="size-4" />
            </IconButton>
            <IconButton label={`${card.name} 블록 빼기`} onClick={() => actions.onRemoveBlock(card.id)}>
              <X className="size-4" />
            </IconButton>
          </span>
        </div>

        {chips.length > 0 && (
          <ul aria-label={`${card.name}에 넣은 항목`} className="flex flex-wrap items-center gap-1.5">
            {chips.map(({ leaf, companion }) => (
              <PickChip key={leaf.leafId} leaf={leaf} companion={companion} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function IconButton({
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
      className="flex size-7 items-center justify-center rounded-md text-foreground-subtle hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** 넣은 항목 칩. ✕로 빼거나 트리로 끌어 뺀다. 함께 들어감 칩은 점선이고 ✕가 없다. */
function PickChip({
  leaf,
  companion,
  actions,
}: {
  leaf: FlowLeaf;
  companion: boolean;
  actions: PickerActions;
}) {
  const [, drag] = useDrag<LeafDragItem>({
    type: DND.chip,
    item: { cardId: leaf.cardId, leafId: leaf.leafId, label: leaf.label },
    canDrag: () => !companion,
  });
  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-card py-0.5 pl-2 text-xs text-foreground",
        companion ? "border-dashed border-border-strong pr-2 text-foreground-secondary" : "cursor-grab border-border-strong pr-0.5",
      )}
    >
      <KindMarker kind={leaf.kind} />
      {leaf.label}
      {!companion && (
        <button
          type="button"
          aria-label={`${leaf.label} 빼기`}
          onClick={() => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
          className={cn(
            "flex size-4 items-center justify-center rounded text-foreground-subtle hover:bg-muted hover:text-foreground",
            FOCUS_RING,
          )}
        >
          <X className="size-3" />
        </button>
      )}
    </li>
  );
}
