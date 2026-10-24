/**
 * 판 4 4절 시험 결과의 앞부분(절 제목, 4.1 데이터 점검, 4.2 종합 판정, 4.3 지표별 결과) — 예시본 4.1~4.3 모양.
 * 칸 글자는 모두 `lib/report/edition4/render/resultsCore.ts` 의 순수 함수가 저장값을 읽어 만든다(다시 계산하지 않음).
 * 화면·인쇄가 같은 부품이고 mode 로 가르는 것은 없다. 표 칸에는 글만 넣는다(렌더 도구가 한 행을 한 줄로 읽는다).
 */
import {
  classReportRowsEd4,
  metricRowsEd4,
  showsClassReportEd4,
  subMetricTablesEd4,
  validationGroupsEd4,
  validationSummaryRowsEd4,
  verdictBasisEd4,
  verdictRowEd4,
} from "../../../lib/report/edition4/render/resultsCore";
import {
  EX_4_1_GROUP_COLUMNS,
  EX_4_1_SUMMARY_COLUMNS,
  EX_4_2_COLUMNS,
  EX_4_3_COLUMNS,
  V3_CLASS_REPORT_COLUMNS,
  V3_CLASS_REPORT_TITLE,
  V3_NO_VALIDATION,
  V3_SUB_METRIC_COLUMNS,
  V3_SUB_METRICS_TITLE,
} from "../../../lib/report/edition4/render/resultsCoreText";
import { FIXED_19_NOTE } from "../../../lib/report/edition4/edition4Text";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle, Ed4TableTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4Table } from "./shared/Ed4Table";

export function Ed4ResultsCore({ data }: Ed4PartProps) {
  const groups = validationGroupsEd4(data.dataValidation);
  const verdictRow = verdictRowEd4(data);
  const basis = verdictBasisEd4(data);
  const classReport = showsClassReportEd4(data) ? data.classReport! : null;
  const subTables = subMetricTablesEd4(data.kpiResults);

  return (
    <section data-ed4-part="Ed4ResultsCore">
      <Ed4SectionTitle number="4" />

      <Ed4SubsectionTitle number="4.1" />
      <Ed4Table columns={EX_4_1_SUMMARY_COLUMNS} rows={validationSummaryRowsEd4(data)} />
      {groups.length === 0 && <Ed4Paragraph>{V3_NO_VALIDATION}</Ed4Paragraph>}
      {groups.map((g) => (
        <div key={g.group} data-ed4-validation-group={g.group}>
          <Ed4TableTitle>{g.head}</Ed4TableTitle>
          <Ed4Table columns={EX_4_1_GROUP_COLUMNS} rows={g.rows} />
        </div>
      ))}

      <Ed4SubsectionTitle number="4.2" />
      {verdictRow && <Ed4Table columns={EX_4_2_COLUMNS} rows={[verdictRow]} />}
      {basis && <Ed4Paragraph>{basis}</Ed4Paragraph>}

      <Ed4SubsectionTitle number="4.3" />
      <Ed4Table
        columns={EX_4_3_COLUMNS}
        rows={metricRowsEd4(data.kpiResults)}
        rowKeys={data.kpiResults.map((r) => r.metricId)}
      />
      <Ed4Paragraph>{FIXED_19_NOTE}</Ed4Paragraph>

      {classReport && (
        <div data-ed4-class-report="">
          <Ed4TableTitle>{V3_CLASS_REPORT_TITLE}</Ed4TableTitle>
          <Ed4Table
            columns={V3_CLASS_REPORT_COLUMNS}
            rows={classReportRowsEd4(classReport, data.kpiResults, data.narrativeFacts?.weakest_class ?? null)}
          />
        </div>
      )}

      {subTables.length > 0 && (
        <div data-ed4-sub-metrics="">
          <Ed4TableTitle>{V3_SUB_METRICS_TITLE}</Ed4TableTitle>
          {subTables.map((t) => (
            <div key={t.metricId}>
              <Ed4Paragraph>{t.head}</Ed4Paragraph>
              <Ed4Table columns={V3_SUB_METRIC_COLUMNS} rows={t.rows} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
