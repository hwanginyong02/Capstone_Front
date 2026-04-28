import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";
import {
  getAvailableTestCases,
  getRecommendedTestCaseIds,
  TASK_TYPE_LABELS,
  type TaskType,
} from "../../data/evaluationData";

interface TestItemsProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  taskType?: TaskType | "";
  onSelectedTCsChange?: (ids: string[]) => void;
}

export function TestItems({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious,
  taskType,
  onSelectedTCsChange,
}: TestItemsProps) {
  const availableTCs = useMemo(() => getAvailableTestCases(taskType), [taskType]);
  const [selectedTCs, setSelectedTCs] = useState<string[]>([]);

  useEffect(() => {
    setSelectedTCs([]);
    onSelectedTCsChange?.([]);
  }, [taskType, onSelectedTCsChange]);

  const handleToggleTC = (tcId: string) => {
    setSelectedTCs((prev) => {
      const next = prev.includes(tcId) ? prev.filter((id) => id !== tcId) : [...prev, tcId];
      onSelectedTCsChange?.(next);
      return next;
    });
  };

  const handleRecommended = () => {
    const recommended = getRecommendedTestCaseIds(taskType);
    setSelectedTCs(recommended);
    onSelectedTCsChange?.(recommended);
  };

  const handleSelectAll = () => {
    const next = availableTCs.map((tc) => tc.id);
    setSelectedTCs(next);
    onSelectedTCsChange?.(next);
  };

  const handleClear = () => {
    setSelectedTCs([]);
    onSelectedTCsChange?.([]);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Test item selection</h1>
          <p className="text-sm text-muted-foreground">
            Choose the evaluation metrics that should be included in the report.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{selectedTCs.length}</span> selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRecommended} disabled={!taskType}>
              Recommended
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!taskType}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Classifier: </span>
          <Badge variant="secondary">{taskType ? TASK_TYPE_LABELS[taskType] : "Choose in Step 1"}</Badge>
        </div>

        {!taskType ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Choose a classifier type in Step 1 before selecting test cases.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {availableTCs.map((tc) => {
              const isSelected = selectedTCs.includes(tc.id);

              return (
                <label
                  key={tc.id}
                  className={cn(
                    "relative flex flex-col p-5 rounded-lg border-2 cursor-pointer transition-colors min-h-[180px]",
                    isSelected ? "border-primary bg-blue-50" : "border-border bg-card hover:border-gray-400",
                  )}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => handleToggleTC(tc.id)} className="mt-0.5" />
                    {tc.additionalFields?.includes("beta") && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        beta
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="font-mono text-xs uppercase font-medium text-muted-foreground">{tc.id}</div>
                    <h3 className="text-base font-semibold leading-tight">{tc.name}</h3>
                    <div className="text-sm text-foreground">{tc.subtitle}</div>
                    <p className="text-xs text-[#6B7280] leading-[1.5]">{tc.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {selectedTCs.includes("TC5") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">F-beta note</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p>`TC5` requires a beta value in the next step.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Selection rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>`TC5` requires beta input.</div>
            <div>Some binary metrics also require a positive class selection.</div>
            <div>Probability columns become required automatically for probability-based metrics.</div>
          </CardContent>
        </Card>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} nextDisabled={selectedTCs.length === 0} />
    </div>
  );
}
