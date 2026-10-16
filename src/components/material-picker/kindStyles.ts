/**
 * 필드 구분(필수 / 권장 / 선택 / 조건부)의 색(docs/MATERIAL_PICKER.md §10·§11).
 *
 * 색은 구분 하나에만 쓴다 — 필수는 강조색(네이비), 권장은 주의색(앰버), 선택·조건부는 회색이다.
 * 권장이 앰버인 것은 빠지면 성적서에 "제공되지 않음"으로 찍혀 하단 바가 같은 색으로 경고하기
 * 때문이다. 필드 패널의 배지·왼쪽 띠, 다이어그램 칩의 점, 하단 현황의 점이 같은 표를 쓴다.
 */
import type { PickKind } from "../../types/reportComposer.types";

export const KIND_STYLE: Record<PickKind, { badge: string; accent: string; dot: string }> = {
  required: { badge: "bg-primary-subtle text-primary", accent: "border-l-primary", dot: "bg-primary" },
  recommended: {
    badge: "bg-warning-subtle text-warning-strong",
    accent: "border-l-warning",
    dot: "bg-warning",
  },
  optional: { badge: "bg-muted text-foreground-secondary", accent: "border-l-border-strong", dot: "bg-foreground-subtle" },
  conditional: { badge: "bg-muted text-foreground-secondary", accent: "border-l-border-strong", dot: "bg-foreground-subtle" },
};
