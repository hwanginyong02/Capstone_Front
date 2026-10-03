/**
 * 카드 한 장. 기존 Selectable Card 패턴에 "필수"(자물쇠)와 "보고 있음"(진한 테두리)을 더했다.
 *
 * **두 표시가 겹친다**(docs/COMPOSER_DESIGN.md "카드 > 상태"):
 * - 성적서에 들어가는지 → 파랑 테두리 + 연한 파랑 배경 (필수는 항상, 선택은 체크박스로)
 * - 지금 아래에서 보고 있는지 → 진한 테두리
 *
 * **누르는 것과 켜는 것을 분리한다.** 합치면 내용을 보려고 눌렀다가 카드가 꺼진다. 그래서
 * 카드 전체를 덮는 투명한 버튼(보기)과 그 위의 체크박스(켜기)를 **형제로** 둔다 — 버튼 안에
 * 체크박스를 넣으면 유효하지 않은 마크업이고 클릭이 서로 먹힌다.
 *
 * 테두리가 1px 에서 2px 로 바뀔 때 카드가 흔들리지 않도록, 2px 일 때 안쪽 여백을 15px 로
 * 줄인다(16px − 1px).
 */
import { Lock } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../utils/styling/styles";
import type { ComposerCard as ComposerCardData } from "../../types/reportComposer.types";

interface ComposerCardProps {
  card: ComposerCardData;
  /** 성적서에 들어가는지. 필수 카드는 항상 참이다. */
  included: boolean;
  /** 지금 상세 영역이 이 카드를 보여주는지. */
  viewing: boolean;
  onView: () => void;
  onToggle: (on: boolean) => void;
}

export function ComposerCard({ card, included, viewing, onView, onToggle }: ComposerCardProps) {
  const fullName = card.number + " " + card.name;

  return (
    <div
      className={cn(
        "relative min-h-24 rounded-lg",
        included ? "border-2 border-primary bg-primary-subtle" : "border bg-card",
        // "보고 있음" 은 위 상태와 겹쳐 테두리만 진하게 바꾼다.
        viewing && "border-2 border-foreground",
        // 꺼진 카드만 hover 에 반응한다 — 켜진 카드는 이미 2px 테두리다.
        !included && !viewing && "hover:border-border-strong",
      )}
    >
      {/* 카드 전체가 "자세히 보기" 버튼이다. 체크박스만 그 위에 얹힌다. */}
      <button
        type="button"
        aria-pressed={viewing}
        onClick={onView}
        aria-label={fullName + " 자세히 보기"}
        className="absolute inset-0 h-full w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />

      <div
        className={cn(
          "pointer-events-none relative flex gap-2",
          included || viewing ? "p-[15px]" : "p-4",
        )}
      >
        <span className="pointer-events-auto flex h-4 w-4 shrink-0 items-center justify-center">
          {card.locked ? (
            <Lock aria-label="항상 포함" className="h-4 w-4 text-primary" />
          ) : (
            <Checkbox
              checked={included}
              onCheckedChange={(next) => onToggle(next === true)}
              aria-label={fullName + " 포함"}
            />
          )}
        </span>

        <div className="min-w-0">
          <div className="text-body-medium font-semibold text-foreground">{fullName}</div>
          {/* 두 줄을 넘으면 자른다. 전체 문장은 상세 영역에서 보여준다. */}
          <p className="mt-1 line-clamp-2 text-body-small text-foreground-secondary">
            {card.description}
          </p>
        </div>
      </div>
    </div>
  );
}
