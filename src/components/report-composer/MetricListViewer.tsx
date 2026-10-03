/**
 * ② 지표와 합격 기준의 "고를 수 있는 지표 보기".
 *
 * 목록은 `getAvailableMetrics`(SPEC.md 와 백엔드 노출 규칙의 단일 출처)에서 오고, "확률 필요"는
 * 지표의 요구 컬럼에 확률 역할이 있는지로 **유도한다** — 지표 ID 를 손으로 나열하면 노출
 * 규칙이 바뀔 때 조용히 어긋난다. 이진의 M9·M10·M19 가 여기 걸린다.
 */
import { Badge } from "../ui/badge";
import { getSelectableMetrics } from "../../data/reportComposer";
import {
  getRequiredColumnsForMetric,
  type RequiredColumnCode,
  type TaskType,
} from "../../data/evaluationData";

const PROBABILITY_ROLES: RequiredColumnCode[] = ["score", "prob_class_*", "prob_label_*"];

function needsProbability(taskType: TaskType, metricId: string): boolean {
  return getRequiredColumnsForMetric(taskType, metricId).some((column) =>
    PROBABILITY_ROLES.includes(column.code),
  );
}

export function MetricListViewer({ taskType }: { taskType: TaskType }) {
  const metrics = getSelectableMetrics(taskType);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <Badge
            key={metric.id}
            variant="outline"
            className="h-7 gap-1.5 rounded-sm border-border px-2"
          >
            <span className="text-mono-small font-mono font-medium text-muted-foreground">
              {metric.id}
            </span>
            <span className="text-body-xs font-medium text-foreground">{metric.name}</span>
            {needsProbability(taskType, metric.id) && (
              <span className="text-body-xs text-muted-foreground">확률 필요</span>
            )}
          </Badge>
        ))}
      </div>

      <p className="mt-3 text-body-small text-muted-foreground">
        지표 {metrics.length}개 중에서 고릅니다. 실제 선택은 지표 선택 단계에서 합니다.
      </p>
    </div>
  );
}
