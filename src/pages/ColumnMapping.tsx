import { useState } from "react";
import { useNavigate } from "react-router";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ColumnMapping as ColumnMappingContent } from "../components/column-mapping/ColumnMapping";
import { confirmMapping } from "../lib/report/confirmMappingApi";
import { FileReuploadNotice } from "../components/workflow/FileReuploadNotice";
import type { FlowEntryState } from "../types/reportComposer.types";
import type { MappingRow } from "../types/mapping.types";
import { evaluationClassNames, keepPositiveClass } from "../utils/domain/evaluationClasses";

/**
 * 컬럼 매핑 — ① 평가 데이터의 두 번째 화면. 업로드 다음이다(docs/MATERIAL_PICKER.md §3).
 *
 * 지표 선택보다 **앞**에 온다. 매핑은 고른 지표에 기대지 않는다 — 정답과 예측(또는 확률)만
 * 요구하고(`getBaseRequiredColumns`), `/api/confirm-mapping` 에는 지표 목록을 늘 비워 보낸다.
 * 그러면 백엔드는 지표 때문에 매핑을 거절하지 않고, 지표마다 계산할 수 있는지
 * (`available_metric_ids`)만 돌려준다. 지표 화면이 그 답으로 계산할 수 없는 지표를 비활성으로
 * 둔다. 검증(`validate-data`)은 지표 목록이 있어야 하므로 지표 다음에 둔다.
 *
 * 종전의 "지표 제외"(빠진 컬럼이 필요한 지표를 이 화면에서 빼기)는 없앴다 — 이 화면에서는 아직
 * 고른 지표가 없다.
 */
export function ColumnMapping() {
  const store = useWorkflowStore();
  const flow = useStepFlow("mapping");
  const [isValid, setIsValid] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const navigate = useNavigate();

  /** 맡아 둔 행의 항목을 평가 흐름에서 넣고 "다음"으로 이 화면에 돌아온다. */
  const handlePlaceLeaf = (leafId: string) => {
    const entry: FlowEntryState = { cardId: "evalData", leafIds: [leafId], returnStep: "mapping" };
    navigate("/app/composer", { state: entry });
  };

  const handleNext = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmMapping({
        columnMapping: store.columnMapping,
        taskType: store.taskType,
        selectedMetricIds: [],
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

  /**
   * 매핑을 바꾼다. 이진에서 정답 컬럼이 바뀌어 고른 양성 클래스가 새 클래스 목록에 없으면 비운다(B5④) —
   * 옛 값이 남으면 다른 컬럼의 값을 양성으로 평가한다. 비우면 양성 클래스를 다시 골라야 확정된다.
   */
  const handleRowsChange = (value: MappingRow[] | ((prev: MappingRow[]) => MappingRow[])) => {
    store.setColumnMapping(value);
    const next = useWorkflowStore.getState();
    if (next.taskType !== "binary") return;
    const current = next.metadata?.positive_class ?? "";
    const kept = keepPositiveClass(current, evaluationClassNames(next.taskType, next.columnMapping, next.metadata), "");
    if (kept !== current) next.setMetadata({ ...(next.metadata || {}), positive_class: kept });
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
      nextLabel={isConfirming ? "확정하는 중…" : "매핑 확정"}
    >
      <FileReuploadNotice />
      <ColumnMappingContent
        taskType={store.taskType}
        rows={store.columnMapping}
        onRowsChange={handleRowsChange}
        onValidationChange={setIsValid}
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
        evalDataPicks={store.materialPicks.evalData}
        onPlaceLeaf={handlePlaceLeaf}
      />
    </WorkflowShell>
  );
}
