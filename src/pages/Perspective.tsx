import { useState } from "react";
import { WorkflowShell } from "../layout/WorkflowShell";
import { ComposerCardForm } from "../components/composer-input/ComposerCardForm";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { focusFirstIssue } from "../components/composer-input/focusFirstIssue";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { getCard } from "../data/reportComposer";
import { getCardIssues } from "../utils/domain/composerFieldGate";

/**
 * 평가 관점 (`/app/perspective`) — 지표와 합격 기준 바로 앞(docs/MATERIAL_PICKER.md §3).
 *
 * ⑤ 의 답은 지표를 권하는 근거다. 지표 화면 바로 앞이라 그 화면의 "추천 지표"와 맞지 않는 지표에
 * 대한 경고가 그대로 동작한다. 종전에는 지표 화면 맨 위에 있었다(WORKFLOW_REDESIGN §10.1).
 */
export function Perspective() {
  const store = useWorkflowStore();
  const flow = useStepFlow("perspective");
  // 다음을 누른 뒤에만 빈 칸을 빨갛게 칠한다(`pages/DataInfo.tsx` 와 같은 규칙).
  const [showErrors, setShowErrors] = useState(false);

  // ⑤ 는 필수 카드라 늘 들어간다.
  const card = getCard("perspective");
  const issues = getCardIssues(
    card,
    store.taskType,
    store.composerPerspective,
    true,
    store.materialPicks.perspective,
  );

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
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">평가 관점</h1>
          <p className="text-sm text-muted-foreground">
            이 모델에서 무엇을 중요하게 볼지 답하세요. 다음 단계에서 이 답으로 지표를 추천합니다.
          </p>
        </div>
        <ComposerCardForm
          card={card}
          taskType={store.taskType}
          values={store.composerPerspective}
          onChange={(fieldId, next) =>
            store.setComposerPerspective((prev) => ({ ...prev, [fieldId]: next }))
          }
          issues={issues}
          showErrors={showErrors}
          picks={store.materialPicks.perspective}
        />
      </main>
    </WorkflowShell>
  );
}
