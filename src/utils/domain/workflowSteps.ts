/**
 * 단계 목록 계산과 단계 간 이동 — 고른 카드에서 걸을 길을 유도한다.
 *
 * 종전에는 단계가 고정 6개였고 번호(`STEP` 상수)가 단일 출처였다. 이제 성적서 구성 화면에서
 * 켠 선택 카드에 따라 7·8단계가 생기고 사라지므로, 단계 목록은 **상수가 아니라 계산 결과**다
 * (docs/COMPOSER_COMPONENTS.md "카드별 입력 단계").
 *
 * 번호를 쓰지 않는 이유: 카드를 토글할 때마다 같은 번호가 다른 단계를 가리키게 된다.
 * 저장된 진행 표시가 조용히 어긋나는 바로 그 상황이다(docs/WORKFLOW_REDESIGN.md §3.3).
 * 그래서 `StepId` 로 가리키고, 번호는 화면에 보여줄 때만 목록 위치에서 만든다.
 *
 * 여기 함수들은 전부 순수하다 — 스토어를 읽지 않고 필요한 것을 인자로 받는다. 그래야
 * 테스트가 카드 조합을 직접 넣어볼 수 있고, 진입 가드가 어떤 목록을 기준으로 판단했는지가
 * 호출하는 쪽에 드러난다.
 */
import { STEP_CATALOG, getStepDefinition } from "../../data/workflowSteps";
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

/** 다음 단계. 마지막이거나 목록에 없으면 null. */
export function nextStepId(id: StepId, steps: StepId[]): StepId | null {
  const index = steps.indexOf(id);
  if (index < 0) return null;
  return steps[index + 1] ?? null;
}

/** 이전 단계. 첫 단계이거나 목록에 없으면 null. */
export function prevStepId(id: StepId, steps: StepId[]): StepId | null {
  const index = steps.indexOf(id);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

/**
 * 진입 가능 여부 — 선행 단계를 마치지 않은 단계로 직접 들어오는 것을 막는다(ISSUES.md E-12).
 *
 * 종전 `canEnterStep` 은 `step - 1` 을 선행 단계로 삼았다. 단계가 고정일 때만 성립하는
 * 산수다 — 카드를 끄면 번호가 당겨지므로 이제는 **계산된 목록에서의 직전 항목**을 본다.
 *
 * 이 가드는 persist 이후에야 성립한다(ISSUES.md E-01). 종전에는 새로고침마다 완료 표시가
 * 비어서, 가드를 켜면 정상 사용자도 첫 단계로 튕겼다.
 */
export function canEnterStepId(
  id: StepId,
  completed: StepId[],
  steps: StepId[],
): boolean {
  const index = steps.indexOf(id);
  // 목록에 없는 단계는 애초에 걸을 길이 아니다(카드를 꺼서 빠진 단계).
  if (index < 0) return false;
  if (index === 0) return true;
  // 이미 마친 단계는 언제든 다시 볼 수 있다(뒤로 가서 수정하는 정상 동선).
  if (completed.includes(id)) return true;
  return completed.includes(steps[index - 1]);
}

/**
 * 진입이 막힐 때 대신 보내야 할 단계 — 목록에서 **처음 미완료**인 곳.
 *
 * 종전 `resumeStep` 은 `Math.max(...completed) + 1` 이었다. 번호가 연속일 때만 맞는 식이고,
 * 건너뛴 단계가 있으면 빈 화면으로 보냈다. 목록을 앞에서부터 훑으면 그 문제가 없다.
 */
export function resumeStepId(completed: StepId[], steps: StepId[]): StepId {
  const firstIncomplete = steps.find((id) => !completed.includes(id));
  // 전부 마쳤다면 마지막 단계가 이어서 할 곳이다.
  return firstIncomplete ?? steps[steps.length - 1];
}

/**
 * 단계 → 경로.
 *
 * run 에 매인 단계는 run id 가 있어야 목적지를 만들 수 있다. 없으면 **워크스페이스 목록**으로
 * 보낸다 — 종전의 `/report/preview` 는 저장되지 않는 임시 성적서를 만들어 발급·재조회를
 * 불가능하게 했다(ISSUES.md E-02·E-06).
 */
export function stepIdToPath(id: StepId, runId?: string | null): string {
  const step = getStepDefinition(id);
  if (step.path) return step.path;
  if (!runId) return "/workspaces";
  return step.runSegment ? "/report/" + runId + "/" + step.runSegment : "/report/" + runId;
}

/**
 * 경로 → 단계. 단계가 아닌 경로(`/app`, `/app/composer`, `/report/:id/print` 등)는 null.
 *
 * 종전 `pathToStep` 은 `/app/*` 만 알아보고 나머지를 **조용히 1단계로** 돌려줬다. 그래서
 * 평가 결과 화면이 자기 단계를 `useEffect` 로 직접 등록해야 했다. 이제 run 경로까지
 * 알아보므로 그 보정이 필요 없다.
 */
export function pathToStepId(pathname: string): StepId | null {
  const byPath = STEP_CATALOG.find((step) => step.path === pathname);
  if (byPath) return byPath.id;

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "report" || segments.length < 2) return null;

  // `/report/no/<번호>` 는 서버 보관본 복원 경로다. 단계가 아니다.
  if (segments[1] === "no") return null;

  // `/report/<runId>` → 성적서, `/report/<runId>/<조각>` → 그 조각의 단계.
  const segment = segments[2];
  const match = STEP_CATALOG.find(
    (step) => step.runScoped && (step.runSegment ?? undefined) === segment,
  );
  return match?.id ?? null;
}
