/**
 * 다이어그램의 카드 노드 하나(docs/MATERIAL_PICKER.md §11).
 *
 * 머리에 입력 순서 번호, 카드 이름, 필수 표시가 있고, 아래에 받기로 한 항목이 칩으로 붙는다.
 * 필수·조건부 필드는 늘 받으므로 "필수 n"으로 접어 보이고, 권장·선택 항목만 칩마다 ×로 뺀다.
 *
 * 노드를 펼치면 그 카드에서 넣고 뺄 수 있는 항목이 모두 나와 클릭 한 번으로 바꾼다. 같은 레인
 * 안에서는 끌거나 ▲▼ 버튼으로 순서를 바꾼다.
 */
import { useRef, useState, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Check, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { categoryOf } from "../../data/reportComposer";
import { fixedFieldCounts, pickItems, type PickItem } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, dropPosition, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface CardNodeProps {
  card: ComposerCard;
  /** 입력 순서 번호(1부터). */
  number: number;
  taskType: TaskType | "";
  picks: readonly string[];
  expanded: boolean;
  onToggleExpanded: () => void;
  /** 같은 레인의 위·아래 카드. 없으면 그쪽으로 옮기는 버튼을 끈다. */
  previousCardId?: ComposerCardId;
  nextCardId?: ComposerCardId;
  actions: PickerActions;
}

const KIND_LABEL = { recommended: "권장", optional: "선택" } as const;

export function CardNode({
  card,
  number,
  taskType,
  picks,
  expanded,
  onToggleExpanded,
  previousCardId,
  nextCardId,
  actions,
}: CardNodeProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);
  const items = pickItems(card.id, taskType);
  const fixed = fixedFieldCounts(card.id, taskType);
  const picked = items.filter((item) => picks.includes(item.pickId));
  const recommended = items.filter((item) => item.kind === "recommended");
  const recommendedPicked = recommended.filter((item) => picks.includes(item.pickId)).length;

  const [{ isDragging }, drag, preview] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.node,
    item: { cardId: card.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<CardDragItem, unknown, { isOver: boolean }>({
    accept: DND.node,
    canDrop: (item) => item.cardId !== card.id && categoryOf(item.cardId).id === categoryOf(card.id).id,
    hover: (item, monitor) => {
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
    <li
      ref={ref}
      aria-label={card.name}
      className={cn("relative", isDragging && "opacity-40")}
    >
      {showIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 h-0.5 rounded-full bg-primary",
            showIndicator === "before" ? "-top-1.5" : "-bottom-1.5",
          )}
        />
      )}
      <div className="flex flex-col gap-2.5 rounded-lg border border-border-strong bg-card p-3">
        <div className="flex items-start gap-2">
          <span
            ref={(element) => {
              drag(element);
            }}
            title="끌어서 순서 바꾸기"
            className="mt-0.5 cursor-grab text-foreground-subtle active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </span>
          <span
            aria-label={`입력 순서 ${number}번`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          >
            {number}
          </span>
          <span className="min-w-0 flex-1 pt-0.5 text-sm font-medium leading-5 text-foreground">
            {card.name}
            {card.locked && <span className="ml-1.5 text-xs font-normal text-muted-foreground">필수</span>}
          </span>
          <span className="flex shrink-0 items-center">
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

        <div className="flex flex-wrap items-center gap-1.5 pl-6">
          {fixed.required > 0 && <FixedChip>필수 {fixed.required}</FixedChip>}
          {fixed.conditional > 0 && <FixedChip>조건부 {fixed.conditional}</FixedChip>}
          {picked.map((item) => (
            <PickChip key={item.pickId} cardId={card.id} item={item} actions={actions} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pl-6">
          {recommended.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              권장 {recommendedPicked}/{recommended.length}
            </span>
          ) : (
            <span />
          )}
          {items.length > 0 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={onToggleExpanded}
              className="text-xs text-foreground-secondary underline underline-offset-4 hover:text-foreground"
            >
              {expanded ? "접기" : "항목 고르기"}
            </button>
          )}
        </div>

        {expanded && (
          <ul aria-label={`${card.name} 항목`} className="flex flex-col border-t border-border pl-6 pt-1">
            {items.map((item) => {
              const on = picks.includes(item.pickId);
              return (
                <li key={item.pickId}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${item.label} (${KIND_LABEL[item.kind]})`}
                    onClick={() => actions.onTogglePick(card.id, item.pickId)}
                    title={item.description}
                    className="flex min-h-9 w-full items-center gap-2 rounded-md px-1 text-left text-sm hover:bg-muted"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
                  </button>
                </li>
              );
            })}
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

function FixedChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
  );
}

/** 받기로 한 권장·선택 항목 칩. ×로 빼거나 팔레트로 끌어 뺀다. */
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
      title={item.description}
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
