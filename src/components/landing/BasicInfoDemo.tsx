import { cn } from "../../utils/styling/styles";
import { DemoPanel, DemoField } from "./DemoPanel";

export function BasicInfoDemo() {
  return (
    <DemoPanel index={0} action="typing">
      <div className="landing-basic-scroll space-y-6">
        <div>
          <h3 className="mb-2 text-2xl font-bold text-foreground">Basic information</h3>
          <p className="text-sm text-muted-foreground">
            Fill in the organization, model, and evaluation request details used throughout the workflow.
          </p>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="px-6 pt-6">
            <h4 className="text-lg font-semibold">Organization</h4>
          </div>
          <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
            <DemoField label="Company name" value="Apex AI Lab" typing />
            <DemoField label="Representative" value="Jane Lee" />
            <DemoField label="Business number" value="123-45-67890" />
            <DemoField label="Phone" value="02-1234-5678" />
          </div>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="px-6 pt-6">
            <h4 className="text-lg font-semibold">Model information</h4>
          </div>
          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-5 md:grid-cols-2">
              <DemoField label="Model name" value="ReviewClassifier-B" typing />
              <DemoField label="Version" value="v1.0.0" />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Classifier type <span className="text-red-600">*</span>
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                {["Binary", "Multi-class", "Multi-label"].map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      "landing-click-target rounded-lg border-2 p-5",
                      index === 0 ? "border-primary bg-blue-50" : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-0.5 h-4 w-4 rounded-full border", index === 0 && "border-primary bg-primary")} />
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {index === 0 ? "One of two classes per sample" : "Alternative classifier type"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoPanel>
  );
}
