import { useState } from "react";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ColumnMapping as ColumnMappingContent } from "../components/column-mapping/ColumnMapping";
import { confirmMapping } from "../lib/report/confirmMappingApi";
import { FileReuploadNotice } from "../components/workflow/FileReuploadNotice";

/**
 * 컬럼 매핑.
 *
 * 지표 선택 **뒤**에 온다. 그래야 "선택한 지표가 요구하는 역할"을 계산해 누락을 짚어줄 수
 * 있다(`getRequiredColumnsForSelection`).
 *
 * 순서를 이렇게 둔 이유는 다음 단계인 검증 때문이기도 하다 — `/api/validate-data` 는
 * `selected_metric_ids` 가 비면 422 로 거절한다(`EvaluateRequest` 의 `min_length=1`).
 * 지표 선택은 검증보다 반드시 앞서야 한다.
 */
export function ColumnMapping() {
  const store = useWorkflowStore();
  const flow = useStepFlow("mapping");
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

      // 경고와 가용 지표는 진행을 막지 않지만 **버려서도 안 된다**(ISSUES.md B-04·A-12).
      // 6단계 상단에 합쳐 보여준다 — 여기서 띄우면 안내가 도착하는 순간 이미 다음
      // 화면으로 넘어가 있다.
      store.setMappingFeedback({
        warnings: result.warnings ?? [],
        availableMetricIds: result.available_metric_ids ?? null,
      });

      if (!result.is_valid) {
        const errorMsgs = result.errors.map((e) => `• ${e.message}`).join("\n");
        alert(`매핑 유효성 검사 실패:\n${errorMsgs}`);
        return;
      }

      flow.goNext();
    } catch (err: any) {
      console.error("Mapping confirmation failed:", err);
      alert(`매핑 확인 실패: ${err.message || err}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePrevious = () => flow.goPrevious();

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
      <FileReuploadNotice />
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
        decisionThreshold={store.decisionThreshold}
        onDecisionThresholdChange={store.setDecisionThreshold}
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
