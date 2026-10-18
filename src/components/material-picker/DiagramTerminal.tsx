/**
 * 흐름도의 시작·끝 단말(docs/MATERIAL_PICKER.md §12.3) — 알약 모양. 이름은 단계 정의의 이름이다
 * (`terminalLabel`: 시작 · 검증 · 확인과 생성).
 */
import { terminalLabel } from "../../utils/domain/flowChart";

export function DiagramTerminal({ id }: { id: "start" | "validation" | "report" }) {
  return (
    <span
      data-flow-node={id}
      className="inline-flex h-8 items-center rounded-full border border-border-strong bg-background px-4 text-sm text-foreground-secondary"
    >
      {terminalLabel(id)}
    </span>
  );
}
