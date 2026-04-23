import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "./ui/utils";
import { Info } from "lucide-react";
import {
  getAvailableTestCases,
  getRecommendedTestCaseIds,
  TASK_TYPE_LABELS,
  type TaskType,
} from "../config/evaluationConfig";

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
  const [betaValue, setBetaValue] = useState("1.0");

  useEffect(() => {
    setSelectedTCs([]);
    onSelectedTCsChange?.([]);
  }, [taskType, onSelectedTCsChange]);

  const selectedCount = selectedTCs.length;
  const totalCount = availableTCs.length;
  const isTc5Selected = selectedTCs.includes("TC5");

  const handleToggleTC = (tcId: string) => {
    setSelectedTCs((prev) => {
      const next = prev.includes(tcId) ? prev.filter((id) => id !== tcId) : [...prev, tcId];
      onSelectedTCsChange?.(next);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = availableTCs.map((tc) => tc.id);
    setSelectedTCs(all);
    onSelectedTCsChange?.(all);
  };

  const handleClearAll = () => {
    setSelectedTCs([]);
    onSelectedTCsChange?.([]);
  };

  const handleRecommended = () => {
    const recommended = getRecommendedTestCaseIds(taskType);
    setSelectedTCs(recommended);
    onSelectedTCsChange?.(recommended);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Test item selection</h1>
          <p className="text-sm text-muted-foreground">
            The available TCs change based on the classifier selected in Step 1.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">{selectedCount}</span> selected /{" "}
              <span className="font-semibold">{totalCount}</span> available
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRecommended} disabled={!taskType}>
                Recommended
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!taskType}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear
              </Button>
            </div>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Selected classifier: </span>
            <Badge variant="secondary">
              {taskType ? TASK_TYPE_LABELS[taskType] : "Choose in Step 1"}
            </Badge>
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
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleTC(tc.id)}
                        className="mt-0.5"
                      />
                      {tc.additionalFields?.includes("beta") && (
                        <Badge variant="outline" className="ml-auto text-xs border-yellow-600 text-yellow-700">
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

          {isTc5Selected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">F-beta Score 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    beta는 F-beta Score 계산에 사용되는 가중치 파라미터입니다. Precision과 Recall의 중요도
                    비율을 조절하며, beta가 클수록 Recall을 더 중요하게 봅니다.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  beta값을 입력하세요. beta=1이면 F1과 동일하고, beta&gt;1이면 Recall 중심,
                  beta&lt;1이면 Precision 중심입니다.
                </p>

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="betaValue">beta값</Label>
                  <Input
                    id="betaValue"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={betaValue}
                    onChange={(e) => setBetaValue(e.target.value)}
                    placeholder="1.0"
                  />
                  <p className="text-xs text-muted-foreground">권장 범위: 0.5 ~ 2.0</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Document-driven rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>`TC5` always requires `beta` input.</div>
              <div>
                For `binary`, `TC2`, `TC3`, `TC4`, `TC5`, `TC7`, `TC8`, `TC9`, `TC10`, and `TC22`
                require a positive class definition.
              </div>
              <div>
                Probability columns are conditionally required by task type and selected TC set, so
                the upload step will adjust automatically.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <ActionBar
        showPrevious={true}
        onPrevious={onPrevious}
        onNext={onNext}
        nextDisabled={selectedCount === 0}
      />
    </div>
  );
}
