/**
 * 판 4 "작성 기록" 상자(판 4 라운드 대응표 29, 부록 B25·B26 — P0) — 화면에만(인쇄·본문 밖). `NarrativeRecordPanel` 이 판 4
 * 성적서일 때 이것을 그린다. `/report/:id`(`Report.tsx`)와 `/report/no/:번호`(`ReportByNumber.tsx`) 두 페이지의 화면 상자다.
 *
 * - 머리: B25 "작성 기록 · 5·6절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)".
 * - 줄: B26 순서 "5.1 판정과 불확실성(8.2 칸) — AI 작성(모델)" 꼴(`ed4RecordLines`). 모르는 칸은 판 3 처럼 뒤에.
 * - 숨는 규칙은 판 3 과 같다(`showsNarrativeRecord` — 서술 대기·실패면 낡은 칸 출처로 그리지 않는다, 칸 출처가 없으면 없음).
 * - 혹시 화면을 브라우저로 인쇄해도 빠지게 `print:hidden`.
 */
import type { FinalReportData } from "../../../types/finalReport.types";
import { B25_RECORD_HEADER, B25_RECORD_NOTE } from "../../../lib/report/edition4/edition4Text";
import { ed4RecordLines } from "../../../lib/report/edition4/render/recordLines";
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
        <span className="font-semibold text-foreground-secondary">{B25_RECORD_HEADER}</span>
        <span className="text-muted-foreground">{` · ${B25_RECORD_NOTE}`}</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {ed4RecordLines(data).map((line) => (
          <li key={line.slot}>
            <span className="text-foreground-secondary">{line.text}</span>
            <span className="text-muted-foreground">{" — "}</span>
            <span>{line.label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
