import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ResultPreviewProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const metrics = [
  { name: "Accuracy", value: "0.800" },
  { name: "Macro Precision", value: "0.798" },
  { name: "Macro Recall", value: "0.794" },
  { name: "Macro F1", value: "0.796" },
];

export function ResultPreview({
  currentStep,
  completedSteps,
  onStepClick,
  onPrevious,
}: ResultPreviewProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Result preview</h1>
          <p className="text-sm text-muted-foreground">
            Review the calculated metrics before exporting the final report.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.name}>
              <CardContent className="py-6">
                <div className="text-xs text-muted-foreground mb-2">{metric.name}</div>
                <div className="text-3xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evaluation notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Summary</Badge>
              Stable overall performance with balanced macro metrics.
            </div>
            <div>Class-level review is recommended before publishing the report.</div>
            <div>Adding more validation samples may improve confidence in the final metrics.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Export</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline">Export JSON</Button>
            <Button>Export PDF</Button>
          </CardContent>
        </Card>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} showNext={false} />
    </div>
  );
}
