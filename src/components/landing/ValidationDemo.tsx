import { CheckCircle2 } from "lucide-react";
import { DemoPanel } from "./DemoPanel";

export function ValidationDemo() {
  return (
    <DemoPanel index={5} action="scroll checks">
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-foreground">Data validation</h3>
        <p className="text-sm text-muted-foreground">Review the backend validation result before running the evaluation.</p>
      </div>
      <div className="mb-5 rounded-lg border bg-card p-4 text-sm">
        <CheckCircle2 className="mr-2 inline h-4 w-4 text-green-600" />
        All validation checks passed. You can proceed to run the evaluation.
      </div>
      <div className="landing-validation-scroll rounded-xl border bg-card">
        <div className="px-6 pt-6"><h4 className="text-lg font-semibold">Validation Details</h4></div>
        <div className="space-y-5 px-6 py-6">
          {["Common Checks", "Binary Checks", "Latency Checks"].map((group) => (
            <div key={group} className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <p className="text-sm font-semibold">{group}</p>
                <span className="text-xs font-medium text-muted-foreground">3 Passed</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_90px] px-4 py-3 text-sm">
                <span className="font-medium">Required values</span>
                <span className="text-muted-foreground">No missing values found</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-center text-xs">Pass</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DemoPanel>
  );
}
