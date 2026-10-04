/**
 * Step 5 진행 판정 — 컬럼 매핑으로 '다음 단계'를 허용할지 결정한다.
 *
 * ISSUES.md E-13 — 종전 판정은 `missingRoles.length === 0 && duplicateCount === 0 &&
 * (resolvedTaskType !== "binary" || positiveClass !== "")` 였다. 여기엔 두 구멍이 있었고,
 * 둘이 겹치면 **매핑 행이 0개인데 '유효'** 가 된다.
 *
 *   ① `getRequiredColumnsForSelection` 은 selectedMetricIds 를 순회해 요구 역할을 모은다.
 *      지표가 하나도 없으면 요구 역할이 **0개**가 되고, 그러면 missingRoles 도 [] 라
 *      "빠진 역할 없음 = 유효"로 통과한다. '행이 있는가'를 보는 조건이 없다.
 *   ② `taskType` 이 "" 이면 `resolvedTaskType` 이 "multiclass" 로 둔갑해
 *      **binary 전용 검사(positiveClass)까지 건너뛴다.**
 *
 * 그 상태는 정확히 E-01(워크플로우 비영속)이 만들어낸다 — 새로고침 한 번이면 taskType 도
 * selectedMetricIds 도 columnMapping 도 전부 초기값이다. 실제 차단은 전적으로 백엔드가 하고,
 * 사용자는 네트워크 왕복 뒤 raw alert 창을 받는다.
 *
 * 판정을 순수 함수로 분리해 '왜 막혔는지'까지 돌려준다.
 */
import type { TaskType } from "../../data/evaluationData";

export type MappingValidityReason =
  | "ok"
  | "no_task_type"
  | "no_metrics"
  | "no_mapped_rows"
  | "duplicate_roles"
  | "missing_roles"
  | "no_positive_class";

export interface MappingValidityInput {
  /** 원본 taskType. "" 를 다른 값으로 둔갑시켜 넘기면 안 된다. */
  taskType: TaskType | "";
  selectedMetricIds: string[];
  /** confirmedRole 이 있고 'ignore' 가 아닌 행의 수. */
  assignedRoleCount: number;
  /** 요구되지만 배정되지 않은 역할 코드. */
  missingRoleCodes: string[];
  /** 중복 배정된 역할 수(다중 허용 역할 제외). */
  duplicateRoleCount: number;
  /** binary 에서 사용자가 고른 양성 클래스. */
  positiveClass: string;
}

/**
 * 진행 차단 사유. "ok" 이외는 전부 '다음'을 막는다.
 *
 * 순서가 의미를 갖는다 — 작업 유형이 없으면 요구 역할 자체를 계산할 수 없고,
 * 지표가 없으면 무엇을 매핑해야 하는지도 정해지지 않는다.
 */
export function getMappingValidityReason(input: MappingValidityInput): MappingValidityReason {
  if (!input.taskType) return "no_task_type";
  if (input.selectedMetricIds.length === 0) return "no_metrics";
  if (input.assignedRoleCount === 0) return "no_mapped_rows";
  if (input.duplicateRoleCount > 0) return "duplicate_roles";
  if (input.missingRoleCodes.length > 0) return "missing_roles";
  if (input.taskType === "binary" && input.positiveClass === "") return "no_positive_class";
  return "ok";
}

export function isMappingValid(input: MappingValidityInput): boolean {
  return getMappingValidityReason(input) === "ok";
}

/** 차단 사유를 사용자 문장으로. null 이면 표시할 안내가 없다. */
export function describeMappingValidity(
  reason: MappingValidityReason,
  missingRoleCodes: string[] = [],
): string | null {
  switch (reason) {
    // 단계를 번호가 아니라 **이름**으로 가리킨다. 번호는 개편 때마다 바뀌는데
    // (업로드는 4단계였다가 1단계가 됐다) 문자열은 같이 안 바뀌어 조용히 거짓말이 된다.
    case "no_task_type":
      return "No classifier type is set. Start again from the classifier type screen.";
    case "no_metrics":
      return "No metrics are selected. Pick them in the Metrics step.";
    case "no_mapped_rows":
      return "No column has a role assigned. Upload the data file again in the Evaluation file step.";
    case "duplicate_roles":
      return "The same role is assigned to more than one column. Resolve the duplicates.";
    case "missing_roles":
      return `These required roles are not assigned: ${missingRoleCodes.join(", ")}`;
    case "no_positive_class":
      return "Binary classification needs a positive class.";
    case "ok":
      return null;
  }
}
