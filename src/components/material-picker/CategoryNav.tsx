/**
 * 재료 고르기 왼쪽 — 대분류 네모 카드 4개와, 고른 대분류의 카드 목록(docs/MATERIAL_PICKER.md §4).
 *
 * 목록은 테두리 하나 안에 두고 줄마다 구분선을 긋는다. 필수 카드에는 "필수"라는 글자를 붙인다.
 * 저장한 카드는 강조 배경과 체크로, 대분류는 그 안의 필수 카드를 다 저장하면 같은 표시로
 * 바뀐다(§7). 지금 보고 있는 카드와 대분류는 진한 테두리다.
 */
import { MATERIAL_CATEGORIES, categoryOf, getCard, getVisibleCards } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCardId, MaterialPicks } from "../../types/reportComposer.types";
import { isCardSaved, isCategoryComplete } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { SavedMark, UnsavedMark } from "./SavedMark";

interface CategoryNavProps {
  taskType: TaskType | "";
  cardId: ComposerCardId;
  picks: MaterialPicks;
  onSelectCard: (cardId: ComposerCardId) => void;
}

export function CategoryNav({ taskType, cardId, picks, onSelectCard }: CategoryNavProps) {
  const current = categoryOf(cardId);
  const visible = new Set(getVisibleCards(taskType).map((card) => card.id));
  const cardsOf = (ids: ComposerCardId[]) => ids.filter((id) => visible.has(id));

  return (
    <nav aria-label="재료 카탈로그" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {MATERIAL_CATEGORIES.map((category) => {
          const selected = category.id === current.id;
          const complete = isCategoryComplete(category, picks);
          const cards = cardsOf(category.cardIds);
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectCard(cards[0])}
              className={cn(
                "flex aspect-square flex-col items-start justify-between rounded-lg text-left transition-colors",
                complete ? "bg-primary-subtle" : "bg-card",
                selected
                  ? "border-2 border-foreground-secondary p-[15px]"
                  : complete
                    ? "border border-primary p-4"
                    : "border border-border-strong p-4 hover:border-foreground-subtle",
              )}
            >
              <span className="flex w-full items-start justify-between">
                <span className="text-base font-medium text-foreground">{category.name}</span>
                {complete && <SavedMark label="필수 카드 모두 저장됨" size={20} />}
              </span>
              <span className="text-sm text-muted-foreground">카드 {cards.length}장</span>
            </button>
          );
        })}
      </div>

      <ul
        aria-label={current.name + " 카드"}
        className="overflow-hidden rounded-lg border border-border-strong"
      >
        {cardsOf(current.cardIds).map((id, index) => {
          const card = getCard(id);
          const saved = isCardSaved(picks, id);
          const viewing = id === cardId;
          return (
            <li key={id} className={cn(index > 0 && "border-t border-border")}>
              <button
                type="button"
                aria-current={viewing ? "true" : undefined}
                onClick={() => onSelectCard(id)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors",
                  saved ? "bg-primary-subtle" : "bg-card hover:bg-muted",
                  viewing && "ring-2 ring-inset ring-foreground-secondary",
                )}
              >
                <span className="flex-1 text-base text-foreground">{card.name}</span>
                {card.locked && <span className="text-sm text-muted-foreground">필수</span>}
                {saved ? <SavedMark label="저장됨" /> : <UnsavedMark />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
