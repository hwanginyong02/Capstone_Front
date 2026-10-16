/**
 * 재료 고르기 가운데 아래 — 고른 카드의 필드(docs/MATERIAL_PICKER.md §8·§11).
 *
 * 왼쪽 재료 목록이나 다이어그램 노드에서 카드를 고르면 그 카드의 필드가 여기 필수 / 권장 / 선택 /
 * 조건부로 나뉘어 나온다. 필드마다 이름, 입력 형식, 조건, 설명을 마우스를 올리지 않아도 그대로
 * 보인다 — 설명을 읽고 넣을지 고른다.
 *
 * 권장·선택 필드는 위 다이어그램으로 끌어 놓거나 ＋를 누르면 바로 들어간다. 필수·조건부는 늘
 * 들어가므로 버튼이 없다. 넣지 않은 선택 카드는 머리의 "카드 넣기"나 머리를 끌어 놓아 통째로
 * 넣는다(권장 항목이 모두 든다).
 */
import { useDrag } from "react-dnd";
import { Check, GripVertical, Plus } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId } from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import { FIELD_SECTIONS, fieldRows, type FieldRow } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface FieldPanelProps {
  taskType: TaskType | "";
  card: ComposerCard;
  /** 이 카드에서 받기로 고른 항목. */
  picks: readonly string[];
  included: boolean;
  actions: PickerActions;
}

/** 다이어그램 노드의 "필드 보기"가 스크롤해 올 요소 id. */
export const FIELD_PANEL_ID = "material-field-panel";

export function FieldPanel({ taskType, card, picks, included, actions }: FieldPanelProps) {
  const rows = fieldRows(card.id, taskType);
  const sections = FIELD_SECTIONS.filter((section) => rows[section.kind].length > 0);
  const [{ isDragging }, drag] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteCard,
    item: { cardId: card.id },
    canDrag: () => !included,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <section
      id={FIELD_PANEL_ID}
      aria-label={`${card.name} 필드`}
      className="flex scroll-mt-20 flex-col gap-5 rounded-xl border border-border bg-card p-5"
    >
      <header
        ref={(element) => {
          drag(element);
        }}
        className={cn(
          "flex flex-wrap items-start justify-between gap-x-6 gap-y-3",
          !included && "cursor-grab",
          isDragging && "opacity-40",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted-foreground">{categoryOf(card.id).name}</p>
          <h2 className="text-base font-medium text-foreground">
            {card.name}
            {card.locked && <span className="ml-2 text-xs font-normal text-muted-foreground">필수 카드</span>}
          </h2>
          <p className="text-sm leading-[21px] text-muted-foreground">{card.description}</p>
        </div>
        {included ? (
          <span className="flex items-center gap-1.5 pt-1 text-sm text-primary">
            <Check className="size-4" aria-hidden="true" />
            다이어그램에 들어가 있어요
          </span>
        ) : (
          <button
            type="button"
            onClick={() => actions.onIncludeCard(card.id)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 text-sm text-foreground-secondary hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" aria-hidden="true" />
            카드 넣기
          </button>
        )}
      </header>

      <p className="text-sm text-muted-foreground">
        권장·선택 필드는 ＋를 누르거나 위 다이어그램으로 끌어 놓으면 바로 들어가요.
      </p>

      {sections.map((section) => (
        <div key={section.kind} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground-secondary">
            {section.title}
            <span className="ml-2 font-normal text-muted-foreground">{section.note}</span>
          </h3>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {rows[section.kind].map((row) => (
              <FieldTile
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
    </section>
  );
}

/**
 * 필드 한 칸 — 이름(검정), 형식(오른쪽 회색), 조건, 설명(회색), 권장 필드면 그 안의 칸.
 * 권장·선택 칸에는 넣기·빼기 버튼이 있고, 아직 넣지 않았으면 다이어그램으로 끌 수 있다.
 */
function FieldTile({
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
  const draggable = Boolean(pickId) && !on;
  const [{ isDragging }, drag] = useDrag<ItemDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteItem,
    item: { cardId, pickId: pickId ?? "" },
    canDrag: () => draggable,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3",
        on ? "border-primary/40 bg-primary-subtle" : "border-border bg-card",
        draggable && "cursor-grab hover:border-border-strong",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex w-3.5 shrink-0 justify-center pt-0.5">
        {draggable && <GripVertical className="size-3.5 text-foreground-subtle" aria-hidden="true" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
