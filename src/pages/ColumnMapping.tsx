import { useState } from "react";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ColumnMapping as ColumnMappingContent } from "../components/column-mapping/ColumnMapping";
import { confirmMapping } from "../lib/report/confirmMappingApi";
import { FileReuploadNotice } from "../components/workflow/FileReuploadNotice";

/**
 * 컬럼 매핑 — ① 평가 데이터의 두 번째 화면. 업로드 다음이다(docs/MATERIAL_PICKER.md §3).
 *
 * 지표 선택보다 **앞**에 온다. 매핑은 고른 지표에 기대지 않는다 — 지표가 없으면 정답과 예측
 * (또는 확률)만 요구하고(`getBaseRequiredColumns`), `/api/confirm-mapping` 도 지표 목록 없이
 * 받아 지표마다 계산할 수 있는지(`available_metric_ids`)를 돌려준다. 검증(`validate-data`)은
 * 지표 목록이 있어야 하므로 지표 다음에 둔다.
 *
 * 지표를 고른 뒤 이 화면으로 돌아왔다면 고른 지표를 함께 보내, 계산할 수 없게 된 지표를 백엔드가
 * 짚어 준다.
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
      // 검증 단계 상단에 합쳐 보여준다 — 여기서 띄우면 안내가 도착하는 순간 이미 다음
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
      nextLabel={isConfirming ? "확정하는 중…" : "매핑 확정"}
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
