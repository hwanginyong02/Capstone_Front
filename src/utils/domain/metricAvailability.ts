/**
 * 지표마다 지금 매핑으로 계산할 수 있는가(docs/MATERIAL_PICKER.md §3).
 *
 * 컬럼 매핑이 지표보다 앞이라, 지표 화면은 매핑된 컬럼으로 계산할 수 없는 지표(예: 확률 컬럼
 * 없이 AUROC·AUPRC·Log Loss)를 처음부터 비활성으로 두고 이유를 한 줄 붙인다. 종전에는 지표를
 * 먼저 고르고, 매핑 화면에서 빠진 컬럼이 걸리면 "지표 제외"로 풀었다.
 *
 * 규칙은 백엔드 `/api/confirm-mapping` 의 지표 가용성과 같다 — 지표가 요구하는 역할
 * (`getRequiredColumnsForMetric`)이 모두 매핑돼야 하고, 예측 역할은 확률 역할로도 충족된다
 * (`resolveMissingRoleCodes`). 두 표가 같다는 것은 `metricColumnContract.test.ts` 가 고정한다.
 * 매핑 확정 응답의 `available_metric_ids` 가 있으면 그것이 정본이고, 이 함수는 이유 문구를
 * 만들며 응답이 없을 때(쇼케이스·옛 초안) 대신 판정한다.
 *
 * 순수 함수다 — 스토어를 읽지 않는다.
 */
import {
  getAvailableMetrics,
  getRequiredColumnsForMetric,
  resolveMissingRoleCodes,
  type RequiredColumnDisplay,
  type TaskType,
} from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

export interface MetricAvailability {
  available: boolean;
  /**
   * 매핑되지 않아 이 지표를 막는 역할. 백엔드가 막았는데 이 규칙으로는 빠진 역할이 없으면
   * 빈 배열이다(그때는 일반 문구를 쓴다).
   */
  missingRoles: RequiredColumnDisplay[];
}

/** 매핑에서 역할마다 배정된 컬럼 수. 미배정과 `ignore` 는 세지 않는다. */
export function mappedRoleCounts(rows: readonly MappingRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!row.confirmedRole || row.confirmedRole === "ignore") continue;
    counts[row.confirmedRole] = (counts[row.confirmedRole] ?? 0) + 1;
  }
  return counts;
}

export function getMetricAvailability(
  taskType: TaskType,
  metricId: string,
  roleCounts: Record<string, number>,
  backendAvailableIds?: readonly string[] | null,
): MetricAvailability {
  const required = getRequiredColumnsForMetric(taskType, metricId);
  const missingCodes = new Set(
    resolveMissingRoleCodes(
      taskType,
      required.map((column) => column.code),
      roleCounts,
    ),
  );
  const missingRoles = required.filter((column) => missingCodes.has(column.code));
  const available = backendAvailableIds
    ? backendAvailableIds.includes(metricId)
    : missingRoles.length === 0;
  return { available, missingRoles: available ? [] : missingRoles };
}

/** 비활성 지표 아래에 붙일 한 줄. 계산할 수 있으면 null. */
export function unavailableReason(availability: MetricAvailability): string | null {
  if (availability.available) return null;
  if (availability.missingRoles.length === 0) return "매핑한 컬럼으로는 계산할 수 없습니다.";
  const columns = availability.missingRoles
    .map((role) => `${role.label}(${role.code})`)
    .join(", ");
  return `${columns} 컬럼이 매핑되지 않아 계산할 수 없습니다.`;
}

/**
 * 이 유형의 지표 중 지금 매핑으로 계산할 수 없는 것과 그 이유. 계산할 수 있는 지표는 키가 없다.
 *
 * 매핑이 하나도 없으면 판정할 근거가 없으므로 아무것도 막지 않는다. 매핑 화면이 정답과 예측
 * 없이는 넘어가지 않으므로 정상 흐름에서는 생기지 않는다.
 */
export function unavailableMetricReasons(
  taskType: TaskType | "",
  rows: readonly MappingRow[],
  backendAvailableIds?: readonly string[] | null,
): Record<string, string> {
  if (!taskType) return {};
  const roleCounts = mappedRoleCounts(rows);
  if (Object.keys(roleCounts).length === 0) return {};

  const reasons: Record<string, string> = {};
  for (const metric of getAvailableMetrics(taskType)) {
    const reason = unavailableReason(
      getMetricAvailability(taskType, metric.id, roleCounts, backendAvailableIds),
    );
    if (reason) reasons[metric.id] = reason;
  }
  return reasons;
}
