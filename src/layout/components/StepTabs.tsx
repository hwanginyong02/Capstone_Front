import { useNavigate } from "react-router";
import { cn } from "../../utils/styling/styles";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { getStepDefinition } from "../../data/workflowSteps";
import { buildStepList, stepIdToPath } from "../../utils/domain/workflowSteps";
import type { StepId } from "../../types/workflow.types";

/**
 * 단계 탭.
 *
 * 종전에는 라벨·아이콘을 가진 **지역 배열**이 여기 있었고, 스토어의 `STEP_PATHS` 와 배열
 * 위치로만 묶여 있었다(그 사실을 주석으로 경고해 두어야 했다). 이제 카탈로그 하나가 라벨·
 * 아이콘·경로를 함께 들고(`data/workflowSteps.ts`), 걸을 목록은 고른 카드에서 계산한다.
 *
 * **칸 수가 고정이 아니다** — 최소 구성이면 8칸, 전체면 10칸이다. 발급 단계도 처음부터
 * 보이되, 아직 도달하지 않은 칸은 비활성이다(지금 성적서 탭이 그렇게 동작한다).
 */
export function StepTabs() {
  const navigate = useNavigate();
  const currentStepId = useWorkflowStore((s) => s.currentStepId);
  const completedStepIds = useWorkflowStore((s) => s.completedStepIds);
  const composerCards = useWorkflowStore((s) => s.composerCards);
  const lastRunId = useWorkflowStore((s) => s.lastRunId);

  const steps = buildStepList(composerCards);
  const currentIndex = steps.indexOf(currentStepId);

  const handleStepClick = (id: StepId) => {
    const store = useWorkflowStore.getState();
    store.setCurrentStepId(id);
    // run 에 매인 단계는 방금 만든 run 으로 간다. run 이 없으면 `stepIdToPath` 가 워크스페이스
    // 목록을 돌려준다 — 종전에는 저장되지 않는 빈 성적서로 갔다(ISSUES.md E-16·E-06).
    navigate(stepIdToPath(id, lastRunId));
  };

  return (
    <div className="h-12 border-b border-border bg-card sticky top-14 z-40">
      <div className="h-full px-8 max-w-[1344px] mx-auto">
        <div className="h-full flex items-stretch">
          {steps.map((id, index) => {
            const { label, Icon } = getStepDefinition(id);
            const isActive = id === currentStepId;
            const isCompleted = completedStepIds.includes(id);
            // 현재 단계를 목록에서 못 찾으면(-1) 뒤 단계를 전부 미래로 둔다.
            const isUpcoming = index > currentIndex && !isCompleted;

            return (
              <button
                key={id}
                onClick={() => !isUpcoming && handleStepClick(id)}
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
                    "flex items-center justify-center h-5 w-5 rounded-full shrink-0",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary-subtle text-foreground",
                    isUpcoming && "border border-border text-muted-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>

                <span
                  className={cn(
                    "text-sm hidden md:inline truncate",
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
