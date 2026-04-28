import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { ActionBar } from "./ActionBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../ui/utils";

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
          <h1 className="text-2xl font-bold text-foreground mb-2">?덉륫 ?ㅼ젙</h1>
          <p className="text-sm text-muted-foreground">
            紐⑤뜽???덉륫媛믪쓣 ?대뼸寃??댁꽍?좎? ?ㅼ젙?⑸땲?? ?낅줈?쒕맂 ?곗씠?곗뿉 ?ы븿???뺣낫???곕씪 ?듭뀡???щ씪吏묐땲??
          </p>
        </div>

        <div className="space-y-6">
          {/* Data Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">?낅줈?쒕맂 ?곗씠???뺣낫</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Step 4?먯꽌 留ㅽ븨??寃곌낵瑜?湲곕컲?쇰줈 ?ъ슜 媛?ν븳 ?듭뀡???쒖떆?⑸땲??
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">y_pred (?덉륫 ?덉씠釉? ?ы븿:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      ?덉쓬
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">prob_class_* (?뺣쪧) ?ы븿:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      ?덉쓬
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm">
                    <span className="text-muted-foreground">媛먯????대옒??</span>{" "}
                    <span className="font-semibold">3媛?/span>
                    <span className="text-muted-foreground ml-1">(cat, dog, bird)</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">珥??섑뵆 ??</span>{" "}
                    <span className="font-semibold">200媛?/span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prediction Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">?덉륫媛??낅젰 諛⑹떇</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                紐⑤뜽???덉륫 寃곌낵瑜??대뼡 諛⑹떇?쇰줈 ?댁꽍?좎? ?좏깮?섏꽭??
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
                      <div className="text-sm font-semibold">y_pred 而щ읆??洹몃?濡??ъ슜</div>
                      <div className="text-xs text-muted-foreground">
                        ?곗씠?곗뿉 ?대? ?ы븿???덉륫 ?덉씠釉?y_pred)??洹몃?濡??ъ슜?⑸땲??
                        threshold ?ㅼ젙???꾩슂 ?놁뒿?덈떎.
                      </div>
                      <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                        ?? y_pred=cat ???덉륫: cat
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
                      <div className="text-sm font-semibold">?뺣쪧媛?湲곕컲?쇰줈 ?먮룞 ?먯젙</div>
                      <div className="text-xs text-muted-foreground">
                        媛??대옒?ㅼ쓽 ?뺣쪧 以?媛???믪? 媛믪쓣 ?덉륫?쇰줈 ?ъ슜?⑸땲??(argmax).
                      </div>
                      <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                        ?? prob_cat=0.92, prob_dog=0.05, prob_bird=0.03 ???덉륫: cat
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
                <CardTitle className="text-lg font-semibold">?먯젙 ?꾧퀎媛?(Threshold) ?ㅼ젙</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  ?뺣쪧 湲곕컲 ?먯젙???곸슜???꾧퀎媛믪쓣 ?ㅼ젙?섏꽭?? multiclass?먯꽌??argmax媛 湲곕낯?댁?留? 理쒖냼 ?뺤떊???꾧퀎媛믪쓣 ?ㅼ젙?????덉뒿?덈떎.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use-threshold">理쒖냼 ?꾧퀎媛??ъ슜</Label>
                    <Badge variant="outline" className="text-xs">?좏깮?ы빆</Badge>
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
                      <Label htmlFor="threshold">?꾧퀎媛?/Label>
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
                        媛???믪? ?뺣쪧????媛믩낫????쑝硫?'?먯젙 遺덇?'濡?泥섎━?⑸땲??
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
              <CardTitle className="text-lg font-semibold">?쒗뿕??ぉ 異붽? ?ㅼ젙</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                ?좏깮???쒗뿕??ぉ 以??쇰???異붽? ?낅젰???꾩슂?⑸땲??
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="font-mono">TC5</Badge>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">F棺 Score</div>
                    <div className="text-xs text-muted-foreground">
                      棺媛믪뿉 ?곕씪 Precision/Recall 以묒슂?꾧? ?щ씪吏묐땲??                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beta-value" className="text-xs">棺媛?/Label>
                    <Input
                      id="beta-value"
                      type="number"
                      placeholder="1.0"
                      value={betaValue}
                      onChange={(e) => setBetaValue(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      棺=1: F1 ?숈씪 / 棺&gt;1: Recall 以묒떆 / 棺&lt;1: Precision 以묒떆
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">?덉륫 ?먯젙 誘몃━蹂닿린</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                ?ㅼ젙??諛⑹떇?쇰줈 ?곸쐞 3媛??섑뵆??????먯젙 寃곌낵瑜?誘몃━ ?뺤씤?섏꽭??
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
                      <TableHead className="font-medium text-muted-foreground uppercase text-xs">?먯젙 寃곌낵</TableHead>
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

