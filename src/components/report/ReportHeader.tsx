import type { ReactNode } from "react";
import { Calendar, Cpu, FileSpreadsheet, FolderKanban } from "lucide-react";
import type { ReportMeta } from "@/types/report.types";

interface ReportHeaderProps {
  meta: ReportMeta;
}

export function ReportHeader({ meta }: ReportHeaderProps) {
  return (
    <header className="space-y-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
          Final report draft
        </span>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
          {meta.taskTypeLabel}
        </span>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
          {meta.reportId}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Evaluation Report</div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{meta.title}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              This final report step reuses the existing evaluation flow inputs and turns them into a
              shareable report layout without breaking the component boundaries you already built.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <MetaCard
            icon={<Calendar className="h-4 w-4 text-slate-500" />}
            label="Issued"
            value={meta.issuedAt}
            detail={`${meta.evaluationPeriod.from} to ${meta.evaluationPeriod.to}`}
          />
          <MetaCard
            icon={<FolderKanban className="h-4 w-4 text-slate-500" />}
            label="Project"
            value={meta.projectName}
            detail={meta.projectAgency}
          />
          <MetaCard
            icon={<Cpu className="h-4 w-4 text-slate-500" />}
            label="Model"
            value={meta.modelName}
            detail={`${meta.versionName} · ${meta.modelPurpose}`}
          />
          <MetaCard
            icon={<FileSpreadsheet className="h-4 w-4 text-slate-500" />}
            label="Source file"
            value={meta.sourceFileName}
            detail={meta.companyName}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <IdentityCard title="Client" value={meta.companyName} detail={`Representative: ${meta.representative}`} />
        <IdentityCard title="Business number" value={meta.businessNumber} detail={meta.purpose} />
        <IdentityCard
          title="Environment"
          value={meta.environment.software}
          detail={[meta.environment.os, meta.environment.cpu, meta.environment.gpu]
            .filter(Boolean)
            .join(" / ")}
        />
      </div>
    </header>
  );
}

function MetaCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function IdentityCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );
}
