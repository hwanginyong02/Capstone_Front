/**
 * 판 4 1절 시험 개요(1.1 의뢰자와 시험기관, 1.2 시험 목적과 성적서 용도, 1.3 제약사항) — 예시본 모양.
 * 글은 `lib/report/edition4/render/overview.ts` 가 고른다. 1.3 은 번호를 글자로 찍는다(`<ol>` 을 쓰지 않음 — 예시본 대조가 번호를
 * 글로 본다). 항목 아래 줄(영향 문장·목적별 미충족 줄)은 들여 쓴 문단이다.
 */
import { clientRows, constraintLines, institutionRows, purposeParagraph, purposeTable } from "../../../lib/report/edition4/render/overview";
import {
  CONSTRAINTS_HEAD,
  OVERVIEW_CLIENT_TITLE,
  OVERVIEW_INSTITUTION_TITLE,
} from "../../../lib/report/edition4/render/overviewText";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle, Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4ItemTable, Ed4Table } from "./shared/Ed4Table";

export function Ed4Overview({ data }: Ed4PartProps) {
  const purpose = purposeTable(data);
  return (
    <section data-ed4-part="Ed4Overview">
      <Ed4SectionTitle number="1" />

      <Ed4SubsectionTitle number="1.1" />
      <Ed4TableTitle>{OVERVIEW_CLIENT_TITLE}</Ed4TableTitle>
      <Ed4ItemTable rows={clientRows(data)} />
      <Ed4TableTitle>{OVERVIEW_INSTITUTION_TITLE}</Ed4TableTitle>
      <Ed4ItemTable rows={institutionRows(data)} />

      <Ed4SubsectionTitle number="1.2" />
      <Ed4Paragraph>{purposeParagraph(data)}</Ed4Paragraph>
      <Ed4Table columns={purpose.header} rows={purpose.rows.map((row) => [row.label, row.value])} />

      <Ed4SubsectionTitle number="1.3" />
      <Ed4Paragraph>{CONSTRAINTS_HEAD}</Ed4Paragraph>
      {constraintLines(data).map((item) => (
        <div key={item.text}>
          <Ed4Paragraph>{item.text}</Ed4Paragraph>
          {item.details.map((line) => (
            <Ed4Paragraph key={line} className="mt-1 pl-6">
              {line}
            </Ed4Paragraph>
          ))}
        </div>
      ))}
    </section>
  );
}
