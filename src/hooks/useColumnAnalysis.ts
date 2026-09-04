/**
 * 자동 컬럼 분석(Step 4 → 5) 훅.
 *
 * 업로드된 평가 파일을 /api/analyze-columns 로 전송해 백엔드가 추론한 컬럼 역할을
 * 프론트 매핑 행(MappingRow)으로 변환해 반환한다. 역할 변환은 translateRoleToFrontend
 * 단일 출처를 사용한다. DataUpload 스텝에서 사용.
 */
import { useState } from "react";

import { apiUrl } from "@/lib/apiBase";
import { translateRoleToFrontend } from "../lib/mapping/translateRoleToFrontend";
import type { MappingRow } from "../types/mapping.types";

interface ColumnAnalysisResult {
  rows: MappingRow[];
  metadata: any;
}

export function useColumnAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeColumns = async (
    file: File,
    taskType: string,
  ): Promise<ColumnAnalysisResult> => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("task_type", taskType);
      formData.append("file", file);

      const response = await fetch(apiUrl("/api/analyze-columns"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server responded with status ${response.status}`,
        );
      }

      const result = await response.json();
      const rows: MappingRow[] = result.column_mappings.map((m: any) => {
        const frontendRole = translateRoleToFrontend(m.role);
        return {
          originalName: m.column,
          sampleValues: m.sample_values || [],
          inferredRole: frontendRole,
          confirmedRole: frontendRole,
          modified: false,
          warnings: [],
        };
      });

      return { rows, metadata: result.metadata };
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzeColumns, isAnalyzing };
}
