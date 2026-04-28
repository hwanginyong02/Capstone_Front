import { AlertTriangle, Info } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  TASK_TYPE_LABELS,
  getSelectedTestCases,
  selectionRequiresProbability,
  type TaskType,
} from "../../data/evaluationData";

interface DataValidationProps {
  currentStep: number;
  completedSteps: number[];
  taskType?: TaskType | "";
  selectedTCIds?: string[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

type CheckStatus = "pass" | "warning" | "info";

interface ValidationCheck {
  name: string;
  detail: string;
  status: CheckStatus;
}

interface ValidationSection {
  title: string;
  description: string;
  checks: ValidationCheck[];
}

function buildValidationSections(taskType?: TaskType | "", selectedTCIds: string[] = []): ValidationSection[] {
  const commonChecks: ValidationCheck[] = [
    {
      name: "Required values",
      detail: "Mapped fields needed for evaluation do not contain blank values.",
      status: "pass",
    },
    {
      name: "Unique IDs",
      detail: "Sample identifiers are present and unique across all rows.",
      status: "pass",
    },
    {
      name: "Label consistency",
      detail: "Ground-truth and prediction labels follow the same label set.",
      status: "pass",
    },
  ];

  if (!taskType) {
    return [
      {
        title: "Common checks",
        description: "Basic checks that apply before any evaluation run.",
        checks: commonChecks,
      },
    ];
  }

  const taskChecks: ValidationCheck[] = [];

  if (taskType === "binary") {
    taskChecks.push({
      name: "Prediction format",
      detail: "If a score column is used, values must stay within the 0 to 1 range.",
      status: "pass",
    });
  }

  if (taskType === "multiclass") {
    taskChecks.push(
      {
        name: "Prediction format",
        detail: "Predicted labels should match the observed class vocabulary.",
        status: "pass",
      },
      {
        name: "Probability rows",
        detail: "Per-class probabilities should stay within 0 to 1 and sum close to 1.",
        status: "warning",
      },
    );
  }

  if (taskType === "multilabel") {
    taskChecks.push(
      {
        name: "Prediction format",
        detail: "Label arrays or separators should be consistent across rows.",
        status: "pass",
      },
      {
        name: "Probability rows",
        detail: "Per-label probabilities, if present, should stay within the 0 to 1 range.",
        status: "pass",
      },
    );
  }

  const selectedTcs = getSelectedTestCases(taskType, selectedTCIds);
  const tcChecks: ValidationCheck[] = [];
  const probabilityRequired = selectionRequiresProbability(taskType, selectedTCIds);
  const tcNames = selectedTcs.map((tc) => tc.name).join(", ");

  if (selectedTcs.length > 0) {
    tcChecks.push({
      name: "Selected TC scope",
      detail: `Active checks are based on the selected metrics: ${tcNames}.`,
      status: "info",
    });
  }

  if (taskType === "binary" && probabilityRequired) {
    tcChecks.push({
      name: "Score-ready metrics",
      detail: "Selected TCs require a usable score column for probability-based evaluation.",
      status: "pass",
    });
  }

  if (taskType === "multiclass" && selectedTCIds.includes("TC6")) {
    tcChecks.push({
      name: "KL divergence input",
      detail: "TC6 requires per-class probability columns for each sample row.",
      status: "pass",
    });
  }

  if (taskType === "multilabel" && selectedTCIds.includes("TC23") && selectedTCIds.length === 1) {
    tcChecks.push({
      name: "Distribution-only run",
      detail: "TC23 can proceed with true labels only, so prediction fields remain optional.",
      status: "info",
    });
  }

  return [
    {
      title: "Common checks",
      description: "Always validate the core dataset shape before running any metric.",
      checks: commonChecks,
    },
    {
      title: `${TASK_TYPE_LABELS[taskType]} checks`,
      description: "Format rules that depend on the selected task type.",
      checks: taskChecks,
    },
    {
      title: "TC-specific checks",
      description: "Extra checks appear only when the selected test cases need them.",
      checks:
        tcChecks.length > 0
          ? tcChecks
          : [
              {
                name: "No extra TC requirement",
                detail: "The current metric selection does not add any extra validation rule.",
                status: "info",
              },
            ],
    },
  ];
}

function getBadgeVariant(status: CheckStatus) {
  if (status === "pass") {
    return "secondary" as const;
  }
  return "outline" as const;
}

function getBadgeLabel(status: CheckStatus) {
  if (status === "pass") {
    return "Pass";
  }
  if (status === "warning") {
    return "Warning";
  }
  return "Info";
}

export function DataValidation({
  currentStep,
  completedSteps,
  taskType = "",
  selectedTCIds = [],
  onStepClick,
  onNext,
  onPrevious,
}: DataValidationProps) {
  const sections = buildValidationSections(taskType, selectedTCIds);
  const allChecks = sections.flatMap((section) => section.checks);
  const warningCount = allChecks.filter((check) => check.status === "warning").length;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Data validation</h1>
          <p className="text-sm text-muted-foreground">
            Final checks for the confirmed mapping and the selected evaluation scope.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Validation checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>

                  <div className="space-y-3">
                    {section.checks.map((check) => (
                      <div
                        key={`${section.title}-${check.name}`}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{check.name}</div>
                          <div className="text-sm text-muted-foreground">{check.detail}</div>
                        </div>
                        <Badge variant={getBadgeVariant(check.status)}>{getBadgeLabel(check.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Validation scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="text-sm font-medium text-muted-foreground">Task type</div>
                <div className="mt-1 font-semibold text-foreground">
                  {taskType ? TASK_TYPE_LABELS[taskType] : "Not selected"}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <div className="text-sm font-medium text-muted-foreground">Selected TCs</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTCIds.length > 0 ? (
                    selectedTCIds.map((id) => (
                      <Badge key={id} variant="outline">
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No test case selected.</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-700">
                  {warningCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    {warningCount > 0 ? "Review before run" : "Minimal validation set"}
                  </span>
                </div>
                <p className="text-sm text-amber-800">
                  This step focuses on required values, unique IDs, prediction format, and label consistency only.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} nextLabel="Run evaluation" />
    </div>
  );
}
