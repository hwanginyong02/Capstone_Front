// ============================================================================
// OverviewSection.tsx
// 1절. 개요 — 평가 대상 모델 정보, 평가 목적, 종합 판정
// ============================================================================

import { CheckCircle, AlertTriangle, XCircle, Cpu } from 'lucide-react';
import type { ReportMeta, LLMSummary } from '@/data/evaluationReportData';

interface OverviewSectionProps {
  meta: ReportMeta;
  verdict: LLMSummary['verdict'];
  overallScore: number;
}

const verdictConfig = {
  PASS: {
    label: '합격 (PASS)',
    icon: CheckCircle,
    color: '#16a34a',
    bg: '#f0fdf4',
    description: '모든 합격 임계치를 통과하여 적합 판정',
  },
  CONDITIONAL_PASS: {
    label: '조건부 합격',
    icon: AlertTriangle,
    color: '#ca8a04',
    bg: '#fffbeb',
    description: '일부 권고 사항 적용 후 재시험 권장',
  },
  FAIL: {
    label: '불합격 (FAIL)',
    icon: XCircle,
    color: '#dc2626',
    bg: '#fef2f2',
    description: '주요 합격 임계치 미달',
  },
};

export function OverviewSection({ meta, verdict, overallScore }: OverviewSectionProps) {
  const v = verdictConfig[verdict];
  const Icon = v.icon;

  return (
    <Section number="1" title="개요">
      <div className="grid grid-cols-3 gap-8">
        {/* Verdict Card (col-span 1) */}
        <div
          className="bg-white rounded-[8px] p-8 flex flex-col gap-4"
          style={{
            boxShadow: `
              rgba(0,0,0,0.08) 0px 0px 0px 1px,
              rgba(0,0,0,0.04) 0px 2px 2px,
              rgba(0,0,0,0.04) 0px 8px 8px -8px,
              #fafafa 0px 0px 0px 1px
            `,
          }}
        >
          <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
            종합 판정
          </span>
          <div
            className="flex items-center gap-3 rounded-[6px] px-4 py-3"
            style={{
              backgroundColor: v.bg,
              borderLeft: `3px solid ${v.color}`,
            }}
          >
            <Icon size={20} strokeWidth={1.5} style={{ color: v.color }} />
            <span className="text-[16px] font-semibold" style={{ color: v.color }}>
              {v.label}
            </span>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
              전체 정확도
            </span>
            <span className="text-[48px] font-semibold leading-none tracking-[-0.15rem] text-[#171717]">
              {(overallScore * 100).toFixed(2)}<span className="text-[24px] text-[#666666]">%</span>
            </span>
            <span className="text-[14px] text-[#4d4d4d]">{v.description}</span>
          </div>
        </div>

        {/* Model Info Card (col-span 2) */}
        <div
          className="col-span-2 bg-white rounded-[8px] p-8 flex flex-col gap-6"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
        >
          <div className="flex items-center gap-2">
            <Cpu size={20} strokeWidth={1.5} className="text-[#171717]" />
            <span className="text-[20px] font-semibold tracking-[-0.06rem] text-[#171717]">
              평가 대상 모델
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="모델명" value={`${meta.modelInfo.name} ${meta.modelInfo.version}`} mono />
            <InfoRow label="아키텍처" value={meta.modelInfo.architecture} />
            <InfoRow label="프레임워크" value={meta.modelInfo.framework} mono />
            <InfoRow label="파라미터 수" value={meta.modelInfo.parameters} mono />
            <InfoRow label="입력 차원" value={meta.modelInfo.inputShape} mono />
            <InfoRow label="출력 클래스 수" value={`${meta.modelInfo.outputClasses}개`} />
          </div>

          <div
            className="rounded-[6px] px-4 py-3 mt-2"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px', backgroundColor: '#fafafa' }}
          >
            <p className="text-[14px] font-normal leading-relaxed text-[#4d4d4d]">
              본 평가는 <span className="font-medium text-[#171717]">{meta.isoStandard}</span> 5.2절
              (분류 성능 평가)을 기준으로 수행되었으며, 평가 지표·임계치·시험 절차는 동 표준 부속서 A를 따른다.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Reusable Section wrapper ─────────────────────────────────────────────

export function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="py-16" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}>
      <div className="flex items-baseline gap-4 mb-8">
        <span className="font-mono text-[14px] font-medium text-[#666666]">§ {number}</span>
        <h2 className="text-[32px] font-semibold tracking-[-0.08rem] text-[#171717]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
        {label}
      </span>
      <span className={`text-[16px] font-medium text-[#171717] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
