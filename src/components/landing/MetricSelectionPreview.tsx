import { cn } from "../../utils/styling/styles";

/**
 * 랜딩 미리보기에 인쇄되는 지표 카드 내용(정적).
 *
 * 의도적으로 실제 지표 표에서 파생하지 않는다 — 마케팅용 화면이라 표시 항목·순서를
 * 디자인이 정하고, `beta` 처럼 컬럼이 아닌 UI 입력값도 섞여 있기 때문이다.
 * 대신 컬럼 목록이 실제 요구사항과 어긋나지 않는지는 계약 테스트가 지킨다
 * (MetricSelectionPreview.test.ts — 과거 M6 가 옛 정보를 계속 보여준 적 있음).
 */
export const PREVIEW_METRICS = [
  ["M1", "Accuracy", "Overall correctness", ["id", "y_true", "y_pred"]],
  ["M2", "Precision", "Positive predictive value", ["id", "y_true", "y_pred"]],
  ["M3", "Recall", "Sensitivity", ["id", "y_true", "y_pred"]],
  ["M4", "F1 Score", "Harmonic mean", ["id", "y_true", "y_pred"]],
  ["M5", "F-beta Score", "Weighted F score", ["id", "y_true", "y_pred", "beta"]],
  ["M6", "KL Divergence", "Distribution divergence", ["id", "y_true", "y_pred"]],
  ["M7", "Specificity", "True negative rate", ["id", "y_true", "y_pred"]],
  ["M8", "FPR", "False positive rate", ["id", "y_true", "y_pred"]],
] as const;

/**
 * ScreenShowcase 두 번째(지표 선택) 카드의 정적 미리보기(iframe 대신 렌더).
 */
export function MetricSelectionPreview() {
  const metrics = PREVIEW_METRICS;

  return (
    <div className="h-full overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 min-w-[190px] items-center rounded-md border bg-input-background px-3 text-sm text-muted-foreground">
            Search metrics
          </div>
          {["id", "y_true", "y_pred", "score"].map((column) => (
            <span
              key={column}
              className="rounded-md border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
            >
              {column}
            </span>
          ))}
        </div>
        <span className="shrink-0 rounded-md bg-secondary px-3 py-2 text-sm font-medium">
          15 matching metrics
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([code, name, subtitle, columns], index) => (
          <div
            key={code}
            className={cn(
              "min-h-[176px] rounded-lg border-2 bg-card p-5 shadow-sm",
              index < 4 ? "border-primary/50 bg-blue-50/60" : "border-border",
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className="h-5 w-5 rounded border border-border bg-card" />
              <div className="flex flex-wrap justify-end gap-1">
                {columns.map((column) => (
                  <span
                    key={column}
                    className="rounded border bg-card px-2 py-1 font-mono text-[10px] leading-none"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
            <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
              {code}
            </p>
            <h4 className="mt-2 text-xl font-semibold leading-tight text-foreground">
              {name}
            </h4>
            <p className="mt-2 text-base text-foreground">{subtitle}</p>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              {name === "Accuracy"
                ? "Measures how often predictions match the correct label."
                : name === "Precision"
                  ? "Checks how many positive predictions are actually correct."
                  : name === "Recall"
                    ? "Checks how many true positives the model finds."
                    : name === "F1 Score"
                      ? "Balances precision and recall in one score."
                      : "Uses selected columns to calculate model performance."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
