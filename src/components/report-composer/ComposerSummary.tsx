/**
 * Action Bar 의 요약 한 줄 — "이진 분류 · 선택 카드 3/4 · 입력 단계 9개".
 *
 * 전부 레지스트리와 단계 계산에서 나온다. AI 호출이나 서버 요청은 없다
 * (docs/COMPOSER_COMPONENTS.md "구성 화면 레이아웃").
 */
import { TASK_TYPE_LABELS_KO, type TaskType } from "../../data/evaluationData";
import { OPTIONAL_CARD_IDS, countOptionalOn } from "../../data/reportComposer";
import { buildStepList } from "../../utils/domain/workflowSteps";
import type { ComposerSelection } from "../../types/reportComposer.types";

interface ComposerSummaryProps {
  taskType: TaskType;
  selection: ComposerSelection;
}

export function ComposerSummary({ taskType, selection }: ComposerSummaryProps) {
  const onCount = countOptionalOn(selection);
  const stepCount = buildStepList(selection).length;

  return (
    <p className="text-body-small text-muted-foreground">
      {TASK_TYPE_LABELS_KO[taskType]}
      {" · 선택 카드 "}
      <span className="font-mono tabular-nums">
        {onCount}/{OPTIONAL_CARD_IDS.length}
      </span>
      {" · 입력 단계 "}
      <span className="font-mono tabular-nums">{stepCount}</span>
      개
    </p>
  );
}
