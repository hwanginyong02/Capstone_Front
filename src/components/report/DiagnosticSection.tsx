import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportSection } from "./ReportSection";
import type { DiagnosticInsight } from "@/types/report.types";

interface DiagnosticSectionProps {
  diagnostics: DiagnosticInsight[];
}

export function DiagnosticSection({ diagnostics }: DiagnosticSectionProps) {
  const chartData = diagnostics.map((item) => ({
    className: item.className,
    Precision: Number((item.precision * 100).toFixed(1)),
    Recall: Number((item.recall * 100).toFixed(1)),
    F1: Number((item.f1Score * 100).toFixed(1)),
  }));

  return (
    <ReportSection
      number={5}
      title="Diagnostics"
      description="This report keeps the visual diagnostic layer separated from the metric adapter, so later backend responses can slot in without rewriting the page."
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-slate-900">Class performance spread</div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="className" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} domain={[80, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Bar dataKey="Precision" fill="#0f172a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Recall" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="F1" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4">
          {diagnostics.map((diagnostic) => {
            const good = diagnostic.severity === "good";

            return (
              <div key={diagnostic.className} className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-[0.9fr_0.8fr_1.3fr]">
                <div>
                  <div className="flex items-center gap-2">
                    {good ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {good ? "stable" : "watch"}
                    </span>
                  </div>
                  <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{diagnostic.className}</div>
                  <div className="mt-2 text-sm text-slate-500">Support {diagnostic.support.toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <MiniMetric label="Precision" value={diagnostic.precision} />
                  <MiniMetric label="Recall" value={diagnostic.recall} />
                  <MiniMetric label="F1" value={diagnostic.f1Score} />
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Most common confusion: <span className="font-semibold text-slate-900">{diagnostic.className}</span>{" "}
                    to <span className="font-semibold text-slate-900">{diagnostic.topConfusion.confusedWith}</span>{" "}
                    ({diagnostic.topConfusion.count} cases, {(diagnostic.topConfusion.rate * 100).toFixed(1)}%)
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{diagnostic.observation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ReportSection>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{(value * 100).toFixed(1)}%</div>
    </div>
  );
}
