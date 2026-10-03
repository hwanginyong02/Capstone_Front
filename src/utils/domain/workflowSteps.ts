/**
 * 단계 목록 계산 — 고른 카드에서 걸을 단계를 유도한다.
 *
 * 종전에는 단계가 고정 6개였고 번호(`STEP` 상수)가 단일 출처였다. 이제 성적서 구성 화면에서
 * 켠 선택 카드에 따라 7·8단계가 생기고 사라지므로, 단계 목록은 **상수가 아니라 계산 결과**다
 * (docs/COMPOSER_COMPONENTS.md "카드별 입력 단계").
 *
 * 번호를 쓰지 않는 이유: 카드를 토글할 때마다 같은 번호가 다른 단계를 가리키게 된다.
 * 저장된 진행 표시가 조용히 어긋나는 바로 그 상황이다(docs/WORKFLOW_REDESIGN.md §3.3).
 * 그래서 `StepId` 로 가리키고, 번호는 화면에 보여줄 때만 목록 위치에서 만든다.
 *
 * 쓰는 곳: 성적서 구성 화면의 하단 요약(입력 단계 n개). 단계 탭·진입 가드·화면 간 이동은
 * 다음 단계에서 이 함수들로 옮긴다.
 */
import { STEP_CATALOG } from "../../data/workflowSteps";
import type { ComposerSelection } from "../../types/reportComposer.types";
import type { StepId } from "../../types/workflow.types";

/**
 * 걸을 단계 목록. 카탈로그 순서를 유지하고, 조건이 성립하지 않는 단계만 뺀다.
 *
 * 최소 구성(선택 카드 전부 꺼짐)이면 8개, 전체면 10개다.
 */
export function buildStepList(selection: ComposerSelection): StepId[] {
  return STEP_CATALOG.filter((step) => {
    if (!step.requiresCards) return true;
    // 하나라도 켜져 있으면 그 단계가 필요하다 — 7단계는 ⑥ ⑦ ⑧ 중 켠 카드만 받는다.
    return step.requiresCards.some((cardId) => selection[cardId]);
  }).map((step) => step.id);
}

/** 목록에서의 위치(1-based). 화면에 번호를 보여줄 때만 쓴다. 없으면 0. */
export function stepNumberOf(id: StepId, steps: StepId[]): number {
  return steps.indexOf(id) + 1;
}
