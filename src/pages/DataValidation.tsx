import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiUrl } from "@/lib/apiBase";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import { WorkflowShell } from "../layout/WorkflowShell";
import {
  DataValidation as DataValidationContent,
  type ValidateDataResponseData,
} from "../components/data-validation/DataValidation";
import {
  mapWorkflowToFinalReport,
  type MapWorkflowToReportInput,
} from "../lib/report/mapWorkflowToFinalReport";

/**
 * Step 6 — Data Validation page
 *
 * 페이지 진입 시 /api/validate-data 를 호출하여 실제 전처리 검증 결과를 표시합니다.
 */
export function DataValidation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useWorkflowStore();
  const { activeWorkspaceId, addEvaluationRun } = useWorkspaceStore();

  const [validationData, setValidationData] = useState<ValidateDataResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBlockingError = (validationData?.error_count ?? 0) > 0;

  // 페이지 진입 시 /api/validate-data 호출
  useEffect(() => {
    if (searchParams.get("showcase") === "1") {
      setValidationData({
        task_type: "binary",
        selected_metric_ids: ["M1", "M2"],
        execution_summary: [
          { label: "총 샘플 수", value: "1,200", note: "건" },
          { label: "결측치 처리", value: "0", note: "건" },
        ],
        validation_details: [
          { name: "필수 컬럼 검사", result: "모든 필수 컬럼이 존재합니다.", handling: "통과", status: "pass", group: "common" },
          { name: "레이블 형식", result: "이진 분류 레이블 형식이 올바릅니다.", handling: "통과", status: "pass", group: "binary" },
        ],
        error_count: 0,
        warning_count: 0,
      });
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
          selected_tcs: store.selectedMetricIds,
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

  const handleNext = () => {
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

    store.markStepCompleted(6);
    store.setCurrentStep(7);

    if (activeWorkspaceId) {
      const run = addEvaluationRun({
        workspaceId: activeWorkspaceId,
        modelName: store.basicInfo.modelName || "Untitled model",
        versionName: store.basicInfo.versionName || "v1.0.0",
        reportId: reportData.meta.reportId,
        workflowSnapshot,
        reportData,
      });

      navigate(`/report/${run.id}`);
      return;
    }

    navigate(stepToPath(7));
  };

  const handlePrevious = () => {
    store.setCurrentStep(5);
    navigate(stepToPath(5));
  };

  return (
    <WorkflowShell
      showActionBar
      showPrevious={true}
      showNext={true}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextDisabled={hasBlockingError || isLoading}
      nextLabel="Run evaluation"
    >
      <DataValidationContent
        validationData={validationData}
        isLoading={isLoading}
        error={error}
      />
    </WorkflowShell>
  );
}
