import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Info, Check, X as XIcon } from "lucide-react";
import { cn } from "../ui/utils";

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
          <h1 className="text-2xl font-bold text-foreground mb-2">?대옒??媛먯?</h1>
          <p className="text-sm text-muted-foreground">
            ?낅줈?쒕맂 ?곗씠?곗쓽 y_true 而щ읆?먯꽌 ?대옒?ㅻ? ?먮룞?쇰줈 媛먯??덉뒿?덈떎. ?뺤씤 ???꾩슂???섏젙?댁＜?몄슂.
          </p>
        </div>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              媛먯????대옒?ㅻ뒗 y_true 而щ읆??怨좎쑀媛믪뿉??異붿텧?섏뿀?듬땲?? ?됯? 寃곌낵???ш린 ?쒖떆???대옒??湲곗??쇰줈 怨꾩궛?⑸땲??
            </AlertDescription>
          </Alert>

          {/* Detected Classes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">媛먯????대옒??/CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                ?됯? ?좏삎: multiclass 쨌 珥?{classCount}媛??대옒??쨌 ?섑뵆 ?? {totalSamples}媛?              </CardDescription>
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
                    <span className="mx-1.5">쨌</span>
                    <span className="font-mono tabular-nums">{cls.count}媛?/span>
                    <span className="mx-1.5">쨌</span>
                    <span className="font-mono tabular-nums">{cls.percentage.toFixed(1)}%</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Distribution Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">?대옒??遺꾪룷</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                ?곗씠?곗뀑 ???대옒?ㅻ퀎 鍮꾩쑉???뺤씤?섏꽭??
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
                      {cls.count}媛?쨌 {cls.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="pt-6 border-t border-border">
                <div className="flex gap-6 flex-wrap">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      ?꾩껜 ?섑뵆
                    </div>
                    <div className="text-base font-semibold">{totalSamples}媛?/div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      ?대옒????                    </div>
                    <div className="text-base font-semibold">{classCount}媛?/div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      遺덇퇏??鍮꾩쑉
                    </div>
                    <div className="text-base font-semibold">{imbalanceRatio}:1</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
                      洹좏삎 ?곹깭
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      ?묓샇
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
                  <span className="text-lg font-semibold">?대옒?ㅻ퀎 ?곸꽭 ?뺣낫</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                            ?대옒?ㅻ챸
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                            ?섑뵆 ??                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">
                            鍮꾩쑉
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs text-center">
                            y_pred?먯꽌 ?ъ슜
                          </TableHead>
                          <TableHead className="font-medium text-muted-foreground uppercase text-xs">
                            ?곹깭
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
                              <Badge variant="secondary">?뺤긽</Badge>
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

