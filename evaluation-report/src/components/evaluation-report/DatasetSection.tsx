// ============================================================================
// DatasetSection.tsx
// 2절. 시험 데이터 — 데이터셋 정보, 분할 비율, 클래스 분포
// ============================================================================

import { Database, Layers, Image } from 'lucide-react';
import { Section } from './OverviewSection';
import type { DatasetInfo } from '@/data/evaluationReportData';

interface DatasetSectionProps {
  dataset: DatasetInfo;
}

export function DatasetSection({ dataset }: DatasetSectionProps) {
  const trainPct = (dataset.trainSamples / dataset.totalSamples) * 100;
  const valPct = (dataset.validationSamples / dataset.totalSamples) * 100;
  const testPct = (dataset.testSamples / dataset.totalSamples) * 100;

  return (
    <Section number="2" title="시험 데이터">
      <div className="flex flex-col gap-8">
        {/* KPI Summary Cards (3-col) */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            icon={<Database size={16} strokeWidth={1.5} className="text-[#0072f5]" />}
            label="전체 샘플 수"
            value={dataset.totalSamples.toLocaleString()}
            unit="건"
          />
          <KpiCard
            icon={<Layers size={16} strokeWidth={1.5} className="text-[#0072f5]" />}
            label="시험용 샘플"
            value={dataset.testSamples.toLocaleString()}
            unit={`건 (${testPct.toFixed(1)}%)`}
          />
          <KpiCard
            icon={<Image size={16} strokeWidth={1.5} className="text-[#0072f5]" />}
            label="클래스 수"
            value={dataset.classes.length.toString()}
            unit="개"
          />
        </div>

        {/* Dataset Source + Split Bar */}
        <div
          className="bg-white rounded-[8px] p-8 flex flex-col gap-6"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoCell label="데이터 출처" value={dataset.source} />
            <InfoCell label="수집 기간" value={dataset.collectionPeriod} mono />
            <InfoCell label="이미지 해상도" value={dataset.imageResolution} mono />
            <InfoCell label="전처리" value={dataset.preprocessingNote} />
          </div>

          {/* Train/Val/Test Split Bar */}
          <div className="flex flex-col gap-3 mt-2">
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              데이터 분할 (Train / Validation / Test)
            </span>
            <div className="flex h-10 rounded-[6px] overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
              <SplitSegment width={trainPct} label="Train" count={dataset.trainSamples} bg="#171717" textColor="#ffffff" />
              <SplitSegment width={valPct} label="Val" count={dataset.validationSamples} bg="#4d4d4d" textColor="#ffffff" />
              <SplitSegment width={testPct} label="Test" count={dataset.testSamples} bg="#0072f5" textColor="#ffffff" />
            </div>
          </div>
        </div>

        {/* Class Distribution Table */}
        <div
          className="bg-white rounded-[8px] overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
          >
            <span className="text-[16px] font-semibold tracking-[-0.02rem] text-[#171717]">
              클래스별 샘플 분포
            </span>
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              5 classes · {dataset.totalSamples.toLocaleString()} samples
            </span>
          </div>

          <table className="w-full">
            <thead>
              <tr style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
                <Th>Class ID</Th>
                <Th>Class Name</Th>
                <Th align="right">Train</Th>
                <Th align="right">Validation</Th>
                <Th align="right">Test</Th>
                <Th align="right">Total</Th>
                <Th align="right">비율</Th>
              </tr>
            </thead>
            <tbody>
              {dataset.classes.map((c) => {
                const ratio = (c.totalCount / dataset.totalSamples) * 100;
                return (
                  <tr key={c.classId} style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
                    <Td mono>{c.classId}</Td>
                    <Td>
                      <span className="font-mono text-[14px] font-medium text-[#171717]">
                        {c.className}
                      </span>
                    </Td>
                    <Td align="right" mono>{c.trainCount.toLocaleString()}</Td>
                    <Td align="right" mono>{c.validationCount.toLocaleString()}</Td>
                    <Td align="right" mono>{c.testCount.toLocaleString()}</Td>
                    <Td align="right" mono>
                      <span className="font-medium text-[#171717]">{c.totalCount.toLocaleString()}</span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#ebebeb] overflow-hidden">
                          <div className="h-full bg-[#0072f5]" style={{ width: `${ratio}%` }} />
                        </div>
                        <span className="font-mono text-[13px] font-medium text-[#4d4d4d] w-12 text-right">
                          {ratio.toFixed(1)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function KpiCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div
      className="bg-white rounded-[8px] p-6 flex flex-col gap-2"
      style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.08rem] text-[#171717]">
          {value}
        </span>
        <span className="text-[14px] font-normal text-[#4d4d4d]">{unit}</span>
      </div>
    </div>
  );
}

function SplitSegment({ width, label, count, bg, textColor }: { width: number; label: string; count: number; bg: string; textColor: string }) {
  return (
    <div
      className="flex items-center justify-center px-3"
      style={{ width: `${width}%`, backgroundColor: bg, color: textColor }}
    >
      <span className="font-mono text-[12px] font-medium">
        {label} · {count.toLocaleString()} ({width.toFixed(1)}%)
      </span>
    </div>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
        {label}
      </span>
      <span className={`text-[14px] font-medium text-[#171717] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="px-4 py-3 font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', mono }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean }) {
  return (
    <td
      className={`px-4 py-3 text-[14px] text-[#4d4d4d] ${mono ? 'font-mono' : ''}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
