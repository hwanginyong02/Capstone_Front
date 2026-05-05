import type { ReactNode } from "react";
import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { ReportSection } from "./ReportSection";
import type { ReportSummary } from "@/types/report.types";

interface SummarySectionProps {
  summary: ReportSummary;
}

export function SummarySection({ summary }: SummarySectionProps) {
  return (
    <ReportSection
      number={6}
      title="Summary"
      description="The summary is generated from report data, not from page-local state, which makes it easier to replace preview text with backend-authored content later."
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-sky-600" />
                Draft narrative
              </div>
              <div className="max-w-4xl text-base leading-7 text-slate-700">{summary.narrative}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Overall score</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {(summary.overallScore * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BulletPanel
            title="Strengths"
            icon={<ThumbsUp className="h-4 w-4 text-emerald-600" />}
            bullets={summary.strengths}
          />
          <BulletPanel
            title="Watch points"
            icon={<ThumbsDown className="h-4 w-4 text-amber-600" />}
            bullets={summary.weaknesses}
          />
        </div>
      </div>
    </ReportSection>
  );
}

function BulletPanel({
  title,
  icon,
  bullets,
}: {
  title: string;
  icon: ReactNode;
  bullets: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </div>
      <ul className="mt-5 space-y-3">
        {bullets.map((bullet, index) => (
          <li key={bullet} className="flex gap-3">
            <span className="mt-0.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-6 text-slate-600">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
