import { useNavigate } from "react-router";
import { cn } from "../../utils/styling/styles";
import { useWorkflowStore, stepToPath } from "../../utils/stores/useWorkflowStore";

const steps = [
  "Basic info",
  "Metrics",
  "Metric details",
  "Data upload",
  "Column mapping",
  "Validation",
  "Final report",
];

export function StepTabs() {
  const navigate = useNavigate();
  const currentStep = useWorkflowStore((s) => s.currentStep);
  const completedSteps = useWorkflowStore((s) => s.completedSteps);
  const lastRunId = useWorkflowStore((s) => s.lastRunId);

  const handleStepClick = (step: number) => {
    useWorkflowStore.getState().setCurrentStep(step);
    // 7번(최종 성적서)은 방금 만든 run 으로 보낸다. stepToPath(7) 은 항상
    // "/report/preview" 를 가리켜, 실제 성적서가 아니라 빈 미리보기로 갔다(ISSUES.md E-16).
    if (step === 7 && lastRunId) {
      navigate(`/report/${lastRunId}`);
      return;
    }
    navigate(stepToPath(step));
  };

  return (
    <div className="h-12 border-b border-border bg-card sticky top-14 z-40">
      <div className="h-full px-8 max-w-[1344px] mx-auto">
        <div className="h-full flex items-stretch">
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = completedSteps.includes(stepNumber);
            const isUpcoming = stepNumber > currentStep && !isCompleted;

            return (
              <button
                key={stepNumber}
                onClick={() => !isUpcoming && handleStepClick(stepNumber)}
                disabled={isUpcoming}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 relative",
                  "transition-colors",
                  isActive && "font-medium",
                  isCompleted && "cursor-pointer hover:bg-muted/50",
                  isUpcoming && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full text-xs",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-blue-50",
                    isUpcoming && "border border-border text-muted-foreground",
                  )}
                >
                  {stepNumber}
                </span>

                <span
                  className={cn(
                    "text-sm hidden md:inline",
                    isActive && "text-foreground font-medium",
                    isCompleted && "text-foreground",
                    isUpcoming && "text-muted-foreground",
                  )}
                >
                  {label}
                </span>

                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
