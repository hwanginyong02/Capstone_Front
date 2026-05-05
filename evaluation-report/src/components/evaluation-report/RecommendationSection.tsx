// ============================================================================
// RecommendationSection.tsx
// 9절. 권고 사항 — 우선순위별 후속 조치 권고
// ============================================================================

import { Lightbulb, ArrowUpRight } from 'lucide-react';
import { Section } from './OverviewSection';
import type { Recommendation } from '@/data/evaluationReportData';

interface RecommendationSectionProps {
  recommendations: Recommendation[];
}

const priorityConfig = {
  HIGH: { color: '#dc2626', bg: '#fef2f2', label: 'HIGH', order: 1 },
  MEDIUM: { color: '#ca8a04', bg: '#fffbeb', label: 'MEDIUM', order: 2 },
  LOW: { color: '#4d4d4d', bg: '#fafafa', label: 'LOW', order: 3 },
};

export function RecommendationSection({ recommendations }: RecommendationSectionProps) {
  // 우선순위 정렬
  const sorted = [...recommendations].sort(
    (a, b) => priorityConfig[a.priority].order - priorityConfig[b.priority].order
  );

  const counts = {
    HIGH: recommendations.filter((r) => r.priority === 'HIGH').length,
    MEDIUM: recommendations.filter((r) => r.priority === 'MEDIUM').length,
    LOW: recommendations.filter((r) => r.priority === 'LOW').length,
  };

  return (
    <Section number="7" title="권고 사항">
      <div className="flex flex-col gap-8">
        {/* Description */}
        <p className="text-[18px] font-normal leading-relaxed text-[#4d4d4d] max-w-[800px]">
          본 절의 권고 사항은 시험 결과 분석을 토대로 도출된 후속 개선 조치이며,
          우선순위에 따라 단계적으로 적용할 것을 권장한다. 각 권고 사항은 정보 제공 목적이며,
          구속력은 갖지 않는다.
        </p>

        {/* Priority Summary */}
        <div className="grid grid-cols-3 gap-4">
          <PriorityKpi priority="HIGH" count={counts.HIGH} />
          <PriorityKpi priority="MEDIUM" count={counts.MEDIUM} />
          <PriorityKpi priority="LOW" count={counts.LOW} />
        </div>

        {/* Recommendation Table */}
        <div
          className="bg-white rounded-[8px] overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div
            className="flex items-center gap-2 px-6 py-4"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
          >
            <Lightbulb size={16} strokeWidth={1.5} className="text-[#171717]" />
            <span className="text-[16px] font-semibold tracking-[-0.02rem] text-[#171717]">
              우선순위별 권고 조치
            </span>
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666] ml-auto">
              {sorted.length} actions
            </span>
          </div>

          <div>
            {sorted.map((rec, i) => (
              <RecommendationRow key={i} rec={rec} index={i + 1} isLast={i === sorted.length - 1} />
            ))}
          </div>
        </div>

        {/* Closing Statement */}
        <div
          className="bg-white rounded-[8px] p-8 flex flex-col gap-3"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            성적서 결문
          </span>
          <p className="text-[16px] font-normal leading-relaxed text-[#171717] max-w-[900px]">
            본 시험성적서는 KS X ISO/IEC TS 4213:2023에 따라 적법하게 발급되었으며,
            기재된 시험 결과는 시험 시점의 데이터셋 및 모델 버전에 한해 유효합니다.
            재시험 또는 추가 검증이 필요한 경우 발급 기관으로 문의하시기 바랍니다.
          </p>
          <div className="flex items-center justify-between mt-4">
            <span className="font-mono text-[12px] font-medium text-[#4d4d4d]">
              한국정보통신기술협회 (TTA) AI품질평가단
            </span>
            <span className="font-mono text-[12px] font-medium text-[#4d4d4d]">
              발급일자 · 2026-04-28
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function PriorityKpi({ priority, count }: { priority: keyof typeof priorityConfig; count: number }) {
  const cfg = priorityConfig[priority];
  return (
    <div
      className="bg-white rounded-[8px] p-6 flex items-center justify-between"
      style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          {cfg.label} priority
        </span>
        <span className="text-[40px] font-semibold leading-none tracking-[-0.08rem] text-[#171717]">
          {count}
          <span className="text-[16px] font-normal text-[#666666] ml-1">건</span>
        </span>
      </div>
      <span
        className="px-[10px] py-[2px] rounded-full font-mono text-[12px] font-medium"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function RecommendationRow({ rec, index, isLast }: { rec: Recommendation; index: number; isLast: boolean }) {
  const cfg = priorityConfig[rec.priority];
  return (
    <div
      className="grid grid-cols-12 gap-6 items-start px-6 py-5"
      style={!isLast ? { boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' } : undefined}
    >
      {/* Index + Priority */}
      <div className="col-span-2 flex items-center gap-3">
        <span className="font-mono text-[14px] font-medium text-[#666666]">
          {String(index).padStart(2, '0')}
        </span>
        <span
          className="px-[10px] py-[2px] rounded-full font-mono text-[12px] font-medium"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Category */}
      <div className="col-span-2">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          분류
        </span>
        <p className="text-[14px] font-medium text-[#171717] mt-1">{rec.category}</p>
      </div>

      {/* Action */}
      <div className="col-span-5">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          권고 조치
        </span>
        <p className="text-[14px] font-normal leading-relaxed text-[#171717] mt-1">
          {rec.action}
        </p>
      </div>

      {/* Expected Impact */}
      <div className="col-span-3">
        <div className="flex items-center gap-1">
          <ArrowUpRight size={12} strokeWidth={1.5} className="text-[#16a34a]" />
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            기대 효과
          </span>
        </div>
        <p className="text-[14px] font-normal leading-relaxed text-[#16a34a] mt-1">
          {rec.expectedImpact}
        </p>
      </div>
    </div>
  );
}
