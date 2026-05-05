import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ReportSection } from "./ReportSection";
import type { ConfusionMatrixData, ReportMetricResult } from "@/types/report.types";

interface TestResultsSectionProps {
  metrics: ReportMetricResult[];
  confusionMatrix: ConfusionMatrixData | null;
}

export function TestResultsSection({ metrics, confusionMatrix }: TestResultsSectionProps) {
  const [activeMetricId, setActiveMetricId] = useState(metrics[0]?.metricId ?? "");
  const activeMetric = metrics.find((metric) => metric.metricId === activeMetricId) ?? metrics[0];

  return (
    <ReportSection
      number={4}
      title="Results"
      description="Core evaluation values are summarized here first, with the detail view changing based on the selected metric card."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const isActive = metric.metricId === activeMetric?.metricId;
            const passed = metric.status === "pass";

            return (
              <button
                key={metric.metricId}
                type="button"
                onClick={() => setActiveMetricId(metric.metricId)}
                className={`rounded-3xl border bg-white p-5 text-left transition ${
                  isActive ? "border-sky-500 shadow-[0_12px_40px_-24px_rgba(14,116,144,0.55)]" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{metric.metricName}</div>
                  {passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                  {formatMetric(metric.metricId, metric.value)}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{metric.summary}</div>
              </button>
            );
          })}
        </div>

        {confusionMatrix ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Confusion matrix</div>
                <div className="text-sm text-slate-500">N = {confusionMatrix.totalSamples.toLocaleString()}</div>
              </div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                actual x predicted
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <div className="grid min-w-[640px] gap-2" style={{ gridTemplateColumns: `160px repeat(${confusionMatrix.labels.length}, minmax(0, 1fr))` }}>
                <div />
                {confusionMatrix.labels.map((label) => (
                  <div key={label} className="px-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </div>
                ))}
                {confusionMatrix.matrix.map((row, rowIndex) => (
                  <div key={confusionMatrix.labels[rowIndex]} className="contents">
                    <div className="flex items-center justify-end pr-4 text-sm font-medium text-slate-700">
                      {confusionMatrix.labels[rowIndex]}
                    </div>
                    {row.map((value, columnIndex) => {
                      const maxValue = Math.max(...row);
                      const intensity = maxValue > 0 ? value / maxValue : 0;
                      const diagonal = rowIndex === columnIndex;
                      const backgroundColor = diagonal
                        ? `rgba(14, 165, 233, ${0.12 + intensity * 0.36})`
                        : `rgba(148, 163, 184, ${0.08 + intensity * 0.18})`;

                      return (
                        <div
                          key={`${rowIndex}-${columnIndex}`}
                          className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900"
                          style={{ backgroundColor }}
                        >
                          {value}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeMetric?.perClass?.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Per-class breakdown</div>
                <div className="text-sm text-slate-500">{activeMetric.metricName} detail</div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <th className="pb-3">Class</th>
                    <th className="pb-3 text-right">Precision</th>
                    <th className="pb-3 text-right">Recall</th>
                    <th className="pb-3 text-right">F1</th>
                    <th className="pb-3 text-right">Support</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMetric.perClass.map((row) => (
                    <tr key={row.className} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-4 text-sm font-medium text-slate-900">{row.className}</td>
                      <td className="py-4 text-right text-sm text-slate-700">{(row.precision * 100).toFixed(1)}%</td>
                      <td className="py-4 text-right text-sm text-slate-700">{(row.recall * 100).toFixed(1)}%</td>
                      <td className="py-4 text-right text-sm text-slate-700">{(row.f1Score * 100).toFixed(1)}%</td>
                      <td className="py-4 text-right text-sm text-slate-700">{row.support.toLocaleString()}</td>
                      <td className="py-4 text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            row.status === "pass" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </ReportSection>
  );
}

function formatMetric(metricId: string, value: number) {
  if (metricId === "TC19") {
    return value.toFixed(3);
  }

  if (metricId === "TC23") {
    return `${value.toFixed(2)}x`;
  }

  return `${(value * 100).toFixed(1)}%`;
}
