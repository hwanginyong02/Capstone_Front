import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "./ui/utils";

interface ColumnMapping {
  originalName: string;
  sampleValues: string;
  inferredRole: string;
  modified: boolean;
}

const roleOptions = [
  { value: "id", label: "id" },
  { value: "y_true", label: "y_true" },
  { value: "y_pred", label: "y_pred" },
  { value: "score", label: "score" },
  { value: "prob_class_*", label: "prob_class_*" },
  { value: "ignore", label: "ignore" },
];

const roleDescriptions = [
  { role: "id", description: "각 샘플을 고유하게 식별하는 컬럼" },
  { role: "y_true", description: "실제 정답 레이블" },
  { role: "y_pred", description: "모델의 예측 레이블" },
  { role: "score", description: "이진 분류의 양성 클래스 확률값" },
  { role: "prob_class_*", description: "다중 클래스의 클래스별 확률값" },
  { role: "ignore", description: "평가에 사용하지 않는 컬럼" },
];

interface ColumnMappingProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ColumnMapping({ currentStep, completedSteps, onStepClick, onNext, onPrevious }: ColumnMappingProps) {
  // In real app, taskType comes from Step 1
  const taskType = "multiclass";

  const [mappings, setMappings] = useState<ColumnMapping[]>([
    { originalName: "sample_id", sampleValues: "S001, S002, S003", inferredRole: "id", modified: false },
    { originalName: "정답값", sampleValues: "cat, dog, bird", inferredRole: "y_true", modified: false },
    { originalName: "예측값", sampleValues: "cat, cat, dog", inferredRole: "y_pred", modified: false },
    { originalName: "p_cat", sampleValues: "0.92, 0.10, 0.08", inferredRole: "prob_class_*", modified: false },
    { originalName: "p_dog", sampleValues: "0.05, 0.62, 0.86", inferredRole: "prob_class_*", modified: false },
    { originalName: "p_bird", sampleValues: "0.03, 0.28, 0.06", inferredRole: "prob_class_*", modified: false },
    { originalName: "메모", sampleValues: "test, final, v2", inferredRole: "ignore", modified: false },
  ]);

  const [positiveClass, setPositiveClass] = useState("cat");
  const [threshold, setThreshold] = useState(0.5);

