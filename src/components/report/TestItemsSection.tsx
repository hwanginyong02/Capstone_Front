import { Sigma, Target } from "lucide-react";
import { ReportSection } from "./ReportSection";
import type { ReportTestItem } from "@/types/report.types";

interface TestItemsSectionProps {
  items: ReportTestItem[];
}

export function TestItemsSection({ items }: TestItemsSectionProps) {
  return (
    <ReportSection
      number={3}
      title="Selected Test Items"
      description="These items are derived from the current workflow selection, so the report and the preview step stay aligned."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{item.id}</div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{item.name}</div>
                <div className="mt-1 text-sm text-slate-500">{item.subtitle}</div>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">Included</span>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sigma className="h-4 w-4" />
                Formula
              </div>
              <div className="font-mono text-sm text-slate-900">{item.formula}</div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">{item.description}</p>

            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <Target className="h-4 w-4" />
              Threshold: <span className="font-semibold text-slate-900">{item.thresholdLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
