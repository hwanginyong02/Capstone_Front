import type { MappingRole, MappingRow } from "../../types/mapping.types";

/**
 * 역할 변경을 **컬럼명으로** 적용한다.
 *
 * 종전에는 표가 넘긴 index 를 전체 rows 배열에 그대로 썼다. 그런데 표는 **필터된**
 * `visibleRows` 를 순회하므로 'Issues only' 같은 필터가 걸리면 두 index 가 어긋나
 * **엉뚱한 컬럼의 역할이 바뀌었다.** (대장에 없는 결함이다.)
 *
 * 지금까지 드러나지 않은 이유는 그 필터가 사실상 죽어 있었기 때문이다 —
 * `MappingRow.warnings` 에 값이 들어가는 유일한 코드가 시연 시드였고 실제 API 경로는
 * 항상 `[]` 를 넣었다. 백엔드 안내를 배선하면(B-03) 필터가 비로소 실사용된다.
 *
 * 컬럼명은 데이터셋 헤더라 유일하므로 필터·정렬과 무관하게 항상 옳다.
 */
export function applyRoleChange(
  rows: MappingRow[],
  columnName: string,
  newRole: string,
): MappingRow[] {
  const resolved = newRole === "unassigned" ? null : (newRole as MappingRole);

  return rows.map((row) =>
    row.originalName === columnName
      ? { ...row, confirmedRole: resolved, modified: row.inferredRole !== resolved }
      : row,
  );
}
