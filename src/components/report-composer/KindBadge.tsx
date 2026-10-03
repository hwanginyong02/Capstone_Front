/**
 * 필드 구분 표시 — 필수 / 선택 / 조건부.
 *
 * 조건부는 **배지를 쓰지 않는다**(docs/COMPOSER_DESIGN.md "구분 배지"). 조건 문구 자체가
 * 설명이라("Fβ 선택 시") 배지 안에 넣으면 읽히지 않는다.
 */
import { Badge } from "../ui/badge";
import type { ComposerField } from "../../types/reportComposer.types";

export function KindBadge({ field }: { field: ComposerField }) {
  if (field.kind === "conditional") {
    return (
      <span className="text-body-xs font-medium text-muted-foreground">
        {field.conditionLabel}
      </span>
    );
  }

  if (field.kind === "optional") {
    return (
      <Badge
        variant="outline"
        className="rounded-sm border-border text-body-xs font-medium text-muted-foreground"
      >
        선택
      </Badge>
    );
  }

  /**
   * 필수는 파랑으로 — 카드의 "성적서에 들어감" 과 같은 색이다. 연한 파랑 바탕 위의 파란
   * 글자는 7:1 로, 상태색을 옅은 배경에 올릴 때 쓰는 짝과 같다(imports `colors.md`).
   */
  return (
    <Badge
      variant="outline"
      className="rounded-sm border-primary bg-primary-subtle text-body-xs font-medium text-primary"
    >
      필수
    </Badge>
  );
}
