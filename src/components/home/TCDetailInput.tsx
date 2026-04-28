import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../ui/utils";
import {
  getRequiredColumnsForTc,
  getSelectedTestCases,
  selectionNeedsField,
  type TaskType,
} from "../../data/evaluationData";
import type { TcDetailState, TcDetailStateMap } from "../../types/workflow.types";

interface TCDetailInputProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  taskType?: TaskType | "";
  selectedTCIds?: string[];
  tcDetails: TcDetailStateMap;
  onTcDetailsChange: (value: TcDetailStateMap | ((prev: TcDetailStateMap) => TcDetailStateMap)) => void;
}

function createDefaultState(id: string, name: string): TcDetailState {
  return {
    id,
    name,
    description: "",
    targetValue: "",
    targetCondition: "above",
    beta: id === "TC5" ? "1.0" : "",
    positiveClass: "",
    completed: false,
  };
}

function parseNumericValue(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTargetValueRule(tcId: string): { summary: string; validate: (value: number) => string | null } {
  const zeroToOneIds = new Set([
    "TC1",
    "TC2",
    "TC3",
    "TC4",
    "TC5",
    "TC7",
    "TC8",
    "TC9",
    "TC10",
    "TC11",
    "TC12",
    "TC13",
    "TC15",
    "TC16",
    "TC17",
    "TC22",
  ]);

  const nonNegativeIds = new Set(["TC6", "TC14", "TC18", "TC19", "TC21"]);

  if (zeroToOneIds.has(tcId)) {
    return {
      summary: "Enter a number between 0 and 1.",
      validate: (value) => (value < 0 || value > 1 ? "Target value must be between 0 and 1 for this TC." : null),
    };
  }

  if (nonNegativeIds.has(tcId)) {
    return {
      summary: "Enter a number greater than or equal to 0.",
      validate: (value) => (value < 0 ? "Target value must be 0 or greater for this TC." : null),
    };
  }

  if (tcId === "TC20") {
    return {
      summary: "Enter a number between -1 and 1.",
      validate: (value) => (value < -1 || value > 1 ? "Target value must be between -1 and 1 for MCC." : null),
    };
  }

  if (tcId === "TC23") {
    return {
      summary: "Enter a number greater than or equal to 1.",
      validate: (value) => (value < 1 ? "Target value must be 1 or greater for imbalance ratio." : null),
    };
  }

  return {
    summary: "Enter a valid numeric target value.",
    validate: () => null,
  };
}

export function TCDetailInput({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
  taskType = "",
  selectedTCIds = [],
  tcDetails,
  onTcDetailsChange,
}: TCDetailInputProps) {
  const resolvedTaskType = taskType || "multiclass";
  const selectedTCs = useMemo(() => getSelectedTestCases(resolvedTaskType, selectedTCIds), [resolvedTaskType, selectedTCIds]);
  const [currentTCIndex, setCurrentTCIndex] = useState(0);

  useEffect(() => {
    if (selectedTCs.length === 0) {
      return;
    }

    onTcDetailsChange((prev) => {
      const next = { ...prev };
      for (const tc of selectedTCs) {
        next[tc.id] = next[tc.id] ?? createDefaultState(tc.id, tc.name);
      }
      return next;
    });
  }, [selectedTCs, onTcDetailsChange]);

  if (selectedTCs.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <AppHeader />
        <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />
        <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Select test cases in Step 2 before entering TC details.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const currentTC = selectedTCs[currentTCIndex];
  const currentState = tcDetails[currentTC.id] ?? createDefaultState(currentTC.id, currentTC.name);
  const requiredColumns = getRequiredColumnsForTc(resolvedTaskType, currentTC.id);
  const needsPositiveClass = selectionNeedsField(resolvedTaskType, [currentTC.id], "positiveClass");
  const needsBeta = selectionNeedsField(resolvedTaskType, [currentTC.id], "beta");
  const isLastTC = currentTCIndex === selectedTCs.length - 1;
  const targetValueRule = getTargetValueRule(currentTC.id);
  const targetValueHint =
    currentTC.id === "TC6"
      ? "Enter the maximum acceptable divergence value for this metric."
      : "Enter the minimum metric value you want this TC to achieve.";
  const parsedTargetValue = parseNumericValue(currentState.targetValue);
  const targetValueError =
    currentState.targetValue.trim() === ""
      ? "Target value is required."
      : parsedTargetValue === null
        ? "Target value must be a valid number."
        : targetValueRule.validate(parsedTargetValue);
  const parsedBeta = parseNumericValue(currentState.beta);
  const betaError = !needsBeta
    ? null
    : currentState.beta.trim() === ""
      ? "Beta is required for this TC."
      : parsedBeta === null
        ? "Beta must be a valid number."
        : parsedBeta <= 0
          ? "Beta must be greater than 0."
          : null;
  const positiveClassError = needsPositiveClass && currentState.positiveClass.trim() === ""
    ? "Positive class is required for this TC."
    : null;

  const updateCurrent = (patch: Partial<TcDetailState>) => {
    onTcDetailsChange((prev) => ({
      ...prev,
      [currentTC.id]: {
        ...currentState,
        ...patch,
      },
    }));
  };

  const isComplete = !targetValueError && !betaError && !positiveClassError;

  const handleNextClick = () => {
    updateCurrent({ completed: true });

    if (isLastTC) {
      onNext();
      return;
    }

    setCurrentTCIndex((prev) => prev + 1);
  };

  const handlePreviousClick = () => {
    if (currentTCIndex === 0) {
      onPrevious();
      return;
    }

    setCurrentTCIndex((prev) => prev - 1);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">TC details</h1>
          <p className="text-sm text-muted-foreground">Set target values and any extra inputs required by each selected TC.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Selected TCs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTCs.map((tc, index) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => setCurrentTCIndex(index)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    index === currentTCIndex ? "border-primary bg-blue-50" : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{tc.id}</div>
                      <div className="text-sm font-semibold">{tc.name}</div>
                    </div>
                    {tcDetails[tc.id]?.completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{currentTC.id} details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <p className="text-xs text-muted-foreground">{targetValueRule.summary}</p>
                {targetValueError && <p className="text-xs text-destructive">{targetValueError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Target condition</Label>
                <Select value={currentState.targetCondition} onValueChange={(value: "above" | "below" | "within") => updateCurrent({ targetCondition: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                    <SelectItem value="within">Within range</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how the target value should be evaluated, such as above 0.85 or below 0.10.
                </p>
              </div>

              {needsPositiveClass && (
                <div className="space-y-2">
                  <Label htmlFor="positiveClass">Positive class</Label>
                  <Input
                    id="positiveClass"
                    value={currentState.positiveClass}
                    onChange={(e) => updateCurrent({ positiveClass: e.target.value })}
                    placeholder="e.g. positive"
                    aria-invalid={Boolean(positiveClassError)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the class treated as the positive outcome when computing metrics like precision, recall, and specificity.
                  </p>
                  {positiveClassError && <p className="text-xs text-destructive">{positiveClassError}</p>}
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
                <div className="text-sm font-medium text-blue-950">Required columns for this TC</div>
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

      <div className="h-18 border-t border-border bg-background sticky bottom-0 z-40">
        <div className="h-full px-8 py-4 flex items-center justify-between max-w-[1344px] mx-auto">
          <Button variant="outline" onClick={handlePreviousClick}>
            {currentTCIndex === 0 ? "Previous step" : "Previous TC"}
          </Button>
          <Button onClick={handleNextClick} disabled={!isComplete}>
            {isLastTC ? "Finish" : "Next TC"}
          </Button>
        </div>
      </div>
    </div>
  );
}
