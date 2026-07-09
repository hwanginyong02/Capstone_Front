import type { MetricFormula } from "../../../types/finalReport.types";
import { SectionTitle } from "../ui/SectionTitle";

interface MetricFormulaSectionProps {
  metricFormulas: MetricFormula[];
}

export function MetricFormulaSection({ metricFormulas }: MetricFormulaSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <SectionTitle number={5} title="지표 정의 및 수식" />

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-2 pr-4 text-left font-medium text-slate-500 w-20">ID</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-500 w-32">시험항목</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-500">산정식</th>
            <th className="py-2 text-left font-medium text-slate-500">시험 목표</th>
          </tr>
        </thead>
        <tbody>
          {metricFormulas.map((m) => (
            <tr key={m.metricId} className="border-b border-slate-100 last:border-b-0">
              <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{m.metricId}</td>
              <td className="py-2.5 pr-4 font-medium text-slate-800">{m.name}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate-600 whitespace-nowrap">{m.formula}</td>
              <td className="py-2.5 text-slate-600">{m.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