  const handleRoleChange = (index: number, newRole: string) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, inferredRole: newRole, modified: true } : m
      )
    );
  };

  // Check for duplicate roles
  const getDuplicateRoles = () => {
    const roleCounts: Record<string, number> = {};
    mappings.forEach((m) => {
      if (m.inferredRole !== "ignore" && m.inferredRole !== "prob_class_*") {
        roleCounts[m.inferredRole] = (roleCounts[m.inferredRole] || 0) + 1;
      }
    });
    return Object.keys(roleCounts).filter((role) => roleCounts[role] > 1);
  };

  const duplicateRoles = getDuplicateRoles();

  // Calculate summary stats
  const totalColumns = mappings.length;
  const mappedColumns = mappings.filter((m) => m.inferredRole !== "ignore").length;
  const ignoredColumns = mappings.filter((m) => m.inferredRole === "ignore").length;

  // Check required columns and mappings
  const hasYTrue = mappings.some((m) => m.inferredRole === "y_true");
  const hasYPred = mappings.some((m) => m.inferredRole === "y_pred");
  const hasScore = mappings.some((m) => m.inferredRole === "score");
  const hasProbClass = mappings.some((m) => m.inferredRole === "prob_class_*");

  // Determine if additional config is needed
  const needsPositiveClass = taskType === "binary" && hasYTrue;
  const needsThreshold =
    (taskType === "binary" && hasScore && !hasYPred) ||
    (taskType === "multilabel" && mappings.some((m) => m.inferredRole === "prob_label_*") && !hasYPred);

  const isValid = hasYTrue && (hasYPred || hasScore || hasProbClass) && duplicateRoles.length === 0;

  const missingRequired: string[] = [];
  if (!hasYTrue) missingRequired.push("y_true");
  if (!hasYPred && !hasScore && !hasProbClass) {
    missingRequired.push("y_pred 또는 확률 컬럼");
  }

  // Detected classes from y_true sample values (simplified)
  const detectedClasses = ["cat", "dog", "bird"];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">컬럼 매핑 확인</h1>
          <p className="text-sm text-muted-foreground">
            업로드한 파일의 컬럼을 시스템이 자동으로 인식했습니다. 잘못 매핑된 항목이 있다면 수정해주세요.
          </p>
        </div>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              AI가 데이터 샘플을 분석하여 각 컬럼의 역할을 자동으로 추론했습니다. 아래 매핑을 검토하고 필요시 수정해주세요.
            </AlertDescription>
          </Alert>

          {/* Mapping Table Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">자동 매핑 결과</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                평가 유형: multiclass · 총 {totalColumns}개 컬럼 감지됨
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        원본 컬럼명
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        샘플 값 미리보기
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        추론된 역할
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs w-24">
                        수정
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping, index) => {
                      const hasDuplicateRole =
                        duplicateRoles.includes(mapping.inferredRole) &&
                        mapping.inferredRole !== "ignore" &&
                        mapping.inferredRole !== "prob_class_*";
                      const isIgnored = mapping.inferredRole === "ignore";

                      return (
                        <TableRow
                          key={index}
                          className={cn(
                            "hover:bg-muted/50",
                            isIgnored && "text-muted-foreground"
                          )}
                        >
                          <TableCell className="font-mono text-sm">
                            {mapping.originalName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {mapping.sampleValues}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={mapping.inferredRole}
                              onValueChange={(value) => handleRoleChange(index, value)}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  hasDuplicateRole && "border-destructive"
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {hasDuplicateRole && (
                              <p className="text-xs text-destructive mt-1">
                                {mapping.inferredRole}는 하나의 컬럼에만 지정할 수 있습니다
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {mapping.modified && (
                              <Badge variant="secondary" className="text-xs">
                                수정됨
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mapping Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">매핑 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    감지된 컬럼
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {totalColumns}개
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    매핑 완료
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {mappedColumns}개
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    무시됨(ignore)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {ignoredColumns}개
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    상태
                  </div>
                  <div>
                    {isValid ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        정상
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        오류
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isValid && missingRequired.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    필수 컬럼이 누락되었습니다: {missingRequired.join(", ")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Conditional: Positive Class Selection (Binary only) */}
          {needsPositiveClass && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Positive Class 지정</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Binary 분류에서 "양성" 클래스를 선택하세요. Precision, Recall 등이 이 클래스 기준으로 계산됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={positiveClass} onValueChange={setPositiveClass}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {detectedClasses.map((cls) => (
                      <label
                        key={cls}
                        htmlFor={`class-${cls}`}
                        className={cn(
                          "flex flex-col p-5 rounded-lg border-2 cursor-pointer transition-colors",
                          positiveClass === cls
                            ? "border-primary bg-blue-50"
                            : "border-border bg-card hover:border-gray-400"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value={cls} id={`class-${cls}`} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold font-mono mb-1">{cls}</div>
                            <div className="text-xs text-muted-foreground">74개 샘플</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Conditional: Threshold Setting */}
          {needsThreshold && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Threshold 설정</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  확률값을 하드 레이블로 변환할 임계값을 설정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="threshold">임계값</Label>
                    <span className="text-sm font-mono tabular-nums text-muted-foreground">
                      {threshold.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="threshold"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[threshold]}
                    onValueChange={(values) => setThreshold(values[0])}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="max-w-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {taskType === "binary"
                    ? "score가 이 값 이상이면 양성으로 판정합니다."
                    : "각 레이블의 확률이 이 값 이상이면 해당 레이블을 예측합니다."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Help Accordion */}
          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="help" className="border-none">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <span className="text-lg font-semibold">역할 설명</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-3">
                    {roleDescriptions.map((item) => (
                      <div key={item.role} className="flex gap-3">
                        <span className="font-mono text-sm font-medium min-w-[120px]">
                          {item.role}:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <ActionBar
        showPrevious={true}
        onPrevious={onPrevious}
        onNext={onNext}
        nextDisabled={!isValid}
      />
    </div>
  );
}
