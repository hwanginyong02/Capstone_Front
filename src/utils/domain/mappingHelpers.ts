/**
 * 컬럼 매핑 헬퍼
 *
 * 이 모듈은 Step 5 (Column Mapping) 전용 유틸리티 함수들을 제공합니다.
 * 매핑 상태를 기반으로 시각적 상태 라벨(예: "없음", "겹침", "일치")과
 * 디자인 톤 색상을 계산합니다.
 */
import type { RequiredColumnDisplay } from "../../data/evaluationData";
import type { MappingRow } from "../../types/mapping.types";

/**
 * Get a human-readable status label for a required column role based on how many columns map to it.
 */
export function getRoleStatusLabel(role: RequiredColumnDisplay, matchedCount: number) {
  if (matchedCount === 0) {
    return { label: "없음", tone: "destructive" as const };
  }
  if (role.code === "prob_class_*" || role.code === "prob_label_*") {
    return { label: `${matchedCount} mapped`, tone: "secondary" as const };
  }
  if (matchedCount > 1) {
    return { label: "겹침", tone: "destructive" as const };
  }
  return { label: "지정됨", tone: "secondary" as const };
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
  if (row.confirmedRole === null) {
    return { label: "미지정", tone: "destructive" as const };
  }
  if (row.modified) {
    return { label: "고침", tone: "secondary" as const };
  }
  if (row.warnings.length > 0) {
    return { label: "확인 필요", tone: "outline" as const };
  }
  return { label: "일치", tone: "secondary" as const };
}
