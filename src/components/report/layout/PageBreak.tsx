import type { ReactNode } from "react";

/**
 * 인쇄(PDF) 시 이 블록 앞에서 페이지를 강제로 나눈다.
 * ReportPrint 페이지가 섹션 그룹을 페이지 단위로 묶는 데 사용한다(페이지에 인라인 스타일을 두지 않기 위함).
 */
export function PageBreak({ children }: { children: ReactNode }) {
  return <div style={{ pageBreakBefore: "always" }}>{children}</div>;
}
