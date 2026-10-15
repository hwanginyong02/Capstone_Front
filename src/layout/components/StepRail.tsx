import { useNavigate } from "react-router";
import { cn } from "../../utils/styling/styles";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { getStepDefinition } from "../../data/workflowSteps";
import { buildStepList, stepIdToPath } from "../../utils/domain/workflowSteps";
import { SavedMark, UnsavedMark } from "../../components/material-picker/SavedMark";
import type { StepId } from "../../types/workflow.types";

/**
 * 단계 표시줄 — 입력 화면 오른쪽의 세로 목록(docs/MATERIAL_PICKER.md §9).
 *
 * 세로로 두는 것은 단계 수가 카드 선택에 따라 8~10개로 바뀌고 단계 이름 길이가 제각각이기
 * 때문이다. 종전에는 헤더 아래 가로 탭(`StepTabs`)이었는데, 칸이 늘면 이름이 잘렸다.
 *
 * 라벨·경로는 카탈로그 하나가 들고(`data/workflowSteps.ts`), 걸을 목록은 고른 카드에서 계산한다.
 * 확인과 생성도 처음부터 보이되, 아직 도달하지 않은 단계는 누를 수 없다.
 *
 * - 지난 단계(마쳤거나 현재보다 앞): 누를 수 있다. 본문색.
 * - 현재 단계: 제목색, 굵기 500, 강조색 막대, `aria-current="step"`.
 * - 다음 단계: 흐린 글자, 누를 수 없다.
 */
export function StepRail() {
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
    <nav
      aria-label="진행 단계"
      className="p-6 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto"
    >
      <ol className="flex flex-col gap-1">
        {steps.map((id, index) => {
          const { label } = getStepDefinition(id);
          const isActive = id === currentStepId;
          const isCompleted = completedStepIds.includes(id);
          // 현재 단계를 목록에서 못 찾으면(-1) 뒤 단계를 전부 미래로 둔다.
          const isUpcoming = index > currentIndex && !isCompleted;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => !isUpcoming && handleStepClick(id)}
                disabled={isUpcoming}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-base transition-colors",
                  isActive && "bg-background font-medium text-foreground",
                  !isActive && !isUpcoming && "text-foreground-secondary hover:bg-background/60",
                  isUpcoming && "cursor-not-allowed text-foreground-subtle",
                )}
              >
                {isActive && (
                  <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" />
                )}
                {isCompleted && !isActive ? <SavedMark label="완료" /> : <UnsavedMark />}
                <span className="min-w-0 flex-1">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
