import { useState } from "react";
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
 * 결정 임계값 입력 — 하드 예측 없이 확률·점수만 매핑했을 때만 나타난다(SPEC §6, A-01).
 *
 * **성적서 합격 목표값(지표와 합격 기준 화면의 목표값)과 다른 개념이다.** 여기서 정하는 것은
 * "확률 몇 이상을 양성으로 볼 것인가"이고, 그 결과로 만들어지는 예측은 모델의 실제
 * 출력이 아니라 파생값이라 성적서에 그 사실이 기재된다.
 *
 * multiclass 는 argmax 라 임계값이 없으므로 카드를 띄우지 않는다.
 */
/**
 * 이 매핑에서 임계값이 쓰이는가 — 하드 예측 없이 확률·점수만 매핑했고, 다중 클래스가 아닐 때다.
 * 카드를 그릴지와 매핑 확정의 범위 검사(`invalid_threshold`)가 이 한 판정을 쓴다 — 쓰이지 않는 값으로
 * 확정을 막으면 고칠 칸이 없다.
 */
export function thresholdApplies(taskType: TaskType, rows: MappingRow[]): boolean {
  // multiclass 는 확률의 argmax 로 예측을 정하므로 임계값 개념이 없다.
  if (taskType === "multiclass") return false;
  const { primary, alternatives } = PREDICTION_ROLE_ALTERNATIVES[taskType];
  const hasHardPrediction = rows.some((row) => row.confirmedRole === primary);
  const hasProbability = rows.some(
    (row) => row.confirmedRole !== null && (alternatives as string[]).includes(row.confirmedRole),
  );
  return !hasHardPrediction && hasProbability;
}

/**
 * 검증·평가 요청에 실을 결정 임계값(S2 P1, 점검 "결정 임계값 잔여값"). 지금 매핑에서 쓰이지 않으면 null 이고,
 * 레이블별 값이면 지금 확률 역할에 매핑된 컬럼의 키만 남긴다.
 *
 * 종전에는 저장된 값을 그대로 보냈다. 칸에 0~1 밖 값을 적은 채 매핑을 바꿔(하드 예측을 매핑 등) 카드가
 * 사라지면, 쓰이지도 않는 그 값 때문에 백엔드가 422 로 거절했고 고칠 칸이 화면에 없었다. 확정 검사와 같은
 * 판정(`thresholdApplies`)을 쓴다.
 */
export function requestDecisionThreshold(
  taskType: TaskType,
  rows: MappingRow[],
  value: number | Record<string, number> | null,
): number | Record<string, number> | null {
  if (value === null || !thresholdApplies(taskType, rows)) return null;
  if (typeof value === "number") return value;
  const { alternatives } = PREDICTION_ROLE_ALTERNATIVES[taskType];
  const probabilityColumns = new Set(
    rows
      .filter((row) => row.confirmedRole !== null && (alternatives as string[]).includes(row.confirmedRole))
      .map((row) => row.originalName),
  );
  const kept = Object.fromEntries(Object.entries(value).filter(([column]) => probabilityColumns.has(column)));
  return Object.keys(kept).length > 0 ? kept : null;
}

/**
 * 칸에 적은 글 → 저장할 값(B4). 빈 칸은 `null`(저장하지 않음 = 기본값 0.5), 숫자가 아니면(입력 중인
 * "0." 같은 것) `undefined`(아무것도 바꾸지 않음). 종전에는 `Number("")` 가 0 이라, 칸을 지우면 0 이
 * 저장돼 모든 샘플을 양성으로 판정했다.
 */
