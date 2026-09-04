import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
import { ReportLoadingState } from "../../components/report/ReportLoadingState";
import { ReportErrorState } from "../../components/report/ReportErrorState";
import { ReportCoverSection } from "../../components/report/sections/ReportCoverSection";
import { CompanyInfoSection } from "../../components/report/sections/CompanyInfoSection";
import { EvalScopeSection } from "../../components/report/sections/EvalScopeSection";
import { DatasetSection } from "../../components/report/sections/DatasetSection";
import { EvalEnvSection } from "../../components/report/sections/EvalEnvSection";
import { MetricListSection } from "../../components/report/sections/MetricListSection";
import { DataValidationSection } from "../../components/report/sections/DataValidationSection";
import { KpiResultSection } from "../../components/report/sections/KpiResultSection";
import { ChartSection } from "../../components/report/sections/ChartSection";
import { LatencySection } from "../../components/report/sections/LatencySection";
import { InterpretSection } from "../../components/report/sections/InterpretSection";
import { ConclusionSection } from "../../components/report/sections/ConclusionSection";
import { RecommendSection } from "../../components/report/sections/RecommendSection";
import { SignatureSection } from "../../components/report/sections/SignatureSection";

export function Report() {
  const { id = "preview" } = useParams();
  const { data: reportData, isLoading, narrativePending, error } = useReportData(id);
  const issuance = useIssuance(id, reportData);
  const data = issuance.data; // 발급 반영본(있으면) — 섹션은 이 값을 렌더한다
  const { download } = usePdfDownload(id);

  if (isLoading) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} onBack={() => window.history.back()} />;
  }

  if (!data) return null;

  return (
    <ReportLayout
      onDownload={download}
      issued={issuance.issued}
      canIssue={issuance.canIssue}
      reportId={data.meta.reportId}
      busy={issuance.busy}
      onIssue={issuance.issue}
      onReissue={issuance.reissue}
    >
      {narrativePending && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          AI 정성 서술(7·8·9절)을 생성하는 중입니다. 아래 지표·차트는 이미 확정된 결과이며, 서술은 완료되는 대로 채워집니다.
        </div>
      )}
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
    </ReportLayout>
  );
}
