import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "./ui/utils";

interface DataValidationProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ValidationItem {
  name: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export function DataValidation({ currentStep, completedSteps, onStepClick, onNext, onPrevious }: DataValidationProps) {
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);

  const validationItems: ValidationItem[] = [
    {
      name: "필수 컬럼 존재 확인",
      status: "pass",
      detail: "y_true, y_pred, prob_class_* 모두 존재합니다.",
    },
    {
      name: "ID 중복 검사",
      status: "pass",
      detail: "200개 샘플 모두 고유한 ID를 가지고 있습니다.",
    },
    {
      name: "누락값(NaN) 검사",
      status: "pass",
      detail: "모든 필수 컬럼에 누락값이 없습니다.",
    },
    {
      name: "확률값 범위 검사",
      status: "pass",
      detail: "모든 확률값이 0~1 범위 안에 있습니다.",
    },
    {
      name: "확률 합 검사",
      status: "pass",
      detail: "각 샘플의 prob_class_* 합이 1.0 ± 0.001 범위입니다.",
    },
    {
      name: "클래스 일치성 검사",
      status: "pass",
      detail: "y_pred의 모든 클래스가 y_true에 존재합니다.",
    },
    {
      name: "샘플 수 적정성",
      status: "warning",
      detail: "샘플 200개는 최소 권장치입니다. 신뢰성 향상을 위해 500개 이상을 권장합니다.",
    },
  ];

  const totalItems = validationItems.length;
  const passedItems = validationItems.filter((item) => item.status === "pass").length;
  const warningItems = validationItems.filter((item) => item.status === "warning").length;
  const failedItems = validationItems.filter((item) => item.status === "fail").length;

  const hasWarnings = warningItems > 0;
  const hasFailed = failedItems > 0;
  const canProceed = !hasFailed && (!hasWarnings || acknowledgeWarning);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">데이터 검증</h1>
          <p className="text-sm text-muted-foreground">
            업로드된 데이터와 모든 설정을 최종 검증합니다. 문제가 없다면 평가를 진행할 수 있습니다.
          </p>
        </div>

        <div className="space-y-6">
          {/* Success Alert */}
          {!hasFailed && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <div className="text-lg font-semibold text-green-700 mb-1">검증 성공</div>
                <AlertDescription className="text-green-700">
                  모든 검사를 통과했습니다. 평가를 진행할 수 있습니다.
                </AlertDescription>
              </div>
              <div className="text-xs text-green-600">
                2026년 4월 22일 15:34 검증 완료
              </div>
            </Alert>
          )}

          {/* Validation Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">검증 결과 요약</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                총 {totalItems}개 항목을 검사하여 {passedItems}개 통과했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    총 샘플 수
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">200</div>
                  <div className="text-xs text-muted-foreground">개</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    감지된 컬럼
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">7</div>
                  <div className="text-xs text-muted-foreground">개</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    통과 항목
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">
                    {passedItems}/{totalItems}
                  </div>
                  <div className="text-xs text-muted-foreground">항목</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    경고 항목
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-yellow-600">
                    {warningItems}
                  </div>
                  <div className="text-xs text-muted-foreground">항목</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Validation Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">상세 검증 결과</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                각 검증 항목의 결과를 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        검증 항목
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs w-[120px]">
                        상태
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        상세 내용
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationItems.map((item, index) => (
                      <TableRow
                        key={index}
                        className={cn(
                          "hover:bg-muted/50",
                          item.status === "warning" && "bg-yellow-50/30"
                        )}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.status === "pass" && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              통과
                            </Badge>
                          )}
                          {item.status === "warning" && (
                            <Badge variant="outline" className="border-yellow-600 text-yellow-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              경고
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Settings Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">평가 설정 요약</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                진행하기 전 입력한 모든 설정을 최종 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">기본 정보</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">회사명:</span>{" "}
                    <span className="font-medium">서울과학기술대학교</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">대상 모델:</span>{" "}
                    <span className="font-medium">Transformer (run1, v.2026)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">시험결과서 용도:</span>{" "}
                    <span className="font-medium">외부 제출용</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">평가 유형:</span>{" "}
                    <span className="font-medium">multiclass</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Section 2: Test Items */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">시험항목 (10개 선택됨)</h4>
                <div className="flex flex-wrap gap-2">
                  {["TC1 Accuracy", "TC2 Precision", "TC3 Recall", "TC4 F1", "TC5 Fβ (β=1.0)",
                    "TC11 Macro", "TC12 Micro", "TC13 Weighted", "TC21 Confusion", "TC22 Class별"].map((tc) => (
                    <Badge key={tc} variant="secondary" className="font-mono text-xs">
                      {tc}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Section 3: Data Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">데이터 및 예측 설정</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">업로드 파일:</span>{" "}
                    <span className="font-medium">multiclass_200.csv (5.57 KB)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">총 샘플 수:</span>{" "}
                    <span className="font-medium">200개</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">클래스:</span>{" "}
                    <span className="font-medium">cat (74), dog (69), bird (57)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">예측 방식:</span>{" "}
                    <span className="font-medium">확률값 기반 자동 판정 (argmax)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Threshold:</span>{" "}
                    <span className="font-medium">사용 안 함</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Acknowledgment */}
          {hasWarnings && (
            <Alert className="border-yellow-600 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-700" />
              <div className="flex-1">
                <div className="text-base font-semibold text-yellow-800 mb-1">
                  진행 전 확인해주세요 ({warningItems}개 경고)
                </div>
                <AlertDescription className="text-yellow-800 mb-3">
                  샘플 수가 적어 평가 결과의 신뢰도가 제한적일 수 있습니다.
                  그래도 진행하시려면 '시험성적서 생성'을 클릭하세요.
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledgeWarning}
                    onCheckedChange={(checked) => setAcknowledgeWarning(checked as boolean)}
                  />
                  <label
                    htmlFor="acknowledge"
                    className="text-sm font-medium text-yellow-800 cursor-pointer"
                  >
                    확인했습니다. 경고에도 불구하고 진행합니다.
                  </label>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </main>

      <ActionBar
        showPrevious={true}
        onPrevious={onPrevious}
        showNext={true}
        onNext={onNext}
        nextDisabled={!canProceed}
        nextLabel="다음 단계"
      />
    </div>
  );
}
