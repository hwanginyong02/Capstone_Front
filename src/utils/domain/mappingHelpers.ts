/**
 * 컬럼 매핑 헬퍼
 *
 * 이 모듈은 Step 5 (Column Mapping) 전용 유틸리티 함수들을 제공합니다.
 * 매핑 상태를 기반으로 시각적 상태 라벨(예: "없음", "겹침", "일치")과
 * 디자인 톤 색상을 계산합니다.
 */
import {
  MULTI_COLUMN_ROLES,
  resolveMissingRoleCodes,
  type RequiredColumnDisplay,
  type TaskType,
} from "../../data/evaluationData";
import type { MappingRole, MappingRow } from "../../types/mapping.types";

/**
 * 필수 역할 카드의 상태 배지. 비어 있는지는 `resolveMissingRoleCodes` 한 규칙으로 정한다 — 예측 역할은
 * 확률 역할이 배정돼 있으면 채워진 것이다(백엔드가 확률에서 예측을 파생한다). 종전에는 개수 0 만 보고
 * 확률만 매핑한 사용자에게 y_pred 를 빨간 "없음"으로 보였다(B12).
 */
export function getRoleStatusLabel(
  taskType: TaskType,
  role: RequiredColumnDisplay,
  roleCounts: Partial<Record<MappingRole, number>>,
) {
  const matchedCount = roleCounts[role.code] ?? 0;
  if (matchedCount === 0) {
    const missing = resolveMissingRoleCodes(taskType, [role.code], roleCounts as Record<string, number>);
    return missing.length === 0
      ? { label: "확률로 대신", tone: "secondary" as const }
      : { label: "없음", tone: "destructive" as const };
  }
  if (MULTI_COLUMN_ROLES.includes(role.code)) {
    return { label: `${matchedCount}개`, tone: "secondary" as const };
  }
  if (matchedCount > 1) {
    return { label: "겹침", tone: "destructive" as const };
  }
  return { label: "지정됨", tone: "secondary" as const };
}

/** 이 행이 겹친 역할인가 — 여러 컬럼 역할(`MULTI_COLUMN_ROLES`)과 ignore 는 겹침이 아니다. */
export function isDuplicateRole(
  role: MappingRole | null,
  roleCounts: Partial<Record<MappingRole, number>>,
): boolean {
  if (!role || role === "ignore" || MULTI_COLUMN_ROLES.includes(role)) return false;
  return (roleCounts[role] ?? 0) > 1;
}

/** 겹친 역할의 수(매핑 확정을 막는다). */
export function countDuplicateRoles(roleCounts: Partial<Record<MappingRole, number>>): number {
  return (Object.keys(roleCounts) as MappingRole[]).filter((role) => isDuplicateRole(role, roleCounts)).length;
}

/**
 * Determine the visual match state for a single mapping row.
 */
export function getRowMatchState(row: MappingRow, duplicate: boolean) {
  // 평가 흐름에 놓지 않은 항목의 역할을 맡아 둔 행 — 사용자가 고친 것도, 확인할 문제도 아니다.
  if (row.heldRole) {
    return { label: "맡아 둠", tone: "outline" as const };
  }
  if (duplicate) {
    return { label: "겹침", tone: "destructive" as const };
  }
  // 역할이 비어 있는(null) 옛 행은 "쓰지 않음"과 같다 — 백엔드로도 ignore 로 간다(M7).
  if (row.modified) {
    return { label: "고침", tone: "secondary" as const };
  }
  if (row.warnings.length > 0) {
    return { label: "확인 필요", tone: "outline" as const };
  }
  return { label: "일치", tone: "secondary" as const };
}
