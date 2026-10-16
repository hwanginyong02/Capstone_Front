/**
 * 추천 세트 — 최소 / 표준 / 상세(docs/MATERIAL_PICKER.md §11).
 *
 * 누르면 그 세트로 항목을 통째로 바꾼다. 지금 고른 것이 어느 세트와 똑같으면 그 버튼이 눌린
 * 모양이다. 일부만 바꿨으면 어느 것도 눌려 있지 않다(종전 프리셋 토글과 같은 규칙,
 * docs/COMPOSER_DESIGN.md 프리셋 절).
 */
import { PICK_TIERS, type PickTier } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";

interface PickSetToggleProps {
  /** 지금 고른 것과 똑같은 세트. 없으면 null. */
  current: PickTier | null;
  onApply: (tier: PickTier) => void;
}

export function PickSetToggle({ current, onApply }: PickSetToggleProps) {
  return (
    <div role="group" aria-label="추천 세트" className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">추천 세트</span>
      <div className="flex rounded-lg bg-muted p-1">
        {PICK_TIERS.map((tier) => {
          const pressed = tier.id === current;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={pressed}
              title={tier.description}
              onClick={() => onApply(tier.id)}
              className={cn(
                "h-8 rounded-md px-4 text-sm transition-colors",
                pressed
                  ? "border border-border-strong bg-card font-medium text-foreground"
                  : "text-foreground-secondary hover:text-foreground",
              )}
            >
              {tier.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
