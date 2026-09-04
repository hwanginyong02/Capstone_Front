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
  mapWorkflowToFinalReport,
  type MapWorkflowToReportInput,
} from "../lib/report/mapWorkflowToFinalReport";
import type { ValidateDataResponseData } from "../types/validation.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { DATA_VALIDATION_SHOWCASE } from "../data/dataValidationShowcase";

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
      setError("업로드된 파일이 없습니다. 데이터 업로드 단계로 돌아가 주세요.");
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const runValidation = async () => {
      try {
        const backendMappings = store.columnMapping.map((row) => ({
          column: row.originalName,
          role: translateRoleToBackend(row.confirmedRole, store.taskType || "multiclass"),
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

        const beta = parseFloat(store.metricDetails?.["M5"]?.beta || "1.0");

        const payload = {
          task_type: store.taskType || "multiclass",
          column_mappings: backendMappings,
          selected_metric_ids: store.selectedMetricIds,
          metadata: metadata,
          beta: beta,
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
          throw new Error(errorData.detail || `Server error: ${response.status}`);
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
    const workflowSnapshot: MapWorkflowToReportInput = {
      basicInfo: store.basicInfo,
      datasetInfo: store.datasetInfo,
      taskType: store.taskType,
      selectedMetricIds: store.selectedMetricIds,
      metricDetails: store.metricDetails,
      uploadedFile: store.uploadedFile,
      trainingExampleFiles: store.trainingExampleFiles,
      trainingUnsuitableExampleFiles: store.trainingUnsuitableExampleFiles,
      columnMapping: store.columnMapping,
      classLabelDescriptions: store.classLabelDescriptions,
      metadata: store.metadata,
    };
    const reportData = mapWorkflowToFinalReport(workflowSnapshot, validationData);
    return { workflowSnapshot, reportData };
  };

  return { validationData, isLoading, error, buildEvaluationResult };
}
