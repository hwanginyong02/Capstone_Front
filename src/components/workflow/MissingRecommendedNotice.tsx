/**
 * 확인과 생성 — 고르지 않은 권장 항목 안내(docs/MATERIAL_PICKER.md §5·§6).
 *
 * 선택 카드의 표준 보고 항목을 재료 고르기에서 고르지 않거나, 골랐지만 "모름"으로 답하면 성적서에
 * "제공되지 않음"으로 찍힌다(재료 선택 점검 5절 "모름은 제공되지 않음으로 셈").
 * 그 사실을 성적서보다 앞에 카드별로 알리고, 그 카드를 재료 고르기에서 바로 열 수 있게 한다.
 * 진행을 막지는 않는다 — 고르지 않는 것도 허용된 선택이다.
 */
import { Info } from "lucide-react";
import type { ComposerCardId } from "../../types/reportComposer.types";
import type { MissingRecommended } from "../../utils/domain/materialPicks";

interface MissingRecommendedNoticeProps {
  items: MissingRecommended[];
  onOpenPicker: (cardId: ComposerCardId) => void;
  /** 받기로 했지만 "모름"으로 답한 권장 항목 — 역시 "제공되지 않음"으로 찍힌다(재료 선택 점검 5절). */
  unknownItems?: MissingRecommended[];
  /** 그 카드의 입력 화면으로 간다. */
  onOpenInput?: (cardId: ComposerCardId) => void;
}

export function MissingRecommendedNotice({
  items,
  onOpenPicker,
  unknownItems = [],
  onOpenInput,
}: MissingRecommendedNoticeProps) {
  if (items.length === 0 && unknownItems.length === 0) return null;

  return (
    <section
      aria-label="빠진 권장 항목"
      className="mb-6 rounded-lg border border-border-strong bg-card px-5 py-4"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        아래 권장 항목은 성적서에 "제공되지 않음"으로 표시됩니다.
      </p>
      {items.length > 0 && (
      <ul className="mt-2 flex flex-col">
        {items.map(({ card, fields }) => (
          <li
            key={card.id}
            className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-t border-border py-3 first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{card.name}</span>
              <span className="text-sm text-foreground-secondary">
                {fields.map((field) => field.label).join(" · ")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenPicker(card.id)}
              className="text-sm text-foreground-secondary underline underline-offset-4 hover:text-foreground"
            >
              재료 고르기에서 넣기
            </button>
          </li>
        ))}
      </ul>
      )}
      {unknownItems.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-foreground-secondary">"모름"으로 답한 항목</p>
          <ul aria-label="모름으로 답한 권장 항목" className="mt-1 flex flex-col">
            {unknownItems.map(({ card, fields }) => (
              <li
                key={card.id}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-t border-border py-3 first:border-t-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{card.name}</span>
                  <span className="text-sm text-foreground-secondary">
                    {fields.map((field) => field.label).join(" · ")}
                  </span>
                </div>
                {onOpenInput && (
                  <button
                    type="button"
                    onClick={() => onOpenInput(card.id)}
                    className="text-sm text-foreground-secondary underline underline-offset-4 hover:text-foreground"
                  >
                    입력 화면에서 고치기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
