import type { ConfusionMatrixData } from "../../../types/report.types";
import { cn } from "../../../utils/styling/styles";

interface ConfusionMatrixChartProps {
  data: ConfusionMatrixData;
  /**
   * 그림(행렬 칸)만 — 영어 머리글(제목·부제·범례)과 오른쪽 요약 상자(Summary·Total samples·Error rate …)를 그리지 않는다.
   * 판 4 성적서 4.4 가 쓴다(S6 질문 3, 사용자 답 "영어 머리글 빼고 그림만"). 넘기지 않으면 판 3 모양 그대로.
   */
  figureOnly?: boolean;
}

export function ConfusionMatrixChart({ data, figureOnly = false }: ConfusionMatrixChartProps) {
  if (data.multilabelMatrices && data.multilabelMatrices.length > 0) {
    return (
      <div className="space-y-6">
        {data.multilabelMatrices.map((m, idx) => (
          <SingleMatrixChart
            key={idx}
            figureOnly={figureOnly}
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
  return <SingleMatrixChart data={data} figureOnly={figureOnly} />;
}

function SingleMatrixChart({ data, figureOnly = false }: ConfusionMatrixChartProps) {
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
      {!figureOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Confusion Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">Actual versus predicted class counts</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-600"></span> Correct
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
              <span className="size-2 rounded-full bg-rose-500"></span> Misclassified
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        {/* 행렬 셀 그리드 */}
        {/*
          판 3 모양: 칸 폭 고정(110~140px) — 클래스가 많으면 카드보다 넓어진다(판 3 보관본 정답이 지키므로 그대로).
          그림만(판 4 4.4): 칸 폭을 카드 폭에 맞춰 나눈다(minmax(0, 1fr)) — 10클래스도 화면 가로 스크롤·인쇄 열 잘림 없이 모든 칸이 들어간다.
        */}
        <div
          className={figureOnly ? "grid w-full min-w-0 gap-1 text-sm" : "inline-grid gap-2 text-sm"}
          data-cm-fit={figureOnly ? "container" : undefined}
          style={{
            gridTemplateColumns: figureOnly
              ? `minmax(48px, 100px) repeat(${labels.length}, minmax(0, 1fr))`
              : `100px repeat(${labels.length}, minmax(110px, 140px))`,
          }}
        >
          {/* Header row */}
          <div />
          {labels.map((label) => (
            <div
              key={label}
              className={cn(
                "py-2 text-center text-xs font-bold text-slate-600 bg-slate-50 rounded border border-slate-100",
                figureOnly && "min-w-0 px-0.5 text-[10px] leading-tight [overflow-wrap:anywhere]",
              )}
            >
              Predicted: {label}
            </div>
          ))}

          {/* Data rows */}
          {matrix.map((row, ri) => (
            <div key={`row-${ri}`} className="contents">
              <div
                className={cn(
                  "flex items-center justify-end pr-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded border border-slate-100",
                  figureOnly && "min-w-0 pr-1 text-right text-[10px] leading-tight [overflow-wrap:anywhere]",
                )}
              >
                Actual: {labels[ri]}
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
                      figureOnly && "min-w-0 px-0.5 py-2",
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

        {/* 오른쪽 요약 통계 패널(그림만 그릴 때는 없음) */}
        {!figureOnly && (
          <div className="w-full md:w-56 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
            <p className="font-bold text-slate-700 border-b border-slate-200 pb-1.5">Summary</p>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Total samples</span>
              <span className="font-semibold text-slate-800 font-mono">{totalSamples.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
              <span className="text-slate-500">Misclassified</span>
              <span className="font-semibold text-rose-600 font-mono">{misclassified.toLocaleString()}</span>
            </div>
            {labels.length === 2 && (
              <div className="pl-2 text-[11px] text-slate-400 space-y-0.5">
                <div>• False positives: {fp.toLocaleString()}</div>
                <div>• False negatives: {fn.toLocaleString()}</div>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
              <span className="text-slate-500">Error rate</span>
              <span className="font-semibold text-rose-600 font-mono">{misclassRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
