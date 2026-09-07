import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { usePrintOnReady } from "../../hooks/usePrintOnReady";
import { PrintLayout } from "../../components/report/layout/PrintLayout";
import { PageBreak } from "../../components/report/layout/PageBreak";
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

export function ReportPrint() {
  const { id = "" } = useParams();
  const { data, narrativePending } = useReportData(id);
  const containerRef = usePrintOnReady(data, narrativePending);

  if (!data) return null;

  return (
    <PrintLayout>
      <div ref={containerRef}>
        <ReportCoverSection meta={data.meta} performer={data.performer} />
        <CompanyInfoSection
          applicant={data.applicant}
          performer={data.performer}
          evalScope={data.evalScope}
          meta={data.meta}
        />
        <EvalScopeSection meta={data.meta} />
        <PageBreak>
          <DatasetSection
            datasetInfo={data.datasetInfo}
            datasetSamples={data.datasetSamples}
            datasetDiagnosis={data.datasetDiagnosis}
            trainingDatasetInfo={data.trainingDatasetInfo}
          />
          <EvalEnvSection meta={data.meta} evalScope={data.evalScope} evalEnv={data.evalEnv} />
        </PageBreak>
        <PageBreak>
          <MetricListSection metricList={data.metricList} metricFormulas={data.metricFormulas} taskTypeLabel={data.meta.taskTypeLabel} />
        </PageBreak>
        <PageBreak>
          <DataValidationSection
            dataValidation={data.dataValidation}
            kpiResults={data.kpiResults}
            totalSamples={data.datasetInfo.sampleCount}
            validationSummary={data.validationSummary}
          />
          <KpiResultSection kpiResults={data.kpiResults} taskType={data.meta.taskType} meta={data.meta} />
        </PageBreak>
        <PageBreak>
          <ChartSection charts={data.charts} />
          <LatencySection latency={data.latency} />
        </PageBreak>
        <PageBreak>
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
        </PageBreak>
      </div>
    </PrintLayout>
  );
}
