import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { AppHeader } from "./components/AppHeader";
import { StepTabs } from "./components/StepTabs";
import { ActionBar } from "./components/ActionBar";
import { pathToStep, useWorkflowStore } from "../utils/stores/useWorkflowStore";

interface WorkflowShellProps {
  children: ReactNode;
  showActionBar?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  leftAction?: ReactNode;
}

/**
 * Shared layout shell for all workflow step pages.
 * Renders AppHeader + StepTabs once, wraps step-specific content in a consistent main container.
 * Also handles rendering the sticky ActionBar at the bottom if requested.
 */
export function WorkflowShell({ 
  children,
  showActionBar = false,
  showPrevious,
  showNext,
  onPrevious,
  onNext,
  nextDisabled,
  nextLabel,
  leftAction
}: WorkflowShellProps) {
  const location = useLocation();
  const isShowcaseMode = new URLSearchParams(location.search).get("showcase") === "1";

  useEffect(() => {
    const step = pathToStep(location.pathname);
    const store = useWorkflowStore.getState();
    store.setCurrentStep(step);

    if (isShowcaseMode) {
      store.setBasicInfo((prev) => ({
        ...prev,
        companyName: prev.companyName || "Apex AI Lab",
        representative: prev.representative || "Jane Lee",
        businessNumber: prev.businessNumber || "123-45-67890",
        phone: prev.phone || "02-1234-5678",
        address: prev.address || "Seoul, Korea",
        reportPurpose: prev.reportPurpose || "external",
        projectName: prev.projectName || "Document classification evaluation",
        projectAgency: prev.projectAgency || "Apex AI Lab",
        projectNumber: prev.projectNumber || "ML-EVAL-2026-001",
        modelName: prev.modelName || "ReviewClassifier-B",
        modelPurpose: prev.modelPurpose || "Classifies customer review sentiment for quality monitoring.",
        modelCategory: prev.modelCategory || "Text classification",
        taskType: "binary",
        envOS: prev.envOS || "Ubuntu 22.04",
        envCPU: prev.envCPU || "8 vCPU",
        envGPU: prev.envGPU || "NVIDIA T4",
        envMemory: prev.envMemory || "32 GB",
        envSoftware: prev.envSoftware || "Python 3.11 / PyTorch 2.x",
      }));
      store.setTaskType("binary");
      store.setSelectedMetricIds(["M1", "M2", "M3", "M4", "M9", "M21", "M22", "M23"]);
      store.setColumnMapping([
        {
          originalName: "row_id",
          sampleValues: ["S001", "S002", "S003"],
          inferredRole: "id",
          confirmedRole: "id",
          modified: false,
          warnings: [],
        },
        {
          originalName: "actual_result",
          sampleValues: ["1", "0", "1"],
          inferredRole: "y_true",
          confirmedRole: "y_true",
          modified: false,
          warnings: [],
        },
        {
          originalName: "predicted_result",
          sampleValues: ["1", "1", "1"],
          inferredRole: "y_pred",
          confirmedRole: "y_pred",
          modified: false,
          warnings: [],
        },
        {
          originalName: "positive_score",
          sampleValues: ["0.92", "0.67", "0.88"],
          inferredRole: "score",
          confirmedRole: "score",
          modified: false,
          warnings: ["Please review this mapping. The column may contain score or probability values."],
        },
        {
          originalName: "comment",
          sampleValues: ["pass", "review", "retry"],
          inferredRole: "ignore",
          confirmedRole: "ignore",
          modified: false,
          warnings: [],
        },
      ]);
      store.setMetadata({
        positive_class: "1",
        negative_class: "0",
        positive_class_ambiguous: false,
        class_distribution: { "0": 52, "1": 48 },
      });
      store.setDatasetInfo({
        trainingDatasetName: "Binary review dataset",
        trainingSampleCount: "100",
        validationSampleCount: "100",
        trainingDataFormat: "Structured JSON",
        trainingClassDistribution: "Negative 52 / Positive 48",
        trainingDataDescription:
          "Customer review sentiment samples labeled by human annotators.",
      });
      store.setUploadedFile({
        name: "eval_result_1775625159458.json",
        size: "42 KB",
        type: "application/json",
      });
      store.setTrainingExampleFiles([
        { name: "valid_review_examples.json", size: "18 KB", type: "application/json" },
      ]);
      store.setTrainingUnsuitableExampleFiles([
        { name: "edge_case_examples.json", size: "12 KB", type: "application/json" },
      ]);
      [1, 2, 3, 4].forEach((completedStep) => store.markStepCompleted(completedStep));
      store.setCurrentStep(step);
    }
  }, [location.pathname, location.search, isShowcaseMode]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative">
      <AppHeader />
      <StepTabs />
      <div className="flex-1 pb-8">
        {children}
      </div>
      {showActionBar && !isShowcaseMode && (
        <ActionBar 
          showPrevious={showPrevious}
          showNext={showNext}
          onPrevious={onPrevious}
          onNext={onNext}
          nextDisabled={nextDisabled}
          nextLabel={nextLabel}
          leftAction={leftAction}
        />
      )}
    </div>
  );
}
