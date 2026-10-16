/**
 * 재료 고르기 왼쪽 — 재료 목록(docs/MATERIAL_PICKER.md §11).
 *
 * 대분류와 그 안의 카드(서브 카탈로그)만 둔다. 대분류는 연한 회색 테두리로 묶고 카드 줄 사이에는
 * 구분선을 긋는다. 카드를 누르면 가운데 아래 필드 패널에 그 카드의 필드 설명과 형식이 나온다 —
 * 필드는 넓은 가운데에서 읽고 고른다.
 *
 * 넣지 않은 선택 카드는 ＋를 누르거나 가운데 다이어그램으로 끌어 놓으면 들어간다. 다이어그램의
 * 카드나 칩을 여기로 끌어 오면 빠진다.
 */
import { useDrag, useDrop } from "react-dnd";
import { Check, ChevronRight, Plus } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerSelection,
} from "../../types/reportComposer.types";
import { MATERIAL_CATEGORIES, getCard, getVisibleCards } from "../../data/reportComposer";
import { isCardIncluded } from "../../utils/domain/cardOrder";
import { cn } from "../../utils/styling/styles";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface PickPaletteProps {
  taskType: TaskType | "";
  selection: ComposerSelection;
  /** 가운데 아래 필드 패널에 보이는 카드. */
  selectedCardId: ComposerCardId;
  onSelectCard: (cardId: ComposerCardId) => void;
  actions: PickerActions;
}

export function PickPalette({ taskType, selection, selectedCardId, onSelectCard, actions }: PickPaletteProps) {
  const visible = new Set(getVisibleCards(taskType).map((card) => card.id));

  const [{ isOver }, drop] = useDrop<CardDragItem | ItemDragItem, unknown, { isOver: boolean }>({
    accept: [DND.node, DND.chip],
    canDrop: (item, monitor) => monitor.getItemType() === DND.chip || !getCard(item.cardId).locked,
    drop: (item, monitor) => {
      if (monitor.getItemType() === DND.chip) {
        actions.onTogglePick(item.cardId, (item as ItemDragItem).pickId);
      } else {
        actions.onExcludeCard(item.cardId);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  return (
    <nav
      ref={(element) => {
        drop(element);
      }}
      aria-label="재료 목록"
      className={cn(
        "flex flex-col gap-3 rounded-xl border-2 border-dashed p-1 transition-colors",
        isOver ? "border-primary bg-primary-subtle" : "border-transparent",
      )}
    >
      <p className="px-1 text-sm leading-[21px] text-muted-foreground">
        카드를 누르면 아래에 필드 설명이 나와요. ＋를 누르거나 가운데로 끌어 놓으면 들어가요.
      </p>
      {MATERIAL_CATEGORIES.map((category) => (
        <section
          key={category.id}
          aria-label={category.name}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <h3 className="border-b border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
            {category.name}
          </h3>
          <ul className="flex flex-col">
            {category.cardIds
              .filter((id) => visible.has(id))
              .map((id, index) => (
                <PaletteCard
                  key={id}
                  card={getCard(id)}
                  first={index === 0}
                  included={isCardIncluded(getCard(id), selection)}
                  selected={id === selectedCardId}
                  onSelect={() => onSelectCard(id)}
                  actions={actions}
                />
              ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function PaletteCard({
  card,
  first,
  included,
  selected,
  onSelect,
  actions,
}: {
  card: ComposerCard;
  first: boolean;
  included: boolean;
  selected: boolean;
  onSelect: () => void;
  actions: PickerActions;
}) {
  const [{ isDragging }, drag] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteCard,
    item: { cardId: card.id },
    canDrag: () => !included,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "relative flex min-h-11 items-center gap-2 pr-2",
        !first && "border-t border-border",
        selected ? "bg-primary-subtle" : "hover:bg-muted",
        !included && "cursor-grab",
        isDragging && "opacity-40",
      )}
    >
      {selected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 pl-3 text-left"
      >
        <span className="min-w-0 flex-1 text-sm text-foreground">{card.name}</span>
        {card.locked && <span className="text-xs text-muted-foreground">필수</span>}
        <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      </button>
      {included ? (
        <span title="다이어그램에 들어가 있어요" className="flex size-7 shrink-0 items-center justify-center text-primary">
          <Check className="size-4" aria-hidden="true" />
          <span className="sr-only">들어감</span>
        </span>
      ) : (
        <button
          type="button"
          aria-label={`${card.name} 넣기`}
          title="넣기"
          onClick={() => actions.onIncludeCard(card.id)}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary hover:border-primary hover:text-primary"
        >
          <Plus className="size-4" />
        </button>
      )}
    </li>
  );
}
