/**
 * 단계 목록 계산과 단계 간 이동 — 고른 카드와 그 순서에서 걸을 길을 유도한다.
 *
 * 종전에는 단계가 고정 6개였고 번호(`STEP` 상수)가 단일 출처였다. 이제 재료 고르기에서 넣은
 * 선택 카드에 따라 단계가 생기고 사라지고, 순서도 사용자가 다이어그램에서 정하므로 단계 목록은
 * **상수가 아니라 계산 결과**다(docs/MATERIAL_PICKER.md §11).
 *
 * 번호를 쓰지 않는 이유: 카드를 토글할 때마다 같은 번호가 다른 단계를 가리키게 된다.
 * 저장된 진행 표시가 조용히 어긋나는 바로 그 상황이다(docs/WORKFLOW_REDESIGN.md §3.3).
 * 그래서 `StepId` 로 가리키고, 번호는 화면에 보여줄 때만 목록 위치에서 만든다.
 *
 * 여기 함수들은 전부 순수하다 — 스토어를 읽지 않고 필요한 것을 인자로 받는다. 그래야
 * 테스트가 카드 조합을 직접 넣어볼 수 있고, 진입 가드가 어떤 목록을 기준으로 판단했는지가
 * 호출하는 쪽에 드러난다.
 */
import { STEP_CATALOG, TRAILING_STEP_IDS, getStepDefinition } from "../../data/workflowSteps";
import type { ComposerCardId, ComposerSelection } from "../../types/reportComposer.types";
import type { StepId } from "../../types/workflow.types";
import { DEFAULT_CARD_ORDER, includedCardsInOrder } from "./cardOrder";

/**
 * 걸을 단계 목록. 들어간 카드를 입력 순서대로 그 카드의 단계(`card.steps`)로 펼치고, 끝에 검증과
 * 확인과 생성을 붙인다. ① 평가 데이터는 업로드와 컬럼 매핑 두 단계가 된다.
 *
 * 최소 구성(선택 카드를 하나도 넣지 않음)이면 8개, 전체면 12개다. 순서를 넘기지 않으면 카탈로그
 * 순서다.
 */
export function buildStepList(
  selection: ComposerSelection,
  order: readonly ComposerCardId[] = DEFAULT_CARD_ORDER,
): StepId[] {
  return [
    ...includedCardsInOrder(order, selection).flatMap((card) => card.steps),
    ...TRAILING_STEP_IDS,
  ];
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
 * 평가 흐름 만들기의 "다음"이 갈 곳.
 *
 * 1. 들어올 때 넘겨받은 돌아갈 화면(`returnStep`)이 지금 목록에 있으면 거기 — 검증 화면에서 ⑦ 을
 *    넣으러 왔으면 테스트 데이터 화면으로 간다.
 * 2. 아니면 처음 미완료 **입력** 화면 — 새 사용자는 첫 화면으로 간다.
 * 3. 입력 화면을 모두 마쳤으면 검증. `resumeStepId` 를 그대로 쓰면 성적서(run 경로)로 가 버려서
 *    입력 화면으로 범위를 좁혔다.
 */
export function composerNextStep(steps: StepId[], completed: StepId[], returnStep?: StepId): StepId {
  if (returnStep && steps.includes(returnStep)) return returnStep;
  const inputs = steps.filter((id) => !TRAILING_STEP_IDS.includes(id));
  return inputs.find((id) => !completed.includes(id)) ?? "validation";
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
