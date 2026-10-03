import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { AppHeader } from "./components/AppHeader";
import { StepTabs } from "./components/StepTabs";
import { ActionBar } from "./components/ActionBar";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { getStepDefinition } from "../data/workflowSteps";
import {
  buildStepList,
  canEnterStepId,
  pathToStepId,
  resumeStepId,
  stepIdToPath,
} from "../utils/domain/workflowSteps";
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
   * 거짓이면 URL→단계 유도와 진입 가드를 건너뛴다. 구성 화면은 걸을 단계를 **정하는**
   * 화면이라 아직 어느 단계에도 있지 않다.
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

    const stepId = pathToStepId(location.pathname);
    // 알아볼 수 없는 경로면 단계 표시를 건드리지 않는다. 종전 `pathToStep` 은 이런 경로를
    // 조용히 1단계로 돌려줘, 평가 결과 화면이 자기 단계를 직접 되돌려 놓아야 했다.
    if (!stepId) return;

    const store = useWorkflowStore.getState();
    // 걸을 목록은 고른 카드에서 나온다 — 가드도 이 목록을 기준으로 판단해야 한다.
    const steps = buildStepList(store.composerCards);

    if (isShowcaseMode) {
      // 시연은 시드가 완료 표시를 직접 채우므로 가드를 적용하지 않는다.
      store.setCurrentStepId(stepId);
      seedShowcaseData(store, stepId);
      return;
    }

    /**
     * run 에 매인 화면은 가드하지 않는다.
     *
     * 가드가 막으려는 것은 **빈 상태로 입력 단계에 들어가는 것**이다(ISSUES.md E-12·E-13·E-04).
     * 반면 `/report/<runId>/...` 는 저장된 run 을 **보여주는** 화면이고, 그 전제 조건은
     * "그 run 이 있는가"다 — 진행 표시가 아니라 `useReportData` 가 확인하고 없으면 오류
     * 화면을 띄운다. 진행 표시로 막으면 URL 로 공유받은 성적서가 열리지 않는다.
     *
     * 종전 동작과도 같다. `pathToStep` 이 `/report/*` 를 1단계로 돌려줘 가드가 늘 통과했다 —
     * 달라진 것은 이제 **단계 표시가 올바르게 맞는다**는 점뿐이다.
     */
    if (getStepDefinition(stepId).runScoped) {
      store.setCurrentStepId(stepId);
      return;
    }

    // 선행 단계를 마치지 않은 단계로 직접 들어오는 것을 막는다(ISSUES.md E-12).
    // 이 가드는 워크플로우 상태가 영속된 뒤에야 성립한다(E-01) — 종전에는 새로고침마다
    // 완료 표시가 비어서 정상 사용자도 첫 단계로 튕겼다.
    if (!canEnterStepId(stepId, store.completedStepIds, steps)) {
      const target = resumeStepId(store.completedStepIds, steps);
      store.setCurrentStepId(target);
      navigate(stepIdToPath(target, store.lastRunId), { replace: true });
      return;
    }

    store.setCurrentStepId(stepId);
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
