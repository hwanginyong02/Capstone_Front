/**
 * 재료 고르기 가운데 — 고른 카드의 필드와 저장 버튼(docs/MATERIAL_PICKER.md §4·§6·§7·§8).
 *
 * 섹션은 필수 / 권장 / 선택 / 조건부다. 필수는 체크박스 없이 글자만, 권장과 선택은 체크박스
 * (기본 꺼짐), 조건부는 조건 문구와 함께 보인다. 권장은 필드 한 줄 단위로 체크하고 그 안의
 * 항목은 아래에 나열만 한다. 선택은 하나씩, 쪼갠 항목이 있으면 항목마다 체크한다.
 *
 * 필드 이름은 검정, 그 필드만의 설명은 회색, 형식은 이름 오른쪽에 회색으로 둔다(§8).
 *
 * 체크는 화면의 초안이다 — 저장을 눌러야 반영된다(§7). 저장한 뒤 체크를 바꾸면 "저장하지 않은
 * 변경이 있어요"를 보인다.
 */
import { Check } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import type { TaskType } from "../../data/evaluationData";
import {
  fieldFormat,
  fieldParts,
  getCard,
  getCardFields,
  partPickId,
  pickKind,
} from "../../data/reportComposer";
import type { ComposerCardId, FieldPart, PickKind } from "../../types/reportComposer.types";
import { isDraftDirty } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";

interface FieldPickerProps {
  taskType: TaskType | "";
  cardId: ComposerCardId;
  /** 화면의 체크(초안). */
  draft: string[];
  /** 저장한 체크. 저장하지 않은 카드면 없다. */
  saved: string[] | undefined;
  onToggle: (pickId: string) => void;
  onSave: () => void;
}

/** 필드 한 줄(또는 쪼갠 항목 한 줄). */
interface Row {
  key: string;
  name: string;
  format?: string;
  description?: string;
  condition?: string;
  /** 체크할 수 있는 줄이면 그 체크 id. */
  pickId?: string;
  /** 권장 필드 아래에 나열만 하는 항목. */
  subs?: FieldPart[];
}

const SECTIONS: Array<{ kind: PickKind; title: string }> = [
  { kind: "required", title: "필수" },
  { kind: "recommended", title: "권장" },
  { kind: "optional", title: "선택" },
  { kind: "conditional", title: "조건부" },
];

function buildRows(cardId: ComposerCardId, taskType: TaskType | ""): Record<PickKind, Row[]> {
  const card = getCard(cardId);
  const rows: Record<PickKind, Row[]> = { required: [], recommended: [], optional: [], conditional: [] };

  for (const field of getCardFields(cardId, taskType)) {
    const kind = pickKind(card, field);
    const condition = kind === "conditional" ? field.conditionLabel : undefined;

    if (kind === "recommended") {
      const subs = fieldParts(field);
      rows.recommended.push({
        key: field.id,
        name: field.label,
        format: subs.length > 0 ? undefined : fieldFormat(field),
        description: field.description,
        pickId: field.id,
        subs: subs.length > 0 ? subs : undefined,
      });
      continue;
    }

    // 필수·선택·조건부는 쪼갠 항목이 있으면 항목마다 한 줄이다(§8 "필드는 하나씩 쪼개 보여준다").
    if (field.parts) {
      for (const part of field.parts) {
        rows[kind].push({
          key: partPickId(field, part.key),
          name: part.label,
          format: part.format,
          description: part.description,
          condition,
          pickId: kind === "optional" ? partPickId(field, part.key) : undefined,
        });
      }
      continue;
    }

    rows[kind].push({
      key: field.id,
      name: field.label,
      format: fieldFormat(field),
      description: field.description,
      condition,
      pickId: kind === "optional" ? field.id : undefined,
    });
  }
  return rows;
}

export function FieldPicker({ taskType, cardId, draft, saved, onToggle, onSave }: FieldPickerProps) {
  const card = getCard(cardId);
  const rows = buildRows(cardId, taskType);
  const isSaved = saved !== undefined;
  const dirty = isDraftDirty(draft, saved);
  const clean = isSaved && !dirty;

  return (
    <section aria-label="필드" className="flex max-w-[680px] flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-large font-medium text-foreground">{card.name}</h1>
        <p className="text-sm leading-[21px] text-muted-foreground">{card.description}</p>
      </div>

      {SECTIONS.filter((section) => rows[section.kind].length > 0).map((section) => (
        <div key={section.kind} className="flex flex-col">
          <h2 className="mb-1.5 text-sm font-medium text-foreground-secondary">{section.title}</h2>
          {rows[section.kind].map((row) => (
            <FieldRow
              key={row.key}
              row={row}
              checked={row.pickId ? draft.includes(row.pickId) : false}
              onToggle={onToggle}
            />
          ))}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-2">
        <Button
          variant="outline"
          disabled={clean}
          onClick={onSave}
          className={cn(
            "h-11 px-5 text-base font-medium disabled:opacity-100",
            clean
              ? "border-primary text-primary"
              : "border-foreground-secondary text-foreground-secondary",
          )}
        >
          {clean && <Check className="size-4" aria-hidden="true" />}
          {clean ? "저장됨" : "저장"}
        </Button>
        {dirty && (isSaved || draft.length > 0) && (
          <span className="text-sm text-muted-foreground">
            {isSaved ? "저장하지 않은 변경이 있어요" : "저장해야 반영돼요"}
          </span>
        )}
      </div>
    </section>
  );
}

function FieldRow({
  row,
  checked,
  onToggle,
}: {
  row: Row;
  checked: boolean;
  onToggle: (pickId: string) => void;
}) {
  const controlId = row.pickId ? "pick-" + row.pickId : undefined;
  const Name = controlId ? "label" : "span";

  return (
    <div className="flex flex-col border-t border-border py-3.5">
      <div className="flex items-start gap-3.5">
        {row.pickId && (
          <Checkbox
            id={controlId}
            checked={checked}
            onCheckedChange={() => onToggle(row.pickId!)}
            className="mt-1 size-5"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Name
              {...(controlId ? { htmlFor: controlId } : {})}
              className={cn("text-base font-medium text-foreground", controlId && "cursor-pointer")}
            >
              {row.name}
            </Name>
            {row.format && <span className="text-right text-sm text-muted-foreground">{row.format}</span>}
          </div>
          {row.condition && (
            <span className="text-sm leading-[21px] text-foreground-secondary">조건: {row.condition}</span>
          )}
          {row.description && (
            <span className="text-sm leading-[21px] text-muted-foreground">{row.description}</span>
          )}
        </div>
      </div>

      {row.subs && (
        <div className="flex flex-col gap-3 pl-[34px] pt-3">
          {row.subs.map((sub) => (
            <div key={sub.key} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-base text-foreground">{sub.label}</span>
                {sub.format && <span className="text-right text-sm text-muted-foreground">{sub.format}</span>}
              </div>
              {sub.description && (
                <span className="text-sm leading-[21px] text-muted-foreground">{sub.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
