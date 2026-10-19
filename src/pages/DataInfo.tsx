import { useState } from "react";
import { Navigate } from "react-router";
import { RemainingNotice } from "../components/composer-input/RemainingNotice";
import { focusFirstIssue } from "../components/composer-input/focusFirstIssue";
import { WorkflowShell } from "../layout/WorkflowShell";
import {
  DataInfo as DataInfoContent,
  DATA_INFO_CARDS,
  type DataInfoCardId,
} from "../components/data-info/DataInfo";
import { TrainingExamplesSection } from "../components/report-info/TrainingExamplesSection";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useStepFlow } from "../hooks/useStepFlow";
import { getCard, isLeafReceived } from "../data/reportComposer";
import { getStepDefinition } from "../data/workflowSteps";
import { getCardIssues } from "../utils/domain/composerFieldGate";
import { includedCardsInOrder } from "../utils/domain/cardOrder";
import { evaluationClassNames } from "../utils/domain/evaluationClasses";

/**
 * ⑥ 학습 데이터 (`/app/training-data`) · ⑦ 테스트 데이터 (`/app/test-data`) · ⑧ 정답 라벨
 * (`/app/ground-truth`) — 카드 하나가 한 단계다(docs/MATERIAL_PICKER.md §11).
 *
 * 재료 고르기에서 넣은 카드만 단계가 된다. 넣은 카드 안에서도 재료 고르기에서 고른 권장·선택
 * 필드만 받는다(§5). 넣지 않은 카드의 표준 보고 항목은 성적서에 "제공되지 않음"으로 찍힌다.
 *
 * ⑥ 의 클래스별 데이터 양은 매핑에서 확정한 클래스 목록이 필요하다 — 학습 데이터는 평가 데이터
 * 뒤에만 놓을 수 있어 지켜진다(`ORDER_RULES`). run 이 생기기 전이라 `/app/*` 경로다. 값은 워크플로
 * 저장소에 있다.
 */
export function DataInfo({ cardId }: { cardId: DataInfoCardId }) {
  const store = useWorkflowStore();
  const flow = useStepFlow(cardId);
  /**
   * 다음을 **누른 뒤에만** 빈 칸을 빨갛게 칠한다. 버튼을 처음부터 잠가 두면 왜 막혔는지
   * 알려면 하단 한 줄을 읽어야 하는데, 긴 폼에서는 그 칸을 찾는 일이 또 다른 숙제가 된다.
   */
  const [showErrors, setShowErrors] = useState(false);

  const VALUES = {
    trainingData: store.composerTrainingData,
    testData: store.composerTestData,
    groundTruth: store.composerGroundTruth,
  };

  const SETTERS = {
    trainingData: store.setComposerTrainingData,
    testData: store.setComposerTestData,
    groundTruth: store.setComposerGroundTruth,
  } as const;

  const values = VALUES[cardId];
  const picks = store.materialPicks[cardId];

  /**
   * ⑥ 클래스별 데이터 양의 칸은 평가 데이터의 클래스로 만든다(멀티레이블은 레이블). 매핑 화면·성적서와
   * 같은 한 함수다(`evaluationClassNames`) — 매핑에서 정답 컬럼을 바꾸면 이 칸도 따라 바뀐다.
   */
  const classNames = evaluationClassNames(store.taskType, store.columnMapping, store.metadata);

  // 클래스별 데이터 양은 지금 클래스를 모두 채워야 한다(B5②) — 화면의 칸과 같은 목록으로 판정한다.
  const issues = getCardIssues(getCard(cardId), store.taskType, values, true, picks, classNames);

  /** ⑥ 예시 파일 두 칸 — 평가 흐름에 넣은 칸만 받는다(선택 항목). picks 가 없으면 둘 다 받는다. */
  const showValidExamples = cardId === "trainingData" && isLeafReceived("trainingData", "trainingExamples", picks);
  const showUnsuitableExamples =
    cardId === "trainingData" && isLeafReceived("trainingData", "trainingUnsuitableExamples", picks);

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
      <DataInfoContent
        taskType={store.taskType}
        cardId={cardId}
        picks={picks}
        values={values}
        onChange={(fieldId, next) => SETTERS[cardId]((prev) => ({ ...prev, [fieldId]: next }))}
        issues={issues}
        classNames={classNames}
        showErrors={showErrors}
        after={
          // ⑥ 의 예시 파일. 전용 칸이라 카드 폼이 아니라 카드 아래에 따로 받는다.
          showValidExamples || showUnsuitableExamples ? (
            <TrainingExamplesSection
              trainingExampleFiles={store.trainingExampleFiles}
              onTrainingExampleFilesChange={store.setTrainingExampleFiles}
              trainingUnsuitableExampleFiles={store.trainingUnsuitableExampleFiles}
              onTrainingUnsuitableExampleFilesChange={store.setTrainingUnsuitableExampleFiles}
              showValid={showValidExamples}
              showUnsuitable={showUnsuitableExamples}
            />
          ) : undefined
        }
      />
    </WorkflowShell>
  );
}

export const TrainingDataStep = () => <DataInfo cardId="trainingData" />;
export const TestDataStep = () => <DataInfo cardId="testData" />;
export const GroundTruthStep = () => <DataInfo cardId="groundTruth" />;

/**
 * 종전 "데이터 정보" 경로(`/app/data-info`). 저장된 링크가 죽지 않도록 넣어 둔 데이터 카드 중 입력
 * 순서상 첫 카드의 단계로 보낸다. 넣은 데이터 카드가 없으면 재료 고르기로 보낸다.
 */
export function LegacyDataInfoRedirect() {
  const composerCards = useWorkflowStore((s) => s.composerCards);
  const cardOrder = useWorkflowStore((s) => s.cardOrder);
  const first = includedCardsInOrder(cardOrder, composerCards).find((card) =>
    (DATA_INFO_CARDS as readonly string[]).includes(card.id),
  );
  const target = first ? getStepDefinition(first.id as DataInfoCardId).path! : "/app/composer";
  return <Navigate to={target} replace />;
}
