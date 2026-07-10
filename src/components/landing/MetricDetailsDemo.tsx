import { cn } from "../../utils/styling/styles";
import { DemoPanel, DemoField } from "./DemoPanel";

export function MetricDetailsDemo() {
  return (
    <DemoPanel index={2} action="typing 0.95">
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-foreground">Metric details</h3>
        <p className="text-sm text-muted-foreground">Set target values and any extra inputs required by each selected metric.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border bg-card">
          <div className="px-6 pt-6"><h4 className="text-lg font-semibold">Selected metrics</h4></div>
          <div className="space-y-2 px-6 py-6">
            {["M1 Accuracy", "M2 Precision"].map((metric, index) => (
              <div key={metric} className={cn("rounded-lg border p-3", index === 0 ? "border-primary bg-blue-50" : "bg-card")}>
                <p className="font-mono text-xs text-muted-foreground">{metric.split(" ")[0]}</p>
                <p className="text-sm font-semibold">{metric.replace(/^M\d /, "")}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="px-6 pt-6">
            <h4 className="text-lg font-semibold">M1: Accuracy</h4>
            <p className="text-sm text-muted-foreground">Overall proportion of correct predictions.</p>
          </div>
          <div className="space-y-6 px-6 py-6">
            <DemoField label="Target value" value="0.95" typing />
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-950">Required columns for this metric</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-md bg-secondary px-2 py-1 text-xs">y_true</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs">y_pred</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoPanel>
  );
}
