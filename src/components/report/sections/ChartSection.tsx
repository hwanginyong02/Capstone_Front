import type { FinalReportData } from "../../../types/finalReport.types";
import { ConfusionMatrixChart } from "./ConfusionMatrixChart";
import { RocCurveChart } from "./RocCurveChart";
import { PrCurveChart } from "./PrCurveChart";

interface ChartSectionProps {
  charts: FinalReportData["charts"];
}

export function ChartSection({ charts }: ChartSectionProps) {
  const hasAnyChart = !!(charts.confusionMatrix || charts.rocCurve || charts.prCurve);

  return (
    <div className="space-y-10 pt-8">
      <h3 className="text-sm font-semibold text-slate-700">시각화 자료</h3>

      {charts.confusionMatrix && (
        <ConfusionMatrixChart data={charts.confusionMatrix} />
      )}

      <div className="grid gap-10 md:grid-cols-2">
        {charts.rocCurve && (
          <RocCurveChart data={charts.rocCurve} auroc={charts.rocCurve.auroc} />
        )}
        {charts.prCurve && (
          <PrCurveChart data={charts.prCurve} auprc={charts.prCurve.auprc} />
        )}
      </div>

      {!hasAnyChart && (
        <p className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
          시각화할 차트가 없습니다. (혼동 행렬은 M21, ROC/PR 곡선은 binary 평가에서 AUROC/AUPRC 선택 시 표시됩니다.)
        </p>
      )}
    </div>
  );
}
