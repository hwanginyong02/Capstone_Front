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
 * ⑤ 중요 오류 유형 아래에 찍는 지금 양성 클래스(점검 나-15). 놓침(FN)·잘못 잡음(FP)은 양성 클래스를 기준으로
 * 뜻이 정해진다 — 한국어 라벨에서 기본 양성이 "정상"이 되면 둘이 뒤집혀, 선언과 D24 위험 오류 사실이 거꾸로
 * 읽힌다. 이진이 아니거나 양성 클래스를 아직 모르면 null(안내를 그리지 않는다).
 *
 * 조사가 값의 받침에 따라 갈리지 않게 문장을 짰다(영문 라벨도 있다).
 */
export function positiveClassNotice(taskType: string, positiveClass: string | null | undefined): string | null {
  const positive = (positiveClass ?? "").trim();
  if (taskType !== "binary" || positive === "") return null;
  return (
    `지금 양성 클래스(모델이 찾아내야 하는 쪽)는 "${positive}"입니다. ` +
    `놓침(FN)은 실제 "${positive}"인데 놓친 것, 잘못 잡음(FP)은 "${positive}" 이외의 값을 "${positive}" 쪽으로 잡은 것입니다. ` +
    "양성 클래스는 컬럼 매핑 화면에서 바꿉니다."
  );
}

/**
 * 평가 관점 (`/app/perspective`) — 지표와 합격 기준 바로 앞(docs/MATERIAL_PICKER.md §3).
 *
 * ⑤ 의 답은 재료 선택 점검 3층의 기준점이다. 바로 다음 지표 화면이 이 답으로 "목적별 점검"을
 * 보여 주고 "추천 지표"를 고르며, 검증 화면의 생성 전 안내가 다시 알린다(`checkMaterialSelection`).
 * 종전에는 지표 화면 맨 위에 있었다(WORKFLOW_REDESIGN §10.1).
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
  const positiveNotice = positiveClassNotice(store.taskType, store.metadata?.positive_class);

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
            이 모델에서 무엇을 중요하게 볼지 답하세요. ‘지표와 합격 기준’ 화면에서 이 답에 맞는 지표가 있는지 확인합니다.
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
          fieldNotes={
            positiveNotice
              ? {
                  criticalErrorType: (
                    <p data-testid="positive-class-notice" className="mt-1 text-body-small text-muted-foreground">
                      {positiveNotice}
                    </p>
                  ),
                }
              : undefined
          }
        />
      </main>
    </WorkflowShell>
  );
}
