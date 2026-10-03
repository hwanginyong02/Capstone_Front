import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { AppHeader } from "./components/AppHeader";
import { StepTabs } from "./components/StepTabs";
import { ActionBar } from "./components/ActionBar";
import { pathToStep, stepToPath, useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { canEnterStep, resumeStep } from "../utils/domain/stepAccess";
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
  previousLabel?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  buttonSize?: "default" | "lg";
  /**
   * 단계 탭을 띄울지. 성적서 구성 화면은 **입력 단계에 들어가기 전**이고, 단계 수가 바로 그
   * 화면의 선택으로 정해지므로 탭을 두지 않는다(docs/COMPOSER_DESIGN.md).
   */
  showStepTabs?: boolean;
  /**
   * 이 화면이 워크플로우의 단계인지.
   *
   * 거짓이면 URL→단계 유도와 진입 가드를 건너뛴다. 구성 화면은 번호가 없는 화면이라
   * `pathToStep` 이 폴백으로 1단계를 돌려주는데, 그 값으로 `setCurrentStep` 을 하면 단계
   * 표시가 업로드로 잘못 옮겨간다.
   */
  isStepPage?: boolean;
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
  previousLabel,
  leftAction,
  rightAction,
  buttonSize,
  showStepTabs = true,
  isStepPage = true
}: WorkflowShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isShowcaseMode = new URLSearchParams(location.search).get("showcase") === "1";

  useEffect(() => {
    // 단계가 아닌 화면(성적서 구성)은 단계 표시를 건드리지 않는다.
    if (!isStepPage) return;

    const step = pathToStep(location.pathname);
    const store = useWorkflowStore.getState();

    if (isShowcaseMode) {
      // 시연은 시드가 완료 표시를 직접 채우므로 가드를 적용하지 않는다.
      store.setCurrentStep(step);
      seedShowcaseData(store, step);
      return;
    }

    // 선행 단계를 마치지 않은 단계로 직접 들어오는 것을 막는다(ISSUES.md E-12).
    // 이 가드는 워크플로우 상태가 영속된 뒤에야 성립한다(E-01) — 종전에는 새로고침마다
    // completedSteps 가 비어서 정상 사용자도 1단계로 튕겼다.
    if (!canEnterStep(step, store.completedSteps)) {
      const target = resumeStep(store.completedSteps);
      store.setCurrentStep(target);
      navigate(stepToPath(target), { replace: true });
      return;
    }

    store.setCurrentStep(step);
  }, [location.pathname, location.search, isShowcaseMode, isStepPage, navigate]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative">
      {/* 워크플로우 안에서는 현재 분류 유형을 계속 보여준다(docs/UI_DESIGN.md §4). */}
      <AppHeader showTaskType />
      {showStepTabs && <StepTabs />}
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
          previousLabel={previousLabel}
          leftAction={leftAction}
          rightAction={rightAction}
          buttonSize={buttonSize}
        />
      )}
    </div>
  );
}
