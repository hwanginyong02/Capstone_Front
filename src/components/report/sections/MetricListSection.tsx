import type { MetricFormula, MetricItem } from "../../../types/finalReport.types";
import { SectionTitle } from "../ui/SectionTitle";

interface MetricListSectionProps {
  metricList: MetricItem[];
  metricFormulas: MetricFormula[];
  taskTypeLabel: string;
}

export function MetricListSection({ metricList, metricFormulas, taskTypeLabel }: MetricListSectionProps) {
  const formulaMap = new Map(metricFormulas.map((f) => [f.metricId, f]));

  const commonItems = metricList.filter((metric) => formulaMap.get(metric.metricId)?.isCommon);
  const specialItems = metricList.filter((metric) => !formulaMap.get(metric.metricId)?.isCommon);

  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={5} title="시험항목 및 방법" subtitle="사용자가 선택한 시험항목에 대해서만 평가를 수행한다." />

      {/* 5.1 공통 지표 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">
          공통 지표{" "}
          <span className="font-normal text-slate-400 text-xs">(Binary / Multi-class / Multi-label 모두 적용)</span>
        </h3>
        <MetricTable items={commonItems} formulaMap={formulaMap} />
      </div>

      {/* 5.2 태스크 전용 지표 (선택된 경우만 표시) */}
      {specialItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">{taskTypeLabel} 전용 지표</h3>
          <MetricTable items={specialItems} formulaMap={formulaMap} />
        </div>
      )}
    </section>
  );
}

function MetricTable({
  items,
  formulaMap,
}: {
  items: MetricItem[];
  formulaMap: Map<string, MetricFormula>;
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-slate-200">
          <th className="py-2 pr-3 text-left font-medium text-slate-500 w-16">Metric ID</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500 w-32">시험항목</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500">시험목표 및 기준</th>
          <th className="py-2 text-left font-medium text-slate-500">시험방법 및 산정식</th>
        </tr>
      </thead>
      <tbody>
        {items.map((metric) => {
          const formula = formulaMap.get(metric.metricId);
          return (
            <tr key={metric.metricId} className="border-b border-slate-100 last:border-b-0 align-top">
              <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{metric.metricId}</td>
              <td className="py-2.5 pr-4 font-medium text-slate-800">{metric.name}</td>
              <td className="py-2.5 pr-4 text-slate-600 text-xs leading-relaxed">
                {formula?.description ?? "—"}
                <br />
                <span className="font-mono text-slate-400">합격 기준: {metric.passCriteria}</span>
              </td>
              <td className="py-2.5 font-mono text-xs text-slate-600">{formula?.formula ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
