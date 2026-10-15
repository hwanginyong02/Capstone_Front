/**
 * 저장 표시 — 강조색 원 안의 체크(docs/MATERIAL_PICKER.md §7·§10). 카드 줄, 대분류 카드, 입력
 * 순서가 같은 표시를 쓴다. 저장하지 않은 자리에는 빈 원을 둔다(`UnsavedMark`).
 */
export function SavedMark({ label, size = 18 }: { label: string; size?: number }) {
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" className="fill-primary" />
      <path
        d="M6 10.5L8.8 13.2L14 7.5"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 아직 저장하지 않은 카드 자리. 장식이라 읽히지 않는다. */
export function UnsavedMark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border-[1.5px] border-border-strong"
    />
  );
}
