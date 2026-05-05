// ============================================================================
// ReportHeader.tsx
// 표지 — 문서 제목, 발급번호, 의뢰기관, 시험기관 메타데이터
// ============================================================================

import { FileText, Shield, Calendar, Hash } from 'lucide-react';
import type { ReportMeta } from '@/data/evaluationReportData';

interface ReportHeaderProps {
  meta: ReportMeta;
}

export function ReportHeader({ meta }: ReportHeaderProps) {
  return (
    <header className="flex flex-col gap-8 mb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
        <span>TTA</span>
        <span className="text-[#808080]">/</span>
        <span>AI 품질평가단</span>
        <span className="text-[#808080]">/</span>
        <span>2026 발급 성적서</span>
        <span className="text-[#808080]">/</span>
        <span className="text-[#171717]">{meta.reportId}</span>
      </div>

      {/* Pill Badge */}
      <div className="flex items-center gap-2">
        <span className="bg-[#ebf5ff] text-[#0068d6] px-[10px] py-[2px] rounded-full text-[12px] font-medium">
          {meta.isoStandard}
        </span>
        <span
          className="bg-white text-[#4d4d4d] px-[10px] py-[2px] rounded-full text-[12px] font-medium"
          style={{ boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px' }}
        >
          {meta.evaluationType}
        </span>
      </div>

      {/* Title Block */}
      <div className="flex flex-col gap-4">
        <h1 className="text-[48px] font-semibold leading-none tracking-[-0.15rem] text-[#171717]">
          인공지능 모델 성능시험 성적서
        </h1>
        <p className="text-[20px] font-normal leading-relaxed text-[#4d4d4d] max-w-[720px]">
          KS X ISO/IEC TS 4213:2023 기반 머신러닝 분류 모델의 성능 평가 결과 보고서.
          본 성적서는 한국정보통신기술협회(TTA) AI품질평가단이 발급하였습니다.
        </p>
      </div>

      {/* Metadata Row */}
      <div
        className="bg-white rounded-[8px] px-8 py-6 flex flex-wrap items-center gap-x-12 gap-y-4"
        style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
      >
        <MetaItem
          icon={<Hash size={14} strokeWidth={1.5} className="text-[#666666]" />}
          label="성적서 번호"
          value={meta.reportId}
          mono
        />
        <MetaItem
          icon={<Calendar size={14} strokeWidth={1.5} className="text-[#666666]" />}
          label="발급일자"
          value={meta.issueDate}
          mono
        />
        <MetaItem
          icon={<Shield size={14} strokeWidth={1.5} className="text-[#666666]" />}
          label="시험 기간"
          value={`${meta.testPeriod.from} ~ ${meta.testPeriod.to}`}
          mono
        />
        <MetaItem
          icon={<FileText size={14} strokeWidth={1.5} className="text-[#666666]" />}
          label="의뢰 기관"
          value={meta.client.name}
        />
      </div>

      {/* Tester / Client Card Pair */}
      <div className="grid grid-cols-2 gap-8">
        <PartyCard title="시험 기관" entity={meta.testAgency.name} sub={meta.testAgency.division} person={meta.testAgency.tester} />
        <PartyCard title="의뢰 기관" entity={meta.client.name} sub={`사업자등록번호 ${meta.client.businessNo}`} person={`대표 ${meta.client.representative}`} />
      </div>
    </header>
  );
}

// ─── Sub-components (private) ─────────────────────────────────────────────

interface MetaItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

function MetaItem({ icon, label, value, mono }: MetaItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
          {label}
        </span>
      </div>
      <span className={`text-[16px] font-medium text-[#171717] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

interface PartyCardProps {
  title: string;
  entity: string;
  sub: string;
  person: string;
}

function PartyCard({ title, entity, sub, person }: PartyCardProps) {
  return (
    <div
      className="bg-white rounded-[8px] p-6 flex flex-col gap-2"
      style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
    >
      <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#666666]">
        {title}
      </span>
      <span className="text-[20px] font-semibold tracking-[-0.06rem] text-[#171717] mt-1">
        {entity}
      </span>
      <span className="text-[14px] font-normal text-[#4d4d4d]">{sub}</span>
      <span className="text-[14px] font-medium text-[#171717] mt-2">{person}</span>
    </div>
  );
}
