import type { RequiredColumnCode, TaskType } from "../data/evaluationData";

export type MappingRole = RequiredColumnCode | "ignore";

export interface MappingRow {
  originalName: string;
  sampleValues: string[];
  inferredRole: MappingRole | null;
  confirmedRole: MappingRole | null;
  modified: boolean;
  warnings: string[];
}

export interface BackendMappingResponse {
  taskType: TaskType;
  requiredRoles: RequiredColumnCode[];
  rows: MappingRow[];
}
