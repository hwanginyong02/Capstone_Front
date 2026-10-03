/**
 * 단계 간 이동 — 각 화면이 자기 이웃을 몰라도 되게 한다.
 *
 * 종전에는 다음/이전 목적지가 **화면마다 하드코딩**돼 있었다. 5개 화면 × 두 방향 = 간선
 * 10개가 흩어져 있었고, 그중 둘은 `STEP` 상수조차 쓰지 않고 경로 문자열을 직접 썼다.
 * 단계가 고정일 때도 재배치마다 조용히 어긋나는 구조였는데, 이제는 단계 목록이 카드 선택에
 * 따라 **달라지므로** 하드코딩이 아예 성립하지 않는다 — 7·8단계가 있을 때와 없을 때
 * 6단계의 다음이 다르다.
 *
 * 그래서 이웃을 계산된 목록에서 유도한다(`utils/domain/workflowSteps.ts`). 화면은 자기가
 * 어느 단계인지만 말하면 된다.
 */
import { useNavigate } from "react-router";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import {
  buildStepList,
  nextStepId,
  prevStepId,
  stepIdToPath,
  stepNumberOf,
} from "../utils/domain/workflowSteps";
import type { StepId } from "../types/workflow.types";

interface GoOptions {
  /**
   * 방금 만든 run 의 id.
   *
   * 검증 단계의 '다음'(평가 결과)이 이것을 필요로 한다 — run 을 만든 직후라 스토어에 아직
   * 반영되지 않았을 수 있는데, 목적지 경로에는 이미 그 id 가 필요하다.
   */
  runId?: string;
}

export function useStepFlow(stepId: StepId) {
  const navigate = useNavigate();
  const composerCards = useWorkflowStore((s) => s.composerCards);

  const steps = buildStepList(composerCards);
  const next = nextStepId(stepId, steps);
  const previous = prevStepId(stepId, steps);

  /** 단계를 옮기고 그 화면으로 보낸다. 목적지가 없으면 아무것도 하지 않는다. */
  const goTo = (target: StepId | null, options: GoOptions = {}) => {
    if (!target) return;
    const store = useWorkflowStore.getState();
    store.setCurrentStepId(target);
    navigate(stepIdToPath(target, options.runId ?? store.lastRunId));
  };

  return {
    steps,
    next,
    previous,
    /** 화면에 보여줄 번호(1-based). 카드를 끄면 뒤 단계의 번호가 당겨진다. */
    stepNumber: stepNumberOf(stepId, steps),
    /** 이 단계를 완료로 표시하고 다음으로 간다. */
    goNext: (options: GoOptions = {}) => {
      useWorkflowStore.getState().markStepIdCompleted(stepId);
      goTo(next, options);
    },
    /** 이전 단계로 돌아간다. 완료 표시는 건드리지 않는다(마친 것을 되돌리지 않는다). */
    goPrevious: (options: GoOptions = {}) => goTo(previous, options),
    goTo,
  };
}
