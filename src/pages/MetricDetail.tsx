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

  const handleNext = () => {
    const currentMetric = selectedMetrics[currentMetricIndex];
    const currentState = currentMetric ? store.metricDetails[currentMetric.id] : undefined;
    const currentMetricIsValid =
      currentMetric && currentState
        ? isCurrentMetricValid(store.taskType, currentMetric.id, currentState)
        : false;

    if (currentMetric && currentState) {
      store.setMetricDetails((prev) => ({
        ...prev,
        [currentMetric.id]: { ...prev[currentMetric.id], completed: currentMetricIsValid },
      }));
    }

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
    const currentMetric = selectedMetrics[currentMetricIndex];
    const currentState = currentMetric ? store.metricDetails[currentMetric.id] : undefined;

    if (currentMetric && currentState) {
      const completed = isCurrentMetricValid(store.taskType, currentMetric.id, currentState);
      store.setMetricDetails((prev) => ({
        ...prev,
        [currentMetric.id]: { ...prev[currentMetric.id], completed },
      }));
    }

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
