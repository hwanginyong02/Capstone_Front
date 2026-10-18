/**
 * 숨겼다 보이는 컨트롤의 클래스(docs/MATERIAL_PICKER.md §12.3) — 트리 ＋·⊕, 블록 ▲▼✕, 단계 ◀▶, 칩 ✕.
 *
 * - 마우스로 올려 볼 수 있는 기기(`can-hover`)에서만 숨기고, 그 줄에 마우스를 올리거나 줄 안에
 *   포커스가 가면 보인다. 터치에서는 늘 보인다.
 * - **버튼은 DOM 에 그대로 남는다**(display 로 숨기지 않음) — 키보드·화면 낭독기·테스트가 그대로 쓴다.
 *   그래서 `hidden`·`invisible` 을 쓰지 않는다(controlStyles.test.ts 가 막는다).
 * - Tailwind 는 이어 붙인 클래스 이름을 찾지 못하므로 그룹마다 리터럴로 둔다.
 */
export const REVEAL = {
  row: "can-hover:opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none",
  node: "can-hover:opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none",
  lane: "can-hover:opacity-0 group-hover/lane:opacity-100 group-focus-within/lane:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none",
  chip: "can-hover:opacity-0 group-hover/chip:opacity-100 group-focus-within/chip:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none",
} as const;

export type RevealGroup = keyof typeof REVEAL;
