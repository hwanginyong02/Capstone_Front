/**
 * 판정 여유(판 4 라운드 대응표 24, 고정 문구 19·10 판 4, 서술 설계 D12 판 4) — 판 4 run 의 지표마다 "작음"·"충분"을 정한다.
 *
 * - 반올림 전 95% 신뢰구간이 목표값을 포함하면(경계 포함) "작음", 포함하지 않으면 "충분".
 * - 신뢰구간이 없는 지표는 목표값과의 차이가 목표값의 3% 엄격 미만이면 "작음"(판 3 근소 차이 식 `isNearTarget` 그대로).
 * - 합격·미달을 가리지 않는다. 판정 대상이 아니면(목표값 없음·측정 불가) 판정 여유가 없다(4.3 "—").
 *
 * 판 4 의 4.3 판정 여유 열·표지 핵심 지표 줄·문제 "핵심 지표 근소 합격" 조건·사실 시트(near_target)가 모두 생성 때 저장한
 * `KpiResult.judgmentMargin` 하나를 읽는다. 판 3 의 `nearTarget`(3% 뜻)은 덮지 않는다 — 판 3 코드(`nearTarget.ts`·
 * `computeVerdict.ts`)는 고치지 않는다.
 */
import type { KpiResult } from "../../../types/finalReport.types";
import { getMetricDisplayId } from "../../../data/evaluationData";
import { isJudged, isNearTarget } from "../computeVerdict";
import { difference } from "../judgedNumber";

export type JudgmentMargin = "small" | "ample";

/** 반올림 전 신뢰구간 경계 한 쌍. */
export interface IntervalBounds {
  low: number;
  high: number;
}

/** 신뢰구간이 목표값을 포함하는가 — 낮은 경계 ≤ 목표 ≤ 높은 경계(경계 포함, 끝자리 잡음은 `difference` 로 걷는다). */
export function ciContainsTarget(low: number, high: number, target: number): boolean {
  return difference(low, target) <= 0 && difference(high, target) >= 0;
}

/**
 * 지표 하나의 판정 여유. `bounds` 는 그 지표에 붙은 신뢰구간의 반올림 전 경계(없으면 null — 3% 규칙).
 * 판정 대상이 아니면 null.
 */
export function judgmentMargin(r: KpiResult, bounds: IntervalBounds | null): JudgmentMargin | null {
  if (!isJudged(r) || r.threshold === null) return null;
  if (bounds) return ciContainsTarget(bounds.low, bounds.high, r.threshold) ? "small" : "ample";
  return isNearTarget(r) ? "small" : "ample";
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * 평가 응답 `confidence_intervals` 의 반올림 전 경계(`low_raw`·`high_raw`, 백엔드 판 4 라운드 S1)를 읽는다. 키는 성적서 표시
 * ID. 두 칸이 모두 숫자이고 low ≤ high 인 항목만 — 없거나 틀리면(옛 백엔드) 그 지표는 빠지고, 붙일 때 넷째 자리 경계로 대신한다.
 */
export function parseRawIntervalBounds(raw: unknown): Record<string, IntervalBounds> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed: Record<string, IntervalBounds> = {};
  for (const [metricId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const low = finite((entry as Record<string, unknown>).low_raw);
    const high = finite((entry as Record<string, unknown>).high_raw);
    if (low === null || high === null || low > high) continue;
    parsed[getMetricDisplayId(metricId)] = { low, high };
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

/**
 * 판 4 run 의 지표에 판정 여유를 붙인다(`attachConfidenceIntervals`·`attachNearTarget` 을 거친 값을 받는다).
 *
 * - 신뢰구간이 있는지는 판 3 과 같은 한 곳(`attachConfidenceIntervals` 가 붙인 `ci`)으로 본다 — 판정 대상이고 엔진이 구간을
 *   계산한 지표다. 그 구간의 반올림 전 경계(`rawBounds`)로 포함 여부를 보고, 반올림 전 경계가 없으면(옛 백엔드) 넷째 자리 경계로.
 * - 반올림 전 경계가 있으면 `ciRaw` 로 함께 저장한다 — 4.3 경계 표기와 사실 시트 `ci_low_text` 가 같은 값을 쓴다.
 * - 판정 대상이 아닌 지표는 그대로 둔다(키 없음 = "—").
 */
export function attachJudgmentMargin(
  kpiResults: KpiResult[],
  rawBounds: Record<string, IntervalBounds> | null,
): KpiResult[] {
  return kpiResults.map((r) => {
    const raw = r.ci ? rawBounds?.[r.metricId] : undefined;
    const bounds = r.ci ? (raw ?? { low: r.ci.low, high: r.ci.high }) : null;
    const margin = judgmentMargin(r, bounds);
    if (margin === null) return r;
    return { ...r, judgmentMargin: margin, ...(raw ? { ciRaw: { low: raw.low, high: raw.high } } : {}) };
  });
}
