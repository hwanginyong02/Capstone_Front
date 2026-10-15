/**
 * ② 합격 기준 표 — 고른 지표마다 목표값과 핵심 지표 체크(docs/MATERIAL_PICKER.md §5).
 *
 * 핵심 지표는 미달하면 최종 불합격이 되는 지표다. 판정이 목표값과 함께 정해지므로 목표값 옆에서
 * 고른다. 고르지 않았으면 유형별 기본값이 체크돼 보인다. 판정과 검증은 `utils/domain/passCriteria.ts`.
 */
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import type { MetricDefinition } from "../../data/evaluationData";
import type { MetricDetailStateMap } from "../../types/workflow.types";
import { getTargetValueRule } from "../../utils/domain/validation";
import { targetValueError } from "../../utils/domain/passCriteria";

interface PassCriteriaCardProps {
  targetMetrics: MetricDefinition[];
  metricDetails: MetricDetailStateMap;
  coreMetricIds: string[];
  coreValid: boolean;
  onTargetChange: (metricId: string, name: string, value: string) => void;
  onToggleCore: (metricId: string, on: boolean) => void;
}

export function PassCriteriaCard({
  targetMetrics,
  metricDetails,
  coreMetricIds,
  coreValid,
  onTargetChange,
  onToggleCore,
}: PassCriteriaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">합격 기준</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          지표마다 넘어야 할 목표값을 정하세요. 이 값은 측정 결과를 바꾸지 않고, 결과와의 비교는
          성적서에서 확인합니다. 핵심 지표를 하나 이상 고르세요. 핵심 지표가 목표에 못 미치면
          불합격, 그 밖의 지표가 못 미치면 조건부 합격입니다.
        </p>

        {targetMetrics.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            고른 지표 중 목표값을 받는 지표가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {targetMetrics.map((metric) => {
              const raw = metricDetails[metric.id]?.targetValue ?? "";
              const error = targetValueError(metric.id, raw);
              return (
                <div
                  key={metric.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_200px_auto] md:items-start"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{metric.id}</span>
                      <span className="text-sm font-semibold">{metric.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getTargetValueRule(metric.id).summary}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      className="font-mono tabular-nums"
                      inputMode="decimal"
                      value={raw}
                      onChange={(event) => onTargetChange(metric.id, metric.name, event.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-label={`${metric.id} 목표값`}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>
                  <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={coreMetricIds.includes(metric.id)}
                      onCheckedChange={(next) => onToggleCore(metric.id, next === true)}
                      aria-label={`${metric.id} 핵심 지표`}
                    />
                    핵심
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {!coreValid && <p className="text-sm text-destructive">핵심 지표를 하나 이상 고르세요.</p>}
      </CardContent>
    </Card>
  );
}
