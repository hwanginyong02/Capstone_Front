/**
 * 카드 한 장.
 *
 * **필수 카드와 선택 카드를 색으로 가른다.** 필수는 파랑(`--color-primary`), 선택은 회색
 * (`--color-border-strong` + `--color-muted`)이다. 종전에는 둘 다 파랑이고 자물쇠/체크박스
 * 아이콘으로만 갈렸는데, 체크박스를 상세 영역의 버튼으로 옮기면서 그 구분이 사라졌다.
 * (`docs/COMPOSER_DESIGN.md` 는 둘을 같은 모양으로 두라고 적지만, 아이콘이 없어진 이상
 *  색이 유일한 단서다.)
 *
 * 카드를 **누르는 것은 보는 것뿐**이다. 성적서에 넣고 빼는 것은 상세 영역의 버튼이 한다 —
 * 내용을 보려고 눌렀다가 카드가 꺼지는 일을 막는 분리는 그대로다.
 *
 * 테두리가 1px 에서 2px 로 바뀔 때 카드가 흔들리지 않도록, 2px 일 때 안쪽 여백을 15px 로
 * 줄인다(16px − 1px).
 */
import { Lock } from "lucide-react";
import { cn } from "../../utils/styling/styles";
import type { ComposerCard as ComposerCardData } from "../../types/reportComposer.types";

interface ComposerCardProps {
  card: ComposerCardData;
  /** 성적서에 들어가는지. 필수 카드는 항상 참이다. */
  included: boolean;
  /** 지금 상세 영역이 이 카드를 보여주는지. */
  viewing: boolean;
  onView: () => void;
}

export function ComposerCard({ card, included, viewing, onView }: ComposerCardProps) {
  const fullName = card.number + " " + card.name;
  const thickBorder = card.locked || included || viewing;

  return (
    <div
      className={cn(
        "relative min-h-24 rounded-lg",
        // 필수 — 파랑. 뺄 수 없으므로 늘 이 모양이다.
        card.locked && "border-2 border-primary bg-primary-subtle",
        // 선택 · 켜짐 — 회색. "들어가지만 뺄 수 있다".
        !card.locked && included && "border-2 border-border-strong bg-muted",
        // 선택 · 꺼짐
        !card.locked && !included && "border bg-card hover:border-border-strong",
        // "보고 있음" 은 위 상태와 겹쳐 테두리만 진하게 바꾼다.
        viewing && "border-2 border-foreground",
      )}
    >
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
          thickBorder ? "p-[15px]" : "p-4",
        )}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {card.locked && <Lock aria-label="항상 포함" className="h-4 w-4 text-primary" />}
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
