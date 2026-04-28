import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface DataValidationProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const checks = [
  { name: "Required columns", detail: "All required columns are present.", status: "pass" },
  { name: "Duplicate IDs", detail: "All sample identifiers are unique.", status: "pass" },
  { name: "Missing values", detail: "No missing values were found in required fields.", status: "pass" },
  { name: "Probability ranges", detail: "Probability values are within the 0 to 1 range.", status: "pass" },
  { name: "Sample size", detail: "The current sample size is usable, but more rows may improve stability.", status: "warning" },
];

export function DataValidation({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
}: DataValidationProps) {
  const warningCount = checks.filter((item) => item.status === "warning").length;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Data validation</h1>
          <p className="text-sm text-muted-foreground">
            Final checks before running the evaluation.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Validation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold text-green-800">Core validation passed</div>
                <div className="text-sm text-green-700">Required checks are complete and the workflow can continue.</div>
              </div>
            </div>

            {warningCount > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-800">{warningCount} warning item</div>
                  <div className="text-sm text-amber-700">Warnings do not block evaluation, but they are worth reviewing.</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Check results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((item) => (
              <div key={item.name} className="rounded-lg border border-border p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.detail}</div>
                </div>
                <Badge variant={item.status === "pass" ? "secondary" : "outline"}>
                  {item.status === "pass" ? "Pass" : "Warning"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} nextLabel="Run evaluation" />
    </div>
  );
}
