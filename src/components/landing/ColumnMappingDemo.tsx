import { ChevronDown } from "lucide-react";
import { DemoPanel } from "./DemoPanel";

export function ColumnMappingDemo() {
  return (
    <DemoPanel index={4} action="scroll & select">
      <div className="landing-mapping-scroll space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="mb-2 text-2xl font-bold text-foreground">Column mapping review</h3>
          <p className="text-sm text-muted-foreground">
            Review and adjust the mapped roles to ensure your dataset is correctly interpreted for evaluation.
          </p>
        </div>
        <span className="rounded-md border px-3 py-1 text-sm">Binary workflow</span>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h4 className="text-lg font-semibold">Required Columns</h4>
        <p className="mt-3 text-sm text-muted-foreground">
          These are the columns required by your selected evaluation metrics.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {["id", "y_true", "y_pred"].map((role) => (
            <div key={role} className="rounded-lg border p-5">
              <p className="text-lg font-semibold">
                {role} <span className="rounded-md bg-secondary px-2 py-1 text-xs">Mapped</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Required by Accuracy and Precision</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h4 className="text-lg font-semibold">Binary classification settings</h4>
        <div className="mt-5 flex items-center gap-4">
          <span className="text-sm font-medium">Positive class value:</span>
          <button className="landing-dropdown-click flex h-10 w-48 items-center justify-between rounded-md border bg-input-background px-3 text-left">
            1
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b bg-muted/40 px-4 py-3 text-sm font-medium">
          <span>Uploaded column</span>
          <span>Sample values</span>
          <span>Role</span>
        </div>
        {[
          ["row_id", "S001, S002, S003", "id"],
          ["actual_result", "1, 0, 1", "y_true"],
          ["predicted_result", "1, 1, 1", "y_pred"],
          ["positive_score", "0.92, 0.67, 0.88", "score"],
          ["comment", "pass, review, retry", "ignore"],
        ].map(([column, values, role]) => (
          <div key={column} className="grid grid-cols-[1fr_1fr_1fr] items-center border-b px-4 py-3 text-sm">
            <span className="font-medium">{column}</span>
            <span className="text-muted-foreground">{values}</span>
            <button className="flex h-9 w-40 items-center justify-between rounded-md border bg-input-background px-3 text-left">
              {role}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-green-200 bg-[#F0FDF4] p-4 text-sm text-slate-700">
        All required settings are satisfied. You can confirm this mapping and continue to validation.
      </div>
      </div>
    </DemoPanel>
  );
}
