import { useState } from "react";
import { useNavigate } from "react-router";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ColumnMapping as ColumnMappingContent } from "../components/column-mapping/ColumnMapping";
import { confirmMapping } from "../lib/report/confirmMappingApi";

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
      const result = await confirmMapping({
        columnMapping: store.columnMapping,
        taskType: store.taskType,
        selectedMetricIds: store.selectedMetricIds,
      });

      if (!result.is_valid) {
        const errorMsgs = result.errors.map((e) => `• ${e.message}`).join("\n");
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
        onSelectedMetricIdsChange={store.setSelectedMetricIds}
        onGoBackToUpload={handlePrevious}
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
