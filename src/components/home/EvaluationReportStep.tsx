import { ActionBar } from "./ActionBar";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { EvaluationReport } from "../report/EvaluationReport";
import type { TaskType } from "@/data/evaluationData";
import type { EvaluationReportData } from "@/types/report.types";

interface EvaluationReportStepProps {
  currentStep: number;
  completedSteps: number[];
  taskType?: TaskType | "";
  selectedTCIds?: string[];
  report: EvaluationReportData;
  onStepClick: (step: number) => void;
  onPrevious: () => void;
}

export function EvaluationReportStep({
  currentStep,
  completedSteps,
  onStepClick,
  onPrevious,
  report,
}: EvaluationReportStepProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.38),_transparent_36%),linear-gradient(180deg,_#f8fbff_0%,_#f8fafc_40%,_#ffffff_100%)]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="mx-auto max-w-[1344px] px-8 pb-24 pt-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Final report</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The evaluation report now lives inside the main workflow and is fed by the state collected in the previous steps.
          </p>
        </div>

        <EvaluationReport report={report} />
      </main>

      <ActionBar showPrevious={true} onPrevious={onPrevious} showNext={false} />
    </div>
  );
}
