/**
 * 95% 신뢰구간 — 백엔드 `success_metrics.confidence_intervals` 를 읽어 판정 대상 지표에 붙이고, 6.0 에
 * 찍는 방식 한 줄을 만든다(서술 설계 D29, 재료 목록 9절).
 *
 * - 엔진은 고른 지표 전부(M21·M22 제외)를 계산한다. 성적서에는 **판정 대상 지표에만** 붙인다 —
 *   판정 대상 여부는 `computeVerdict.ts` 의 `isJudged` 한 곳이 정한다.
 * - 계산을 생략한 지표(method "skipped")는 붙이지 않는다. 표에는 "—"로 찍히고, 방식 한 줄에 사유를 적는다.
 * - 구간 계산은 백엔드 한 곳에서 한다. 여기서는 실려 온 값을 의심하며 읽고(모양이 틀린 항목은 버림),
 *   옮기기만 한다. 방식 한 줄은 생성 때 한 번 만들어 성적서 데이터에 저장한다.
 */
import { getMetricDisplayId } from "../../data/evaluationData";
import type { KpiResult } from "../../types/finalReport.types";
import { isJudged } from "./computeVerdict";
import { josaEuroRo } from "./koreanJosa";

/** 응답 한 항목을 읽은 값. 계산한 구간이면 low·high 가 숫자, 생략이면 둘 다 null 이고 reason 이 있다. */
export interface RawConfidenceInterval {
  low: number | null;
  high: number | null;
  method: string;
  nResamples?: number;
  seed?: number;
  reason?: string;
}

/** 백엔드 method 표기 → 성적서에 찍는 이름. 여기 없는 방식은 모르는 값이라 버린다. */
const METHOD_LABEL: Record<string, string> = {
  wilson: "Wilson 점수 구간",
  bootstrap_multinomial: "다항 재표집 부트스트랩",
  bootstrap: "행 재표집 부트스트랩",
  delong: "DeLong 방법",
  logit: "로짓 변환 정규근사",
  normal: "정규근사",
};

const LEVEL = 0.95;

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toInterval(raw: unknown): RawConfidenceInterval | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  // 열 이름이 "95% 신뢰구간"이다 — 다른 수준의 구간은 그 열에 넣을 수 없다.
  if (value.level !== LEVEL) return null;

  if (value.method === "skipped") {
    return {
      low: null,
      high: null,
      method: "skipped",
      reason: typeof value.reason === "string" && value.reason.trim() ? value.reason.trim() : undefined,
    };
  }

  if (typeof value.method !== "string" || !(value.method in METHOD_LABEL)) return null;
  const low = finite(value.low);
  const high = finite(value.high);
  if (low === null || high === null || low > high) return null;

  const nResamples = finite(value.n_resamples);
  const seed = finite(value.seed);
  return {
    low,
    high,
    method: value.method,
    ...(nResamples !== null ? { nResamples } : {}),
    ...(seed !== null ? { seed } : {}),
  };
}

/**
 * 응답의 confidence_intervals 를 읽는다. 키는 성적서 표시 ID 로 바꾼다(`getMetricDisplayId`).
 * 키가 없거나 읽을 항목이 하나도 없으면 null. 모양이 틀린 항목은 그 항목만 버린다.
 */
export function parseConfidenceIntervals(raw: unknown): Record<string, RawConfidenceInterval> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed: Record<string, RawConfidenceInterval> = {};
  for (const [metricId, entry] of Object.entries(raw as Record<string, unknown>)) {
    const interval = toInterval(entry);
    if (interval) parsed[getMetricDisplayId(metricId)] = interval;
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

/** 판정 대상 지표에 계산한 구간을 붙인다. 판정 대상이 아니거나 생략한 지표는 그대로 둔다. */
export function attachConfidenceIntervals(
  kpiResults: KpiResult[],
  intervals: Record<string, RawConfidenceInterval> | null,
): KpiResult[] {
  if (!intervals) return kpiResults;
  return kpiResults.map((r) => {
    const interval = intervals[r.metricId];
    if (!isJudged(r) || !interval || interval.low === null || interval.high === null) return r;
    return { ...r, ci: { low: interval.low, high: interval.high, method: interval.method } };
  });
}

/** 재표집 방식의 조건 — "2,000회, 시드 4213, 백분위 구간". 응답에 횟수가 없으면 "백분위 구간"만. */
function resamplingDetail(interval: RawConfidenceInterval | undefined): string {
  const parts: string[] = [];
  if (interval?.nResamples !== undefined) parts.push(`${interval.nResamples.toLocaleString("en-US")}회`);
  if (interval?.seed !== undefined) parts.push(`시드 ${interval.seed}`);
  parts.push("백분위 구간");
  return parts.join(", ");
}

/**
 * 6.0 에 찍는 방식 한 줄(결정적). `attachConfidenceIntervals` 를 거친 지표를 받는다. 판정 대상 지표에
 * 붙은 구간이 하나도 없으면 null — 그 성적서는 신뢰구간 열·고정 문구 3 을 찍지 않는다. 예:
 * "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1, M2), 다항 재표집 부트스트랩(2,000회, 시드 4213,
 *  백분위 구간; M4)으로 산출하였습니다. 다음 지표는 신뢰구간을 산출하지 않았습니다: M10(사유)."
 */
export function confidenceIntervalNote(
  kpiResults: KpiResult[],
  intervals: Record<string, RawConfidenceInterval> | null,
): string | null {
  const withCi = kpiResults.filter((r) => r.ci && isJudged(r));
  if (withCi.length === 0) return null;

  // 방식은 지표 표 순서대로 처음 나온 차례로 적는다.
  const byMethod = new Map<string, string[]>();
  for (const r of withCi) {
    const ids = byMethod.get(r.ci!.method) ?? [];
    ids.push(r.metricId);
    byMethod.set(r.ci!.method, ids);
  }
  const methods = [...byMethod.entries()].map(([method, ids]) => {
    const label = METHOD_LABEL[method] ?? method;
    if (method === "bootstrap" || method === "bootstrap_multinomial") {
      const sample = intervals?.[ids[0]];
      return `${label}(${resamplingDetail(sample)}; ${ids.join(", ")})`;
    }
    return `${label}(${ids.join(", ")})`;
  });

  // 조사는 괄호 앞 방식 이름의 받침에 맞춘다("정규근사(M19)로", "Wilson 점수 구간(M1)으로").
  const lastLabel = METHOD_LABEL[[...byMethod.keys()].at(-1)!] ?? "";
  let note = `판정 대상 지표의 95% 신뢰구간은 ${methods.join(", ")}${josaEuroRo(lastLabel)} 산출하였습니다.`;

  // 판정 대상인데 계산을 생략한 지표 — 표의 "—"가 왜 비었는지 여기서 밝힌다.
  const skipped = kpiResults
    .filter((r) => isJudged(r) && !r.ci && intervals?.[r.metricId]?.method === "skipped")
    .map((r) => {
      const reason = intervals![r.metricId].reason;
      return reason ? `${r.metricId}(${reason})` : r.metricId;
    });
  if (skipped.length > 0) {
    note += ` 다음 지표는 신뢰구간을 산출하지 않았습니다: ${skipped.join(", ")}.`;
  }
  return note;
}
