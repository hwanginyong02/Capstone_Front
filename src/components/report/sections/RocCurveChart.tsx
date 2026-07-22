import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface RocCurveChartProps {
  data: { fpr: number[]; tpr: number[] };
  auroc?: number;
}

export function RocCurveChart({ data, auroc }: RocCurveChartProps) {
  const points = data.fpr.map((fpr, i) => ({ fpr, tpr: data.tpr[i] }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">ROC Curve (수신기 반응 특성 곡선)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Y축: TPR (재현율) / X축: FPR (위양성률)</p>
        </div>
        {auroc !== undefined && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-800">
            AUROC: <span className="font-mono text-sm text-teal-900">{auroc.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="w-full h-[280px] min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 15, right: 25, bottom: 25, left: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="fpr"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              label={{ value: "FPR (위양성률)", position: "insideBottom", offset: -15, fontSize: 11, fill: "#64748b" }}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              label={{ value: "TPR (재현율)", angle: -90, position: "insideLeft", offset: -10, fontSize: 11, fill: "#64748b" }}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              formatter={(v: number) => v.toFixed(3)}
              labelFormatter={(v: number) => `FPR: ${Number(v).toFixed(3)}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
            />
            {/* Random classifier baseline */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="tpr"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
