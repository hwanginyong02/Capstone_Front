import { BasicInfo } from "../components/home/BasicInfo";
import { ColumnMapping } from "../components/home/ColumnMapping";
import { DataUpload } from "../components/home/DataUpload";
import { DataValidation } from "../components/home/DataValidation";
import { EvaluationReportStep } from "../components/home/EvaluationReportStep";
import { TCDetailInput } from "../components/home/TCDetailInput";
import { TestItems } from "../components/home/TestItems";
import { useHomeWorkflow } from "../hooks/useHomeWorkflow";

export function Home() {
  const workflow = useHomeWorkflow();

  if (workflow.currentStep === 1) {
    return <BasicInfo {...workflow.basicInfoStep} />;
  }

  if (workflow.currentStep === 2) {
    return <TestItems {...workflow.testItemsStep} />;
  }

  if (workflow.currentStep === 3) {
    return <TCDetailInput {...workflow.tcDetailStep} />;
  }

  if (workflow.currentStep === 4) {
    return <DataUpload {...workflow.dataUploadStep} />;
  }

  if (workflow.currentStep === 5) {
    return <ColumnMapping {...workflow.commonStep} />;
  }

  if (workflow.currentStep === 6) {
    return <DataValidation {...workflow.commonStep} />;
  }

  return <EvaluationReportStep {...workflow.reportStep} />;
}
