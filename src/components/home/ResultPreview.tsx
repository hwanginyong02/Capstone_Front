import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getSelectedTestCases, type TaskType } from "../../data/evaluationData";

interface ResultPreviewProps {
  currentStep: number;
  completedSteps: number[];
  taskType?: TaskType | "";
  selectedTCIds?: string[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ResultMetricResponse {
  tcId: string;
  value: string | null;
  unit?: string;
  summary?: string;
}

interface ResultPreviewResponse {
  metrics: ResultMetricResponse[];
  generatedAt?: string;
}

function getPreviewCount(total: number) {
  if (total <= 1) {
    return total;
  }
  if (total <= 3) {
    return total;
  }
  return 3;
}

export function ResultPreview({
  currentStep,
  completedSteps,
  taskType = "",
  selectedTCIds = [],
  onStepClick,
  onPrevious,
}: ResultPreviewProps) {
  const selectedTcs = taskType ? getSelectedTestCases(taskType, selectedTCIds) : [];
  const previewCount = getPreviewCount(selectedTcs.length);
  const previewTcs = selectedTcs.slice(0, previewCount);
  const remainingCount = Math.max(selectedTcs.length - previewCount, 0);

  // Placeholder until the backend evaluation API is connected.
  const backendResponse: ResultPreviewResponse | null = null;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Result preview</h1>
          <p className="text-sm text-muted-foreground">
            Review a small set of selected TC results before exporting the final report.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Preview metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewTcs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {previewTcs.map((tc) => {
                    const metric = backendResponse?.metrics.find((item) => item.tcId === tc.id) ?? null;

                    return (
                      <Card key={tc.id}>
                        <CardContent className="space-y-4 py-6">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">{tc.id}</div>
                              <div className="mt-1 font-semibold text-foreground">{tc.name}</div>
                            </div>
                            <Badge variant="outline">Preview</Badge>
                          </div>

                          <div className="text-3xl font-bold text-foreground">
                            {metric?.value ?? "Pending"}
                            {metric?.unit ? <span className="ml-1 text-lg font-medium">{metric.unit}</span> : null}
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {metric?.summary ?? "This card will be populated from the backend response after evaluation runs."}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {remainingCount > 0 && (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    {remainingCount} more metrics are included in the final report export.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                No selected TC is available for preview yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Included in report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The backend should return results only for the selected TCs. The full set will be included in the exported report.
            </p>

            <div className="flex flex-wrap gap-2">
              {selectedTcs.length > 0 ? (
                selectedTcs.map((tc) => (
                  <Badge key={tc.id} variant="secondary">
                    {tc.id}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No test case selected.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Backend response shape</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This screen assumes the backend responds with one result item per selected TC, keyed by <code>tcId</code>.
            </p>

            <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground">
{`{
  "metrics": [
    {
      "tcId": "TC1",
      "value": "0.812",
      "unit": "",
      "summary": "Optional short note for preview"
    }
  ],
  "generatedAt": "2026-04-29T10:30:00Z"
}`}
            </pre>
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
