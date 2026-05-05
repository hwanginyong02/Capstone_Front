// ============================================================================
// DiagnosticSection.tsx
// 6-7절. 진단 분석 — 클래스별 성능 차트 + 오분류 패턴 진단
// ============================================================================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import { Section } from './OverviewSection';
import type { DiagnosticInsight } from '@/data/evaluationReportData';

interface DiagnosticSectionProps {
  diagnostics: DiagnosticInsight[];
}

export function DiagnosticSection({ diagnostics }: DiagnosticSectionProps) {
  // Recharts용 데이터 변환
  const chartData = diagnostics.map((d) => ({
    name: d.className,
    Precision: +(d.precision * 100).toFixed(2),
    Recall: +(d.recall * 100).toFixed(2),
    'F1-Score': +(d.f1Score * 100).toFixed(2),
  }));

  return (
    <Section number="5" title="진단 분석">
      <div className="flex flex-col gap-8">
        <p className="text-[18px] font-normal leading-relaxed text-[#4d4d4d] max-w-[800px]">
          클래스별 성능 분포와 주요 오분류 패턴을 분석한다. 본 절은 LLM 기반 자동 진단 엔진이
          Confusion Matrix를 분석하여 생성한 결과이며, 시험기관 검토자의 검수를 거쳤다.
        </p>

        {/* 5.1 Class Performance Bar Chart */}
        <div
          className="bg-white rounded-[8px] overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
          >
            <span className="text-[16px] font-semibold tracking-[-0.02rem] text-[#171717]">
              5.1 클래스별 성능 분포
            </span>
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              Precision · Recall · F1-Score
            </span>
          </div>
          <div className="p-8" style={{ height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid stroke="#ebebeb" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#4d4d4d', fontSize: 12, fontFamily: 'Geist Mono, monospace' }}
                  axisLine={{ stroke: '#ebebeb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[80, 100]}
                  tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Geist Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 8px 8px -8px',
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '13px',
                  }}
                  cursor={{ fill: 'rgba(0, 114, 245, 0.04)' }}
                  formatter={(value: number) => `${value}%`}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', color: '#4d4d4d' }}
                  iconType="square"
                />
                <Bar dataKey="Precision" fill="#171717" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Recall" fill="#0072f5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1-Score" fill="#a3a3a3" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5.2 Per-class Diagnostic Cards */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[20px] font-semibold tracking-[-0.06rem] text-[#171717]">
              5.2 클래스별 진단 소견
            </span>
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              LLM-generated · Reviewer-verified
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {diagnostics.map((d) => (
              <DiagnosticCard key={d.className} diagnostic={d} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Diagnostic Card ──────────────────────────────────────────────────────

const severityConfig = {
  good: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', label: '양호' },
  warning: { icon: AlertTriangle, color: '#ca8a04', bg: '#fffbeb', label: '주의' },
  critical: { icon: AlertOctagon, color: '#dc2626', bg: '#fef2f2', label: '심각' },
};

function DiagnosticCard({ diagnostic: d }: { diagnostic: DiagnosticInsight }) {
  const cfg = severityConfig[d.severity];
  const Icon = cfg.icon;

  return (
    <div
      className="bg-white rounded-[8px] p-6 grid grid-cols-12 gap-8 items-start"
      style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
    >
      {/* Class identity (col-span 3) */}
      <div className="col-span-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.5} style={{ color: cfg.color }} />
          <span
            className="px-[10px] py-[2px] rounded-full font-mono text-[12px] font-medium"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <span className="text-[24px] font-semibold tracking-[-0.06rem] text-[#171717] font-mono">
          {d.className}
        </span>
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          Support · {d.support.toLocaleString()} samples
        </span>
      </div>

      {/* Metrics (col-span 4) */}
      <div className="col-span-4 grid grid-cols-3 gap-3">
        <MetricMini label="Precision" value={d.precision} />
        <MetricMini label="Recall" value={d.recall} />
        <MetricMini label="F1" value={d.f1Score} />
      </div>

      {/* Top Confusion + Observation (col-span 5) */}
      <div className="col-span-5 flex flex-col gap-3">
        <div
          className="rounded-[6px] px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: '#fafafa', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
        >
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            주요 오분류
          </span>
          <span className="font-mono text-[13px] font-medium text-[#171717]">{d.className}</span>
          <ArrowRight size={12} strokeWidth={1.5} className="text-[#808080]" />
          <span className="font-mono text-[13px] font-medium text-[#dc2626]">
            {d.topConfusion.confusedWith}
          </span>
          <span className="font-mono text-[12px] font-medium text-[#4d4d4d] ml-auto">
            {d.topConfusion.count}건 ({(d.topConfusion.rate * 100).toFixed(1)}%)
          </span>
        </div>
        <p className="text-[14px] font-normal leading-relaxed text-[#4d4d4d]">
          {d.observation}
        </p>
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
        {label}
      </span>
      <span className="text-[20px] font-semibold tracking-[-0.06rem] text-[#171717] font-mono">
        {(value * 100).toFixed(1)}<span className="text-[14px] text-[#666666]">%</span>
      </span>
    </div>
  );
}
