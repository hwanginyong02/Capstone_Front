// ============================================================================
// pages/EvaluationReport.tsx
// 시험성적서 페이지 — 어셈블러 (state + layout)
// ============================================================================

import { useState } from 'react';
import { ReportHeader } from '@/components/evaluation-report/ReportHeader';
import { OverviewSection } from '@/components/evaluation-report/OverviewSection';
import { DatasetSection } from '@/components/evaluation-report/DatasetSection';
import { TestItemsSection } from '@/components/evaluation-report/TestItemsSection';
import { TestResultsSection } from '@/components/evaluation-report/TestResultsSection';
import { DiagnosticSection } from '@/components/evaluation-report/DiagnosticSection';
import { SummarySection } from '@/components/evaluation-report/SummarySection';
import { RecommendationSection } from '@/components/evaluation-report/RecommendationSection';
import {
  reportMeta,
  datasetInfo,
  testItems,
  confusionMatrix,
  metricResults,
  diagnostics,
  llmSummary,
  recommendations,
} from '@/data/evaluationReportData';

export function EvaluationReport() {
  const [activeMetricId, setActiveMetricId] = useState<string>('accuracy');

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        {/* 표지 + 메타데이터 */}
        <ReportHeader meta={reportMeta} />

        {/* 1절. 개요 */}
        <OverviewSection
          meta={reportMeta}
          verdict={llmSummary.verdict}
          overallScore={llmSummary.overallScore}
        />

        {/* 2절. 시험 데이터 */}
        <DatasetSection dataset={datasetInfo} />

        {/* 3절. 시험 항목 */}
        <TestItemsSection items={testItems} />

        {/* 4-5절. 시험 결과 (Confusion Matrix + 지표 결과) */}
        <TestResultsSection
          confusionMatrix={confusionMatrix}
          metricResults={metricResults}
          activeMetricId={activeMetricId}
          onMetricChange={setActiveMetricId}
        />

        {/* 6-7절. 진단 분석 */}
        <DiagnosticSection diagnostics={diagnostics} />

        {/* 8절. 종합 평가 소견 */}
        <SummarySection summary={llmSummary} />

        {/* 9절. 권고 사항 */}
        <RecommendationSection recommendations={recommendations} />
      </div>
    </div>
  );
}
