import { useNavigate } from "react-router";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { DataValidation as DataValidationContent } from "../components/data-validation/DataValidation";
import { useDataValidation } from "../hooks/useDataValidation";

/**
 * Step 6 — Data Validation page
 *
 * 페칭/검증 로직은 useDataValidation 훅이 담당하고, 페이지는 결과 주입과
 * 네비게이션(평가 실행 이력 저장 포함)만 처리하는 얇은 컨트롤러다.
 */
export function DataValidation() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const { activeWorkspaceId, addEvaluationRun } = useWorkspaceStore();
  const { validationData, isLoading, error, buildEvaluationResult } = useDataValidation();

  const hasBlockingError = (validationData?.error_count ?? 0) > 0;

  const handleNext = () => {
    const { workflowSnapshot, reportData } = buildEvaluationResult();

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
