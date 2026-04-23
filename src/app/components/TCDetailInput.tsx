import { useMemo, useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Check, Circle, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "./ui/utils";
import {
  getSelectedTestCases,
  selectionNeedsField,
  type TaskType,
} from "../config/evaluationConfig";
import type { TcDetailStateMap, TcDetailState } from "../types/workflow";

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

interface EnvData {
  os: string;
  cpu: string;
  gpu: string;
  memory: string;
  software: string;
}

export function TCDetailInput({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
  taskType,
  selectedTCIds = [],
  tcDetails,
  onTcDetailsChange,
}: TCDetailInputProps) {
  const resolvedTaskType = taskType || "binary";
  const selectedDefinitions = useMemo(
    () => getSelectedTestCases(resolvedTaskType, selectedTCIds),
    [resolvedTaskType, selectedTCIds],
  );

  const [currentTCIndex, setCurrentTCIndex] = useState(0);
  const [envExpanded, setEnvExpanded] = useState(false);
  const [env, setEnv] = useState<EnvData>({
    os: "",
    cpu: "",
    gpu: "",
    memory: "",
    software: "",
  });

  const currentDefinition = selectedDefinitions[currentTCIndex];
  const currentTC =
    currentDefinition &&
    (tcDetails[currentDefinition.id] || {
      id: currentDefinition.id,
      name: currentDefinition.name,
      description: currentDefinition.description,
      targetValue: "",
      targetCondition: "above" as const,
      beta: currentDefinition.id === "TC5" ? "1.0" : "",
      positiveClass: "",
      completed: false,
    });

  const updateCurrentTC = (field: keyof TcDetailState, value: string | boolean) => {
    if (!currentTC) {
      return;
    }

    onTcDetailsChange((prev) => ({
      ...prev,
      [currentTC.id]: {
        ...currentTC,
        [field]: value,
      },
    }));
  };

  const isCurrentTCValid = () => {
    if (!currentTC) {
      return false;
    }

    const hasTarget = !!currentTC.targetValue;
    const needsBeta = currentTC.id === "TC5";
    const needsPositiveClass = selectionNeedsField(resolvedTaskType, [currentTC.id], "positiveClass");

    return hasTarget && (!needsBeta || !!currentTC.beta) && (!needsPositiveClass || !!currentTC.positiveClass);
  };

  const handlePreviousTC = () => {
    if (currentTCIndex > 0) {
      setCurrentTCIndex(currentTCIndex - 1);
      return;
    }

    onPrevious();
  };

  const handleNextTC = () => {
    if (!currentTC) {
      return;
    }

    if (!isCurrentTCValid()) {
      return;
    }

    updateCurrentTC("completed", true);

    if (currentTCIndex < selectedDefinitions.length - 1) {
      setCurrentTCIndex(currentTCIndex + 1);
      return;
    }

    onNext();
  };

  if (!currentTC) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <AppHeader />
        <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />
        <main className="px-8 pt-12 pb-32 max-w-[1280px] mx-auto">
          <Card>
            <CardContent className="py-12 text-sm text-muted-foreground">
              No test cases selected yet. Choose one or more TCs in the previous step.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isLastTC = currentTCIndex === selectedDefinitions.length - 1;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-32 max-w-[1280px] mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">TC detail inputs</h1>
          <p className="text-sm text-muted-foreground">
            Additional inputs now follow the mapping document instead of local hardcoding.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {selectedDefinitions.map((tc, index) => {
              const state = tcDetails[tc.id];

              return (
                <button
                  key={tc.id}
                  onClick={() => setCurrentTCIndex(index)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap",
                    currentTCIndex === index ? "border-primary bg-blue-50" : "border-border bg-card hover:border-gray-400",
                  )}
                >
                  {state?.completed ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn("font-mono font-semibold", currentTCIndex === index ? "text-primary" : "text-foreground")}>
                    {tc.id}
                  </span>
                  <span className="text-sm text-muted-foreground">{tc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {currentTC.id} - {currentTC.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{currentTC.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Target value <span className="text-red-600">*</span>
                </Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={currentTC.targetValue}
                    onChange={(e) => updateCurrentTC("targetValue", e.target.value)}
                    placeholder="95"
                    className="flex-1"
                  />
                  <Select
                    value={currentTC.targetCondition}
                    onValueChange={(value) => updateCurrentTC("targetCondition", value)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="within">Within</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-16 px-3 py-2 border border-border rounded-md bg-muted text-center font-mono text-sm flex items-center justify-center">
                    %
                  </div>
                </div>
              </div>

              {currentTC.id === "TC5" && (
                <div className="space-y-2">
                  <Label>
                    Beta value <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={currentTC.beta}
                    onChange={(e) => updateCurrentTC("beta", e.target.value)}
                    placeholder="1.0"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    The mapping document marks `beta` as required for `TC5` across all classifier types.
                  </p>
                </div>
              )}

              {selectionNeedsField(resolvedTaskType, [currentTC.id], "positiveClass") && (
                <div className="space-y-2">
                  <Label>
                    Positive class value <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={currentTC.positiveClass}
                    onChange={(e) => updateCurrentTC("positiveClass", e.target.value)}
                    placeholder="Example: 1, defect, positive"
                    className="max-w-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    For binary evaluation, the document requires a positive class on `TC2`, `TC3`, `TC4`,
                    `TC5`, `TC7`, `TC8`, `TC9`, `TC10`, and `TC22`.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5">
              <button
                type="button"
                onClick={() => setEnvExpanded(!envExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  {envExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">Test environment (optional)</span>
                </div>
              </button>

              {envExpanded && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="envOS">OS</Label>
                      <Input id="envOS" value={env.os} onChange={(e) => setEnv((prev) => ({ ...prev, os: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="envCPU">CPU</Label>
                      <Input id="envCPU" value={env.cpu} onChange={(e) => setEnv((prev) => ({ ...prev, cpu: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="envGPU">GPU</Label>
                      <Input id="envGPU" value={env.gpu} onChange={(e) => setEnv((prev) => ({ ...prev, gpu: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="envMemory">Memory</Label>
                      <Input id="envMemory" value={env.memory} onChange={(e) => setEnv((prev) => ({ ...prev, memory: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="envSoftware">Software stack</Label>
                    <Input
                      id="envSoftware"
                      value={env.software}
                      onChange={(e) => setEnv((prev) => ({ ...prev, software: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-card border-t border-border flex items-center justify-between px-8 z-10">
        <Button variant="outline" onClick={handlePreviousTC}>
          {currentTCIndex === 0 ? "Previous step" : "Previous TC"}
        </Button>
        <Button onClick={handleNextTC} disabled={!isCurrentTCValid()}>
          {isLastTC ? "Finish" : "Next TC"}
        </Button>
      </div>
    </div>
  );
}
