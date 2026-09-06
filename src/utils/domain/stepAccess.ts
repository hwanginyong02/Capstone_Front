/**
 * 단계 진입 가드 — 선행 단계를 마치지 않은 단계로 직접 들어오는 것을 막는다.
 *
 * ISSUES.md E-12 — `WorkflowShell` 이 선행 단계 완료 여부를 검사하지 않아, URL 을 직접
 * 치면 빈 상태로 5·6단계에 들어갈 수 있었다. 거기서 매핑 화면은 '유효'로 판정되고(E-13)
 * 검증은 '오류 0건'으로 읽혀(E-04) 빈 성적서까지 도달했다.
 *
 * **이 가드는 E-01(persist) 이후에야 성립한다.** 종전에는 새로고침마다 completedSteps 가
 * 비어서, 가드를 켜면 정상 사용자도 1단계로 튕겼다.
 */

/** 진입 가능 여부. */
export function canEnterStep(step: number, completedSteps: number[]): boolean {
  if (step <= 1) return true;
  // 이미 마친 단계는 언제든 다시 볼 수 있다(뒤로 가서 수정하는 정상 동선).
  if (completedSteps.includes(step)) return true;
  // 아직 안 마쳤다면 바로 앞 단계는 끝나 있어야 한다.
  return completedSteps.includes(step - 1);
}

/**
 * 진입이 막힐 때 대신 보내야 할 단계.
 * 마친 단계 중 가장 뒤의 '다음' 단계 — 즉 사용자가 실제로 이어서 해야 할 곳.
 */
export function resumeStep(completedSteps: number[]): number {
  if (completedSteps.length === 0) return 1;
  return Math.max(...completedSteps) + 1;
}
