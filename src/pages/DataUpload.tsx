import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { useColumnAnalysis } from "../hooks/useColumnAnalysis";
import { evaluationClassNames, keepPositiveClass } from "../utils/domain/evaluationClasses";
import { WorkflowShell } from "../layout/WorkflowShell";
import {
  DataUpload as DataUploadContent,
  isEvaluationDataUploadValid,
} from "../components/data-upload/DataUpload";
import { resolveTaskType } from "../data/evaluationData";

/**
 * ① 평가 데이터 — 결과 파일 업로드. 다음이 컬럼 매핑이다(docs/MATERIAL_PICKER.md §3).
 *
 * **컬럼 자동 분석(`/api/analyze-columns`)은 여기 '다음'에서 돌린다.** 결과를 쓰는 화면이 바로
 * 다음인 컬럼 매핑이다. 종전에는 매핑 직전이던 지표 선택의 '다음'에서 돌렸다 — 그때는 지표가
 * 매핑보다 앞이었다. 분석은 최대 150초가 걸리므로(`ANALYSIS_TIMEOUT_MS`) 취소할 수 있다.
 *
 * 모델 이름·버전은 ④ 평가 대상 모델 단계가 먼저 받는다.
 */
export function DataUpload() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const flow = useStepFlow("upload");
  const { analyzeColumns, isAnalyzing, cancel } = useColumnAnalysis();
  // 종전에는 raw alert() 로만 드러났다. 화면 안에 남겨야 사용자가 읽고 조치할 수 있다(E-18).
  const [fileError, setFileError] = useState<string | null>(null);

  // 분류 유형은 작업 유형 화면에서 고른다. 유형 없이 들어오면 안내할 컬럼도 분석 기준도
  // 정해지지 않으므로 그 화면으로 돌려보낸다.
  useEffect(() => {
    if (!store.taskType) {
      navigate("/app", { replace: true });
    }
  }, [store.taskType, navigate]);

  const handleNext = async () => {
    if (!store.rawFile) {
      setFileError("평가 데이터 파일이 없습니다. 이 화면에서 다시 올려 주세요.");
      return;
    }

    setFileError(null);
    try {
      const { rows, metadata, columnNotes } = await analyzeColumns(
        store.rawFile,
        resolveTaskType(store.taskType),
      );

      // 다시 올린 경우 전에 고른 양성 클래스가 새 파일의 클래스에도 있으면 지킨다(M5) — 분석은 metadata 를
      // 통째로 덮어, 종전에는 다시 올릴 때마다 자동 판단 값으로 조용히 뒤집혔다.
      const previousPositive = store.taskType === "binary" ? (store.metadata?.positive_class ?? "") : "";
      store.setColumnMapping(rows);
      const mapped = useWorkflowStore.getState().columnMapping;
      store.setMetadata(
        previousPositive && metadata
          ? {
              ...metadata,
              positive_class: keepPositiveClass(
                previousPositive,
                evaluationClassNames(store.taskType, mapped, metadata),
                metadata.positive_class ?? "",
              ),
            }
          : metadata,
      );
      // 백엔드가 만든 컬럼 대조 안내를 검증 단계까지 나른다(B-03).
      store.setColumnNotes(columnNotes);

      flow.goNext();
    } catch (err: any) {
      console.error("Column analysis failed:", err);
      setFileError(err?.message || String(err));
    }
  };

  return (
    <WorkflowShell
      showActionBar
      showPrevious={!isAnalyzing}
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={handleNext}
      nextDisabled={!isEvaluationDataUploadValid(store.uploadedFile, !!store.rawFile) || isAnalyzing}
      previousLabel="이전"
      nextLabel={isAnalyzing ? "컬럼 분석 중…" : "다음"}
      leftAction={
        isAnalyzing ? (
          <Button variant="outline" onClick={cancel}>
            분석 취소
          </Button>
        ) : undefined
      }
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
        needsReupload={!!store.uploadedFile && !store.rawFile}
        evalDataPicks={store.materialPicks.evalData}
      />
    </WorkflowShell>
  );
}
