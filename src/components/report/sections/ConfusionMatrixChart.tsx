import type { ConfusionMatrixData } from "../../../types/report.types";
import { cn } from "../../../utils/styling/styles";

interface ConfusionMatrixChartProps {
  data: ConfusionMatrixData;
}

export function ConfusionMatrixChart({ data }: ConfusionMatrixChartProps) {
  if (data.multilabelMatrices && data.multilabelMatrices.length > 0) {
    return (
      <div className="space-y-6">
        {data.multilabelMatrices.map((m, idx) => (
          <SingleMatrixChart
            key={idx}
            data={{
              labels: [`Negative (${m.label})`, `Positive (${m.label})`],
              matrix: m.matrix,
              totalSamples: m.totalSamples,
            }}
          />
        ))}
      </div>
    );
  }
  return <SingleMatrixChart data={data} />;
}

function SingleMatrixChart({ data }: ConfusionMatrixChartProps) {
  const { labels, matrix, totalSamples } = data;
  const maxVal = Math.max(...matrix.flat());

  // 오분류 통계 (대각선 외 = 오분류)
  let misclassified = 0;
  let fp = 0; // 예측 Positive, 실제 Negative
  let fn = 0; // 예측 Negative, 실제 Positive
  matrix.forEach((row, ri) => {
    row.forEach((count, ci) => {
      if (ri !== ci) {
        misclassified += count;
        // 이진 분류 가정: 인덱스 0 = Negative, 1 = Positive
        if (labels.length === 2) {
          if (ri === 0 && ci === 1) fp += count;
          if (ri === 1 && ci === 0) fn += count;
        }
      }
    });
  });
  const misclassRate = totalSamples > 0 ? (misclassified / totalSamples) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Confusion Matrix (혼동 행렬)</h3>
          <p className="text-xs text-slate-400 mt-0.5">실제 클래스와 예측 클래스의 오분류 행렬 분포</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-600"></span> 정분류 (Pass)
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
            <span className="size-2 rounded-full bg-rose-500"></span> 오분류 (Fail)
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        {/* 행렬 셀 그리드 */}
        <div
          className="inline-grid gap-2 text-sm"
          style={{ gridTemplateColumns: `100px repeat(${labels.length}, minmax(110px, 140px))` }}
        >
          {/* Header row */}
          <div />
          {labels.map((label) => (
            <div key={label} className="py-2 text-center text-xs font-bold text-slate-600 bg-slate-50 rounded border border-slate-100">
              예측: {label}
            </div>
          ))}

          {/* Data rows */}
          {matrix.map((row, ri) => (
            <div key={`row-${ri}`} className="contents">
              <div className="flex items-center justify-end pr-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded border border-slate-100">
                실제: {labels[ri]}
              </div>
              {row.map((count, ci) => {
                const intensity = maxVal > 0 ? count / maxVal : 0;
                const isDiag = ri === ci;
                return (
                  <div
                    key={ci}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-4 px-2 text-center border shadow-xs transition-transform hover:scale-[1.02]",
                      isDiag ? "text-emerald-950 border-emerald-300" : "text-rose-950 border-rose-200",
                    )}
                    style={{
                      backgroundColor: isDiag
                        ? `rgba(16, 185, 129, ${0.12 + intensity * 0.45})`
                        : `rgba(244, 63, 94, ${0.08 + intensity * 0.35})`,
                    }}
                  >
                    <span className="text-lg font-bold tabular-nums">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-medium opacity-80 mt-0.5">
                      {((count / totalSamples) * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 오른쪽 요약 통계 패널 */}
        <div className="w-full md:w-56 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
          <p className="font-bold text-slate-700 border-b border-slate-200 pb-1.5">요약 통계</p>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">총 평가 샘플 수</span>
            <span className="font-semibold text-slate-800 font-mono">{totalSamples.toLocaleString()}건</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
            <span className="text-slate-500">오분류 건수</span>
            <span className="font-semibold text-rose-600 font-mono">{misclassified.toLocaleString()}건</span>
          </div>
          {labels.length === 2 && (
            <div className="pl-2 text-[11px] text-slate-400 space-y-0.5">
              <div>• FP (위양성): {fp.toLocaleString()}건</div>
              <div>• FN (위음성): {fn.toLocaleString()}건</div>
            </div>
          )}
          <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
            <span className="text-slate-500">오분류율</span>
            <span className="font-semibold text-rose-600 font-mono">{misclassRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
