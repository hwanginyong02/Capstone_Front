import type { RequiredColumnCode, TaskType } from "../data/evaluationData";

export type MappingRole = RequiredColumnCode | "ignore";

export interface MappingRow {
  originalName: string;
  sampleValues: string[];
  inferredRole: MappingRole | null;
  confirmedRole: MappingRole | null;
  modified: boolean;
  warnings: string[];
  /**
   * 평가 흐름에 놓지 않은 항목의 역할을 맡아 둔 값(docs/MATERIAL_PICKER.md §12.4). 이 행은 그동안
   * `confirmedRole: "ignore"` 이고, 항목을 다시 놓으면 이 역할로 돌아간다. 요청 본문에는 실리지 않는다.
   */
  heldRole?: MappingRole;
}

export interface BackendMappingResponse {
  taskType: TaskType;
  requiredRoles: RequiredColumnCode[];
  rows: MappingRow[];
}
