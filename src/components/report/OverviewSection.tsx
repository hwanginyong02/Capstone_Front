import { AlertTriangle, CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { ReportSection } from "./ReportSection";
import type { ReportMeta, ReportSummary } from "@/types/report.types";

interface OverviewSectionProps {
  meta: ReportMeta;
  summary: ReportSummary;
}

const verdictConfig = {
  PASS: {
    label: "Pass",
    description: "The current workflow inputs are coherent enough to move toward final export.",
    icon: CheckCircle2,
    tone: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  CONDITIONAL_PASS: {
    label: "Conditional pass",
    description: "The structure is ready, but a few values still need confirmation before delivery.",
    icon: AlertTriangle,
    tone: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  FAIL: {
    label: "Needs review",
    description: "The report should not be exported until the remaining issues are addressed.",
    icon: XCircle,
    tone: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
} as const;

export function OverviewSection({ meta, summary }: OverviewSectionProps) {
  const verdict = verdictConfig[summary.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <ReportSection
      number={1}
      title="Overview"
      description="A high-level snapshot of the current evaluation package, including the workflow context that now feeds the report."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={`rounded-3xl border p-6 ${verdict.bg} ${verdict.border}`}>
          <div className="flex items-center gap-3">
            <VerdictIcon className={`h-6 w-6 ${verdict.tone}`} />
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Verdict</div>
              <div className={`text-lg font-semibold ${verdict.tone}`}>{verdict.label}</div>
            </div>
          </div>
          <div className="mt-8 text-5xl font-semibold tracking-tight text-slate-950">
            {(summary.overallScore * 100).toFixed(1)}%
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{verdict.description}</p>
          <p className="mt-6 text-sm leading-6 text-slate-700">{summary.headline}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard label="Report purpose" value={meta.purpose} />
          <InfoCard label="Task type" value={meta.taskTypeLabel} />
          <InfoCard label="Model version" value={`${meta.modelName} · ${meta.versionName}`} />
          <InfoCard label="Runtime environment" value={meta.environment.memory || "Not recorded"} />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <ClipboardList className="h-4 w-4" />
              <span className="text-sm font-semibold">Integration note</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              The report renderer is now separate from the workflow state. That means we can keep the page
              polished while swapping the preview data source for real API output later.
            </p>
          </div>
        </div>
      </div>
    </ReportSection>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 text-sm font-semibold leading-6 text-slate-900">{value}</div>
    </div>
  );
}
