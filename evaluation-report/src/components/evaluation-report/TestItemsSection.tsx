// ============================================================================
// TestItemsSection.tsx
// 3절. 시험 항목 — 평가 지표 정의, 수식, 합격 임계치
// ============================================================================

import { Calculator, Target } from 'lucide-react';
import { Section } from './OverviewSection';
import type { TestItem } from '@/data/evaluationReportData';

interface TestItemsSectionProps {
  items: TestItem[];
}

export function TestItemsSection({ items }: TestItemsSectionProps) {
  return (
    <Section number="3" title="시험 항목 및 평가 지표">
      <div className="flex flex-col gap-8">
        {/* Description */}
        <p className="text-[18px] font-normal leading-relaxed text-[#4d4d4d] max-w-[800px]">
          본 시험은 KS X ISO/IEC TS 4213:2023 부속서 A의 분류 모델 평가 지표 4종을 사용한다.
          각 지표는 시험 데이터 1,868건에 대해 계산되며, 합격 임계치는 의뢰 기관과의 협의를 통해 사전 합의되었다.
        </p>

        {/* Test Items Grid (2x2) */}
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <TestItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Notation Reference */}
        <div
          className="bg-white rounded-[8px] p-6 flex flex-col gap-3"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div className="flex items-center gap-2">
            <Calculator size={16} strokeWidth={1.5} className="text-[#171717]" />
            <span className="text-[16px] font-semibold text-[#171717] tracking-[-0.02rem]">
              기호 설명 (Notation)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-2">
            <NotationItem symbol="TP" desc="True Positive (참 양성)" />
            <NotationItem symbol="TN" desc="True Negative (참 음성)" />
            <NotationItem symbol="FP" desc="False Positive (거짓 양성)" />
            <NotationItem symbol="FN" desc="False Negative (거짓 음성)" />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function TestItemCard({ item }: { item: TestItem }) {
  return (
    <div
      className="bg-white rounded-[8px] p-6 flex flex-col gap-4"
      style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            지표 {item.id.toUpperCase()}
          </span>
          <span className="text-[20px] font-semibold tracking-[-0.06rem] text-[#171717]">
            {item.name}
          </span>
        </div>
        <span className="bg-[#ebf5ff] text-[#0068d6] px-[10px] py-[2px] rounded-full font-mono text-[12px] font-medium">
          {item.symbol}
        </span>
      </div>

      {/* Formula Box */}
      <div
        className="rounded-[6px] px-4 py-3 flex items-center justify-center"
        style={{ backgroundColor: '#fafafa', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
      >
        <span className="font-mono text-[15px] font-medium text-[#171717] tracking-tight">
          {item.symbol} = {item.formula}
        </span>
      </div>

      {/* Description */}
      <p className="text-[14px] font-normal leading-relaxed text-[#4d4d4d]">
        {item.description}
      </p>

      {/* Threshold */}
      <div
        className="flex items-center justify-between rounded-[6px] px-4 py-3 mt-1"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
      >
        <div className="flex items-center gap-2">
          <Target size={14} strokeWidth={1.5} className="text-[#666666]" />
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            합격 임계치
          </span>
        </div>
        <span className="font-mono text-[16px] font-semibold text-[#171717]">
          ≥ {(item.threshold * 100).toFixed(0)}{item.unit || '%'}
        </span>
      </div>
    </div>
  );
}

function NotationItem({ symbol, desc }: { symbol: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono text-[13px] font-semibold text-[#171717] px-2 py-0.5 rounded-[4px]"
        style={{ backgroundColor: '#fafafa', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
      >
        {symbol}
      </span>
      <span className="text-[13px] font-normal text-[#4d4d4d]">{desc}</span>
    </div>
  );
}
