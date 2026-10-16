/**
 * 재료 고르기 왼쪽 — 재료 목록(docs/MATERIAL_PICKER.md §11).
 *
 * 대분류 → 카드 → 항목을 들여쓰기와 연결선으로 보이는 나무다. 여기서 카드나 항목을 끌어 가운데
 * 다이어그램에 놓거나, ＋를 눌러 넣는다. 필수 카드는 처음부터 들어가 있어 찾을 필요가 없다.
 * 다이어그램의 카드나 칩을 여기로 끌어 오면 빠진다.
 */
import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Check, ChevronRight, GripVertical, Plus } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerSelection,
  MaterialPicks,
} from "../../types/reportComposer.types";
import { MATERIAL_CATEGORIES, getCard, getVisibleCards } from "../../data/reportComposer";
import { isCardIncluded } from "../../utils/domain/cardOrder";
import { fixedFieldCounts, pickItems, type PickItem } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface PickPaletteProps {
  taskType: TaskType | "";
  picks: MaterialPicks;
  selection: ComposerSelection;
  /** 처음에 펼쳐 둘 카드(확인과 생성의 "재료 고르기에서 넣기"). */
  initialExpanded?: ComposerCardId | null;
  actions: PickerActions;
}

const KIND_LABEL = { recommended: "권장", optional: "선택" } as const;

export function PickPalette({ taskType, picks, selection, initialExpanded, actions }: PickPaletteProps) {
  const [expanded, setExpanded] = useState<Set<ComposerCardId>>(
    () => new Set(initialExpanded ? [initialExpanded] : []),
  );
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

  const toggle = (cardId: ComposerCardId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });

  return (
    <nav
      ref={(element) => {
        drop(element);
      }}
      aria-label="재료 목록"
      className={cn(
        "flex flex-col gap-5 rounded-xl border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary-subtle" : "border-transparent",
      )}
    >
      <p className="text-sm leading-[21px] text-muted-foreground">
        카드나 항목을 가운데로 끌어 놓거나 ＋를 누르면 바로 들어가요. 다이어그램에서 여기로 끌어 오면
        빠져요.
      </p>
      {MATERIAL_CATEGORIES.map((category) => (
        <section key={category.id} aria-label={category.name} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium text-foreground">{category.name}</h3>
          <ul className="ml-1.5 flex flex-col border-l border-border-strong">
            {category.cardIds
              .filter((id) => visible.has(id))
              .map((id) => (
                <PaletteCard
                  key={id}
                  card={getCard(id)}
                  taskType={taskType}
                  picks={picks[id] ?? []}
                  included={isCardIncluded(getCard(id), selection)}
                  expanded={expanded.has(id)}
                  onToggleExpanded={() => toggle(id)}
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
  taskType,
  picks,
  included,
  expanded,
  onToggleExpanded,
  actions,
}: {
  card: ComposerCard;
  taskType: TaskType | "";
  picks: readonly string[];
  included: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  actions: PickerActions;
}) {
  const items = pickItems(card.id, taskType);
  const fixed = fixedFieldCounts(card.id, taskType);
  const [{ isDragging }, drag] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteCard,
    item: { cardId: card.id },
    canDrag: () => !included,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li className="relative flex flex-col pl-3">
      <span aria-hidden="true" className="absolute left-0 top-[22px] w-2.5 border-t border-border-strong" />
      <div
        ref={(element) => {
          drag(element);
        }}
        className={cn(
          "flex min-h-11 items-center gap-1.5 rounded-lg pl-1 pr-1.5",
          included ? "bg-primary-subtle" : "cursor-grab hover:bg-muted",
          isDragging && "opacity-40",
        )}
      >
        {items.length > 0 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${card.name} 항목 ${expanded ? "접기" : "보기"}`}
            onClick={onToggleExpanded}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-subtle hover:text-foreground"
          >
            <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{card.name}</span>
        {card.locked && <span className="text-xs text-muted-foreground">필수</span>}
        {included ? (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3.5" aria-hidden="true" />
            들어감
          </span>
        ) : (
          <button
            type="button"
            aria-label={`${card.name} 넣기`}
            title="넣기"
            onClick={() => actions.onIncludeCard(card.id)}
            className="flex size-7 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 pb-2 pl-8 pt-1">
          <p className="text-xs leading-[18px] text-muted-foreground">{card.description}</p>
          {fixed.required + fixed.conditional > 0 && (
            <p className="text-xs leading-[18px] text-muted-foreground">
              필수 항목 {fixed.required + fixed.conditional}개는 {included ? "이미 들어가 있어요" : "카드를 넣으면 함께 들어가요"}.
            </p>
          )}
          <ul aria-label={`${card.name} 고를 항목`} className="mt-1 flex flex-col border-l border-border">
            {items.map((item) => (
              <PaletteItem
                key={item.pickId}
                cardId={card.id}
                item={item}
                on={picks.includes(item.pickId)}
                actions={actions}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function PaletteItem({
  cardId,
  item,
  on,
  actions,
}: {
  cardId: ComposerCardId;
  item: PickItem;
  on: boolean;
  actions: PickerActions;
}) {
  const [{ isDragging }, drag] = useDrag<ItemDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteItem,
    item: { cardId, pickId: item.pickId },
    canDrag: () => !on,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "flex min-h-9 items-center gap-2 pl-2.5",
        !on && "cursor-grab",
        isDragging && "opacity-40",
      )}
    >
      {!on && <GripVertical className="size-3.5 shrink-0 text-foreground-subtle" aria-hidden="true" />}
      <span title={item.description} className="min-w-0 flex-1 text-sm text-foreground">
        {item.label}
      </span>
      <span className="text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${item.label} ${on ? "빼기" : "넣기"}`}
        onClick={() => actions.onTogglePick(cardId, item.pickId)}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded border",
          on
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-strong bg-card text-foreground-subtle hover:border-primary hover:text-primary",
        )}
      >
        {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
    </li>
  );
}
