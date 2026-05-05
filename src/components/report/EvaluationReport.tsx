import { DatasetSection } from "./DatasetSection";
import { DiagnosticSection } from "./DiagnosticSection";
import { OverviewSection } from "./OverviewSection";
import { RecommendationSection } from "./RecommendationSection";
import { ReportHeader } from "./ReportHeader";
import { SummarySection } from "./SummarySection";
import { TestItemsSection } from "./TestItemsSection";
import { TestResultsSection } from "./TestResultsSection";
import type { EvaluationReportData } from "@/types/report.types";

interface EvaluationReportProps {
  report: EvaluationReportData;
}

export function EvaluationReport({ report }: EvaluationReportProps) {
  return (
    <div className="space-y-8">
      <ReportHeader meta={report.meta} />
      <OverviewSection meta={report.meta} summary={report.summary} />
      <DatasetSection dataset={report.dataset} />
      <TestItemsSection items={report.testItems} />
      <TestResultsSection metrics={report.metricResults} confusionMatrix={report.confusionMatrix} />
      <DiagnosticSection diagnostics={report.diagnostics} />
      <SummarySection summary={report.summary} />
      <RecommendationSection recommendations={report.recommendations} />
    </div>
  );
}
