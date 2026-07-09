import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { useIssuance } from "../../hooks/useIssuance";
import { usePdfDownload } from "../../hooks/usePdfDownload";
import { ReportLayout } from "../../components/report/layout/ReportLayout";
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
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-slate-200 border-t-teal-500 animate-ping opacity-75"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">평가 엔진 연산 수행 중...</h2>
            <p className="text-sm text-slate-500">
              선택한 ISO/IEC 4213 시험 지표를 계산하고 성적서를 자동 구성하고 있습니다. 잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
            <span className="text-xl font-bold">!</span>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">평가 연산 실패</h2>
            <p className="text-sm text-red-600 font-mono bg-red-50 p-3 rounded border border-red-100 break-all text-left">
              {error}
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full py-2 px-4 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            이전 단계로 돌아가기
          </button>
        </div>
      </div>
    );
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
