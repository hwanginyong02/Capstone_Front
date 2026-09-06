/**
 * 자동 컬럼 분석(Step 4 → 5) 훅.
 *
 * 업로드된 평가 파일을 /api/analyze-columns 로 전송해 백엔드가 추론한 컬럼 역할을
 * 프론트 매핑 행(MappingRow)으로 변환해 반환한다. 역할 변환은 translateRoleToFrontend
 * 단일 출처를 사용한다. DataUpload 스텝에서 사용.
 *
 * 타임아웃·취소 (ISSUES.md E-18): 종전에는 signal 도 타임아웃도 없어, 백엔드가
 * 최악 약 270초까지 늘어지는 동안 화면은 'Analyzing...' 라벨만 띄운 채 뒤로 가기
 * 버튼까지 감췄다. 사용자가 취소도 후퇴도 할 수 없었다.
 */
import { useRef, useState } from "react";

import { apiUrl } from "@/lib/apiBase";
import { translateRoleToFrontend } from "../lib/mapping/translateRoleToFrontend";
import type { MappingRow } from "../types/mapping.types";

interface ColumnAnalysisResult {
  rows: MappingRow[];
  metadata: any;
}

/**
 * 백엔드 최악 지연을 조금 상회하는 값.
 * 백엔드는 45s x 최대 3회 시도 ≈ 135초다(재시도를 스키마 거부에만 걸도록 좁힌 뒤 기준).
 * 더 짧게 잡으면 백엔드가 준비해 둔 규칙 폴백 응답조차 받지 못한다.
 */
export const ANALYSIS_TIMEOUT_MS = 150_000;

export function useColumnAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);

  /** 진행 중인 분석을 즉시 끊는다. 대기 화면의 취소 버튼이 호출한다. */
  const cancel = () => {
    controllerRef.current?.abort();
  };

  const analyzeColumns = async (
    file: File,
    taskType: string,
  ): Promise<ColumnAnalysisResult> => {
    setIsAnalyzing(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    timedOutRef.current = false;
    const timer = setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, ANALYSIS_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("task_type", taskType);
      formData.append("file", file);

      const response = await fetch(apiUrl("/api/analyze-columns"), {
        method: "POST",
        body: formData,
        signal: controller.signal,
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
    } catch (err) {
      // abort 는 '왜 끊겼는지'를 구분해 전달한다 — 타임아웃과 사용자 취소는 다른 사건이다.
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          timedOutRef.current
            ? `Column analysis did not finish within ${Math.round(ANALYSIS_TIMEOUT_MS / 1000)}s and was stopped.`
            : "Column analysis was cancelled.",
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
      controllerRef.current = null;
      setIsAnalyzing(false);
    }
  };

  return { analyzeColumns, isAnalyzing, cancel };
}
