import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Info, AlertTriangle, Download, ChevronLeft } from "lucide-react";
import { cn } from "./ui/utils";

interface ResultPreviewProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ResultPreview({ currentStep, completedSteps, onStepClick, onPrevious }: ResultPreviewProps) {
  const confusionMatrix = [
    [59, 10, 5],
    [8, 55, 6],
    [7, 4, 46],
  ];

  const classes = ["cat", "dog", "bird"];

  const classMetrics = [
    { class: "cat", precision: 0.7973, recall: 0.7973, f1: 0.7973, specificity: 0.8810, support: 74 },
    { class: "dog", precision: 0.7971, recall: 0.7971, f1: 0.7971, specificity: 0.8947, support: 69 },
    { class: "bird", precision: 0.8070, recall: 0.8070, f1: 0.8070, specificity: 0.9301, support: 57 },
  ];

  const distributionData = [
    { class: "cat", actual: 74, predicted: 74, actualPct: 37.0, predictedPct: 37.0 },
    { class: "dog", actual: 69, predicted: 70, actualPct: 34.5, predictedPct: 35.0 },
    { class: "bird", actual: 57, predicted: 56, actualPct: 28.5, predictedPct: 28.0 },
  ];

  const topMisclassifications = [
    { from: "cat", to: "dog", count: 10 },
    { from: "cat", to: "bird", count: 8 },
    { from: "dog", to: "cat", count: 7 },
    { from: "bird", to: "dog", count: 6 },
    { from: "bird", to: "cat", count: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-24 max-w-[1344px] mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">평가 결과 미리보기</h1>
            <p className="text-sm text-muted-foreground">
              실제 데이터 기반으로 계산된 평가 결과입니다. 검토 후 시험성적서를 생성하세요.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge variant="secondary" className="font-mono">Transformer · v.2026</Badge>
            <Badge variant="secondary" className="font-mono tabular-nums">200 samples</Badge>
            <Badge variant="secondary" className="font-mono">2026-04-22 15:34</Badge>
          </div>
        </div>

        <div className="space-y-10">
          {/* Top Metrics */}
          <Card>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 divide-x divide-border">
                <div className="space-y-2 px-4 first:pl-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    ACCURACY (TC1)
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums">0.8000</div>
                  <div className="text-xs text-muted-foreground">전체 정확도 · 160/200</div>
                </div>
                <div className="space-y-2 px-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    MACRO PRECISION (TC11)
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums">0.8024</div>
                  <div className="text-xs text-muted-foreground">클래스 평균 Precision</div>
                </div>
                <div className="space-y-2 px-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    MACRO RECALL (TC11)
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums">0.8000</div>
                  <div className="text-xs text-muted-foreground">클래스 평균 Recall</div>
                </div>
                <div className="space-y-2 px-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    MACRO F1 (TC11)
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums">0.8006</div>
                  <div className="text-xs text-muted-foreground">클래스 평균 F1</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Metrics */}
          <Card>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-x divide-border">
                <div className="space-y-2 px-4 first:pl-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    Fβ SCORE (TC5, β=1.0)
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums">0.8006</div>
                  <div className="text-xs text-muted-foreground">F-베타 점수</div>
                </div>
                <div className="space-y-2 px-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                    KL DIVERGENCE (TC6)
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums">0.3187</div>
                  <div className="text-xs text-muted-foreground">예측 확률 손실 (낮을수록 좋음)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aggregate Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">집계 메트릭 (TC11 / TC12 / TC13)</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Macro, Micro, Weighted 세 가지 평균 방식의 결과를 비교합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        평균 방법
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Precision
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Recall
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        F1 Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        Macro Average <span className="text-xs text-muted-foreground font-mono">TC11</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8024</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8000</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8006</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        Micro Average <span className="text-xs text-muted-foreground font-mono">TC12</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8000</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8000</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8000</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        Weighted Average <span className="text-xs text-muted-foreground font-mono">TC13</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8024</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8000</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">0.8006</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Confusion Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">혼동 행렬 (TC21)</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                실제 클래스와 예측 클래스의 교차표입니다. 대각선이 정확한 예측입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                {/* Confusion Matrix Table */}
                <div className="flex-[3]">
                  <div className="text-xs text-muted-foreground mb-2">↓ 실제 / 예측 →</div>
                  <div className="inline-block border border-border rounded-lg overflow-hidden">
                    <table className="border-collapse">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="w-16 h-12 border-r border-border" />
                          {classes.map((cls) => (
                            <th
                              key={cls}
                              className="w-20 h-12 text-center font-mono text-xs border-r border-border last:border-r-0"
                            >
                              {cls}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classes.map((rowClass, i) => (
                          <tr key={rowClass} className="border-t border-border">
                            <td className="w-16 h-16 text-right pr-3 font-mono text-xs bg-muted/40 border-r border-border">
                              {rowClass}
                            </td>
                            {confusionMatrix[i].map((value, j) => (
                              <td
                                key={j}
                                className={cn(
                                  "w-20 h-16 text-center font-mono tabular-nums border-r border-border last:border-r-0",
                                  i === j
                                    ? "bg-green-50 text-green-700 font-semibold text-lg"
                                    : "bg-muted/30"
                                )}
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Misclassifications */}
                <div className="flex-[2]">
                  <h4 className="text-base font-semibold mb-3">주요 오분류 Top 5</h4>
                  <div className="space-y-2">
                    {topMisclassifications.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted/50 rounded-md p-3"
                      >
                        <div className="font-medium text-sm">
                          실제 {item.from} → 예측 {item.to}
                        </div>
                        <div className="font-mono tabular-nums font-semibold text-sm">
                          {item.count}건
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class-wise Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">클래스별 상세 메트릭 (TC22)</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                각 클래스별 Precision, Recall, F1, Specificity 및 Support를 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        클래스
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Precision
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Recall
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        F1 Score
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Specificity
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        Support
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classMetrics.map((row) => (
                      <TableRow key={row.class} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{row.class}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.precision.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.recall.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.f1.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.specificity.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.support}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">클래스 분포 비교 (TC14 / TC23)</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                실제 분포와 예측 분포를 비교하여 모델의 편향을 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary">불균형 비율 1.30:1</Badge>
                <Badge variant="secondary">분포 차이 KL=0.012</Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  양호
                </Badge>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                        클래스
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        실제 수
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        예측 수
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        실제 비율
                      </TableHead>
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                        예측 비율
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributionData.map((row) => (
                      <TableRow key={row.class} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{row.class}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{row.actual}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{row.predicted}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.actualPct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {row.predictedPct.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Auto Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">자동 인사이트 및 이상 탐지</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                평가 결과를 자동 분석한 주요 관찰 사항입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription>
                  전체 정확도 80%는 무작위 추측 기준선(33.3%) 대비 유의미하게 우수합니다.
                </AlertDescription>
              </Alert>
              <Alert className="border-yellow-600 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-700" />
                <AlertDescription className="text-yellow-800">
                  cat 클래스에서 dog로의 오분류가 10건으로 가장 많습니다. 특징 간 혼동 가능성을 검토하세요.
                </AlertDescription>
              </Alert>
              <Alert>
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription>
                  Macro와 Micro 평균이 거의 동일합니다. 클래스 간 성능 편차가 적다는 의미입니다.
                </AlertDescription>
              </Alert>
              <Alert className="border-yellow-600 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-700" />
                <AlertDescription className="text-yellow-800">
                  샘플 수 200개는 최소 권장치입니다. 500개 이상에서 평가 신뢰도가 크게 향상됩니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Custom Action Bar for Step 8 */}
      <div className="h-18 border-t border-border bg-background sticky bottom-0 z-40">
        <div className="h-full px-8 py-4 flex items-center justify-between max-w-[1344px] mx-auto">
          <Button variant="outline" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            설정 수정
          </Button>

          <div className="flex gap-2">
            <Button variant="outline">결과 내보내기 (JSON)</Button>
            <Button className="px-6 py-3">
              <Download className="h-4 w-4 mr-2" />
              시험성적서 생성 (PDF)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
