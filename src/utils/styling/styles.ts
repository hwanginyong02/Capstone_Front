/**
 * Tailwind CSS 스타일링 유틸리티
 *
 * 이 파일은 Tailwind CSS 클래스들을 스타일 충돌 없이 안전하게 병합해 주는
 * `cn` (classNames) 유틸리티 함수를 제공합니다.
 * 버튼, 카드, 인풋 등 모든 UI 컴포넌트에서 광범위하게 사용됩니다.
 *
 * `theme.css` 가 `docs/imports/typography.md` 의 타입 스케일을 `--text-*` 토큰으로 들고 있는데,
 * tailwind-merge 는 기본 설정으로는 `text-body-small` 같은 이름을 **글자 크기로 알아보지
 * 못한다.** 그러면 `cn("text-sm", "text-body-small")` 이 둘을 모두 남기고, 어느 쪽이 이기는지는
 * 클래스 순서가 아니라 생성된 CSS 의 규칙 순서가 정한다 — shadcn 컴포넌트는 기본 클래스에
 * `text-xs`·`text-sm` 을 들고 있으므로 토큰으로 덮어쓰는 일이 늘 이 상황이다.
 * 그래서 토큰 이름을 글자 크기 그룹에 등록해, 충돌이 정상적으로 해소되게 한다.
 */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** `theme.css` 의 `@theme` 에 정의된 타입 스케일 토큰. 두 곳이 함께 움직여야 한다. */
const TEXT_SCALE_TOKENS = [
  "heading-large",
  "heading-medium",
  "heading-small",
  "body-large",
  "body-medium",
  "body-small",
  "body-xs",
  "metric-large",
  "metric-medium",
  "mono-small",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TEXT_SCALE_TOKENS] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
