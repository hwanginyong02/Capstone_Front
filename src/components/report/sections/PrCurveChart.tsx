import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PrCurveChartProps {
  data: { recall: number[]; precision: number[] };
  auprc?: number;
}

export function PrCurveChart({ data, auprc }: PrCurveChartProps) {
  const points = data.recall.map((recall, i) => ({ recall, precision: data.precision[i] }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">PR Curve (정밀도-재현율 곡선)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Y축: Precision (정밀도) / X축: Recall (재현율)</p>
        </div>
        {auprc !== undefined && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-800">
            AUPRC: <span className="font-mono text-sm text-purple-900">{auprc.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="w-full h-[280px] min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 15, right: 25, bottom: 25, left: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              label={{ value: "Recall (재현율)", position: "insideBottom", offset: -15, fontSize: 11, fill: "#64748b" }}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              label={{ value: "Precision (정밀도)", angle: -90, position: "insideLeft", offset: -10, fontSize: 11, fill: "#64748b" }}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              formatter={(v: number) => v.toFixed(3)}
              labelFormatter={(v: number) => `Recall: ${Number(v).toFixed(3)}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
            />
            <Line
              type="monotone"
              dataKey="precision"
              stroke="#7c3aed"
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
