import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { PrintLayout } from "../../components/report/layout/PrintLayout";
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
  const { id = "preview" } = useParams();
  const { data, narrativePending } = useReportData(id);
  const containerRef = useRef<HTMLDivElement>(null);

  // Puppeteer waits for data-pdf-ready attribute before capturing, and triggers browser print.
  // 서술(7·8·9절) 병합이 끝날 때까지(narrativePending=false) 캡처/인쇄를 미뤄 PDF 완결성 유지(D6b).
  useEffect(() => {
    if (!data || narrativePending || !containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.setAttribute("data-pdf-ready", "true");
      // 레이아웃 렌더링이 완료된 후 자동으로 브라우저 인쇄 다이얼로그 호출
      setTimeout(() => {
        window.print();
      }, 300);
    });
    return () => cancelAnimationFrame(raf);
  }, [data, narrativePending]);

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
        <div style={{ pageBreakBefore: "always" }}>
          <DatasetSection
            datasetInfo={data.datasetInfo}
            datasetSamples={data.datasetSamples}
            datasetDiagnosis={data.datasetDiagnosis}
            trainingDatasetInfo={data.trainingDatasetInfo}
          />
          <EvalEnvSection meta={data.meta} evalScope={data.evalScope} evalEnv={data.evalEnv} />
        </div>
        <div style={{ pageBreakBefore: "always" }}>
          <MetricListSection metricList={data.metricList} metricFormulas={data.metricFormulas} taskTypeLabel={data.meta.taskTypeLabel} />
        </div>
        <div style={{ pageBreakBefore: "always" }}>
          <DataValidationSection
            dataValidation={data.dataValidation}
            kpiResults={data.kpiResults}
            totalSamples={data.datasetInfo.sampleCount}
          />
          <KpiResultSection kpiResults={data.kpiResults} taskType={data.meta.taskType} meta={data.meta} />
        </div>
        <div style={{ pageBreakBefore: "always" }}>
          <ChartSection charts={data.charts} />
          <LatencySection latency={data.latency} />
        </div>
        <div style={{ pageBreakBefore: "always" }}>
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
        </div>
      </div>
    </PrintLayout>
  );
}
