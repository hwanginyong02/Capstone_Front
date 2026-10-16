/**
 * 재료 고르기 왼쪽 — 재료 목록(docs/MATERIAL_PICKER.md §8·§11).
 *
 * 대분류 → 카드 → 필드를 들여쓰기와 연결선으로 보이는 나무다. 카드를 펼치면 그 카드의 필드가
 * 필수 / 권장 / 선택 / 조건부로 나뉘어 나온다. 필드마다 이름, 입력 형식, 설명을 **마우스를 올리지
 * 않아도** 그대로 보인다 — 설명을 읽고 넣을지 고른다.
 *
 * 권장·선택 필드는 ＋를 누르거나 가운데 다이어그램으로 끌어 놓으면 바로 들어간다. 필수·조건부는
 * 늘 들어가므로 버튼이 없다. 다이어그램의 카드나 칩을 여기로 끌어 오면 빠진다.
 */
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
import { FIELD_SECTIONS, fieldRows, type FieldRow } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface PickPaletteProps {
  taskType: TaskType | "";
  picks: MaterialPicks;
  selection: ComposerSelection;
  /** 펼친 카드. 다이어그램 노드의 "필드 보기"도 여기를 펼친다. */
  expanded: ReadonlySet<ComposerCardId>;
  onToggleExpanded: (cardId: ComposerCardId) => void;
  actions: PickerActions;
}

/** 다이어그램에서 카드를 찾아 스크롤할 때 쓰는 요소 id. */
export const paletteCardElementId = (cardId: ComposerCardId) => `palette-card-${cardId}`;

export function PickPalette({
  taskType,
  picks,
  selection,
  expanded,
  onToggleExpanded,
  actions,
}: PickPaletteProps) {
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
        "flex flex-col gap-5 rounded-xl border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary-subtle" : "border-transparent",
      )}
    >
      <p className="text-sm leading-[21px] text-muted-foreground">
        카드를 펼쳐 필드 설명을 보고, ＋를 누르거나 가운데로 끌어 놓으면 바로 들어가요. 다이어그램에서
        여기로 끌어 오면 빠져요.
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
                  onToggleExpanded={() => onToggleExpanded(id)}
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
  const rows = fieldRows(card.id, taskType);
  const sections = FIELD_SECTIONS.filter((section) => rows[section.kind].length > 0);
  const [{ isDragging }, drag] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteCard,
    item: { cardId: card.id },
    canDrag: () => !included,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li id={paletteCardElementId(card.id)} className="relative flex scroll-mt-20 flex-col pl-3">
      <span aria-hidden="true" className="absolute left-0 top-[22px] w-2.5 border-t border-border-strong" />
      <div
        ref={(element) => {
          drag(element);
        }}
        className={cn(
          "flex flex-col rounded-lg pb-2 pl-1 pr-1.5",
          included ? "bg-primary-subtle" : "cursor-grab hover:bg-muted",
          isDragging && "opacity-40",
        )}
      >
        <div className="flex min-h-11 items-center gap-1.5">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${card.name} 필드 ${expanded ? "접기" : "보기"}`}
            onClick={onToggleExpanded}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-subtle hover:text-foreground"
          >
            <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
          </button>
          {/* 이름을 눌러도 펼친다 — 마우스 편의다. 키보드는 왼쪽 펼치기 버튼을 쓴다. */}
          <span
            onClick={onToggleExpanded}
            className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-foreground"
          >
            {card.name}
          </span>
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
        <p className="pl-8 text-xs leading-[18px] text-muted-foreground">{card.description}</p>
        <p className="pl-8 pt-0.5 text-xs leading-[18px] text-foreground-subtle">
          {sections.map((section) => `${section.title} ${rows[section.kind].length}`).join(" · ")}
        </p>
      </div>

      {expanded && (
        <div aria-label={`${card.name} 필드`} role="group" className="flex flex-col gap-4 pb-3 pl-4 pt-3">
          {sections.map((section) => (
            <div key={section.kind} className="flex flex-col">
              <h4 className="pb-1.5 text-xs font-medium text-foreground-secondary">
                {section.title}
                <span className="ml-1.5 font-normal text-muted-foreground">{section.note}</span>
              </h4>
              <ul className="flex flex-col">
                {rows[section.kind].map((row) => (
                  <PaletteFieldRow
                    key={row.key}
                    cardId={card.id}
                    row={row}
                    on={row.pickId ? picks.includes(row.pickId) : false}
                    actions={actions}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * 필드 한 줄 — 이름(검정), 형식(오른쪽 회색), 조건, 설명(회색), 권장 필드면 그 안의 칸.
 * 권장·선택 줄에는 넣기·빼기 버튼이 있고, 아직 넣지 않았으면 다이어그램으로 끌 수 있다.
 */
function PaletteFieldRow({
  cardId,
  row,
  on,
  actions,
}: {
  cardId: ComposerCardId;
  row: FieldRow;
  on: boolean;
  actions: PickerActions;
}) {
  const pickId = row.pickId;
  const [{ isDragging }, drag] = useDrag<ItemDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteItem,
    item: { cardId, pickId: pickId ?? "" },
    canDrag: () => Boolean(pickId) && !on,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const draggable = Boolean(pickId) && !on;

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "flex items-start gap-2 border-t border-border py-2.5",
        draggable && "cursor-grab",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex w-3.5 shrink-0 justify-center pt-0.5">
        {draggable && <GripVertical className="size-3.5 text-foreground-subtle" aria-hidden="true" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{row.name}</span>
          {row.format && <span className="text-right text-xs text-muted-foreground">{row.format}</span>}
        </div>
        {row.condition && (
          <span className="text-xs leading-[18px] text-foreground-secondary">조건: {row.condition}</span>
        )}
        {row.description && (
          <span className="text-xs leading-[18px] text-muted-foreground">{row.description}</span>
        )}
        {row.subs && (
          <ul className="mt-1 flex flex-col gap-1 border-l border-border pl-2.5">
            {row.subs.map((sub) => (
              <li key={sub.key} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-xs text-foreground">{sub.label}</span>
                {sub.format && <span className="text-right text-xs text-muted-foreground">{sub.format}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {pickId && (
        <button
          type="button"
          aria-pressed={on}
          aria-label={`${row.name} ${on ? "빼기" : "넣기"}`}
          onClick={() => actions.onTogglePick(cardId, pickId)}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md border",
            on
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-card text-foreground-subtle hover:border-primary hover:text-primary",
          )}
        >
          {on ? <Check className="size-4" /> : <Plus className="size-4" />}
        </button>
      )}
    </li>
  );
}
