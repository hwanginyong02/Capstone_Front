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

  return (
    <Badge variant="secondary" className="rounded-sm text-body-xs font-medium text-foreground">
      필수
    </Badge>
  );
}
