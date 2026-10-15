import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { cn } from "../../utils/styling/styles";
import type { TaskType } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

interface BinaryClassificationCardProps {
  resolvedTaskType: TaskType;
  positiveClass: string;
  setPositiveClass: (val: string) => void;
  yTrueRow: MappingRow | undefined;
  yTrueValues: string[];
  /** 백엔드가 양성 클래스를 자동 판단하지 못한 경우(D5d) — 사용자 확인 유도. */
  positiveClassAmbiguous?: boolean;
}

export function BinaryClassificationCard({
  resolvedTaskType,
  positiveClass,
  setPositiveClass,
  yTrueRow,
  yTrueValues,
  positiveClassAmbiguous,
}: BinaryClassificationCardProps) {
  if (resolvedTaskType !== "binary") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Binary classification settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Which value is the positive class? The evaluation metrics will treat this value as "Positive" (1) and all others as "Negative" (0).
          </p>

          {yTrueRow && positiveClassAmbiguous && (
            <Alert className="border-warning-border bg-warning-subtle">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-strong">
                The positive class could not be determined automatically. Check that the value below
                is correct — picking the wrong one skews Precision, Recall, FPR, and AUROC.
              </AlertDescription>
            </Alert>
          )}

          {yTrueRow ? (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">Positive class value:</div>
              <Select value={positiveClass} onValueChange={setPositiveClass}>
                <SelectTrigger className={cn("w-[200px]", positiveClass === "" && "border-destructive")}>
                  <SelectValue placeholder="Select positive class" />
                </SelectTrigger>
                <SelectContent>
                  {yTrueValues.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Alert className="bg-muted border-border">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                Assign a column to the <strong>y_true</strong> role first to see available class values.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
