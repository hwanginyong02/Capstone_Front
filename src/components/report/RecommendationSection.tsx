import { ArrowUpRight, Lightbulb } from "lucide-react";
import { ReportSection } from "./ReportSection";
import type { ReportRecommendation } from "@/types/report.types";

interface RecommendationSectionProps {
  recommendations: ReportRecommendation[];
}

const priorityTone = {
  HIGH: "bg-rose-50 text-rose-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-700",
} as const;

export function RecommendationSection({ recommendations }: RecommendationSectionProps) {
  return (
    <ReportSection
      number={7}
      title="Recommendations"
      description="These are integration-focused next steps so the refactored report can progress cleanly from draft preview to export-ready output."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {(["HIGH", "MEDIUM", "LOW"] as const).map((priority) => {
            const count = recommendations.filter((item) => item.priority === priority).length;

            return (
              <div key={priority} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{priority} priority</div>
                <div className="mt-4 flex items-end justify-between">
                  <div className="text-4xl font-semibold tracking-tight text-slate-950">{count}</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${priorityTone[priority]}`}>{priority}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lightbulb className="h-4 w-4" />
            Next actions
          </div>

          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={`${recommendation.priority}-${recommendation.category}`}
                className="grid gap-4 rounded-2xl border border-slate-200 p-5 lg:grid-cols-[80px_140px_1fr_260px]"
              >
                <div className="font-mono text-sm text-slate-500">{String(index + 1).padStart(2, "0")}</div>
                <div className="space-y-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${priorityTone[recommendation.priority]}`}>
                    {recommendation.priority}
                  </span>
                  <div className="text-sm font-semibold text-slate-900">{recommendation.category}</div>
                </div>
                <div className="text-sm leading-6 text-slate-700">{recommendation.action}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    Expected impact
                  </div>
                  {recommendation.expectedImpact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReportSection>
  );
}
