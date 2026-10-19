/**
 * 컬럼 매핑이 받는 역할 — 평가 흐름에 놓지 않은 ① 항목의 역할은 받지 않는다(docs/MATERIAL_PICKER.md §12.4).
 *
 * 숨길 수 있는 역할은 선택 항목(샘플 ID 컬럼)과 권장 항목(지연시간 컬럼)의 역할뿐이다. 정답·예측(확률)
 * 은 필수 항목이라 늘 받는다. 판정은 `allowedMappingRoles` 한 곳이고, 적용은 스토어의 두 쓰기 지점
 * (`setColumnMapping`·`setMaterialPick`)이 `restrictMappingRoles` 로 한다 — 매핑을 읽어 요청·성적서를
 * 만드는 곳이 여럿이라, 출력마다 거르면 어긋난다.
 *
 * 받지 않게 된 역할은 지우지 않는다. 그 행을 "쓰지 않음"(ignore)으로 내리고 원래 역할을 `heldRole` 에
 * 맡아 둔다. 항목을 다시 놓으면 돌려준다. 사용자가 그 행의 역할을 직접 바꾸면 맡아 둔 값은 지운다
 * (`applyRoleChange`). `heldRole` 은 요청 본문에 실리지 않는다(요청 빌더는 컬럼·역할·샘플값만 담는다).
 */
import { MAPPABLE_ROLES_BY_TASK, getColumnDisplay, type TaskType } from "../../data/evaluationData";
import { getCard, getCardFields, isFieldPicked } from "../../data/reportComposer";
import type { MappingRole, MappingRow } from "../../types/mapping.types";

/** 그 역할을 받는 ① 항목 id. `ignore` 나 어느 항목에도 없는 역할이면 null. */
export function leafOfRole(role: MappingRole): string | null {
  if (role === "ignore") return null;
  const field = getCard("evalData").fields.find((item) => item.columnRoles?.includes(role));
  return field?.id ?? null;
}

/**
 * 이 유형에서 매핑 화면이 내놓는 역할: 유형의 매핑 역할 중 그 역할을 받는 ① 항목을 받는 것 + "ignore".
 * `evalDataPicks` 가 없으면(평가 흐름 만들기 이전의 상태·시연) 모두 받는다.
 */
export function allowedMappingRoles(
  taskType: TaskType,
  evalDataPicks: readonly string[] | undefined,
): MappingRole[] {
  const card = getCard("evalData");
  const fields = getCardFields("evalData", taskType);
  const roles = MAPPABLE_ROLES_BY_TASK[taskType].filter((role) => {
    const field = fields.find((item) => item.columnRoles?.includes(role));
    return field !== undefined && isFieldPicked(card, field, evalDataPicks);
  });
  return [...roles, "ignore"];
}

/**
 * 받지 않는 역할을 "쓰지 않음"으로 내리고 `heldRole` 에 맡긴다. 다시 받게 된 `heldRole` 은 돌려준다.
 *
 * - 맡아 둔 행은 `modified: false` 다 — 사용자가 고친 것이 아니다. 자동 매핑 결과(`inferredRole`)는 그대로.
 * - 유형의 매핑 역할이 아닌 역할(유형을 바꾸기 전의 값)은 건드리지 않는다 — 숨김 규칙이 아니다.
 * - 바뀐 것이 없으면 같은 배열(참조)을 돌려준다. 스토어가 이것으로 "매핑이 바뀌었는가"를 본다.
 * - `taskType` 이 "" 면 그대로 둔다.
 */
export function restrictMappingRoles(
  rows: MappingRow[],
  taskType: TaskType | "",
  evalDataPicks: readonly string[] | undefined,
): MappingRow[] {
  if (!taskType) return rows;
  const allowed = new Set<MappingRole>(allowedMappingRoles(taskType, evalDataPicks));
  const mappable = new Set<MappingRole>(MAPPABLE_ROLES_BY_TASK[taskType]);
  let changed = false;
  const next = rows.map((row): MappingRow => {
    const role = row.confirmedRole;
    if (role && role !== "ignore" && mappable.has(role) && !allowed.has(role)) {
      changed = true;
      return { ...row, confirmedRole: "ignore", heldRole: role, modified: false };
    }
    if (role === "ignore" && row.heldRole && allowed.has(row.heldRole)) {
      changed = true;
      const { heldRole, ...rest } = row;
      return { ...rest, confirmedRole: heldRole, modified: row.inferredRole !== heldRole };
    }
    return row;
  });
  return changed ? next : rows;
}

/**
 * 역할 드롭다운의 선택지(이름은 `roleOptionLabel`). 받는 역할(`allowedMappingRoles`)에, 이미 배정된 역할 중 목록에 없는 것을
 * 더한다 — 유형을 바꾸기 전의 값이 남아 있으면 Select 가 값을 못 찾아 빈 칸으로 그려지기 때문이다.
 * 숨긴 역할은 스토어가 이미 "쓰지 않음"으로 내렸으므로 여기서 되살아나지 않는다.
 */
export function buildRoleOptions(
  taskType: TaskType,
  evalDataPicks: readonly string[] | undefined,
  assigned: Iterable<MappingRole>,
): Array<{ value: MappingRole; label: string }> {
  const codes = allowedMappingRoles(taskType, evalDataPicks).filter((role) => role !== "ignore");
  for (const role of assigned) {
    if (role !== "ignore" && !codes.includes(role)) codes.push(role);
  }
  return [...codes, "ignore" as const].map((value) => ({ value, label: roleOptionLabel(value) }));
}

/** 역할 선택지 이름 — 한국어 이름 뒤에 코드(M7). 남는 컬럼을 치우는 선택지는 "쓰지 않음" 하나다. */
export function roleOptionLabel(role: MappingRole): string {
  if (role === "ignore") return "쓰지 않음 (ignore)";
  return `${getColumnDisplay(role).label} (${role})`;
}
