import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  TASK_TYPE_LABELS,
  TEST_CASES,
  type RequiredColumnCode,
  type RequiredColumnDisplay,
  type TaskType,
  getRequiredColumnsForSelection,
  getRequiredColumnsForTc,
} from "../../data/evaluationData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../ui/utils";

type MappingRole = RequiredColumnCode | "ignore";
type FilterMode = "all" | "issues" | "edited";

interface MappingRow {
  originalName: string;
  sampleValues: string[];
  inferredRole: MappingRole | null;
  confirmedRole: MappingRole | null;
  modified: boolean;
  warnings: string[];
}

interface BackendMappingResponse {
  taskType: TaskType;
  requiredRoles: RequiredColumnCode[];
  rows: MappingRow[];
}

interface ColumnMappingProps {
  currentStep: number;
  completedSteps: number[];
  taskType?: TaskType | "";
  selectedTCIds?: string[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const roleOptions: Array<{ value: MappingRole; label: string }> = [
  { value: "id", label: "id" },
  { value: "y_true", label: "y_true" },
  { value: "y_pred", label: "y_pred" },
  { value: "score", label: "score" },
  { value: "prob_class_*", label: "prob_class_*" },
  { value: "true_labels", label: "true_labels" },
  { value: "pred_labels", label: "pred_labels" },
  { value: "prob_label_*", label: "prob_label_*" },
  { value: "ignore", label: "ignore" },
];

function buildMockBackendResponse(taskType: TaskType, requiredRoles: RequiredColumnCode[]): BackendMappingResponse {
  if (taskType === "binary") {
    return {
      taskType,
      requiredRoles,
      rows: [
        {
          originalName: "row_id",
          sampleValues: ["S001", "S002", "S003"],
          inferredRole: "id",
          confirmedRole: "id",
          modified: false,
          warnings: [],
        },
        {
          originalName: "actual_result",
          sampleValues: ["1", "0", "1"],
          inferredRole: "y_true",
          confirmedRole: "y_true",
          modified: false,
          warnings: [],
        },
        {
          originalName: "predicted_result",
          sampleValues: ["1", "1", "1"],
          inferredRole: "y_pred",
          confirmedRole: "y_pred",
          modified: false,
          warnings: [],
        },
        {
          originalName: "positive_score",
          sampleValues: ["0.92", "0.67", "0.88"],
          inferredRole: "score",
          confirmedRole: "score",
          modified: false,
          warnings: ["Please review this mapping. The column may contain score or probability values."],
        },
        {
          originalName: "comment",
          sampleValues: ["pass", "review", "retry"],
          inferredRole: "ignore",
          confirmedRole: "ignore",
          modified: false,
          warnings: [],
        },
      ],
    };
  }

  if (taskType === "multilabel") {
    return {
      taskType,
      requiredRoles,
      rows: [
        {
          originalName: "sample_id",
          sampleValues: ["S001", "S002", "S003"],
          inferredRole: "id",
          confirmedRole: "id",
          modified: false,
          warnings: [],
        },
        {
          originalName: "gold_labels",
          sampleValues: ["sports|news", "news", "finance|policy"],
          inferredRole: "true_labels",
          confirmedRole: "true_labels",
          modified: false,
          warnings: [],
        },
        {
          originalName: "model_labels",
          sampleValues: ["sports", "news", "finance"],
          inferredRole: "pred_labels",
          confirmedRole: "pred_labels",
          modified: false,
          warnings: [],
        },
        {
          originalName: "prob_news",
          sampleValues: ["0.63", "0.91", "0.08"],
          inferredRole: "prob_label_*",
          confirmedRole: "prob_label_*",
          modified: false,
          warnings: [],
        },
        {
          originalName: "prob_sports",
          sampleValues: ["0.74", "0.09", "0.11"],
          inferredRole: "prob_label_*",
          confirmedRole: "prob_label_*",
          modified: false,
          warnings: [],
        },
      ],
    };
  }

  return {
    taskType,
    requiredRoles,
    rows: [
      {
        originalName: "sample_id",
        sampleValues: ["S001", "S002", "S003"],
        inferredRole: "id",
        confirmedRole: "id",
        modified: false,
        warnings: [],
      },
      {
        originalName: "actual_label",
        sampleValues: ["cat", "dog", "bird"],
        inferredRole: "y_true",
        confirmedRole: "y_true",
        modified: false,
        warnings: [],
      },
      {
        originalName: "predicted_label",
        sampleValues: ["cat", "cat", "dog"],
        inferredRole: "y_pred",
        confirmedRole: "y_pred",
        modified: false,
        warnings: [],
      },
      {
        originalName: "p_cat",
        sampleValues: ["0.92", "0.10", "0.08"],
        inferredRole: "prob_class_*",
        confirmedRole: "prob_class_*",
        modified: false,
        warnings: [],
      },
      {
        originalName: "p_dog",
        sampleValues: ["0.05", "0.62", "0.86"],
        inferredRole: "prob_class_*",
        confirmedRole: "prob_class_*",
        modified: false,
        warnings: [],
      },
      {
        originalName: "p_bird",
        sampleValues: ["0.03", "0.28", "0.06"],
        inferredRole: "prob_class_*",
        confirmedRole: "prob_class_*",
        modified: false,
        warnings: [],
      },
      {
        originalName: "memo",
        sampleValues: ["test", "final", "v2"],
        inferredRole: null,
        confirmedRole: null,
        modified: false,
        warnings: ["No matching role was inferred for this column."],
      },
    ],
  };
}

function getRoleStatusLabel(role: RequiredColumnDisplay, matchedCount: number) {
  if (matchedCount === 0) {
    return { label: "Missing", tone: "destructive" as const };
  }
  if (role.code === "prob_class_*" || role.code === "prob_label_*") {
    return { label: `${matchedCount} mapped`, tone: "secondary" as const };
  }
  if (matchedCount > 1) {
    return { label: "Conflict", tone: "destructive" as const };
  }
  return { label: "Mapped", tone: "secondary" as const };
}

function getRowMatchState(row: MappingRow, duplicate: boolean) {
  if (duplicate) {
    return { label: "Conflict", tone: "destructive" as const };
  }
  if (row.confirmedRole === null) {
    return { label: "Unmapped", tone: "destructive" as const };
  }
  if (row.modified) {
    return { label: "Changed", tone: "secondary" as const };
  }
  if (row.warnings.length > 0) {
    return { label: "Needs Review", tone: "outline" as const };
  }
  return { label: "Matched", tone: "secondary" as const };
}

export function ColumnMapping({
  currentStep,
  completedSteps,
  taskType = "",
  selectedTCIds = [],
  onStepClick,
  onNext,
  onPrevious,
}: ColumnMappingProps) {
  const resolvedTaskType: TaskType = taskType || "multiclass";
  const selectedTestCases = useMemo(
    () => TEST_CASES.filter((tc) => selectedTCIds.includes(tc.id) && tc.supportedTaskTypes.includes(resolvedTaskType)),
    [resolvedTaskType, selectedTCIds],
  );
  const requiredRoles = useMemo(
    () => getRequiredColumnsForSelection(resolvedTaskType, selectedTCIds),
    [resolvedTaskType, selectedTCIds],
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [rows, setRows] = useState<MappingRow[]>([]);

  useEffect(() => {
    const response = buildMockBackendResponse(
      resolvedTaskType,
      requiredRoles.map((role) => role.code),
    );
    setRows(response.rows);
  }, [resolvedTaskType, requiredRoles]);

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<MappingRole, number>> = {};
    rows.forEach((row) => {
      if (!row.confirmedRole || row.confirmedRole === "ignore") {
        return;
      }
      counts[row.confirmedRole] = (counts[row.confirmedRole] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (filterMode === "edited") {
      return rows.filter((row) => row.modified);
    }
    if (filterMode === "issues") {
      return rows.filter((row) => {
        const duplicate =
          row.confirmedRole &&
          row.confirmedRole !== "ignore" &&
          row.confirmedRole !== "prob_class_*" &&
          row.confirmedRole !== "prob_label_*" &&
          (roleCounts[row.confirmedRole] ?? 0) > 1;
        const unassigned = row.confirmedRole === null;
        return duplicate || unassigned || row.warnings.length > 0;
      });
    }
    return rows;
  }, [filterMode, roleCounts, rows]);

  const mappingSummary = useMemo(() => {
    const editedCount = rows.filter((row) => row.modified).length;
    const duplicateCount = Object.entries(roleCounts).filter(([role, count]) => {
      if (!count || count < 2) {
        return false;
      }
      return role !== "prob_class_*" && role !== "prob_label_*";
    }).length;

    const missingRoles = requiredRoles.filter((role) => {
      const count = roleCounts[role.code] ?? 0;
      return count === 0;
    });

    return {
      editedCount,
      duplicateCount,
      missingRoles,
      isValid: missingRoles.length === 0 && duplicateCount === 0,
    };
  }, [requiredRoles, roleCounts, rows]);

  const handleRoleChange = (index: number, newRole: string) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              confirmedRole: newRole === "unassigned" ? null : (newRole as MappingRole),
              modified: row.inferredRole !== (newRole === "unassigned" ? null : newRole),
            }
          : row,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Column mapping review</h1>
            <p className="text-sm text-muted-foreground">
              Review the backend auto-mapping result, fix any mismatches, and confirm the columns required for this evaluation.
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-3 py-1 text-sm">
            {TASK_TYPE_LABELS[resolvedTaskType]} workflow
          </Badge>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            The backend has already analyzed the uploaded file and suggested roles for each detected column. This step is for human review and final confirmation.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Selected test cases and required columns</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Each selected TC can require different columns. Confirm that all of them are satisfied before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTestCases.length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No TC selection was passed into this screen, so the UI is falling back to the current task type only.
                </AlertDescription>
              </Alert>
            )}

            {selectedTestCases.length > 0 && (
              <div className="space-y-3">
                {selectedTestCases.map((tc) => {
                  const tcRequiredRoles = getRequiredColumnsForTc(resolvedTaskType, tc.id);
                  const tcMissing = tcRequiredRoles.filter((role) => (roleCounts[role.code] ?? 0) === 0);
                  const tcHasConflict = tcRequiredRoles.some((role) => {
                    const count = roleCounts[role.code] ?? 0;
                    return role.code !== "prob_class_*" && role.code !== "prob_label_*" && count > 1;
                  });
                  const tcComplete = tcMissing.length === 0 && !tcHasConflict;

                  return (
                    <div key={tc.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{tc.id}</Badge>
                            <div className="font-semibold">{tc.name}</div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{tc.description}</p>
                        </div>
                        <Badge variant={tcComplete ? "secondary" : "destructive"}>
                          {tcComplete ? "Ready" : "Needs review"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {tcRequiredRoles.map((role) => {
                          const count = roleCounts[role.code] ?? 0;
                          const status = getRoleStatusLabel(role, count);

                          return (
                            <div key={`${tc.id}-${role.code}`} className="rounded-lg border border-border bg-muted/20 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{role.code}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{role.label}</div>
                                </div>
                                <Badge variant={status.tone}>{status.label}</Badge>
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">{role.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {requiredRoles.length > 0 && (
              <div className="rounded-xl border border-border bg-[#F8FAFC] p-4">
                <div className="text-sm font-medium text-slate-900">Overall required role coverage</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {requiredRoles.map((role) => {
                    const count = roleCounts[role.code] ?? 0;
                    const status = getRoleStatusLabel(role, count);

                    return (
                      <Badge key={role.code} variant={status.tone}>
                        {role.code}: {status.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Detected mapping</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Check whether each uploaded column was mapped to the right role, then edit only the ones that need correction.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={filterMode === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterMode("all")}>
                  All rows
                </Button>
                <Button
                  variant={filterMode === "issues" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("issues")}
                >
                  Issues only
                </Button>
                <Button
                  variant={filterMode === "edited" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("edited")}
                >
                  Edited only
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase text-muted-foreground">Uploaded column</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Sample values</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Auto-mapped role</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Match</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground">Final role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row, index) => {
                    const duplicate =
                      row.confirmedRole &&
                      row.confirmedRole !== "ignore" &&
                      row.confirmedRole !== "prob_class_*" &&
                      row.confirmedRole !== "prob_label_*" &&
                      (roleCounts[row.confirmedRole] ?? 0) > 1;
                    const needsAttention = duplicate || row.confirmedRole === null || row.warnings.length > 0;
                    const matchState = getRowMatchState(row, duplicate);

                    return (
                      <TableRow key={row.originalName} className={cn(needsAttention && "bg-amber-50/40")}>
                        <TableCell className="align-top">
                          <div className="font-mono text-sm">{row.originalName}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="max-w-[240px] text-sm text-muted-foreground">
                            {row.sampleValues.join(", ")}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={row.inferredRole ? "outline" : "destructive"}>
                            {row.inferredRole ?? "No match"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            <Badge variant={matchState.tone}>{matchState.label}</Badge>
                            {row.modified && row.inferredRole && row.confirmedRole && (
                              <div className="text-xs text-muted-foreground">
                                Auto-mapped as <span className="font-medium text-foreground">{row.inferredRole}</span>, changed to{" "}
                                <span className="font-medium text-foreground">{row.confirmedRole}</span>
                              </div>
                            )}
                            {row.warnings.map((warning) => (
                              <div key={warning} className="flex items-start gap-2 text-xs text-amber-800">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                <span>{warning}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={row.confirmedRole ?? "unassigned"}
                            onValueChange={(value) => handleRoleChange(index, value)}
                          >
                            <SelectTrigger className={cn("w-[210px]", duplicate && "border-destructive")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">unassigned</SelectItem>
                              {roleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {!mappingSummary.isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {mappingSummary.missingRoles.length > 0 &&
                `Missing required roles: ${mappingSummary.missingRoles.map((role) => role.code).join(", ")}. `}
              {mappingSummary.duplicateCount > 0 &&
                "At least one single-use role has been assigned to multiple columns. Resolve the conflicts before confirming."}
            </AlertDescription>
          </Alert>
        )}

        {mappingSummary.isValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All required roles are mapped for the selected test cases. You can confirm this mapping and continue to validation.
            </AlertDescription>
          </Alert>
        )}
      </main>

      <ActionBar
        showPrevious={true}
        onPrevious={onPrevious}
        onNext={onNext}
        nextDisabled={!mappingSummary.isValid}
        nextLabel="Confirm mapping"
      />
    </div>
  );
}
