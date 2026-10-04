import { Navigate, useNavigate } from "react-router";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ReportComposer as ReportComposerContent } from "../components/report-composer/ReportComposer";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList } from "../utils/domain/workflowSteps";
import { getStepDefinition } from "../data/workflowSteps";

/**
 * 성적서 구성 화면 (`/app/composer`) — 분류 유형 선택 다음에 온다.
 *
 * 입력 단계에 들어가기 **전** 화면이라 단계 탭을 두지 않는다. 단계 수가 바로 이 화면의
 * 선택으로 정해지므로, 탭을 두면 아직 정해지지 않은 것을 그려야 한다
 * (docs/COMPOSER_DESIGN.md). 그래서 `WorkflowShell` 에 `showStepTabs={false}` 와
 * `isStepPage={false}` 를 넘긴다 — 후자는 URL→단계 유도와 진입 가드를 끈다.
 *
 * 유형을 고르지 않고 URL 로 바로 들어오면 고를 것이 없으므로 진입 화면으로 보낸다.
 *
 * **다음 버튼이 비활성되는 경우는 없다.** 필수 카드는 항상 들어가고 입력은 다음 단계에서
 * 받는다.
 */
export function ReportComposer() {
  const navigate = useNavigate();
  const taskType = useWorkflowStore((s) => s.taskType);
  const composerCards = useWorkflowStore((s) => s.composerCards);
  const setComposerCard = useWorkflowStore((s) => s.setComposerCard);
  const applyComposerPreset = useWorkflowStore((s) => s.applyComposerPreset);

  // 렌더 중에 navigate 를 부르지 않는다 — 라우트 테이블의 리다이렉트와 같은 방식을 쓴다.
  if (!taskType) return <Navigate to="/app" replace />;

  /** 고른 카드로 계산한 첫 단계. 지금은 항상 업로드지만 목록에서 가져온다. */
  const handleNext = () => {
    const [firstStep] = buildStepList(composerCards);
    const path = getStepDefinition(firstStep).path ?? "/app/data-upload";
    navigate(path);
  };

  return (
    <WorkflowShell
      showStepTabs={false}
      isStepPage={false}
      showActionBar
      showPrevious
      showNext
      previousLabel="Back"
      nextLabel="Next step"
      buttonSize="lg"
      onPrevious={() => navigate("/app")}
      onNext={handleNext}
    >
      <ReportComposerContent
        taskType={taskType}
        selection={composerCards}
        onToggleCard={setComposerCard}
        onApplyPreset={applyComposerPreset}
      />
    </WorkflowShell>
  );
}
