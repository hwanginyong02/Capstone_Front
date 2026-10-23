/**
 * 항목 구분 마커 — ● 필수 · ◆ 권장 · ○ 선택 · ↳ 함께 들어감(docs/MATERIAL_PICKER.md §12.3).
 *
 * 색만으로 가르지 않게 모양을 다르게 한다. 마커는 장식이라 읽히지 않는다 — 구분은 글자로 따로 전한다
 * (트리 줄의 숨은 글자, 팝업 머리, 하단 바의 라벨). 트리·칩·하단 바·팝업·범례가 이 하나를 쓴다.
 */
import { CornerDownRight } from "lucide-react";
import type { PickKind } from "../../types/reportComposer.types";
import { cn } from "../../utils/styling/styles";
import { KIND_MARKER } from "./kindStyles";

export function KindMarker({ kind, className }: { kind: PickKind; className?: string }) {
  if (kind === "conditional") {
    return (
      <CornerDownRight aria-hidden="true" className={cn("size-3 shrink-0 text-foreground-subtle", className)} />
    );
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}>
      <span className={KIND_MARKER[kind]} />
    </span>
  );
}
