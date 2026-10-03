/**
 * 카드 한 장.
 *
 * **테두리와 채움을 다른 축으로 쓴다.**
 *
 * | 무엇 | 어떻게 |
 * |---|---|
 * | 성적서에 들어가는가 | 2px 파란 **테두리**(`--color-primary`) |
 * | 지금 아래에서 보고 있는가 | 진한 회색 **채움**(`--color-border-strong`) |
 *
 * 두 가지가 한 카드에 겹치므로 서로 다른 성질에 실어야 읽힌다. 종전에는 둘 다 테두리에
 * 실어서(색 → 두께) 차이가 거의 보이지 않았다.
 *
 * 채움에 쓴 `--color-border-strong` 은 이름이 테두리용이지만, 중립 토큰 중 "진한 회색"에
 * 해당하는 값이 이것뿐이다. 새 색을 만들지 않기로 한 범위를 지키려고 그대로 쓴다.
 *
 * 카드를 **누르는 것은 보는 것뿐**이다. 성적서에 넣고 빼는 것은 상세 영역의 버튼이 한다 —
 * 내용을 보려고 눌렀다가 카드가 꺼지는 일을 막는 분리는 그대로다.
 *
 * 테두리 두께가 바뀔 때 카드 크기가 흔들리지 않도록 안쪽 여백으로 상쇄한다(16 − 테두리).
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

  return (
    <div
      className={cn(
        "relative min-h-24 rounded-lg",
        // 테두리 = 성적서에 들어가는가. 2px 일 때 여백을 15px 로 줄여 크기를 맞춘다.
        included ? "border-2 border-primary p-[15px]" : "border p-4",
        // 채움 = 지금 보고 있는가. 보고 있지 않으면 들어간 카드만 연한 파랑을 깐다.
        viewing ? "bg-border-strong" : included ? "bg-primary-subtle" : "bg-card",
        !included && !viewing && "hover:border-border-strong",
      )}
    >
      <button
        type="button"
        aria-pressed={viewing}
        onClick={onView}
        aria-label={fullName + " 자세히 보기"}
        className="absolute inset-0 h-full w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />

      <div className="pointer-events-none relative flex gap-2">
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
