import { useState } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from "@/lib/apiBase";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ColumnMapping as ColumnMappingContent } from "../components/column-mapping/ColumnMapping";

/**
 * Step 5 ??Column Mapping page
 */
export function ColumnMapping() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const [isValid, setIsValid] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  const handleNext = async () => {
    setIsConfirming(true);
    try {
      const translateRoleToBackend = (role: string | null, taskType: string) => {
        if (!role) return "ignore";
        if (role === "id") return "sample_id";
        if (role === "ignore") return "ignore";
        
        if (taskType === "binary") {
          if (role === "y_true") return "y_true";
          if (role === "y_pred") return "y_pred";
          if (role === "score") return "score_positive";
        } else if (taskType === "multiclass") {
          if (role === "y_true") return "y_true";
          if (role === "y_pred") return "y_pred";
          if (role === "prob_class_*") return "prob_per_class";
        } else if (taskType === "multilabel") {
          if (role === "y_true") return "true_labels";
          if (role === "y_pred") return "pred_labels";
          if (role === "prob_label_*") return "score_per_label";
        }
        return "ignore";
      };

      const backendMappings = store.columnMapping.map((row) => ({
        column: row.originalName,
        role: translateRoleToBackend(row.confirmedRole, store.taskType || "multiclass"),
        sample_values: row.sampleValues,
      }));

      const payload = {
        task_type: store.taskType || "multiclass",
        column_mappings: backendMappings,
        selected_metric_ids: store.selectedMetricIds,
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
        const errorMessage = errorData.detail || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.is_valid) {
        const errorMsgs = result.errors.map((e: any) => `• ${e.message}`).join("\n");
        alert(`매핑 유효성 검사 실패:\n${errorMsgs}`);
        return;
      }

      store.markStepCompleted(5);
      store.setCurrentStep(6);
      navigate(stepToPath(6));
    } catch (err: any) {
      console.error("Mapping confirmation failed:", err);
      alert(`매핑 확인 실패: ${err.message || err}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePrevious = () => {
    store.setCurrentStep(4);
    navigate(stepToPath(4));
  };

  const handlePositiveClassChange = (val: string) => {
    store.setMetadata({
      ...(store.metadata || {}),
      positive_class: val,
    });
  };

  return (
    <WorkflowShell
      showActionBar
      showPrevious={!isConfirming}
      showNext={true}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextDisabled={!isValid || isConfirming}
      nextLabel={isConfirming ? "Confirming..." : "Confirm mapping"}
    >
      <ColumnMappingContent
        taskType={store.taskType}
        selectedMetricIds={store.selectedMetricIds}
        rows={store.columnMapping}
        onRowsChange={store.setColumnMapping}
        onValidationChange={setIsValid}
        classLabelDescriptions={store.classLabelDescriptions}
        onClassLabelDescriptionsChange={store.setClassLabelDescriptions}
        positiveClass={store.metadata?.positive_class || ""}
        onPositiveClassChange={handlePositiveClassChange}
        positiveClassAmbiguous={store.metadata?.positive_class_ambiguous}
        detectedClasses={
          store.metadata?.detected_classes?.length
            ? store.metadata.detected_classes
            : store.metadata?.detected_labels
        }
        columnUniqueValues={store.metadata?.column_unique_values}
      />
    </WorkflowShell>
  );
}
