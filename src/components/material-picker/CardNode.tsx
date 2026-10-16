/**
 * 다이어그램의 카드 노드 하나(docs/MATERIAL_PICKER.md §11).
 *
 * 왼쪽 세로축 위에 입력 순서 번호가 있고, 같은 레인의 다음 카드 번호까지 선으로 잇는다. 레인 안의
 * 순서는 화살표 없이 위에서 아래로 읽는다. 노드에는 카드 이름과 필수 표시, 받기로 고른 권장·선택
 * 항목의 칩만 붙는다 — 필드 수 같은 숫자는 두지 않는다. 칩은 ×로 뺀다.
 *
 * 노드를 누르면 가운데 아래 필드 패널에 이 카드가 열리고, 열린 노드는 강조 테두리로 보인다. 필드
 * 설명과 형식은 거기서 읽고 고른다. 같은 레인 안에서는 끌거나 ▲▼ 버튼으로 순서를 바꾼다.
 */
import { useRef, useState, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { categoryOf } from "../../data/reportComposer";
import { pickItems, type PickItem } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, dropPosition, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface CardNodeProps {
  card: ComposerCard;
  /** 입력 순서 번호(1부터). */
  number: number;
  taskType: TaskType | "";
  picks: readonly string[];
  /** 필드 패널에 열려 있는 카드인지. */
  selected: boolean;
  /** 필드 패널에 이 카드를 연다. */
  onSelect: () => void;
  /** 같은 레인의 위·아래 카드. 없으면 그쪽으로 옮기는 버튼을 끈다. */
  previousCardId?: ComposerCardId;
  nextCardId?: ComposerCardId;
  actions: PickerActions;
}

export function CardNode({
  card,
  number,
  taskType,
  picks,
  selected,
  onSelect,
  previousCardId,
  nextCardId,
  actions,
}: CardNodeProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);
  const items = pickItems(card.id, taskType);
  const picked = items.filter((item) => picks.includes(item.pickId));

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

      {/* 상자 어디를 눌러도 필드 패널에 연다. 키보드는 카드 이름 버튼으로 연다(클릭이 상자로 올라온다). */}
      <div
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer flex-col gap-2.5 rounded-lg border bg-card p-3 transition-colors",
          selected ? "border-primary ring-1 ring-primary" : "border-border-strong hover:border-foreground-subtle",
        )}
      >
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
            aria-pressed={selected}
            className="min-w-0 flex-1 pt-px text-left text-sm font-medium leading-5 text-foreground"
          >
            {card.name}
            {card.locked && <span className="ml-1.5 text-xs font-normal text-muted-foreground">필수</span>}
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
            {!card.locked && (
              <IconButton label={`${card.name} 빼기`} onClick={() => actions.onExcludeCard(card.id)}>
                <X className="size-4" />
              </IconButton>
            )}
          </span>
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {picked.map((item) => (
              <PickChip key={item.pickId} cardId={card.id} item={item} actions={actions} />
            ))}
          </div>
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

/** 받기로 한 권장·선택 항목 칩. ×로 빼거나 재료 목록으로 끌어 뺀다. */
function PickChip({
  cardId,
  item,
  actions,
}: {
  cardId: ComposerCardId;
  item: PickItem;
  actions: PickerActions;
}) {
  const [, drag] = useDrag<ItemDragItem>({ type: DND.chip, item: { cardId, pickId: item.pickId } });
  return (
    <span
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "inline-flex cursor-grab items-center gap-1 rounded-md border py-0.5 pl-2 pr-0.5 text-xs",
        item.kind === "recommended"
          ? "border-primary/30 bg-primary-subtle text-foreground"
          : "border-border-strong bg-card text-foreground-secondary",
      )}
    >
      {item.label}
      <button
        type="button"
        aria-label={`${item.label} 빼기`}
        onClick={() => actions.onTogglePick(cardId, item.pickId)}
        className="flex size-4 items-center justify-center rounded text-foreground-subtle hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
