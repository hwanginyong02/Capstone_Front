import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  TASK_TYPE_LABELS,
  selectionNeedsField,
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

type ValidationStatus = "pass" | "warning" | "error";

interface ExecutionSummaryItem {
  label: string;
  value: string;
  note: string;
}

interface ValidationDetailItem {
  name: string;
  result: string;
  handling: string;
  status: ValidationStatus;
}

interface ValidationResponse {
  taskType: TaskType;
  selectedTcIds: string[];
  executionSummary: ExecutionSummaryItem[];
  validationDetails: ValidationDetailItem[];
  errorCount: number;
  warningCount: number;
}

function buildMockValidationResponse(
  taskType?: TaskType | "",
  selectedTCIds: string[] = [],
): ValidationResponse {
  const resolvedTaskType: TaskType = taskType || "multiclass";
  const hasPositiveClassRequirement =
    resolvedTaskType === "binary" && selectionNeedsField(resolvedTaskType, selectedTCIds, "positiveClass");
  const hasLatencyColumn = false;

  const validationDetails: ValidationDetailItem[] = [
    {
      name: "Missing value",
      result: "None",
      handling: "Exclude affected rows from evaluation",
      status: "pass",
    },
    {
      name: "Duplicate ID",
      result: "None",
      handling: "Keep the first row and exclude later duplicates",
      status: "pass",
    },
    {
      name: "Class mismatch",
      result: "None",
      handling: "Exclude affected rows from evaluation",
      status: "pass",
    },
    {
      name: "Missing required column",
      result: "None",
      handling: "Stop evaluation",
      status: "pass",
    },
    {
      name: "Excluded samples",
      result: "0 rows",
      handling: "Exclude only rows with missing or invalid values",
      status: "pass",
    },
  ];

  if (resolvedTaskType === "multiclass") {
    validationDetails.push(
      {
        name: "Missing probability column",
        result: "None",
        handling: "Stop evaluation when required by selected TCs",
        status: "pass",
      },
      {
        name: "Probability sum error",
        result: "0 rows",
        handling: "Warn and continue",
        status: "pass",
      },
      {
        name: "Argmax and y_pred mismatch",
        result: "0 rows",
        handling: "Warn and continue",
        status: "pass",
      },
      {
        name: "Unknown class detected",
        result: "None",
        handling: "Exclude affected rows from evaluation",
        status: "pass",
      },
    );
  }

  if (resolvedTaskType === "binary") {
    validationDetails.push(
      {
        name: "Missing positive class",
        result: hasPositiveClassRequirement ? "None" : "Not applicable",
        handling: hasPositiveClassRequirement ? "Stop evaluation" : "Skip this check",
        status: "pass",
      },
      {
        name: "Score range error",
        result: "0 rows",
        handling: "Exclude affected rows from evaluation",
        status: "pass",
      },
      {
        name: "Binary class system error",
        result: "None",
        handling: "Exclude affected rows from evaluation",
        status: "pass",
      },
    );
  }

  if (resolvedTaskType === "multilabel") {
    validationDetails.push(
      {
        name: "Label format mismatch",
        result: "None",
        handling: "Exclude affected rows from evaluation",
        status: "pass",
      },
      {
        name: "Missing prob_label_* column",
        result: "None",
        handling: "Stop evaluation when required by selected TCs",
        status: "pass",
      },
      {
        name: "Label vocabulary mismatch",
        result: "None",
        handling: "Exclude affected rows from evaluation",
        status: "pass",
      },
    );
  }

  if (hasLatencyColumn) {
    validationDetails.push(
      {
        name: "Latency value error",
        result: "0 rows",
        handling: "Exclude from latency statistics",
        status: "pass",
      },
      {
        name: "Latency missing value",
        result: "0 rows",
        handling: "Exclude from latency statistics",
        status: "pass",
      },
    );
  }

  const errorCount = validationDetails.filter((item) => item.status === "error").length;
  const warningCount = validationDetails.filter((item) => item.status === "warning").length;

  return {
    taskType: resolvedTaskType,
    selectedTcIds: selectedTCIds,
    executionSummary: [
      {
        label: "Total validated rows",
        value: "[N rows]",
        note: "Uploaded row count used as the base for validation.",
      },
      {
        label: "Valid prediction rows",
        value: "[N rows]",
        note: "Rows actually used for metric calculation after exclusions.",
      },
      {
        label: "Excluded samples",
        value: "[N rows]",
        note: "Rows excluded because of missing or invalid values.",
      },
      {
        label: "Selected TC count",
        value: `[${selectedTCIds.length || "N"} items]`,
        note:
          selectedTCIds.length > 0
            ? `Selected TCs: [${selectedTCIds.join(", ")}]`
            : "No test cases selected.",
      },
      {
        label: "Validation result",
        value: `Errors [${errorCount}] / Warnings [${warningCount}]`,
        note: "See the detailed table below.",
      },
    ],
    validationDetails,
    errorCount,
    warningCount,
  };
}

function getStatusBadge(status: ValidationStatus) {
  if (status === "error") {
    return <Badge variant="destructive">Error</Badge>;
  }
  if (status === "warning") {
    return <Badge variant="outline">Warning</Badge>;
  }
  return <Badge variant="secondary">Pass</Badge>;
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
  const validationResponse = buildMockValidationResponse(taskType, selectedTCIds);
  const hasBlockingError = validationResponse.errorCount > 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pb-24 pt-12">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Data validation</h1>
          <p className="text-sm text-muted-foreground">
            Review the backend validation result before running the evaluation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TASK_TYPE_LABELS[validationResponse.taskType]}</Badge>
          {validationResponse.selectedTcIds.map((id) => (
            <Badge key={id} variant="outline">
              {id}
            </Badge>
          ))}
        </div>

        {hasBlockingError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Validation errors were found. Review the detail table before continuing.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              No blocking validation error was found in the current mock response.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">6.0 Execution summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[220px]">Item</TableHead>
                    <TableHead className="w-[180px]">Value</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResponse.executionSummary.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell className="align-top whitespace-normal font-semibold">{item.label}</TableCell>
                      <TableCell className="align-top whitespace-normal">{item.value}</TableCell>
                      <TableCell className="align-top whitespace-normal text-muted-foreground">{item.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">6.0.1 Validation details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[320px]">Check</TableHead>
                    <TableHead className="w-[220px]">Result</TableHead>
                    <TableHead>Handling</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResponse.validationDetails.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="align-top whitespace-normal font-medium">{item.name}</TableCell>
                      <TableCell className="align-top whitespace-normal">{item.result}</TableCell>
                      <TableCell className="align-top whitespace-normal text-muted-foreground">{item.handling}</TableCell>
                      <TableCell className="align-top">{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} nextLabel="Run evaluation" />
    </div>
  );
}
