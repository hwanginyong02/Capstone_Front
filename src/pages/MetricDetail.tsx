import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { MetricDetailInput, isCurrentMetricValid } from "../components/metric-detail/MetricDetailInput";
import { getSelectedMetrics } from "../data/evaluationData";

/**
 * Step 3 — Metric detail page
 */
export function MetricDetail() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);

  const resolvedTaskType = store.taskType || "multiclass";
  const selectedMetrics = useMemo(
    () => getSelectedMetrics(resolvedTaskType, store.selectedMetricIds),
    [resolvedTaskType, store.selectedMetricIds]
  );

  // 현재 지표의 유효성을 계산해 completed 플래그를 스토어에 반영한다.
  // handleNext(다음 지표/단계 이동)와 handleMetricSelect(탭 클릭 이동) 양쪽에서 공유한다.
  const markCurrentMetricCompleted = () => {
    const currentMetric = selectedMetrics[currentMetricIndex];
    const currentState = currentMetric ? store.metricDetails[currentMetric.id] : undefined;

    if (currentMetric && currentState) {
      const completed = isCurrentMetricValid(store.taskType, currentMetric.id, currentState);
      store.setMetricDetails((prev) => ({
        ...prev,
        [currentMetric.id]: { ...prev[currentMetric.id], completed },
      }));
    }
  };

  const handleNext = () => {
    markCurrentMetricCompleted();

    if (currentMetricIndex < selectedMetrics.length - 1) {
      setCurrentMetricIndex((prev) => prev + 1);
    } else {
      store.markStepCompleted(3);
      store.setCurrentStep(4);
      navigate(stepToPath(4));
    }
  };

  const handlePrevious = () => {
    if (currentMetricIndex > 0) {
      setCurrentMetricIndex((prev) => prev - 1);
    } else {
      store.setCurrentStep(2);
      navigate(stepToPath(2));
    }
  };

  const handleMetricSelect = (nextIndex: number) => {
    markCurrentMetricCompleted();
    setCurrentMetricIndex(nextIndex);
  };

  const currentMetric = selectedMetrics[currentMetricIndex];
  const currentState = currentMetric ? store.metricDetails[currentMetric.id] : undefined;
  const isComplete =
    currentMetric && currentState
      ? isCurrentMetricValid(store.taskType, currentMetric.id, currentState)
      : false;

  return (
    <WorkflowShell
      showActionBar
      showPrevious={true}
      showNext={true}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextDisabled={!isComplete}
      nextLabel={currentMetricIndex < selectedMetrics.length - 1 ? "Next metric" : "Finish"}
    >
      <MetricDetailInput
        taskType={store.taskType}
        selectedMetricIds={store.selectedMetricIds}
        metricDetails={store.metricDetails}
        onMetricDetailsChange={store.setMetricDetails}
        currentMetricIndex={currentMetricIndex}
        onCurrentMetricIndexChange={handleMetricSelect}
      />
    </WorkflowShell>
  );
}
