/**
 * 재료 고르기 가운데 아래 — 고른 카드의 필드(docs/MATERIAL_PICKER.md §8·§11).
 *
 * 왼쪽 재료 목록이나 다이어그램 노드에서 카드를 고르면 그 카드의 필드가 여기 필수 / 권장 / 선택 /
 * 조건부로 나뉘어 나온다. 필드마다 이름, 입력 형식, 조건, 설명을 마우스를 올리지 않아도 그대로
 * 보인다 — 설명을 읽고 넣을지 고른다.
 *
 * 구분은 색 배지와 칸 왼쪽의 색 띠로 가른다(`KIND_STYLE`). 형식은 이름 옆 작은 칩이고, 선택지가
 * 붙은 형식은 칩 아래에 선택지를 따로 적는다. 설명 끝의 "예: …"는 한 줄 떼어 연하게 보인다.
 *
 * 권장·선택 필드는 위 다이어그램으로 끌어 놓거나 ＋를 누르면 바로 들어간다. 필수·조건부는 늘
 * 들어가므로 버튼이 없다. 넣지 않은 선택 카드는 머리의 "카드 넣기"나 머리를 끌어 놓아 통째로
 * 넣는다(권장 항목이 모두 든다).
 */
import { useDrag } from "react-dnd";
import { Check, CornerDownRight, GripVertical, Plus } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId, PickKind } from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import { FIELD_SECTIONS, fieldRows, type FieldRow } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";
import { KIND_STYLE } from "./kindStyles";

interface FieldPanelProps {
  taskType: TaskType | "";
  card: ComposerCard;
  /** 이 카드에서 받기로 고른 항목. */
  picks: readonly string[];
  included: boolean;
  actions: PickerActions;
}

/** 다이어그램 노드를 눌렀을 때 스크롤해 올 요소 id. */
export const FIELD_PANEL_ID = "material-field-panel";

/** "하나 선택: A / B" 처럼 선택지가 붙은 형식을 칩과 선택지로 나눈다. */
function splitFormat(format: string): { kind: string; choices?: string } {
  const at = format.indexOf(": ");
  return at < 0 ? { kind: format } : { kind: format.slice(0, at), choices: format.slice(at + 2) };
}

/** 설명 끝의 "예: …"를 떼어 낸다. */
function splitExample(description: string): { text: string; example?: string } {
  const at = description.lastIndexOf("예: ");
  if (at < 0) return { text: description };
  return { text: description.slice(0, at).trim(), example: description.slice(at + 3).trim() };
}

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
      className="flex scroll-mt-20 flex-col gap-6 rounded-xl border border-border bg-card p-5"
    >
      <header
        ref={(element) => {
          drag(element);
        }}
        className={cn(
          "flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border pb-4",
          !included && "cursor-grab",
          isDragging && "opacity-40",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted-foreground">{categoryOf(card.id).name}</p>
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            {card.name}
            {card.locked && (
              <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", KIND_STYLE.required.badge)}>
                필수 카드
              </span>
            )}
          </h2>
          <p className="text-sm leading-[21px] text-muted-foreground">{card.description}</p>
          <p className="pt-1 text-xs text-foreground-subtle">
            권장·선택 필드는 ＋를 누르거나 위 다이어그램으로 끌어 놓으면 바로 들어가요.
          </p>
        </div>
        {included ? (
          <span className="flex items-center gap-1.5 rounded-md bg-primary-subtle px-2.5 py-1 text-sm text-primary">
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

      {/*
        필드만 패널 안에서 스크롤한다 — 필드가 많아도 패널이 길어지지 않아, 페이지를 내리지 않고 바로
        위 다이어그램으로 끌어 놓는다. 머리(카드 이름·카드 넣기)는 그대로 있다. 높이는 넉넉히 —
        최소 360px, 보통은 화면 높이의 45%.
      */}
      <div
        aria-label={`${card.name} 필드 목록`}
        role="group"
        className="-mr-2 flex max-h-[max(360px,45vh)] flex-col gap-6 overflow-y-auto pr-2"
      >
        {sections.map((section) => {
          const sectionRows = rows[section.kind];
          return (
            <div key={section.kind} className="flex flex-col gap-2.5">
              <h3 className="flex">
                <span
                  className={cn("rounded-md px-2.5 py-1 text-xs font-medium", KIND_STYLE[section.kind].solid)}
                >
                  {section.title}
                </span>
              </h3>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {sectionRows.map((row) => (
                  <FieldTile
                    key={row.key}
                    cardId={card.id}
                    kind={section.kind}
                    row={row}
                    on={row.pickId ? picks.includes(row.pickId) : false}
                    actions={actions}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 필드 한 칸 — 이름과 형식 칩, 선택지, 조건, 설명, 예시, 권장 필드면 그 안의 칸.
 * 권장·선택 칸에는 넣기·빼기 버튼이 있고, 아직 넣지 않았으면 다이어그램으로 끌 수 있다.
 */
function FieldTile({
  cardId,
  kind,
  row,
  on,
  actions,
}: {
  cardId: ComposerCardId;
  kind: PickKind;
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
  const format = row.format ? splitFormat(row.format) : null;
  const description = row.description ? splitExample(row.description) : null;

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-l-[3px] py-3 pl-2.5 pr-3",
        kind === "conditional" ? "border-dashed" : "",
        KIND_STYLE[kind].accent,
        on ? "border-y-primary/40 border-r-primary/40 bg-primary-subtle" : "border-y-border border-r-border bg-card",
        draggable && "cursor-grab hover:border-y-border-strong hover:border-r-border-strong",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex w-3.5 shrink-0 justify-center pt-0.5">
        {draggable && <GripVertical className="size-3.5 text-foreground-subtle" aria-hidden="true" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-foreground">{row.name}</span>
          {format && (
            <span className="rounded border border-border bg-muted px-1.5 py-px text-[11px] leading-4 text-foreground-secondary">
              {format.kind}
            </span>
          )}
        </div>
        {format?.choices && (
          <span className="text-xs leading-[18px] text-foreground-secondary">{format.choices}</span>
        )}
        {row.condition && (
          <span className="flex items-start gap-1 text-xs leading-[18px] text-foreground-secondary">
            <CornerDownRight className="mt-0.5 size-3 shrink-0 text-foreground-subtle" aria-hidden="true" />
            조건: {row.condition}
          </span>
        )}
        {description && (
          <div className="flex flex-col gap-0.5">
            {description.text && (
              <span className="text-xs leading-[18px] text-muted-foreground">{description.text}</span>
            )}
            {description.example && (
              <span className="text-xs leading-[18px] text-foreground-subtle">
                <span className="mr-1.5 font-medium">예</span>
                {description.example}
              </span>
            )}
          </div>
        )}
        {row.subs && (
          <ul className="mt-0.5 flex flex-col gap-1 border-l-2 border-border pl-2.5">
            {row.subs.map((sub) => (
              <li key={sub.key} className="flex flex-wrap items-center gap-x-2">
                <span className="text-xs text-foreground">{sub.label}</span>
                {sub.format && (
                  <span className="rounded border border-border bg-muted px-1.5 py-px text-[11px] leading-4 text-foreground-secondary">
                    {sub.format}
                  </span>
                )}
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
