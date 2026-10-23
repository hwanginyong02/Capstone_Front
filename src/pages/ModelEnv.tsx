import { useState } from "react";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { focusFirstIssue } from "../components/composer-input/focusFirstIssue";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ModelEnv as ModelEnvContent } from "../components/model-env/ModelEnv";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { getCard } from "../data/reportComposer";
import { getCardIssues } from "../utils/domain/composerFieldGate";

/**
 * 모델 설정과 실행 환경 (`/app/model-env`) — 평가 대상 모델 다음(docs/MATERIAL_PICKER.md §3).
 *
 * ⑨ 를 넣었을 때만 단계 목록에 나타난다. 재료 고르기에서 체크한 항목만 받는다(§5). run 이
 * 생기기 전이라 `/app/*` 경로다.
 */
export function ModelEnv() {
  const taskType = useWorkflowStore((s) => s.taskType);
  const values = useWorkflowStore((s) => s.composerModelEnv);
  const setValues = useWorkflowStore((s) => s.setComposerModelEnv);
  const included = useWorkflowStore((s) => s.composerCards.modelEnv);
  const picks = useWorkflowStore((s) => s.materialPicks.modelEnv);
  const flow = useStepFlow("modelEnv");
  // 다음을 누른 뒤에만 빈 칸을 빨갛게 칠한다(`pages/DataInfo.tsx` 와 같은 규칙).
  const [showErrors, setShowErrors] = useState(false);

  const issues = getCardIssues(getCard("modelEnv"), taskType, values, included, picks);

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious()}
      onNext={() => {
        if (issues.length > 0) {
          setShowErrors(true);
          focusFirstIssue(issues);
          return;
        }
        flow.goNext();
      }}
      previousLabel="이전"
      nextLabel="다음"
      rightAction={<RemainingNotice issues={issues} />}
    >
      <ModelEnvContent
        taskType={taskType}
        values={values}
        onChange={(fieldId, next) => setValues((prev) => ({ ...prev, [fieldId]: next }))}
        issues={issues}
        showErrors={showErrors}
        picks={picks}
      />
    </WorkflowShell>
  );
}
