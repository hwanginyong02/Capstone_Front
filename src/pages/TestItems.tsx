import { useState } from "react";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import { TestItems as TestItemsContent } from "../components/test-items/TestItems";
import { PassCriteriaCard } from "../components/test-items/PassCriteriaCard";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { focusFirstIssue } from "../components/composer-input/focusFirstIssue";
import { getCard, getCardFields } from "../data/reportComposer";
import { getFieldIssue, type FieldIssue } from "../utils/domain/composerFieldGate";
import { passCriteriaState } from "../utils/domain/passCriteria";

/**
 * 지표와 합격 기준 (`/app/metrics`) — 평가 관점 다음, 검증 앞(docs/MATERIAL_PICKER.md §3).
 *
 * ② 를 한 화면에서 받는다: 지표, β(Fβ 를 골랐을 때), 지표 선택 이유(멀티레이블), 지표마다의 합격
 * 목표값과 핵심 지표. 목표값은 평가 **전에** 받고, 결과와의 비교는 성적서가 한다(§3). 종전에는
 * 목표값과 핵심 지표를 Details 화면이 받았다(§5).
 *
 * 컬럼 매핑이 이 화면보다 앞이다. 검증(`/api/validate-data`)은 `selected_metric_ids` 가 비면
 * 거절하므로 검증은 이 화면 뒤에 둔다 — 백엔드를 바꾸지 않고 순서로 지킨다.
 *
 * β(M5)는 목표값과 달리 `/api/evaluate` 페이로드에 실리는 **평가 입력**이다.
 */
export function TestItems() {
  const store = useWorkflowStore();
  const flow = useStepFlow("metrics");
  // 지표 선택 이유의 빈 칸은 다음을 누른 뒤에만 빨갛게 칠한다(`pages/DataInfo.tsx` 와 같은 규칙).
  const [showErrors, setShowErrors] = useState(false);

  /** ② 카드 중 레지스트리로 그리는 필드(멀티레이블의 지표 선택 이유)만 검사한다. */
  const metricCard = getCard("metrics");
  const metricCardIssues = getCardFields("metrics", store.taskType)
    .filter((field) => field.step === "metrics")
    .map((field) => getFieldIssue(metricCard, field, store.composerMetrics))
    .filter((issue): issue is FieldIssue => issue !== null);

  const beta = store.metricDetails["M5"]?.beta ?? "1.0";
  const betaInvalid =
    store.selectedMetricIds.includes("M5") &&
    (beta.trim() === "" || !Number.isFinite(Number(beta)) || Number(beta) <= 0);

  const handleBetaChange = (value: string) => {
    store.setMetricDetails((prev) => {
      const existing = prev.M5 ?? {
        id: "M5",
        name: "F-beta Score",
        description: "",
        targetValue: "",
        positiveClass: "",
        completed: false,
        beta: "1.0",
      };
      return { ...prev, M5: { ...existing, beta: value } };
    });
  };

  const criteria = passCriteriaState(
    store.taskType,
    store.selectedMetricIds,
    store.metricDetails,
    store.composerMetrics,
  );

  const updateTarget = (metricId: string, name: string, value: string) => {
    store.setMetricDetails((prev) => {
      const existing = prev[metricId] ?? {
        id: metricId,
        name,
        description: "",
        beta: "",
        positiveClass: "",
        completed: false,
        targetValue: "",
      };
      return { ...prev, [metricId]: { ...existing, targetValue: value } };
    });
  };

  /**
   * 핵심 지표를 하나 바꾸는 순간 지금 보이는 목록 전체를 사용자의 선택으로 저장한다 — 기본값과
   * 사용자 선택이 섞여 어느 쪽인지 모르게 되지 않게 한다.
   */
  const toggleCore = (metricId: string, on: boolean) => {
    const next = on
      ? [...new Set([...criteria.coreMetricIds, metricId])]
      : criteria.coreMetricIds.filter((id) => id !== metricId);
    store.setComposerMetrics((prev) => ({ ...prev, coreMetrics: { choices: next } }));
  };

  const handleNext = () => {
    if (metricCardIssues.length > 0) {
      setShowErrors(true);
      focusFirstIssue(metricCardIssues);
      return;
    }
    flow.goNext();
  };

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={handleNext}
      // 지표 선택 이유는 잠그지 않는다 — 누르면 어느 칸이 비었는지 말해 준다. 지표·β·목표값은
      // 칸이 눈앞에 있고 틀린 값을 바로 표시하므로 종전대로 잠근다.
      nextDisabled={
        store.selectedMetricIds.length === 0 ||
        betaInvalid ||
        !criteria.targetsValid ||
        !criteria.coreValid
      }
      previousLabel="이전"
      nextLabel="다음"
      rightAction={<RemainingNotice issues={metricCardIssues} />}
    >
      <TestItemsContent
        taskType={store.taskType}
        selectedMetricIds={store.selectedMetricIds}
        onSelectedMetricsChange={store.setSelectedMetricIds}
        beta={beta}
        onBetaChange={handleBetaChange}
        showErrors={showErrors}
        metricCardValues={store.composerMetrics}
        onMetricCardChange={(fieldId, next) =>
          store.setComposerMetrics((prev) => ({ ...prev, [fieldId]: next }))
        }
        metricCardIssues={metricCardIssues}
        passCriteria={
          store.selectedMetricIds.length > 0 ? (
            <PassCriteriaCard
              targetMetrics={criteria.targetMetrics}
              metricDetails={store.metricDetails}
              coreMetricIds={criteria.coreMetricIds}
              coreValid={criteria.coreValid}
              onTargetChange={updateTarget}
              onToggleCore={toggleCore}
            />
          ) : undefined
        }
      />
    </WorkflowShell>
  );
}
