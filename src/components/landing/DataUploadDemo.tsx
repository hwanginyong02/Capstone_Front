import { Upload } from "lucide-react";
import { DemoPanel, DemoField } from "./DemoPanel";

export function DataUploadDemo() {
  return (
    <DemoPanel index={3} action="scroll & upload">
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-foreground">Data upload</h3>
        <p className="text-sm text-muted-foreground">
          Upload the evaluation data first, then enter the training dataset information used to build the model.
        </p>
      </div>
      <div className="landing-upload-scroll space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-primary bg-blue-50 p-4">
          <p className="text-sm font-semibold">1. Evaluation data</p>
          <p className="mt-1 text-xs text-muted-foreground">File with id, ground truth, prediction, and optional latency</p>
        </div>
        <div className="rounded-lg border border-primary bg-blue-50 p-4">
          <p className="text-sm font-semibold">2. Training dataset</p>
          <p className="mt-1 text-xs text-muted-foreground">Dataset summary and example file for the final report</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="landing-file-pick rounded-xl border-2 border-dashed bg-card p-6">
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <h4 className="text-base font-semibold">Click to choose evaluation data</h4>
          <p className="mt-1 text-sm text-muted-foreground">eval_result_1775625159458.json</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h4 className="text-lg font-semibold">Training dataset information</h4>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <DemoField label="Training dataset name" value="Binary review dataset" />
            <DemoField label="Training samples" value="100" />
            <DemoField label="Evaluation samples" value="100" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h4 className="text-lg font-semibold">Training data example</h4>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {["Representative valid example", "Edge or unsuitable example"].map((title) => (
            <div key={title} className="rounded-lg border p-4">
              <p className="text-sm font-semibold">{title}</p>
              <div className="mt-4 flex min-h-[92px] items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
                Choose example file
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </DemoPanel>
  );
}
