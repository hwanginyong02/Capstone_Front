/**
 * 아슬아슬(근소 차이) 지표 — 목표값과의 차이가 목표값의 3% 미만인 판정 대상 지표(서술 설계 D12).
 *
 * - 판정 대상 여부·마진·아슬아슬 판정은 `computeVerdict.ts` 의 `isJudged`·`computeMargin`·`isNearTarget`
 *   한 곳이 정한다. 여기서는 그 결과를 성적서 데이터에 붙이고 8.3 한 줄을 만들기만 한다.
 * - 8.3 한 줄은 생성 때 한 번 만들어 저장한다 — 발급본은 나중에 문안을 바꿔도 그대로다.
 * - 합격·미달을 가리지 않고 표시한다. "아슬아슬 합격"만 문제로 올리는 것은 9절 문제 목록의 몫이다.
 */
import type { KpiResult } from "../../types/finalReport.types";
import { computeMargin, isJudged, isNearTarget } from "./computeVerdict";
import { formatMetricValue } from "./metricValueFormat";

/**
 * 판정 대상 지표에 margin·nearTarget 을 붙인다. 판정 대상이 아닌 지표(정보성·측정 불가)는 그대로 둔다.
 * 키가 붙은 성적서만 6.1 판정 규칙에 3% 문장을 찍는다.
 */
export function attachNearTarget(kpiResults: KpiResult[]): KpiResult[] {
  return kpiResults.map((r) => {
    const margin = computeMargin(r);
    if (!isJudged(r) || margin === null) return r;
    return { ...r, margin, nearTarget: isNearTarget(r) };
  });
}

/** 6.1 판정 규칙에 3% 문장을 찍을 성적서인지 — 아슬아슬 표시 키가 하나라도 있으면 그렇다. */
export function hasNearTargetMarks(kpiResults: KpiResult[]): boolean {
  return kpiResults.some((r) => r.nearTarget !== undefined);
}

/**
 * 8.3 에 찍는 한 줄(결정적). `attachNearTarget` 을 거친 지표를 받는다. 아슬아슬 지표가 없으면 null. 예:
 * "목표값과의 차이가 목표값의 3% 미만인 지표(근소 차이): F1 Score(M4) 0.812(목표 0.800 이상, 충족),
 *  FPR(M8) 0.102(목표 0.100 이하, 미달)."
 */
export function nearTargetNote(kpiResults: KpiResult[]): string | null {
  const items = kpiResults
    .filter((r) => r.nearTarget === true && r.threshold !== null)
    .map((r) => {
      const bound = r.higherIsBetter === false ? "이하" : "이상";
      const outcome = r.status === "pass" ? "충족" : "미달";
      return `${r.name}(${r.metricId}) ${formatMetricValue(r.value)}(목표 ${formatMetricValue(r.threshold)} ${bound}, ${outcome})`;
    });
  if (items.length === 0) return null;
  return `목표값과의 차이가 목표값의 3% 미만인 지표(근소 차이): ${items.join(", ")}.`;
}
