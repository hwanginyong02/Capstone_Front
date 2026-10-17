import { useParams } from "react-router";
import { isLegacyLayout } from "../../lib/report/normalizeReportContent";
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
        <ReportCoverSection meta={data.meta} performer={data.performer} materialCheck={data.materialCheck} />
        <CompanyInfoSection
          applicant={data.applicant}
          performer={data.performer}
          evalScope={data.evalScope}
          meta={data.meta}
          materialCheck={data.materialCheck}
        />
        <EvalScopeSection meta={data.meta} evalScope={data.evalScope} />
        <PageBreak>
          <DatasetSection
            datasetInfo={data.datasetInfo}
            datasetSamples={data.datasetSamples}
            datasetDiagnosis={data.datasetDiagnosis}
            trainingDatasetInfo={data.trainingDatasetInfo}
            materials={data.materials}
          />
          <EvalEnvSection meta={data.meta} evalScope={data.evalScope} evalEnv={data.evalEnv} materials={data.materials} />
        </PageBreak>
        <PageBreak>
          <MetricListSection metricList={data.metricList} metricFormulas={data.metricFormulas} taskTypeLabel={data.meta.taskTypeLabel} materials={data.materials} />
        </PageBreak>
        <PageBreak>
          <DataValidationSection
            dataValidation={data.dataValidation}
            kpiResults={data.kpiResults}
            totalSamples={data.datasetInfo.sampleCount}
            validationSummary={data.validationSummary}
            materialCheck={data.materialCheck}
          />
          <KpiResultSection
            kpiResults={data.kpiResults}
            classReport={data.classReport}
            derivationIn60={isLegacyLayout(data)}
            taskType={data.meta.taskType}
            meta={data.meta}
            // 판정 규칙 문구는 그 규칙(D19)으로 판정한 성적서에만 — judgedCount 가 그 표시다.
            showVerdictRule={data.conclusion.judgedCount !== undefined}
          />
        </PageBreak>
        <PageBreak>
          <ChartSection charts={data.charts} />
          <LatencySection latency={data.latency} materialCheck={data.materialCheck} />
        </PageBreak>
        <PageBreak>
          <InterpretSection
            interpretation={data.interpretation}
            source={data.narrativeSource}
            // 파생 예측 사실은 7.1 앞에 찍는다. 판 2 이전 보관본은 6.0 일러두기에 찍었다.
            derivedPrediction={isLegacyLayout(data) ? undefined : data.meta.derivedPrediction}
            confusionCounts={data.confusionCounts}
          />
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