export function parseThresholdText(raw: string): number | null | undefined {
  const text = raw.trim();
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function DecisionThresholdCard({
  resolvedTaskType,
  rows,
  decisionThreshold,
  onDecisionThresholdChange,
}: DecisionThresholdCardProps) {
  /** 칸마다 입력 중인 글. 숫자일 때만 저장하고, 칸을 떠나면 저장값을 다시 보인다. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { alternatives } = PREDICTION_ROLE_ALTERNATIVES[resolvedTaskType];
  const probabilityRows = rows.filter(
    (row) => row.confirmedRole !== null && (alternatives as string[]).includes(row.confirmedRole),
  );

  // 파생이 일어나지 않으면 임계값은 쓰이지 않는다 — 쓰이지 않는 입력을 보여주지 않는다.
  if (!thresholdApplies(resolvedTaskType, rows)) return null;

  const perColumn = typeof decisionThreshold === "object" && decisionThreshold !== null;
  const scalarValue = perColumn ? DEFAULT_DECISION_THRESHOLD : (decisionThreshold ?? DEFAULT_DECISION_THRESHOLD);

  const thresholdFor = (column: string) =>
    perColumn
      ? (decisionThreshold as Record<string, number>)[column] ?? DEFAULT_DECISION_THRESHOLD
      : scalarValue;

  const SCALAR_KEY = "\u0000scalar";
  const shown = (key: string, stored: number) => drafts[key] ?? String(stored);
  const editDraft = (key: string, raw: string) => setDrafts((prev) => ({ ...prev, [key]: raw }));
  const dropDraft = (key: string) =>
    setDrafts((prev) => {
      const { [key]: _dropped, ...rest } = prev;
      return rest;
    });

  const setScalar = (raw: string) => {
    editDraft(SCALAR_KEY, raw);
    const parsed = parseThresholdText(raw);
    if (parsed !== undefined) onDecisionThresholdChange(parsed);
  };

  const setForColumn = (column: string, raw: string) => {
    editDraft(column, raw);
    const parsed = parseThresholdText(raw);
    if (parsed === undefined) return;
    const base: Record<string, number> = perColumn
      ? { ...(decisionThreshold as Record<string, number>) }
      : Object.fromEntries(probabilityRows.map((r) => [r.originalName, scalarValue]));
    // 빈 칸은 그 키를 지운다 — 백엔드가 없는 키를 기본값 0.5 로 본다.
    if (parsed === null) delete base[column];
    else base[column] = parsed;
    onDecisionThresholdChange(base);
  };

  const isMultilabel = resolvedTaskType === "multilabel";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          결정 임계값
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            예측 레이블 컬럼을 지정하지 않아 확률·점수 컬럼에서 예측을 만듭니다. 여기서 정한
            임계값과, 예측을 만들어 냈다는 사실이 모두 성적서에 적힙니다. 나중에 정하는 합격
            목표값과는 <em>다른</em> 값입니다.
          </AlertDescription>
        </Alert>

        {isMultilabel ? (
          <div className="space-y-2">
            {probabilityRows.map((row) => (
              <label key={row.originalName} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-mono text-foreground-secondary">{row.originalName}</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  aria-label={`${row.originalName} 결정 임계값`}
                  value={shown(row.originalName, thresholdFor(row.originalName))}
                  onChange={(e) => setForColumn(row.originalName, e.target.value)}
                  onBlur={() => dropDraft(row.originalName)}
                  className="w-28 rounded border border-border-strong px-2 py-1 text-right"
                />
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              레이블마다 임계값을 따로 정하고, 각각 따로 판정합니다. 비우면 {DEFAULT_DECISION_THRESHOLD}입니다.
            </p>
          </div>
        ) : (
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground-secondary">
              이 값 이상인 점수를 양성으로 봅니다
              <span className="ml-1 font-mono text-muted-foreground">
                ({probabilityRows.map((r) => r.originalName).join(", ")})
              </span>
            </span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              aria-label="결정 임계값"
              value={shown(SCALAR_KEY, scalarValue)}
              onChange={(e) => setScalar(e.target.value)}
              onBlur={() => dropDraft(SCALAR_KEY)}
              className="w-28 rounded border border-border-strong px-2 py-1 text-right"
            />
          </label>
        )}
        {!isMultilabel && (
          <p className="text-xs text-muted-foreground">비우면 {DEFAULT_DECISION_THRESHOLD}입니다.</p>
        )}

        {!withinUnitInterval(decisionThreshold) && (
          <Alert variant="destructive">
            <AlertDescription>{THRESHOLD_RANGE_MESSAGE}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/** 범위를 벗어났을 때 카드와 매핑 확정 안내가 함께 쓰는 문장. */
export const THRESHOLD_RANGE_MESSAGE = "결정 임계값은 0과 1 사이여야 합니다.";

/** 백엔드와 같은 규칙([0,1])을 화면에서도 검사해 왕복 전에 알려준다. 범위 판정은 이 함수 하나다. */
export function withinUnitInterval(value: number | Record<string, number> | null): boolean {
  if (value === null) return true;
  const items = typeof value === "object" ? Object.values(value) : [value];
  return items.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
}
