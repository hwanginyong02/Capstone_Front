import { Info, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { PREDICTION_ROLE_ALTERNATIVES, type TaskType } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

/** SPEC §6 — 임계값 입력 카드의 기본값. 백엔드도 같은 값을 쓴다. */
export const DEFAULT_DECISION_THRESHOLD = 0.5;

interface DecisionThresholdCardProps {
  resolvedTaskType: TaskType;
  rows: MappingRow[];
  decisionThreshold: number | Record<string, number> | null;
  onDecisionThresholdChange: (value: number | Record<string, number> | null) => void;
}

/**
 * 결정 임계값 입력 — 하드 예측 없이 확률·점수만 매핑했을 때만 나타난다(SPEC §6, ISSUES.md A-01).
 *
 * **성적서 합격 목표값(3단계의 목표값)과 다른 개념이다.** 여기서 정하는 것은
 * "확률 몇 이상을 양성으로 볼 것인가"이고, 그 결과로 만들어지는 예측은 모델의 실제
 * 출력이 아니라 파생값이라 성적서에 그 사실이 기재된다.
 *
 * multiclass 는 argmax 라 임계값이 없으므로 카드를 띄우지 않는다.
 */
export function DecisionThresholdCard({
  resolvedTaskType,
  rows,
  decisionThreshold,
  onDecisionThresholdChange,
}: DecisionThresholdCardProps) {
  const { primary, alternatives } = PREDICTION_ROLE_ALTERNATIVES[resolvedTaskType];
  const hasHardPrediction = rows.some((row) => row.confirmedRole === primary);
  const probabilityRows = rows.filter(
    (row) => row.confirmedRole !== null && (alternatives as string[]).includes(row.confirmedRole),
  );

  // 파생이 일어나지 않으면 임계값은 쓰이지 않는다 — 쓰이지 않는 입력을 보여주지 않는다.
  if (hasHardPrediction || probabilityRows.length === 0) return null;
  // multiclass 는 확률의 argmax 로 예측을 정하므로 임계값 개념이 없다.
  if (resolvedTaskType === "multiclass") return null;

  const perColumn = typeof decisionThreshold === "object" && decisionThreshold !== null;
  const scalarValue = perColumn ? DEFAULT_DECISION_THRESHOLD : (decisionThreshold ?? DEFAULT_DECISION_THRESHOLD);

  const thresholdFor = (column: string) =>
    perColumn
      ? (decisionThreshold as Record<string, number>)[column] ?? DEFAULT_DECISION_THRESHOLD
      : scalarValue;

  const setScalar = (raw: string) => {
    const parsed = Number(raw);
    onDecisionThresholdChange(Number.isFinite(parsed) ? parsed : null);
  };

  const setForColumn = (column: string, raw: string) => {
    const parsed = Number(raw);
    const base: Record<string, number> = perColumn
      ? { ...(decisionThreshold as Record<string, number>) }
      : Object.fromEntries(probabilityRows.map((r) => [r.originalName, scalarValue]));
    base[column] = Number.isFinite(parsed) ? parsed : DEFAULT_DECISION_THRESHOLD;
    onDecisionThresholdChange(base);
  };

  const isMultilabel = resolvedTaskType === "multilabel";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-500" />
          Decision threshold
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            예측 레이블 컬럼이 없어 확률·점수에서 예측을 만듭니다. 여기서 정한 임계값과
            "파생값이라는 사실"이 성적서에 기재됩니다. (3단계에서 정하는 <em>합격 목표값</em>과는
            다른 값입니다.)
          </AlertDescription>
        </Alert>

        {isMultilabel ? (
          <div className="space-y-2">
            {probabilityRows.map((row) => (
              <label key={row.originalName} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-mono text-slate-700">{row.originalName}</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  aria-label={`${row.originalName} decision threshold`}
                  value={thresholdFor(row.originalName)}
                  onChange={(e) => setForColumn(row.originalName, e.target.value)}
                  className="w-28 rounded border border-slate-300 px-2 py-1 text-right"
                />
              </label>
            ))}
            <p className="text-xs text-slate-500">
              레이블마다 다른 임계값을 줄 수 있습니다. 각 레이블은 독립적으로 판정됩니다.
            </p>
          </div>
        ) : (
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-700">
              점수가 이 값 이상이면 양성으로 판정합니다
              <span className="ml-1 font-mono text-slate-500">
                ({probabilityRows.map((r) => r.originalName).join(", ")})
              </span>
            </span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              aria-label="decision threshold"
              value={scalarValue}
              onChange={(e) => setScalar(e.target.value)}
              className="w-28 rounded border border-slate-300 px-2 py-1 text-right"
            />
          </label>
        )}

        {!withinUnitInterval(decisionThreshold) && (
          <Alert variant="destructive">
            <AlertDescription>임계값은 0 과 1 사이여야 합니다.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/** 백엔드와 같은 규칙([0,1])을 화면에서도 검사해 왕복 전에 알려준다. */
export function withinUnitInterval(value: number | Record<string, number> | null): boolean {
  if (value === null) return true;
  const items = typeof value === "object" ? Object.values(value) : [value];
  return items.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
}
