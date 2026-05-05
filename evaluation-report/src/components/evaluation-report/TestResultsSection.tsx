// ============================================================================
// TestResultsSection.tsx
// 4-5절. 시험 결과 — KPI 카드 + Confusion Matrix 히트맵 + 클래스별 성능 표
// ============================================================================

import { CheckCircle, XCircle, TrendingUp, Grid3x3 } from 'lucide-react';
import { Section } from './OverviewSection';
import type { ConfusionMatrix, MetricResult } from '@/data/evaluationReportData';

interface TestResultsSectionProps {
  confusionMatrix: ConfusionMatrix;
  metricResults: MetricResult[];
  activeMetricId: string;
  onMetricChange: (id: string) => void;
}

export function TestResultsSection({
  confusionMatrix,
  metricResults,
  activeMetricId,
  onMetricChange,
}: TestResultsSectionProps) {
  const activeMetric = metricResults.find((m) => m.metricId === activeMetricId) ?? metricResults[0];

  return (
    <Section number="4" title="시험 결과">
      <div className="flex flex-col gap-8">
        {/* 4.1 KPI Summary Row — 4 metrics */}
        <div className="grid grid-cols-4 gap-4">
          {metricResults.map((m) => (
            <MetricKpiCard
              key={m.metricId}
              metric={m}
              isActive={m.metricId === activeMetricId}
              onClick={() => onMetricChange(m.metricId)}
            />
          ))}
        </div>

        {/* 4.2 Confusion Matrix */}
        <div
          className="bg-white rounded-[8px] overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 size={16} strokeWidth={1.5} className="text-[#171717]" />
              <span className="text-[16px] font-semibold tracking-[-0.02rem] text-[#171717]">
                4.1 Confusion Matrix (혼동 행렬)
              </span>
            </div>
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              N = {confusionMatrix.totalSamples.toLocaleString()}
            </span>
          </div>
          <div className="p-8">
            <ConfusionMatrixHeatmap matrix={confusionMatrix} />
          </div>
        </div>

        {/* 4.3 Per-Class Performance Table */}
        {activeMetric.perClass.length > 0 && (
          <div
            className="bg-white rounded-[8px] overflow-hidden"
            style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
            >
              <span className="text-[16px] font-semibold tracking-[-0.02rem] text-[#171717]">
                4.2 클래스별 상세 성능
              </span>
              <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
                Per-class metrics
              </span>
            </div>
            <PerClassTable perClass={activeMetric.perClass} />
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Metric KPI Card ──────────────────────────────────────────────────────

function MetricKpiCard({
  metric,
  isActive,
  onClick,
}: {
  metric: MetricResult;
  isActive: boolean;
  onClick: () => void;
}) {
  const passColor = metric.pass ? '#16a34a' : '#dc2626';
  const passBg = metric.pass ? '#f0fdf4' : '#fef2f2';
  const Icon = metric.pass ? CheckCircle : XCircle;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-[8px] p-6 flex flex-col gap-3 text-left transition-all hover:bg-[#fafafa]"
      style={{
        boxShadow: isActive
          ? `${passColor} 0px 0px 0px 2px`
          : 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          {metric.metricName}
        </span>
        <Icon size={14} strokeWidth={1.5} style={{ color: passColor }} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.08rem] text-[#171717]">
          {(metric.overallValue * 100).toFixed(2)}
        </span>
        <span className="text-[18px] font-medium text-[#666666]">%</span>
      </div>
      <div
        className="rounded-[4px] px-2 py-1 flex items-center gap-1.5 self-start"
        style={{ backgroundColor: passBg }}
      >
        <TrendingUp size={12} strokeWidth={1.5} style={{ color: passColor }} />
        <span className="font-mono text-[12px] font-medium" style={{ color: passColor }}>
          +{((metric.overallValue - metric.threshold) * 100).toFixed(1)}%p vs 임계치 {(metric.threshold * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  );
}

// ─── Confusion Matrix Heatmap ─────────────────────────────────────────────

function ConfusionMatrixHeatmap({ matrix }: { matrix: ConfusionMatrix }) {
  // 각 행의 max 값 기준으로 색상 강도 계산
  const rowMaxes = matrix.matrix.map((row) => Math.max(...row));

  return (
    <div className="flex flex-col gap-4">
      {/* Predicted axis label */}
      <div className="flex items-center justify-center">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          Predicted Class →
        </span>
      </div>

      <div className="flex gap-4">
        {/* Actual axis label (vertical) */}
        <div className="flex items-center justify-center" style={{ width: '24px' }}>
          <span
            className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666] whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            ← Actual Class
          </span>
        </div>

        {/* Matrix Grid */}
        <div className="flex-1">
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${matrix.labels.length}, 1fr)` }}>
            {/* Header row */}
            <div />
            {matrix.labels.map((l) => (
              <div key={l} className="px-2 py-2 text-center">
                <span className="font-mono text-[12px] font-medium text-[#4d4d4d]">{l}</span>
              </div>
            ))}

            {/* Data rows */}
            {matrix.matrix.map((row, i) => (
              <div key={i} className="contents">
                {/* Row label */}
                <div className="px-2 py-2 flex items-center justify-end">
                  <span className="font-mono text-[13px] font-medium text-[#171717]">
                    {matrix.labels[i]}
                  </span>
                </div>
                {/* Cells */}
                {row.map((value, j) => {
                  const isDiagonal = i === j;
                  const intensity = value / rowMaxes[i];
                  const bgColor = isDiagonal
                    ? `rgba(22, 163, 74, ${0.08 + intensity * 0.45})` // 초록 (정답)
                    : value > 0
                    ? `rgba(220, 38, 38, ${0.05 + intensity * 0.35})` // 빨강 (오답)
                    : '#fafafa';
                  const textColor = isDiagonal && intensity > 0.5
                    ? '#15803d'
                    : !isDiagonal && intensity > 0.4
                    ? '#991b1b'
                    : '#171717';
                  return (
                    <div
                      key={j}
                      className="m-1 rounded-[6px] flex items-center justify-center aspect-square"
                      style={{
                        backgroundColor: bgColor,
                        boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px',
                      }}
                    >
                      <span
                        className="font-mono text-[15px] font-semibold"
                        style={{ color: textColor }}
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-[3px]"
            style={{ backgroundColor: 'rgba(22, 163, 74, 0.4)', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
          />
          <span className="font-mono text-[12px] font-medium text-[#4d4d4d]">정답 (대각선)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-[3px]"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.3)', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
          />
          <span className="font-mono text-[12px] font-medium text-[#4d4d4d]">오분류</span>
        </div>
      </div>
    </div>
  );
}

// ─── Per-Class Table ──────────────────────────────────────────────────────

function PerClassTable({ perClass }: { perClass: MetricResult['perClass'] }) {
  return (
    <table className="w-full">
      <thead>
        <tr style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
          <Th>클래스</Th>
          <Th align="right">Precision</Th>
          <Th align="right">Recall</Th>
          <Th align="right">F1-Score</Th>
          <Th align="right">Support</Th>
          <Th align="center">판정</Th>
        </tr>
      </thead>
      <tbody>
        {perClass.map((c) => (
          <tr key={c.className} style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
            <td className="px-4 py-3">
              <span className="font-mono text-[14px] font-medium text-[#171717]">
                {c.className}
              </span>
            </td>
            <MetricCell value={c.precision} />
            <MetricCell value={c.recall} />
            <MetricCell value={c.f1Score} />
            <td className="px-4 py-3 text-right font-mono text-[14px] text-[#4d4d4d]">
              {c.support.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center">
              <PassPill pass={c.pass} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetricCell({ value }: { value: number }) {
  return (
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        <div className="w-20 h-1.5 rounded-full bg-[#ebebeb] overflow-hidden">
          <div className="h-full bg-[#0072f5]" style={{ width: `${value * 100}%` }} />
        </div>
        <span className="font-mono text-[14px] font-medium text-[#171717] w-16 text-right">
          {(value * 100).toFixed(2)}%
        </span>
      </div>
    </td>
  );
}

function PassPill({ pass }: { pass: boolean }) {
  const color = pass ? '#15803d' : '#991b1b';
  const bg = pass ? '#f0fdf4' : '#fef2f2';
  return (
    <span
      className="px-[10px] py-[2px] rounded-full font-mono text-[12px] font-medium inline-flex items-center gap-1"
      style={{ backgroundColor: bg, color }}
    >
      {pass ? (
        <>
          <CheckCircle size={12} strokeWidth={1.5} />
          PASS
        </>
      ) : (
        <>
          <XCircle size={12} strokeWidth={1.5} />
          FAIL
        </>
      )}
    </span>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className="px-4 py-3 font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}
