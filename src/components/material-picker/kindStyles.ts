/**
 * 필드 구분(필수 / 권장 / 선택 / 조건부)의 색(docs/MATERIAL_PICKER.md §10·§11).
 *
 * 색은 구분 하나에만 쓴다 — 필수는 강조색(네이비), 권장은 주의색(앰버), 선택·조건부는 회색이다.
 * 권장이 앰버인 것은 빠지면 성적서에 "제공되지 않음"으로 찍혀 하단 바가 같은 색으로 경고하기
 * 때문이다. 필드 패널의 구분 머리·왼쪽 띠, 다이어그램 칩의 점, 하단 현황의 점이 같은 표를 쓴다.
 *
 * - `solid`: 필드 패널의 구분 머리. 진한 배경에 흰 글자로 강조한다. 조건부는 선택과 가르려고 한 단계
 *   연한 회색에 검정 글자다.
 * - `badge`: 연한 배경 배지(패널 머리의 "필수 카드").
 */
import type { PickKind } from "../../types/reportComposer.types";

export const KIND_STYLE: Record<PickKind, { solid: string; badge: string; accent: string; dot: string }> = {
  required: {
    solid: "bg-primary text-primary-foreground",
    badge: "bg-primary-subtle text-primary",
    accent: "border-l-primary",
    dot: "bg-primary",
  },
  recommended: {
    solid: "bg-warning-strong text-warning-foreground",
    badge: "bg-warning-subtle text-warning-strong",
    accent: "border-l-warning",
    dot: "bg-warning",
  },
  optional: {
    solid: "bg-foreground-subtle text-primary-foreground",
    badge: "bg-muted text-foreground-secondary",
    accent: "border-l-border-strong",
    dot: "bg-foreground-subtle",
  },
  conditional: {
    solid: "bg-border-strong text-foreground",
    badge: "bg-muted text-foreground-secondary",
    accent: "border-l-border-strong",
    dot: "bg-foreground-subtle",
  },
};

/** 구분 이름. 트리·팝업·범례·하단 바가 이 하나를 쓴다("조건부"는 화면에서 "함께 들어감"이다). */
export const KIND_LABEL: Record<PickKind, string> = {
  required: "필수",
  recommended: "권장",
  optional: "선택",
  conditional: "함께 들어감",
};

/** 범례 툴팁의 뜻풀이. */
export const KIND_HINT: Record<PickKind, string> = {
  required: "다음으로 가려면 꼭 넣어야 해요",
  recommended: "성적서 표준 보고 항목이에요. 빠지면 ‘제공되지 않음’으로 찍혀요",
  optional: "넣으면 성적서와 AI 서술에 더 실려요",
  conditional: "조건을 정하는 항목을 넣으면 같이 들어가요. 따로 끌지 않아요",
};

/**
 * 마커 모양 — 필수 꽉 찬 원(네이비), 권장 마름모(앰버), 선택 빈 원(회색). 함께 들어감은 ↳ 아이콘이라
 * 여기 없다(`KindMarker`). 권장은 muted 바탕에서 대비가 3:1 을 넘게 warning-strong 을 쓴다.
 */
export const KIND_MARKER: Record<Exclude<PickKind, "conditional">, string> = {
  required: "size-2 rounded-full bg-primary",
  recommended: "size-2 rotate-45 bg-warning-strong",
  optional: "size-2 rounded-full border-[1.5px] border-foreground-subtle",
};
