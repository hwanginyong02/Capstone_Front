/**
 * 판 4 표지와 시험 결과 요약(예시본 맨 앞 — 제목·상태 줄·표준 문구·발급 기관·발급 문구(22)·정보 표·"시험 결과 요약" 표).
 * 글은 모두 `lib/report/edition4/render/cover.ts` 가 저장값에서 고른다(다시 계산하지 않음). 미발급은 부록 B1(상태 두 줄, 문서
 * 번호·발급 일시 "(미발급)", 고정 문구 22 없음). 판 3 `ReportCoverSection`·`SignatureSection` 은 동결이라 import 하지 않는다.
 */
import {
  coverInfoGrid,
  coverIssueSentence,
  coverIssuerLine,
  coverStandardLine,
  coverStatusLines,
  coverSummaryRows,
} from "../../../lib/report/edition4/render/cover";
import { COVER_SUMMARY_HEADERS, COVER_SUMMARY_TITLE } from "../../../lib/report/edition4/render/coverText";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4ItemTable, Ed4Table } from "./shared/Ed4Table";

export function Ed4Cover({ data }: Ed4PartProps) {
  const [infoHeader, ...infoRows] = coverInfoGrid(data);
  const standard = coverStandardLine(data);
  const issueSentence = coverIssueSentence(data);
  const summary = coverSummaryRows(data);
  return (
    <section data-ed4-part="Ed4Cover">
      <h1 className="text-3xl font-bold text-slate-900">{data.meta.title}</h1>
      {coverStatusLines(data).map((line) => (
        <Ed4Paragraph key={line} className="font-semibold">
          {line}
        </Ed4Paragraph>
      ))}
      {standard && <Ed4Paragraph>{standard}</Ed4Paragraph>}
      <Ed4Paragraph>{coverIssuerLine(data)}</Ed4Paragraph>
      {issueSentence && <Ed4Paragraph>{issueSentence}</Ed4Paragraph>}
      <Ed4Table columns={infoHeader} rows={infoRows} />
      {summary.length > 0 && (
        <>
          <Ed4TableTitle>{COVER_SUMMARY_TITLE}</Ed4TableTitle>
          <Ed4ItemTable headers={COVER_SUMMARY_HEADERS} rows={summary} />
        </>
      )}
    </section>
  );
}
