import { useNavigate } from "react-router";
import { useState } from "react";
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
  const { analyzeColumns, isAnalyzing } = useColumnAnalysis();

  const handleNext = async () => {
    if (phase === "evaluation") {
      setPhase("training");
      return;
    }

    if (!store.rawFile) {
      alert("Evaluation file is missing. Please re-upload.");
      return;
    }

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
      alert(`자동 컬럼 매핑 분석 실패: ${err.message || err}`);
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
    >
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
