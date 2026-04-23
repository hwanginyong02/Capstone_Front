import { Check } from "lucide-react";
import { cn } from "./ui/utils";

const steps = [
  "기본 정보",
  "시험항목",
  "TC별 상세 정보",
  "데이터 업로드",
  "컬럼 매핑",
  "데이터 검증",
  "결과 미리보기",
];

interface StepTabsProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export function StepTabs({ currentStep, completedSteps, onStepClick }: StepTabsProps) {
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
                onClick={() => !isUpcoming && onStepClick?.(stepNumber)}
                disabled={isUpcoming}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 relative",
                  "transition-colors",
                  isActive && "font-medium",
                  isCompleted && "cursor-pointer hover:bg-muted/50",
                  isUpcoming && "cursor-not-allowed"
                )}
              >
                {/* Step Number or Check Icon */}
                <span
                  className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full text-xs",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-blue-50",
                    isUpcoming && "border border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    stepNumber
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "text-sm hidden md:inline",
                    isActive && "text-foreground font-medium",
                    isCompleted && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {label}
                </span>

                {/* Active Underline */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
