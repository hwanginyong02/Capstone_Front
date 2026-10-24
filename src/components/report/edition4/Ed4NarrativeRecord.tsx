/**
 * 판 4 "작성 기록" 상자 — 화면에만(인쇄 없음). `NarrativeRecordPanel` 이 판 4 성적서일 때 이것을 그린다.
 * 지금은 머리 줄 자리만(판 4 라운드 S4·S5 1단계 뼈대) — 2단계(S5 ⑥)가 부록 B25·B26 글과 칸 줄로 채운다.
 * 숨는 규칙(대기·실패)도 2단계가 정한다. 지금은 판 3 `showsNarrativeRecord` 와 같은 조건(서술이 끝났고 칸별 출처가 있음).
 */
import type { FinalReportData } from "../../../types/finalReport.types";
import { showsNarrativeRecord } from "../NarrativeRecordPanel";

export function Ed4NarrativeRecord({ data }: { data: FinalReportData }) {
  if (!showsNarrativeRecord(data)) return null;
  return (
    <details
      aria-label="작성 기록"
      data-ed4-part="Ed4NarrativeRecord"
      className="print:hidden mb-6 rounded border border-border bg-muted px-4 py-3 text-xs text-foreground-secondary"
    >
      <summary className="cursor-pointer select-none">
        <span className="font-semibold text-foreground-secondary">작성 기록</span>
      </summary>
    </details>
  );
}
