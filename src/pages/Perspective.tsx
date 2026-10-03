import { Navigate } from "react-router";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { WorkflowShell } from "../layout/WorkflowShell";
import { Perspective as PerspectiveContent } from "../components/perspective/Perspective";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { getCard } from "../data/reportComposer";
import { getCardIssues } from "../utils/domain/composerFieldGate";

/**
 * 평가 관점 (`/app/perspective`) — 업로드 다음, 지표 선택 앞.
 *
 * ⑤ 는 필수 카드라 이 단계는 항상 나타난다. 필수 질문을 비운 채로는 진행할 수 없고,
 * 모르면 "모름"을 고른다.
 */
export function Perspective() {
  const taskType = useWorkflowStore((s) => s.taskType);
  const values = useWorkflowStore((s) => s.composerPerspective);
  const setValues = useWorkflowStore((s) => s.setComposerPerspective);
  const flow = useStepFlow("perspective");

  if (!taskType) return <Navigate to="/app" replace />;

  // 필수 카드라 included 는 항상 참이다.
  const issues = getCardIssues(getCard("perspective"), taskType, values, true);

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={() => flow.goNext()}
      nextDisabled={issues.length > 0}
      nextLabel="Next step"
      rightAction={<RemainingNotice issues={issues} lang="en" />}
    >
      <PerspectiveContent
        taskType={taskType}
        values={values}
        onChange={(fieldId, next) => setValues((prev) => ({ ...prev, [fieldId]: next }))}
        issues={issues}
      />
    </WorkflowShell>
  );
}
