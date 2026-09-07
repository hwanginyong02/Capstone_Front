import { useParams } from "react-router";
import { useReportData } from "../../hooks/useReportData";
import { usePrintOnReady } from "../../hooks/usePrintOnReady";
import { PrintLayout } from "../../components/report/layout/PrintLayout";
import { DraftNotPrintableNotice } from "../../components/report/DraftNotPrintableNotice";
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

  /**
   * 미평가 초안은 인쇄 대상이 아니다 (ISSUES.md H-03 파생 · F-05 와 같은 뿌리).
   *
   * 서버는 PDF 를 만들지도 보관하지도 않으므로(★결정 8) **이 인쇄물이 최종 산출물**이다.
   * 그런데 인쇄 탭은 새 문서라 워크플로우 store 의 `rawFile`(File — persist 불가)이 없고,
   * 그래서 저장된 `run.reportData` 를 렌더한다. 서술 병합이 끝나기 전이면 그것은 초안이고,
   * 초안의 판정은 `buildConclusion([])` 의 기본값 "조건부 적합 · 0.0%" 다.
   * 종전에는 그 초안을 **자동으로** 인쇄 다이얼로그까지 띄웠다 — 평가마다 서술 병합
   * 구간(최대 160초) 내내 열려 있던 창이다.
   *
   * 인쇄 훅에도 같은 판정을 넘겨, 자동 인쇄와 `data-pdf-ready`(Puppeteer 대기 표식)가
   * **함께** 잠기게 한다.
   */
  const printable = !!data?.isEvaluated;
  const containerRef = usePrintOnReady(data, narrativePending);

  if (!data) return null;
  if (!printable) {
    return (
      <PrintLayout>
        <DraftNotPrintableNotice />
      </PrintLayout>
    );
  }

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
