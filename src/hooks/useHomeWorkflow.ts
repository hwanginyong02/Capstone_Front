import { useState } from "react";
import type { TaskType } from "../data/evaluationData";
import {
  DEFAULT_BASIC_INFO,
  DEFAULT_DATASET_INFO,
  type BasicInfoFormData,
  type DatasetInfoFormData,
  type TcDetailStateMap,
  type UploadedFileInfo,
} from "../types/workflow.types";

export function useHomeWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const [selectedTCIds, setSelectedTCIds] = useState<string[]>([]);
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormData>(DEFAULT_BASIC_INFO);
  const [tcDetails, setTcDetails] = useState<TcDetailStateMap>({});
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfoFormData>(DEFAULT_DATASET_INFO);

  const handleTaskTypeChange = (type: string) => {
    setTaskType(type as TaskType);
    setSelectedTCIds([]);
    setTcDetails({});
    setUploadedFile(null);
    setBasicInfo((prev) => ({ ...prev, taskType: type as TaskType }));
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const commonStep = {
    currentStep,
    completedSteps,
    taskType,
    selectedTCIds,
    onStepClick: handleStepClick,
    onNext: handleNext,
    onPrevious: handlePrevious,
  };

  return {
    currentStep,
    commonStep,
    basicInfoStep: {
      ...commonStep,
      formData: basicInfo,
      onFormDataChange: setBasicInfo,
      onTaskTypeChange: handleTaskTypeChange,
    },
    testItemsStep: {
      ...commonStep,
      taskType,
      onSelectedTCsChange: setSelectedTCIds,
    },
    tcDetailStep: {
      ...commonStep,
      tcDetails,
      onTcDetailsChange: setTcDetails,
    },
    dataUploadStep: {
      ...commonStep,
      datasetInfo,
      onDatasetInfoChange: setDatasetInfo,
      uploadedFile,
      onUploadedFileChange: setUploadedFile,
    },
  };
}
