import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "./ui/utils";

interface PredictionSettingProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function PredictionSetting({ currentStep, completedSteps, onStepClick, onNext, onPrevious }: PredictionSettingProps) {
  const [predictionMode, setPredictionMode] = useState("prob");
  const [useThreshold, setUseThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0.5);
  const [betaValue, setBetaValue] = useState(1.0);

  const previewData = [
    { id: "S001", prob_cat: 0.92, prob_dog: 0.05, prob_bird: 0.03, result: "cat" },
    { id: "S002", prob_cat: 0.10, prob_dog: 0.62, prob_bird: 0.28, result: "dog" },
    { id: "S003", prob_cat: 0.08, prob_dog: 0.86, prob_bird: 0.06, result: "dog" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">예측 설정</h1>
          <p className="text-sm text-muted-foreground">
            모델의 예측값을 어떻게 해석할지 설정합니다. 업로드된 데이터에 포함된 정보에 따라 옵션이 달라집니다.
          </p>
        </div>

        <div className="space-y-6">
          {/* Data Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">업로드된 데이터 정보</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Step 4에서 매핑된 결과를 기반으로 사용 가능한 옵션을 표시합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">y_pred (예측 레이블) 포함:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      있음
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">prob_class_* (확률) 포함:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      있음
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm">
                    <span className="text-muted-foreground">감지된 클래스:</span>{" "}
                    <span className="font-semibold">3개</span>
                    <span className="text-muted-foreground ml-1">(cat, dog, bird)</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">총 샘플 수:</span>{" "}
                    <span className="font-semibold">200개</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prediction Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">예측값 입력 방식</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                모델의 예측 결과를 어떤 방식으로 해석할지 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={predictionMode} onValueChange={setPredictionMode}>
                <div className="space-y-3">
                  {/* Option 1: Direct y_pred */}
                  <label
                    htmlFor="mode-direct"
                    className={cn(
                      "flex gap-4 p-5 rounded-lg border-2 cursor-pointer transition-colors",
                      predictionMode === "direct"
                        ? "border-primary bg-blue-50"
                        : "border-border bg-card hover:border-gray-400"
                    )}
                  >
                    <RadioGroupItem value="direct" id="mode-direct" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold">y_pred 컬럼을 그대로 사용</div>
                      <div className="text-xs text-muted-foreground">
                        데이터에 이미 포함된 예측 레이블(y_pred)을 그대로 사용합니다.
                        threshold 설정이 필요 없습니다.
                      </div>
                      <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                        예: y_pred=cat → 예측: cat
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Probability-based */}
                  <label
                    htmlFor="mode-prob"
                    className={cn(
                      "flex gap-4 p-5 rounded-lg border-2 cursor-pointer transition-colors",
                      predictionMode === "prob"
                        ? "border-primary bg-blue-50"
                        : "border-border bg-card hover:border-gray-400"
                    )}
                  >
                    <RadioGroupItem value="prob" id="mode-prob" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold">확률값 기반으로 자동 판정</div>
                      <div className="text-xs text-muted-foreground">
                        각 클래스의 확률 중 가장 높은 값을 예측으로 사용합니다 (argmax).
                      </div>
                      <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                        예: prob_cat=0.92, prob_dog=0.05, prob_bird=0.03 → 예측: cat
                      </div>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Conditional Threshold Settings */}
          {predictionMode === "prob" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">판정 임계값 (Threshold) 설정</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  확률 기반 판정에 적용할 임계값을 설정하세요. multiclass에서는 argmax가 기본이지만, 최소 확신도 임계값을 설정할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use-threshold">최소 임계값 사용</Label>
                    <Badge variant="outline" className="text-xs">선택사항</Badge>
                  </div>
                  <Switch
                    id="use-threshold"
                    checked={useThreshold}
                    onCheckedChange={setUseThreshold}
                  />
                </div>

                {useThreshold && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="threshold">임계값</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(parseFloat(e.target.value))}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        가장 높은 확률이 이 값보다 낮으면 '판정 불가'로 처리됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TC Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">시험항목 추가 설정</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                선택한 시험항목 중 일부는 추가 입력이 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="font-mono">TC5</Badge>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Fβ Score</div>
                    <div className="text-xs text-muted-foreground">
                      β값에 따라 Precision/Recall 중요도가 달라집니다
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beta-value" className="text-xs">β값</Label>
                    <Input
                      id="beta-value"
                      type="number"
                      placeholder="1.0"
                      value={betaValue}
                      onChange={(e) => setBetaValue(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      β=1: F1 동일 / β&gt;1: Recall 중시 / β&lt;1: Precision 중시
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">예측 판정 미리보기</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                설정한 방식으로 상위 3개 샘플에 대한 판정 결과를 미리 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">id</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">prob_cat</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">prob_dog</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">prob_bird</TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">판정 결과</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono">{row.id}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono tabular-nums",
                          row.result === "cat" && "bg-blue-50 font-semibold"
                        )}>
                          {row.prob_cat.toFixed(2)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono tabular-nums",
                          row.result === "dog" && "bg-blue-50 font-semibold"
                        )}>
                          {row.prob_dog.toFixed(2)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono tabular-nums",
                          row.result === "bird" && "bg-blue-50 font-semibold"
                        )}>
                          {row.prob_bird.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-medium">{row.result}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} />
    </div>
  );
}
