/**
 * 컬럼 매핑 확정(Step 5) API 호출.
 *
 * 프론트 매핑 행을 백엔드 역할로 변환(translateRoleToBackend, 단일 출처)해
 * /api/confirm-mapping 으로 전송하고 유효성 검사 결과를 반환한다. ColumnMapping 페이지에서 사용.
 */
import { apiUrl } from "@/lib/apiBase";
import { translateRoleToBackend } from "../mapping/translateRoleToBackend";
import type { MappingRow } from "../../types/mapping.types";

export interface ConfirmMappingInput {
  columnMapping: MappingRow[];
  taskType: string | null;
  selectedMetricIds: string[];
}

export interface ConfirmMappingResult {
  is_valid: boolean;
  errors: { message: string }[];
}

export async function confirmMapping(
  input: ConfirmMappingInput,
): Promise<ConfirmMappingResult> {
  const taskType = input.taskType || "multiclass";

  const backendMappings = input.columnMapping.map((row) => ({
    column: row.originalName,
    role: translateRoleToBackend(row.confirmedRole, taskType),
    sample_values: row.sampleValues,
  }));

  const payload = {
    task_type: taskType,
    column_mappings: backendMappings,
    selected_metric_ids: input.selectedMetricIds,
  };

  const response = await fetch(apiUrl("/api/confirm-mapping"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${response.status}`);
  }

  return response.json();
}
