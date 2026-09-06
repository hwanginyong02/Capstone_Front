/**
 * ReportSections — 화면용 성적서 본문(1~9절)의 단일 출처.
 *
 * 같은 성적서를 렌더하는 화면 경로가 둘이다 — 워크스페이스 run 으로 여는 `/report/:id`
 * 와 성적서 번호로 서버 스냅샷을 복원해 여는 `/report/no/:reportNo`(ISSUES.md F-04).
 * 두 곳에 섹션 JSX 를 복제하면 한쪽만 갱신되는 드리프트가 생긴다 — 인쇄본이
 * `validationSummary` 를 넘기지 않아 사용자 입력값을 인쇄하던 것이 바로 그 사례다(E-17).
 * 그래서 본문 조립은 여기 한 곳에만 둔다.
 *
 * 인쇄 경로(ReportPrint)는 PageBreak 로 절을 묶어야 해서 구조가 다르므로 공유하지 않는다.
 * 대신 `DataValidationSection.test.tsx` 의 배선 계약 테스트가 두 경로의 prop 집합을 대조한다.
 */
import type { FinalReportData } from "../../types/finalReport.types";
import { ReportCoverSection } from "./sections/ReportCoverSection";
import { CompanyInfoSection } from "./sections/CompanyInfoSection";
import { EvalScopeSection } from "./sections/EvalScopeSection";
import { DatasetSection } from "./sections/DatasetSection";
import { EvalEnvSection } from "./sections/EvalEnvSection";
import { MetricListSection } from "./sections/MetricListSection";
import { DataValidationSection } from "./sections/DataValidationSection";
import { KpiResultSection } from "./sections/KpiResultSection";
import { ChartSection } from "./sections/ChartSection";
import { LatencySection } from "./sections/LatencySection";
import { InterpretSection } from "./sections/InterpretSection";
import { ConclusionSection } from "./sections/ConclusionSection";
import { RecommendSection } from "./sections/RecommendSection";
import { SignatureSection } from "./sections/SignatureSection";

export function ReportSections({ data }: { data: FinalReportData }) {
  return (
    <>
      <ReportCoverSection meta={data.meta} performer={data.performer} />
      <CompanyInfoSection
        applicant={data.applicant}
        performer={data.performer}
        evalScope={data.evalScope}
        meta={data.meta}
      />
      <EvalScopeSection meta={data.meta} />
      <DatasetSection
        datasetInfo={data.datasetInfo}
        datasetSamples={data.datasetSamples}
        datasetDiagnosis={data.datasetDiagnosis}
        trainingDatasetInfo={data.trainingDatasetInfo}
      />
      <EvalEnvSection meta={data.meta} evalScope={data.evalScope} evalEnv={data.evalEnv} />
      <MetricListSection metricList={data.metricList} metricFormulas={data.metricFormulas} taskTypeLabel={data.meta.taskTypeLabel} />
      <DataValidationSection
        dataValidation={data.dataValidation}
        kpiResults={data.kpiResults}
        totalSamples={data.datasetInfo.sampleCount}
        validationSummary={data.validationSummary}
      />
      <KpiResultSection kpiResults={data.kpiResults} taskType={data.meta.taskType} meta={data.meta} />
      <ChartSection charts={data.charts} />
      <LatencySection latency={data.latency} />
      <InterpretSection interpretation={data.interpretation} source={data.narrativeSource} />
      <ConclusionSection conclusion={data.conclusion} source={data.narrativeSource} />
      <RecommendSection
        recommendations={data.recommendations}
        narrative={data.recommendationNarrative}
        source={data.narrativeSource}
      />
      <SignatureSection
        signature={data.signature}
        meta={data.meta}
        evalScope={data.evalScope}
        performer={data.performer}
      />
    </>
  );
}
