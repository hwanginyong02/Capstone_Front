/**
 * 재료 고르기 오른쪽 — 입력 순서(docs/MATERIAL_PICKER.md §4).
 *
 * 필수 카드와, 항목을 하나 이상 골라 저장한 선택 카드가 입력 순서대로 나온다. 라벨은 없다.
 * 아래에 "필수 5개 중 N개 저장"과 이전·다음 버튼이 있다. 버튼은 페이지가 만들어 넘긴다 —
 * 이동을 정하는 것은 페이지다(FRONTEND_DEVELOPMENT_GUIDELINE §2).
 *
 * 저장하지 않은 필수 카드가 있는데 다음을 누르면, 그 카드 이름을 오류로 보인다(§7).
 */
import type { ReactNode } from "react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCardId, MaterialPicks } from "../../types/reportComposer.types";
import {
  inputOrderCards,
  isCardSaved,
  requiredProgress,
  savedPickCount,
} from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { SavedMark } from "./SavedMark";

interface InputOrderPanelProps {
  taskType: TaskType | "";
  picks: MaterialPicks;
  cardId: ComposerCardId;
  onSelectCard: (cardId: ComposerCardId) => void;
  /** 다음을 눌렀는데 막혔을 때 보일 문장. 없으면 오류를 보이지 않는다. */
  error?: string | null;
  /** 이전·다음 버튼. */
  actions: ReactNode;
}

export function InputOrderPanel({
  taskType,
  picks,
  cardId,
  onSelectCard,
  error,
  actions,
}: InputOrderPanelProps) {
  const cards = inputOrderCards(taskType, picks);
  const progress = requiredProgress(taskType, picks);

  return (
    <div className="flex flex-col gap-5 p-6 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
      <ol aria-label="입력 순서" className="flex flex-col overflow-y-auto">
        {cards.map((card, index) => {
          const saved = isCardSaved(picks, card.id);
          const count = savedPickCount(picks, card.id);
          const viewing = card.id === cardId;
          return (
            <li key={card.id} className="flex flex-col items-stretch">
              {index > 0 && (
                <div aria-hidden="true" className="flex h-5 justify-center">
                  <svg width="12" height="20" viewBox="0 0 12 20" className="stroke-foreground-subtle">
                    <path
                      d="M6 1V18M2.5 14.5L6 18L9.5 14.5"
                      fill="none"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              <button
                type="button"
                aria-current={viewing ? "true" : undefined}
                onClick={() => onSelectCard(card.id)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-4 py-2 text-left transition-colors",
                  saved ? "border border-primary bg-primary-subtle" : "border border-border-strong bg-card",
                  viewing && "border-transparent ring-2 ring-inset ring-foreground-secondary",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-medium text-foreground">{card.name}</span>
                  {count > 0 && (
                    <span className="text-sm text-muted-foreground">고른 항목 {count}개</span>
                  )}
                </span>
                {saved && <SavedMark label="저장됨" />}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm leading-[21px] text-destructive">
            {error}
          </p>
        )}
        <span className="text-sm text-muted-foreground">
          필수 {progress.total}개 중 {progress.saved}개 저장
        </span>
        {actions}
      </div>
    </div>
  );
}
