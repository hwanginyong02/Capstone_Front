/**
 * 데이터 검증(Step 6) 페칭 훅.
 *
 * 페이지 진입 시 워크플로우 store 입력값으로 payload/FormData 를 구성해
 * /api/validate-data 를 호출하고 결과를 반환한다. 결과는 리포트(6절 시험 결과)에서
 * 재사용할 수 있도록 store.setValidationResult 로 보존한다. showcase 모드(?showcase=1)에서는
 * 정적 목 데이터(DATA_VALIDATION_SHOWCASE)를 사용한다. DataValidation 페이지에서 사용.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { apiUrl } from "@/lib/apiBase";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import {
  buildReportInput,
  mapWorkflowToFinalReport,
  type MapWorkflowToReportInput,
} from "../lib/report/mapWorkflowToFinalReport";
import type { ValidateDataResponseData } from "../types/validation.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { DATA_VALIDATION_SHOWCASE } from "../data/dataValidationShowcase";
import { resolveBeta } from "../utils/domain/validation";
import { resolveTaskType } from "../data/evaluationData";
import { requestDecisionThreshold } from "../components/column-mapping/DecisionThresholdCard";

interface EvaluationResult {
  workflowSnapshot: MapWorkflowToReportInput;
  reportData: ReturnType<typeof mapWorkflowToFinalReport>;
}

interface UseDataValidationResult {
  validationData: ValidateDataResponseData | null;
  isLoading: boolean;
  error: string | null;
  /** 현재 store 스냅샷 + 검증 결과로 최종 리포트 데이터를 조립한다 (페이지 handleNext 에서 사용). */
  buildEvaluationResult: () => EvaluationResult;
}

export function useDataValidation(): UseDataValidationResult {
  const [searchParams] = useSearchParams();
  const store = useWorkflowStore();

  const [validationData, setValidationData] = useState<ValidateDataResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페이지 진입 시 /api/validate-data 호출 (showcase 모드는 목 데이터 사용)
  useEffect(() => {
    if (searchParams.get("showcase") === "1") {
      setValidationData(DATA_VALIDATION_SHOWCASE);
      return;
    }

    if (!store.rawFile) {
      setError("업로드된 파일이 없습니다. 평가 데이터 화면으로 돌아가 주세요.");
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const runValidation = async () => {
      try {
        const backendMappings = store.columnMapping.map((row) => ({
          column: row.originalName,
          role: translateRoleToBackend(row.confirmedRole, resolveTaskType(store.taskType)),
          sample_values: row.sampleValues,
        }));

        const metadata = {
          positive_class: store.metadata?.positive_class || null,
          negative_class: store.metadata?.negative_class || null,
          positive_class_ambiguous: store.metadata?.positive_class_ambiguous || false,
          detected_classes: store.metadata?.detected_classes || [],
          detected_labels: store.metadata?.detected_labels || [],
          class_distribution: store.metadata?.class_distribution || {},
        };

        const beta = resolveBeta(store.metricDetails);

        const payload = {
          task_type: resolveTaskType(store.taskType),
          column_mappings: backendMappings,
          selected_metric_ids: store.selectedMetricIds,
          metadata: metadata,
          beta: beta,
          // 지금 매핑에서 쓰이는 값만(S2 P1) — 안 쓰이는 옛 값이 범위 밖이면 422 로 막혔다.
          decision_threshold: requestDecisionThreshold(
            resolveTaskType(store.taskType), store.columnMapping, store.decisionThreshold,
          ),
        };

        const formData = new FormData();
        formData.append("file", store.rawFile!);
        formData.append("data", JSON.stringify(payload));

        const response = await fetch(apiUrl("/api/validate-data"), {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `서버 오류: ${response.status}`);
        }

        const result: ValidateDataResponseData = await response.json();
        if (active) {
          setValidationData(result);
          // 리포트(6절 시험 결과)에서 재사용할 수 있도록 store에 보존
          store.setValidationResult(result);
        }
      } catch (err: any) {
        console.error("Data validation failed:", err);
        if (active) {
          setError(err.message || String(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    runValidation();

    return () => {
      active = false;
    };
  }, [store.rawFile, store.columnMapping, store.selectedMetricIds, store.taskType]);

  const buildEvaluationResult = (): EvaluationResult => {
    // 렌더 때 잡은 `store` 가 아니라 지금 값을 읽는다 — 검증 화면의 "다음"이 진행 기록을 남긴 직후
    // 다시 부르기 때문이다(재료 선택 점검 6절).
    const workflowSnapshot: MapWorkflowToReportInput = buildReportInput(useWorkflowStore.getState());
    const reportData = mapWorkflowToFinalReport(workflowSnapshot, validationData);
    return { workflowSnapshot, reportData };
  };

  return { validationData, isLoading, error, buildEvaluationResult };
}
