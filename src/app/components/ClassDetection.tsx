import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Info, Check, X as XIcon } from "lucide-react";
import { cn } from "./ui/utils";

interface ClassDetectionProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ClassInfo {
  name: string;
  count: number;
  percentage: number;
  inYPred: boolean;
}

export function ClassDetection({ currentStep, completedSteps, onStepClick, onNext, onPrevious }: ClassDetectionProps) {
  const [classes] = useState<ClassInfo[]>([
    { name: "cat", count: 74, percentage: 37.0, inYPred: true },
    { name: "dog", count: 69, percentage: 34.5, inYPred: true },
    { name: "bird", count: 57, percentage: 28.5, inYPred: true },
  ]);

  const totalSamples = classes.reduce((sum, c) => sum + c.count, 0);
  const classCount = classes.length;
  const maxCount = Math.max(...classes.map((c) => c.count));
  const minCount = Math.min(...classes.map((c) => c.count));
  const imbalanceRatio = (maxCount / minCount).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">클래스 감지</h1>
          <p className="text-sm text-muted-foreground">
            업로드된 데이터의 y_true 컬럼에서 클래스를 자동으로 감지했습니다. 확인 후 필요시 수정해주세요.
          </p>
        </div>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              감지된 클래스는 y_true 컬럼의 고유값에서 추출되었습니다. 평가 결과는 여기 표시된 클래스 기준으로 계산됩니다.
            </AlertDescription>
          </Alert>

          {/* Detected Classes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">감지된 클래스</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                평가 유형: multiclass · 총 {classCount}개 클래스 · 샘플 수: {totalSamples}개
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => (
                  <Badge
                    key={cls.name}
                    variant="secondary"
                    className="py-1.5 px-3 text-sm group hover:pr-8 relative"
                  >
                    <span className="font-semibold">{cls.name}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono tabular-nums">{cls.count}개</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono tabular-nums">{cls.percentage.toFixed(1)}%</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Distribution Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">클래스 분포</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                데이터셋 내 클래스별 비율을 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bar Chart */}
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div key={cls.name} className="flex items-center gap-4">
                    <div className="w-[120px] text-sm font-medium">{cls.name}</div>
                    <div className="flex-1 bg-muted rounded-sm h-6 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-sm"
                        style={{ width: `${cls.percentage}%` }}
                      />
                    </div>
                    <div className="w-[120px] text-right text-sm font-mono tabular-nums">
                      {cls.count}개 · {cls.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="pt-6 border-t border-border">
                <div className="flex gap-6 flex-wrap">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      전체 샘플
                    </div>
                    <div className="text-base font-semibold">{totalSamples}개</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      클래스 수
                    </div>
                    <div className="text-base font-semibold">{classCount}개</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      불균형 비율
                    </div>
                    <div className="text-base font-semibold">{imbalanceRatio}:1</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      균형 상태
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      양호
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Details Accordion */}
          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <span className="text-lg font-semibold">클래스별 상세 정보</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                            클래스명
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                            샘플 수
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                            비율
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-center">
                            y_pred에서 사용
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                            상태
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map((cls) => (
                          <TableRow key={cls.name} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{cls.name}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {cls.count}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {cls.percentage.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {cls.inYPred ? (
                                <Check className="h-4 w-4 text-green-600 inline" />
                              ) : (
                                <XIcon className="h-4 w-4 text-red-600 inline" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">정상</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} onNext={onNext} />
    </div>
  );
}
