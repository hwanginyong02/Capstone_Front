import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { cn } from "../../utils/styling/styles";
import type { TaskType } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

/**
 * 백엔드가 양성 클래스를 자동으로 정하지 못했을 때의 경고(M5). 그때 백엔드의 기본값 함수
 * (`default_positive_class`, 분석·지표 계산이 같이 쓴다)는 문자열 정렬에서 뒤쪽 값을 고른다 — 그 값이
 * 아래 선택 칸에 들어 있으니 "임시로 골랐다"고 알린다. 프론트는 양성을 따로 정하지 않고 그 값을 보인다.
 */
export const POSITIVE_CLASS_AMBIGUOUS_MESSAGE =
  "양성 클래스를 자동으로 정하지 못해 정렬 순서상 뒤 값을 임시로 골랐습니다. 아래 값이 맞는지 확인하세요. " +
  "잘못 고르면 Precision, Recall, FPR, AUROC 가 모두 틀어집니다.";

/**
 * 양성 클래스가 무엇인지 한 줄로(점검 나-15). 한국어 라벨("불량/정상")에서는 정렬 순서상 "정상"이 기본 양성이
 * 되기 쉬워 FN·FP 의 뜻이 뒤집힌다 — ⑤ 평가 관점의 위험 방향도 이 값을 기준으로 읽힌다.
 */
export const POSITIVE_CLASS_GUIDE = "모델이 찾아내야 하는 쪽(예: 불량, 이탈)을 고르세요.";

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
          이진 분류 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            어느 값이 양성 클래스인가요? 평가 지표는 이 값을 양성(1)으로, 나머지를 모두 음성(0)으로 봅니다.{" "}
            {POSITIVE_CLASS_GUIDE}
          </p>

          {yTrueRow && positiveClassAmbiguous && (
            <Alert className="border-warning-border bg-warning-subtle">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-strong">
                {POSITIVE_CLASS_AMBIGUOUS_MESSAGE}
              </AlertDescription>
            </Alert>
          )}

          {yTrueRow ? (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">양성 클래스 값:</div>
              <Select value={positiveClass} onValueChange={setPositiveClass}>
                <SelectTrigger className={cn("w-[200px]", positiveClass === "" && "border-destructive")}>
                  <SelectValue placeholder="양성 클래스 선택" />
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
                먼저 <strong>y_true</strong> 역할에 컬럼을 지정하면 고를 수 있는 클래스 값이 보입니다.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
