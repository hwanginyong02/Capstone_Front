import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import { Alert, AlertDescription } from "../components/ui/alert";
import { DataValidation as DataValidationContent } from "../components/data-validation/DataValidation";
import { useDataValidation } from "../hooks/useDataValidation";
import {
  describeValidationGate,
  getValidationGateReason,
} from "../utils/domain/validationGate";
import { FileReuploadNotice } from "../components/workflow/FileReuploadNotice";

/** 평가 실행(성적서 생성) 중 발생한 예외를 사용자가 읽을 수 있는 문장으로 바꾼다. */
function describeSubmitError(err: unknown): string {
  // 평가 결과는 localStorage 에 저장된다(서버에 사본이 없음). run 하나당 컬럼별 고유값
  // 전량이 담긴 metadata 가 함께 들어가 용량이 크고, 한도를 넘으면 여기서 예외가 난다.
  const isQuota =
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");

  if (isQuota) {
    return (
      "브라우저 저장 공간이 가득 차 평가 결과를 저장하지 못했습니다. " +
      "워크스페이스 상세 화면에서 오래된 평가 기록을 삭제한 뒤 다시 시도해 주세요."
    );
  }

  return err instanceof Error ? err.message : String(err);
}

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

  const [submitError, setSubmitError] = useState<string | null>(null);

  // 검증이 실패했거나 아예 수행되지 않은 경우(validationData === null)를 '오류 0건'으로
  // 읽지 않는다. 종전 판정 `(validationData?.error_count ?? 0) > 0` 은 그 둘을 `?? 0` 에
  // 흡수시켜, 검증 절이 통째로 빈 성적서를 발급 가능 상태까지 통과시켰다(ISSUES.md E-04).
  const gateReason = getValidationGateReason({ validationData, isLoading, error });
  const gateMessage = describeValidationGate(gateReason);

  // 이 핸들러에서 예외가 나면 React 는 잡아주지 않는다(ErrorBoundary 도 없음).
  // 감싸지 않으면 "버튼을 눌러도 아무 일도 안 일어나는" 무증상 실패가 된다.
  const handleNext = () => {
    setSubmitError(null);
    try {
      const { workflowSnapshot, reportData } = buildEvaluationResult();

      if (activeWorkspaceId) {
        const run = addEvaluationRun({
          workspaceId: activeWorkspaceId,
          modelName: store.basicInfo.modelName || "Untitled model",
          versionName: store.basicInfo.versionName || "v1.0.0",
          reportId: reportData.meta.reportId,
          workflowSnapshot,
          reportData,
        });

        // 저장에 성공한 뒤에만 단계를 넘긴다(실패 시 6단계에 머물러 재시도 가능).
        // run id 를 남겨야 성적서를 벗어난 뒤 7번 탭으로 돌아올 수 있다(ISSUES.md E-16).
        store.setLastRunId(run.id);
        store.markStepCompleted(6);
        store.markStepCompleted(7);
        store.setCurrentStep(7);
        navigate(`/report/${run.id}`);
        return;
      }

      store.markStepCompleted(6);
      store.setCurrentStep(7);
      navigate(stepToPath(7));
    } catch (err) {
      console.error("평가 실행(성적서 생성) 실패:", err);
      setSubmitError(describeSubmitError(err));
    }
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
      nextDisabled={gateReason !== "ok"}
      nextLabel="Run evaluation"
    >
      {submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      {gateMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{gateMessage}</AlertDescription>
        </Alert>
      )}
      <FileReuploadNotice />
      <DataValidationContent
        validationData={validationData}
        isLoading={isLoading}
        error={error}
      />
    </WorkflowShell>
  );
}
