/**
 * 카드 한 장.
 *
 * **파란색 하나로 통일하고, 두 가지를 다른 축으로 나눈다.**
 *
 * | 무엇 | 어떻게 |
 * |---|---|
 * | 성적서에 들어가는가 | 연한 파랑 **채움**(`--color-primary-subtle`) |
 * | 지금 아래에서 보고 있는가 | 파란 테두리를 **더 굵게**(2px → 3px) |
 *
 * 종전에는 "보고 있음"을 검은 테두리로 표시했는데, 파랑과 검정이 한 줄에 섞여 어느 쪽이
 * 무슨 뜻인지 읽히지 않았다. 색을 하나로 합치면 남는 단서는 두께뿐이라 그쪽을 쓴다.
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
  // 보고 있으면 3px, 들어가 있으면 2px, 그 외 1px. 여백이 그만큼 줄어 크기는 그대로다.
  const padding = viewing ? "p-[13px]" : included ? "p-[15px]" : "p-4";

  return (
    <div
      className={cn(
        "relative min-h-24 rounded-lg",
        // 성적서에 들어가는가 — 연한 파랑 채움.
        included ? "border-2 border-primary bg-primary-subtle" : "border bg-card",
        // 지금 보고 있는가 — 같은 파랑을 더 굵게.
        viewing && "border-[3px] border-primary",
        // 들어가지도 보고 있지도 않을 때만 hover 에 반응한다.
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

      <div className={cn("pointer-events-none relative flex gap-2", padding)}>
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
