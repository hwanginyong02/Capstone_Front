/**
 * 판 4 3절 시험 방법(3.1 의뢰자 요구사항 ~ 3.5 시험 절차와 평가 환경) — 예시본 모양. 저장값을 읽기만 하고, 글·칸은 순수 함수
 * (`lib/report/edition4/render/methodEd4.ts`)가 만든다. 화면·인쇄가 같은 부품이다(mode 로 가르는 것 없음).
 * 표 칸에는 글만 넣는다(렌더 시험 도구가 표 한 행을 한 줄로 읽는다). 번호 목록(3.5 절차)은 `<ol>` 대신 번호를 글로 찍는다.
 */
import {
  ED4_DASH,
  FIXED_25_STEPS,
  FIXED_26_RECORDED,
} from "../../../lib/report/edition4/edition4Text";
import {
  basisItemsEd4,
  criteriaRowsEd4,
  declarationRowsEd4,
  derivationEd4,
  formulaGroupsEd4,
  metricRationaleEd4,
  requirementsHeadEd4,
  scheduleRowsEd4,
  systemRowsEd4,
  verdictRuleParagraphsEd4,
} from "../../../lib/report/edition4/render/methodEd4";
import {
  ED3_PER_LABEL_COLUMNS,
  EX_3_1_CRITERIA_COLUMNS,
  EX_3_1_CRITERIA_TITLE,
  EX_3_1_DECLARATIONS_TITLE,
  EX_3_2_COLUMNS,
  EX_3_2_HEAD,
  EX_3_5_SCHEDULE_COLUMNS,
  EX_3_5_SCHEDULE_TITLE,
  EX_3_5_SYSTEM_HEAD,
  EX_3_5_SYSTEM_TITLE,
} from "../../../lib/report/edition4/render/methodText";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle, Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4ItemTable, Ed4Table } from "./shared/Ed4Table";

/** 3.3 목록 한 묶음(예시본의 "- " 항목). */
function BasisList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Ed4Method({ data }: Ed4PartProps) {
  const declarations = declarationRowsEd4(data);
  const rationale = metricRationaleEd4(data);
  const derivation = derivationEd4(data);
  const basis = basisItemsEd4(data);
  const [rule, margin] = verdictRuleParagraphsEd4(data);

  return (
    <section data-ed4-part="Ed4Method">
      <Ed4SectionTitle number="3" />

      <Ed4SubsectionTitle number="3.1" />
      <Ed4Paragraph>{requirementsHeadEd4(data)}</Ed4Paragraph>
      {declarations.length > 0 && (
        <>
          <Ed4TableTitle>{EX_3_1_DECLARATIONS_TITLE}</Ed4TableTitle>
          <Ed4ItemTable rows={declarations} />
        </>
      )}
      {rationale && <Ed4Paragraph>{rationale}</Ed4Paragraph>}
      <Ed4TableTitle>{EX_3_1_CRITERIA_TITLE}</Ed4TableTitle>
      <Ed4Table columns={EX_3_1_CRITERIA_COLUMNS} rows={criteriaRowsEd4(data)} />

      <Ed4SubsectionTitle number="3.2" />
      <Ed4Paragraph>{EX_3_2_HEAD}</Ed4Paragraph>
      {formulaGroupsEd4(data).map((group) => (
        <div key={group.title}>
          <Ed4TableTitle>{group.title}</Ed4TableTitle>
          <Ed4Table columns={EX_3_2_COLUMNS} rows={group.rows} />
        </div>
      ))}

      <Ed4SubsectionTitle number="3.3" />
      <BasisList items={basis.first ? [basis.first] : []} />
      {derivation && derivation.perLabelRows.length > 0 && (
        <Ed4Table columns={ED3_PER_LABEL_COLUMNS} rows={derivation.perLabelRows} />
      )}
      <BasisList items={basis.rest} />

      <Ed4SubsectionTitle number="3.4" />
      <Ed4Paragraph>{rule}</Ed4Paragraph>
      <Ed4Paragraph>{margin}</Ed4Paragraph>

      <Ed4SubsectionTitle number="3.5" />
      {FIXED_25_STEPS.map((step) => (
        <Ed4Paragraph key={step}>{step}</Ed4Paragraph>
      ))}
      <Ed4TableTitle>{EX_3_5_SCHEDULE_TITLE}</Ed4TableTitle>
      <Ed4Table columns={EX_3_5_SCHEDULE_COLUMNS} rows={scheduleRowsEd4(data)} />
      <Ed4TableTitle>{EX_3_5_SYSTEM_TITLE}</Ed4TableTitle>
      <Ed4Paragraph>{EX_3_5_SYSTEM_HEAD}</Ed4Paragraph>
      <Ed4Paragraph>{FIXED_26_RECORDED}</Ed4Paragraph>
      <Ed4ItemTable rows={systemRowsEd4(data).map((row) => ({ label: row.label, value: row.value || ED4_DASH }))} />
    </section>
  );
}
