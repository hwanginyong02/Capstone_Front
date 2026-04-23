import { useState } from "react";
import { BasicInfo } from "./components/BasicInfo";
import { TestItems } from "./components/TestItems";
import { TCDetailInput } from "./components/TCDetailInput";
import { DataUpload } from "./components/DataUpload";
import { ColumnMapping } from "./components/ColumnMapping";
import { DataValidation } from "./components/DataValidation";
import { ResultPreview } from "./components/ResultPreview";
import type { TaskType } from "./config/evaluationConfig";
import {
  DEFAULT_BASIC_INFO,
  type BasicInfoFormData,
  type TcDetailStateMap,
} from "./types/workflow";

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Shared state lifted from child components
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const [selectedTCIds, setSelectedTCIds] = useState<string[]>([]);
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormData>(DEFAULT_BASIC_INFO);
  const [tcDetails, setTcDetails] = useState<TcDetailStateMap>({});

  const handleTaskTypeChange = (type: string) => {
    setTaskType(type as TaskType);
    setSelectedTCIds([]);
    setTcDetails({});
    setBasicInfo((prev) => ({ ...prev, taskType: type as TaskType }));
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {currentStep === 1 && (
        <BasicInfo
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
          formData={basicInfo}
          onFormDataChange={setBasicInfo}
          onTaskTypeChange={handleTaskTypeChange}
        />
      )}
      {currentStep === 2 && (
        <TestItems
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
          taskType={taskType}
          onSelectedTCsChange={setSelectedTCIds}
        />
      )}
      {currentStep === 3 && (
        <TCDetailInput
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
          taskType={taskType}
          selectedTCIds={selectedTCIds}
          tcDetails={tcDetails}
          onTcDetailsChange={setTcDetails}
        />
      )}
      {currentStep === 4 && (
        <DataUpload
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
          selectedTCIds={selectedTCIds}
          taskType={taskType}
        />
      )}
      {currentStep === 5 && (
        <ColumnMapping
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
      {currentStep === 6 && (
        <DataValidation
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
      {currentStep === 7 && (
        <ResultPreview
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </>
  );
}
