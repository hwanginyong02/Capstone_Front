import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { WorkflowShell } from "../layout/WorkflowShell";
import {
  DataUpload as DataUploadContent,
  isEvaluationDataUploadValid,
} from "../components/data-upload/DataUpload";
/**
 * 데이터 업로드 — 평가 구간의 첫 단계.
 *
 * **컬럼 자동 분석(`/api/analyze-columns`)은 여기서 돌리지 않는다.** 그 호출은 최대 150초가
 * 걸리는데(`ANALYSIS_TIMEOUT_MS`), 결과를 쓰는 화면은 컬럼 매핑이다. 여기서 돌리면
 * 결과가 필요 없는 지표 선택으로 가려고 그 시간을 기다리게 된다. 분석은 매핑 직전인
 * 지표 선택의 '다음'에서 실행한다.
 *
 * 학습 데이터셋 정보도 이 화면에서 빠졌다 — 평가에 쓰이지 않고 성적서 3절을 채우는 값이라
 * 성적서 구간(`/report/:id/issue-info`)으로 옮겼다. 다만 모델명·버전은 여기 남는다:
 * 평가 결과를 식별하는 이름표라, 성적서를 내지 않는 run 에도 반드시 있어야 한다.
 */
export function DataUpload() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const flow = useStepFlow("upload");
  const [fileError, setFileError] = useState<string | null>(null);

  // 분류 유형은 진입 화면에서 고른다. 유형 없이 들어오면 안내할 컬럼도 분석 기준도
  // 정해지지 않으므로 진입 화면으로 돌려보낸다.
  useEffect(() => {
    if (!store.taskType) {
      navigate("/app", { replace: true });
    }
  }, [store.taskType, navigate]);

  const handleNext = () => {
    if (!store.rawFile) {
      setFileError("Evaluation file is missing. Please re-upload it in this step.");
      return;
    }

    setFileError(null);
    flow.goNext();
  };

  return (
    <WorkflowShell
      showActionBar
      showPrevious={false}
      showNext
      onNext={handleNext}
      nextDisabled={
        !isEvaluationDataUploadValid(
          store.uploadedFile,
          !!store.rawFile,
          store.basicInfo.modelName,
          store.basicInfo.versionName,
        )
      }
      nextLabel="Next step"
    >
      {fileError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      )}
      <DataUploadContent
        taskType={store.taskType}
        uploadedFile={store.uploadedFile}
        onUploadedFileChange={store.setUploadedFile}
        modelName={store.basicInfo.modelName}
        versionName={store.basicInfo.versionName}
        onModelNameChange={(value) =>
          store.setBasicInfo((prev) => ({ ...prev, modelName: value }))
        }
        onVersionNameChange={(value) =>
          store.setBasicInfo((prev) => ({ ...prev, versionName: value }))
        }
        needsReupload={!!store.uploadedFile && !store.rawFile}
      />
    </WorkflowShell>
  );
}
