import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { AppHeader } from "./components/AppHeader";
import { StepTabs } from "./components/StepTabs";
import { ActionBar } from "./components/ActionBar";
import { pathToStep, useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { seedShowcaseData } from "../utils/domain/showcaseSeed";

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
      seedShowcaseData(store, step);
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
