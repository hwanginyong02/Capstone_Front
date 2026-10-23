import type { FinalReportData } from "../../../types/finalReport.types";
import { ConfusionMatrixChart } from "./ConfusionMatrixChart";
import { RocCurveChart } from "./RocCurveChart";
import { PrCurveChart } from "./PrCurveChart";
import { SubsectionTitle } from "../shared/SubsectionTitle";

interface ChartSectionProps {
  charts: FinalReportData["charts"];
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
  /** 판 1 보관본인가(`isLegacyLayout`) — 차트가 없을 때의 안내를 운영 main 이 발급하던 문장 그대로 찍는다. */
  legacyLayout?: boolean;
}

export function ChartSection({ charts, schema3, legacyLayout = false }: ChartSectionProps) {
  const hasAnyChart = !!(charts.confusionMatrix || charts.rocCurve || charts.prCurve);

  return (
    <div className="space-y-10 pt-8">
      <SubsectionTitle number="6.3" schema3={schema3} className="text-sm font-semibold text-slate-700">시각화 자료</SubsectionTitle>

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
          {legacyLayout
            ? "시각화할 차트가 없습니다. (혼동 행렬은 M21, ROC/PR 곡선은 binary 평가에서 AUROC/AUPRC 선택 시 표시됩니다.)"
            : "시각화할 차트가 없습니다. (혼동 행렬은 M21 을 골랐을 때, ROC/PR 곡선은 이진 분류에서 확률(score) 컬럼이 있을 때 표시됩니다.)"}
        </p>
      )}
    </div>
  );
}
