/**
 * 지표 값과 목표(임계)값을 방향성에 맞게 비교해 합·불(pass/fail)을 판정.
 *
 * - higherIsBetter=true(기본):  값 ≥ 목표 → pass  (목표=하한)
 * - higherIsBetter=false:       값 ≤ 목표 → pass  (목표=상한, 낮을수록 좋은 지표)
 *
 * 방향성의 단일 출처는 evaluationData.ts 의 MetricDefinition.higherIsBetter 다.
 * 비교는 끝자리 잡음을 걷은 차이(`judgedNumber.meetsTarget`)로 한다 — 0.7999999999999999 대 목표 0.8 은 합격.
 */
import { meetsTarget } from "./judgedNumber";

export function evaluateStatus(
  value: number,
  target: number,
  higherIsBetter: boolean,
): "pass" | "fail" {
  return meetsTarget(value, target, higherIsBetter) ? "pass" : "fail";
}
