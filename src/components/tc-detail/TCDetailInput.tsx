import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../../utils/styling/styles";
import {
  getMetricDisplayId,
  getRequiredColumnsForMetric,
  getSelectedMetrics,
  selectionNeedsField,
  type TaskType,
} from "../../data/evaluationData";
import type { MetricDetailState, MetricDetailStateMap } from "../../types/workflow.types";
import { parseNumericValue, getTargetValueRule, metricNeedsTargetValue } from "../../utils/domain/validation";

interface TCDetailInputProps {
  taskType?: TaskType | "";
  selectedMetricIds?: string[];
  metricDetails: MetricDetailStateMap;
  onMetricDetailsChange: (value: MetricDetailStateMap | ((prev: MetricDetailStateMap) => MetricDetailStateMap)) => void;
  currentMetricIndex: number;
  onCurrentMetricIndexChange: (idx: number) => void;
}

function createDefaultState(id: string, name: string): MetricDetailState {
  return {
    id,
    name,
    description: "",
    targetValue: "",
    beta: id === "M5" ? "1.0" : "",
    positiveClass: "",
    completed: false,
  };
}

export function TCDetailInput({
  taskType = "",
  selectedMetricIds = [],
  metricDetails,
  onMetricDetailsChange,
  currentMetricIndex,
  onCurrentMetricIndexChange,
}: TCDetailInputProps) {
  const resolvedTaskType = taskType || "multiclass";
  const selectedMetrics = useMemo(() => getSelectedMetrics(resolvedTaskType, selectedMetricIds), [resolvedTaskType, selectedMetricIds]);

  useEffect(() => {
    if (selectedMetrics.length === 0) {
      return;
    }

    onMetricDetailsChange((prev) => {
      const next = { ...prev };
      for (const metric of selectedMetrics) {
        next[metric.id] = next[metric.id] ?? createDefaultState(metric.id, metric.name);
      }
      return next;
    });
  }, [selectedMetrics, onMetricDetailsChange]);

  if (selectedMetrics.length === 0) {
    return (
      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Select metrics in Step 2 before entering metric details.
          </CardContent>
        </Card>
      </main>
    );
  }

  const currentMetric = selectedMetrics[currentMetricIndex];
  const currentState = metricDetails[currentMetric.id] ?? createDefaultState(currentMetric.id, currentMetric.name);
  const requiredColumns = getRequiredColumnsForMetric(resolvedTaskType, currentMetric.id);
  const needsBeta = selectionNeedsField(resolvedTaskType, [currentMetric.id], "beta");
  const needsTargetValue = metricNeedsTargetValue(currentMetric.id);
  const targetValueRule = getTargetValueRule(currentMetric.id);
  const targetValueHint = getTargetValueHint(currentMetric.id);
  const parsedTargetValue = parseNumericValue(currentState.targetValue);
  const targetValueError = !needsTargetValue
    ? null
    : currentState.targetValue.trim() === ""
      ? "Target value is required."
      : parsedTargetValue === null
        ? "Target value must be a valid number."
        : targetValueRule.validate(parsedTargetValue);
  const parsedBeta = parseNumericValue(currentState.beta);
  const betaError = !needsBeta
    ? null
    : currentState.beta.trim() === ""
      ? "Beta is required for this metric."
      : parsedBeta === null
        ? "Beta must be a valid number."
        : parsedBeta <= 0
          ? "Beta must be greater than 0."
          : null;

  const updateCurrent = (patch: Partial<MetricDetailState>) => {
    onMetricDetailsChange((prev) => ({
      ...prev,
      [currentMetric.id]: {
        ...currentState,
        ...patch,
      },
    }));
  };

  const isComplete = !targetValueError && !betaError;

  return (
    <>
      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Metric details</h1>
          <p className="text-sm text-muted-foreground">Set target values and any extra inputs required by each selected metric.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Selected metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedMetrics.map((metric, index) => (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => onCurrentMetricIndexChange(index)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    index === currentMetricIndex ? "border-primary bg-blue-50" : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{getMetricDisplayId(metric.id)}</div>
                      <div className="text-sm font-semibold">{metric.name}</div>
                    </div>
                    {metricDetails[metric.id]?.completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {getMetricDisplayId(currentMetric.id)}: {currentMetric.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{currentMetric.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {needsTargetValue ? (
                <div className="space-y-2">
                  <Label htmlFor="targetValue">Target value</Label>
                  <Input
                    id="targetValue"
                    value={currentState.targetValue}
                    onChange={(e) => updateCurrent({ targetValue: e.target.value })}
                    placeholder="e.g. 0.85"
                    aria-invalid={Boolean(targetValueError)}
                  />
                  <p className="text-xs text-muted-foreground">{targetValueHint}</p>
                  <p className="text-xs text-muted-foreground">
                    This value becomes the acceptance criterion used later in the report. Higher-is-better metrics use it as the minimum acceptable score, while lower-is-better metrics use it as the maximum acceptable value.
                  </p>
                  <p className="text-xs text-muted-foreground">{targetValueRule.summary}</p>
                  {targetValueError && <p className="text-xs text-destructive">{targetValueError}</p>}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-sm font-medium text-foreground">Target value is not required</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {getMetricDisplayId(currentMetric.id)} is reviewed as an informational output rather than a single pass/fail number, so no target value is collected here.
                  </p>
                </div>
              )}

              {needsBeta && (
                <div className="space-y-2">
                  <Label htmlFor="beta">Beta</Label>
                  <Input
                    id="beta"
                    value={currentState.beta}
                    onChange={(e) => updateCurrent({ beta: e.target.value })}
                    placeholder="1.0"
                    aria-invalid={Boolean(betaError)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Beta controls the balance between precision and recall. `1.0` means equal weight, values above `1.0` emphasize recall, and values below `1.0` emphasize precision.
                  </p>
                  {betaError && <p className="text-xs text-destructive">{betaError}</p>}
                </div>
              )}

              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-950">Required columns for this metric</div>
                <div className="flex flex-wrap gap-2">
                  {requiredColumns.map((column) => (
                    <Badge key={column.code} variant="secondary">
                      {column.code}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-3">
                  {requiredColumns.map((column) => (
                    <div key={column.code} className="rounded-md border border-blue-200 bg-white/80 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{column.code}</Badge>
                        <span className="text-sm font-medium text-slate-900">{column.label}</span>
                      </div>
                      <p className="text-xs text-slate-600">{column.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

export function isCurrentMetricValid(
  taskType: TaskType | "",
  metricId: string,
  state: MetricDetailState
) {
  const needsBeta = selectionNeedsField(taskType || "multiclass", [metricId], "beta");
  const needsTargetValue = metricNeedsTargetValue(metricId);
  
  const parsedTargetValue = parseNumericValue(state.targetValue);
  const targetValueRule = getTargetValueRule(metricId);
  const targetValueError = !needsTargetValue
    ? null
    : state.targetValue.trim() === ""
      ? "Target value is required."
      : parsedTargetValue === null
        ? "Target value must be a valid number."
        : targetValueRule.validate(parsedTargetValue);

  const parsedBeta = parseNumericValue(state.beta);
  const betaError = !needsBeta
    ? null
    : state.beta.trim() === ""
      ? "Beta is required for this metric."
      : parsedBeta === null
        ? "Beta must be a valid number."
        : parsedBeta <= 0
          ? "Beta must be greater than 0."
          : null;

  const isComplete = !targetValueError && !betaError;

  return isComplete;
}

function getTargetValueHint(metricId: string): string {
  const lowerIsBetter = new Set(["M6", "M8", "M14", "M15", "M18", "M19", "M23"]);

  if (lowerIsBetter.has(metricId)) {
    return "Enter the largest value that is still acceptable for this metric.";
  }

  if (metricId === "M20") {
    return "Enter the minimum acceptable MCC value. MCC ranges from -1 to 1, where higher is better.";
  }

  return "Enter the minimum score this metric should reach to be considered acceptable.";
}
