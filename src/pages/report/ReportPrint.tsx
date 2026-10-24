import { useParams } from "react-router";
import { isLegacyLayout, usesSchema3, usesSchema4 } from "../../lib/report/normalizeReportContent";
import { useStoredReport } from "../../hooks/useReportData";
import { NotPrintableState, ReportNotFoundState } from "../../components/report/ReportStateNotices";
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
import { Edition4Report } from "../../components/report/edition4/Edition4Report";

export function ReportPrint() {
  const { id = "" } = useParams();
  // 저장된 완성본만 읽는다 — 인쇄 탭은 평가·서술 작업을 시작하지 않는다(서술 라운드 S3b).
  const { data, status } = useStoredReport(id);
  const containerRef = usePrintOnReady(data, status === "ready");

  if (status === "not_found" || !data) return <ReportNotFoundState />;
  if (status === "not_printable") return <NotPrintableState />;

  return (
    <PrintLayout>
      <div ref={containerRef}>
        {usesSchema4(data) ? <Edition4Report data={data} mode="print" /> : (<>
        <ReportCoverSection meta={data.meta} performer={data.performer} materialCheck={data.materialCheck} schema3={usesSchema3(data)} />
        <CompanyInfoSection
          applicant={data.applicant}
          performer={data.performer}
          evalScope={data.evalScope}
          meta={data.meta}
          materialCheck={data.materialCheck}
          hasConfidenceIntervals={data.confidenceIntervalNote !== undefined}
          schema3={usesSchema3(data)}
          legacyLayout={isLegacyLayout(data)}
        />
        <EvalScopeSection meta={data.meta} evalScope={data.evalScope} schema3={usesSchema3(data)} legacyLayout={isLegacyLayout(data)} />
        <PageBreak>
          <DatasetSection
            datasetInfo={data.datasetInfo}
            datasetSamples={data.datasetSamples}
            datasetDiagnosis={data.datasetDiagnosis}
            trainingDatasetInfo={data.trainingDatasetInfo}
            materials={data.materials}
            schema3={usesSchema3(data)}
            legacyLayout={isLegacyLayout(data)}
          />
          <EvalEnvSection meta={data.meta} evalScope={data.evalScope} evalEnv={data.evalEnv} materials={data.materials} schema3={usesSchema3(data)} />
        </PageBreak>
        <PageBreak>
          <MetricListSection metricList={data.metricList} metricFormulas={data.metricFormulas} taskTypeLabel={data.meta.taskTypeLabel} materials={data.materials} schema3={usesSchema3(data)} />
        </PageBreak>
        <PageBreak>
          <DataValidationSection
            dataValidation={data.dataValidation}
            kpiResults={data.kpiResults}
            totalSamples={data.datasetInfo.sampleCount}
            validationSummary={data.validationSummary}
            materialCheck={data.materialCheck}
            taskTypeLabel={data.meta.taskTypeLabel}
            schema3={usesSchema3(data)}
          />
          <KpiResultSection
            kpiResults={data.kpiResults}
            classReport={data.classReport}
            derivationIn60={isLegacyLayout(data)}
            taskType={data.meta.taskType}
            meta={data.meta}
            // 판정 규칙 문구는 그 규칙(D19)으로 판정한 성적서에만 — judgedCount 가 그 표시다.
            showVerdictRule={data.conclusion.judgedCount !== undefined}
          confidenceIntervalNote={data.confidenceIntervalNote}
          targetDigits={data.targetDigits}
          judgedValueDigits={data.judgedValueDigits}
          coreMetricsSource={data.coreMetricsSource}
            schema3={usesSchema3(data)}
          />
        </PageBreak>
        <PageBreak>
          <ChartSection charts={data.charts} schema3={usesSchema3(data)} legacyLayout={isLegacyLayout(data)} />
          <LatencySection latency={data.latency} materialCheck={data.materialCheck} schema3={usesSchema3(data)} />
        </PageBreak>
        <PageBreak>
          <InterpretSection
            interpretation={data.interpretation}
            source={data.narrativeSource}
            // 파생 예측 사실은 7.1 앞에 찍는다. 판 2 이전 보관본은 6.0 일러두기에 찍었다.
            derivedPrediction={isLegacyLayout(data) ? undefined : data.meta.derivedPrediction}
            confusionCounts={data.confusionCounts}
            errorRatioSentence={data.errorRatioSentence}
            labelCautionSentence={data.labelCautionSentence}
            schema3={usesSchema3(data)}
            narrativeSections={data.narrativeSections}
            taskType={data.meta.taskType}
            narrativeFacts={data.narrativeFacts}
            classLabelDescriptions={data.datasetInfo.classLabelDescriptions}
          />
          <ConclusionSection
            conclusion={data.conclusion}
            source={data.narrativeSource}
            nearTargetNote={data.nearTargetNote}
            sourceRelationSentence={data.sourceRelationSentence}
            schema3={usesSchema3(data)}
            narrativeSections={data.narrativeSections}
            noBenchmarkSentence={data.noBenchmarkSentence}
            kpiResults={data.kpiResults}
            targetDigits={data.targetDigits}
            judgedValueDigits={data.judgedValueDigits}
            legacyLayout={isLegacyLayout(data)}
          />
          <RecommendSection
            recommendations={data.recommendations}
            narrative={data.recommendationNarrative}
            source={data.narrativeSource}
            problems={data.problems}
            schema3={usesSchema3(data)}
            narrativeSections={data.narrativeSections}
          />
          <SignatureSection
            signature={data.signature}
            meta={data.meta}
            evalScope={data.evalScope}
            performer={data.performer}
            schema3={usesSchema3(data)}
          />
        </PageBreak>
        </>)}
      </div>
    </PrintLayout>
  );
}
