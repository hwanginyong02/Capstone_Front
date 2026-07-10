import { cn } from "../../utils/styling/styles";
import { DemoPanel } from "./DemoPanel";

export function MetricsDemo() {
  return (
    <DemoPanel index={1} action="click metrics">
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-foreground">Metric selection</h3>
        <p className="text-sm text-muted-foreground">
          Choose the evaluation metrics that should be included in the report.
        </p>
      </div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm"><span className="font-semibold">2</span> selected</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary px-3 py-1 text-sm">15 matching metrics</span>
          <span className="rounded-md border px-3 py-1 text-sm text-muted-foreground">Reset columns</span>
        </div>
      </div>
      <div className="landing-metrics-scroll grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["M1", "Accuracy", true],
          ["M2", "Precision", true],
          ["M3", "Recall", false],
          ["M4", "F1 Score", false],
          ["M5", "F-beta Score", false],
          ["M6", "KL Divergence", false],
          ["M7", "Specificity", false],
          ["M8", "FPR", false],
        ].map(([code, name, selected]) => (
          <div
            key={name as string}
            className={cn(
              "landing-click-target min-h-[172px] rounded-lg border-2 p-5",
              selected ? "border-primary bg-blue-50" : "border-border bg-card",
            )}
          >
            <div className="mb-3 flex items-start gap-2">
              <span className={cn("mt-0.5 h-4 w-4 rounded border", selected && "border-primary bg-primary")} />
              <div className="ml-auto rounded border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">y_true</div>
            </div>
            <p className="font-mono text-xs uppercase text-muted-foreground">{code}</p>
            <h4 className="mt-2 text-base font-semibold">{name}</h4>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Evaluates binary classification performance using confirmed labels and predictions.
            </p>
          </div>
        ))}
      </div>
    </DemoPanel>
  );
}
