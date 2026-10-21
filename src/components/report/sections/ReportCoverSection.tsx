import type { FinalReportMeta, MaterialCheckResult, PerformerInfo } from "../../../types/finalReport.types";

interface ReportCoverSectionProps {
  meta: FinalReportMeta;
  performer: PerformerInfo;
  /**
   * 재료 선택 점검 결과. 보고 항목이 빠졌으면 표지부터 사실대로 적는다(고정 문구 2.3). 없는 옛
   * 성적서는 종전 문구.
   */
  materialCheck?: MaterialCheckResult;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

export function ReportCoverSection({ meta, performer, materialCheck, schema3 }: ReportCoverSectionProps) {
  return (
    <div className="mb-12 space-y-6 border-b border-slate-200 pb-10 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
        {materialCheck?.printed.cover ?? "기준 표준: ISO/IEC TS 4213:2022"}
      </p>
      <h1 className="text-3xl font-bold text-slate-900">{meta.title}</h1>
      <p className="text-sm text-slate-500">발급 기관: {performer.orgName} AI 평가 플랫폼</p>
      <div className="inline-grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600">
        <span className="text-right font-medium text-slate-500">문서 번호</span>
        <span className="text-left">{meta.reportId || "(미발급)"}</span>
        <span className="text-right font-medium text-slate-500">발급 일시</span>
        <span className="text-left">{meta.issuedAt || "(미발급)"}</span>
        <span className="text-right font-medium text-slate-500">평가 유형</span>
        <span className="text-left">{meta.taskTypeLabel}</span>
        <span className="text-right font-medium text-slate-500">시험 기간</span>
        <span className="text-left">{meta.evaluationPeriod.from} ~ {meta.evaluationPeriod.to}</span>
      </div>
    </div>
  );
}
