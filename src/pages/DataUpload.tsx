import { useNavigate } from "react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { useWorkflowStore, stepToPath } from "../utils/stores/useWorkflowStore";
import { WorkflowShell } from "../layout/WorkflowShell";
import {
  DataUpload as DataUploadContent,
  isEvaluationDataUploadValid,
  isTrainingDatasetInfoValid,
  type DataUploadPhase,
} from "../components/data-upload/DataUpload";
import { useColumnAnalysis } from "../hooks/useColumnAnalysis";

/**
 * Step 4 — Data Upload page
 *
 * 자동 컬럼 분석 fetch 는 useColumnAnalysis 훅이 담당하고, 페이지는 phase 전환과
 * 네비게이션만 처리하는 얇은 컨트롤러다.
 */
export function DataUpload() {
  const navigate = useNavigate();
  const store = useWorkflowStore();
  const [phase, setPhase] = useState<DataUploadPhase>("evaluation");
  const { analyzeColumns, isAnalyzing, cancel } = useColumnAnalysis();
  // 종전에는 raw alert() 로만 드러났다. 화면 안에 남겨야 사용자가 읽고 조치할 수 있다(E-18).
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleNext = async () => {
    if (phase === "evaluation") {
      setPhase("training");
      return;
    }

    if (!store.rawFile) {
      setAnalysisError("Evaluation file is missing. Please re-upload it in this step.");
      return;
    }

    setAnalysisError(null);
    try {
      const { rows, metadata } = await analyzeColumns(
        store.rawFile,
        store.taskType || "multiclass",
      );

      store.setColumnMapping(rows);
      store.setMetadata(metadata);

      store.markStepCompleted(4);
      store.setCurrentStep(5);
      navigate(stepToPath(5));
    } catch (err: any) {
      console.error("Column analysis failed:", err);
      setAnalysisError(err?.message || String(err));
    }
  };

  const handlePrevious = () => {
    if (phase === "training") {
      setPhase("evaluation");
      return;
    }

    store.setCurrentStep(3);
    navigate(stepToPath(3));
  };

  const nextDisabled =
    phase === "evaluation"
      ? !isEvaluationDataUploadValid(store.datasetInfo, store.uploadedFile)
      : !isTrainingDatasetInfoValid(store.datasetInfo) || isAnalyzing;

  return (
    <WorkflowShell
      showActionBar
      showPrevious={!isAnalyzing}
      showNext={true}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextDisabled={nextDisabled}
      nextLabel={isAnalyzing ? "Analyzing..." : (phase === "evaluation" ? "Next: training dataset" : "Next step")}
      leftAction={
        isAnalyzing ? (
          <Button variant="outline" onClick={cancel}>
            Cancel analysis
          </Button>
        ) : undefined
      }
    >
      {analysisError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{analysisError}</AlertDescription>
        </Alert>
      )}
      <DataUploadContent
        phase={phase}
        onPhaseChange={setPhase}
        taskType={store.taskType}
        selectedMetricIds={store.selectedMetricIds}
        datasetInfo={store.datasetInfo}
        onDatasetInfoChange={store.setDatasetInfo}
        uploadedFile={store.uploadedFile}
        onUploadedFileChange={store.setUploadedFile}
        trainingExampleFiles={store.trainingExampleFiles}
        onTrainingExampleFilesChange={store.setTrainingExampleFiles}
        trainingUnsuitableExampleFiles={store.trainingUnsuitableExampleFiles}
        onTrainingUnsuitableExampleFilesChange={store.setTrainingUnsuitableExampleFiles}
      />
    </WorkflowShell>
  );
}
