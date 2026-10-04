import { useParams } from "react-router";
import { RemainingNotice } from "../../components/composer-input/RemainingNotice";
import { WorkflowShell } from "../../layout/WorkflowShell";
import { DataInfo as DataInfoContent, DATA_INFO_CARDS } from "../../components/data-info/DataInfo";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { useStepFlow } from "../../hooks/useStepFlow";
import { getCard } from "../../data/reportComposer";
import { getCardIssues } from "../../utils/domain/composerFieldGate";
import type {
  ComposerCardId,
  ComposerValueMap,
  OptionalCardId,
} from "../../types/reportComposer.types";

/**
 * 데이터 정보 (`/report/:id/data-info`) — 발급 구간.
 *
 * ⑥ ⑦ ⑧ 중 **하나라도** 켜면 나타나고, 켠 카드의 폼만 그린다. 끈 카드는 검사하지도 않는다 —
 * 끄는 것은 허용된 선택이고, 그때 그 카드의 표준 보고 항목은 성적서에 "제공되지 않음"으로
 * 찍힌다(docs/COMPOSER_COMPONENTS.md 열린 결정).
 */
export function DataInfo() {
  const { id = "" } = useParams();
  const store = useWorkflowStore();
  const flow = useStepFlow("dataInfo");

  const VALUES: Record<string, ComposerValueMap> = {
    trainingData: store.composerTrainingData,
    testData: store.composerTestData,
    groundTruth: store.composerGroundTruth,
  };

  const SETTERS = {
    trainingData: store.setComposerTrainingData,
    testData: store.setComposerTestData,
    groundTruth: store.setComposerGroundTruth,
  } as const;

  const includedCards = DATA_INFO_CARDS.filter(
    (cardId) => store.composerCards[cardId as OptionalCardId],
  );

  /**
   * ⑥ 클래스별 데이터 양의 칸은 업로드한 파일에서 찾은 클래스로 만든다.
   * 멀티레이블은 클래스가 아니라 레이블 목록이 온다.
   */
  const classNames: string[] = store.metadata?.detected_classes?.length
    ? store.metadata.detected_classes
    : (store.metadata?.detected_labels ?? []);

  const issues = includedCards.flatMap((cardId) =>
    getCardIssues(getCard(cardId), store.taskType, VALUES[cardId], true),
  );

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious({ runId: id })}
      onNext={() => flow.goNext({ runId: id })}
      nextDisabled={issues.length > 0}
      previousLabel="Back"
      nextLabel="Next step"
      rightAction={<RemainingNotice issues={issues} />}
    >
      <DataInfoContent
        taskType={store.taskType}
        includedCards={includedCards}
        valuesOf={(cardId) => VALUES[cardId] ?? {}}
        onChange={(cardId: ComposerCardId, fieldId, next) => {
          const setter = SETTERS[cardId as keyof typeof SETTERS];
          setter?.((prev) => ({ ...prev, [fieldId]: next }));
        }}
        issues={issues}
        classNames={classNames}
      />
    </WorkflowShell>
  );
}
