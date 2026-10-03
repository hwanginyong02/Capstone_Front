import { useParams } from "react-router";
import { RemainingNotice } from "../../components/composer-input/RemainingNotice";
import { WorkflowShell } from "../../layout/WorkflowShell";
import { ModelEnv as ModelEnvContent } from "../../components/model-env/ModelEnv";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { useStepFlow } from "../../hooks/useStepFlow";
import { getCard } from "../../data/reportComposer";
import { getCardIssues } from "../../utils/domain/composerFieldGate";

/**
 * 모델과 환경 (`/report/:id/model-env`) — 발급 구간.
 *
 * ⑨ 를 켰을 때만 단계 목록에 나타난다. run 에 매인 경로를 쓰는 이유는 평가 결과·성적서와
 * 같다 — 어느 run 의 성적서를 쓰는 중인지 URL 이 말해야 새로고침·공유가 깨지지 않는다.
 */
export function ModelEnv() {
  const { id = "" } = useParams();
  const taskType = useWorkflowStore((s) => s.taskType);
  const values = useWorkflowStore((s) => s.composerModelEnv);
  const setValues = useWorkflowStore((s) => s.setComposerModelEnv);
  const included = useWorkflowStore((s) => s.composerCards.modelEnv);
  const flow = useStepFlow("modelEnv");

  const issues = getCardIssues(getCard("modelEnv"), taskType, values, included);

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious({ runId: id })}
      onNext={() => flow.goNext({ runId: id })}
      nextDisabled={issues.length > 0}
      previousLabel="이전"
      nextLabel="다음 단계"
      rightAction={<RemainingNotice issues={issues} />}
    >
      <ModelEnvContent
        taskType={taskType}
        values={values}
        onChange={(fieldId, next) => setValues((prev) => ({ ...prev, [fieldId]: next }))}
        issues={issues}
      />
    </WorkflowShell>
  );
}
