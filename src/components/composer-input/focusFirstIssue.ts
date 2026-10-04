/**
 * 막힌 첫 칸으로 화면을 옮기고 커서를 둔다.
 *
 * 긴 폼에서 "Next" 가 막혔다고만 말하면, 어느 칸 때문인지 찾으러 사용자가 위아래로 훑어야
 * 한다. 아래 Action Bar 는 이름을 말해 주지만 그 칸이 화면 밖이면 이름만으로는 못 찾는다.
 *
 * 컨트롤 id 규칙은 `ComposerFieldInput` 이 정한다 — 한 칸짜리 입력은 `field-<id>`,
 * 여러 칸이 묶인 입력(라디오·체크박스·entries)은 래퍼에 `field-<id>-group` 이 붙는다.
 * 묶음부터 찾는 이유는 그쪽이 질문 전체를 감싸고 있어 화면에 더 많은 맥락이 들어오기
 * 때문이다.
 */
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

export function focusFirstIssue(issues: FieldIssue[]): void {
  const [first] = issues;
  if (!first) return;

  const group = document.getElementById("field-" + first.fieldId + "-group");
  const single = document.getElementById("field-" + first.fieldId);
  const target = group ?? single;
  if (!target) return;

  target.scrollIntoView({ block: "center", behavior: "smooth" });

  // 묶음 래퍼는 포커스를 받을 수 없으므로 안의 첫 컨트롤에 준다.
  const focusable =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target
      : target.querySelector<HTMLElement>("input, textarea, button, [tabindex]");
  focusable?.focus({ preventScroll: true });
}
