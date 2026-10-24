/**
 * 같은 수는 같은 글자(D2, 2026-10-24 사용자 승인) — 판정과 무관한 자리의 값이 같은 성적서의 판정 대상 지표 값과 같은 원값이면
 * 그 지표의 judged 글자(사실 시트 `metrics[].value_text` 와 같은 글자)를 쓴다. 예: 이진 최약 클래스 F1 = 양성 클래스 F1 = F1 Score(M4)
 * 이면 M4 value_text 그대로(0.9696 이면 0.9696 — plain 0.970 이 아니다).
 *
 * '같은 원값' 은 |차이| < 1e-9(백엔드 `judged_value_text_ed4`·`same_metric_value_ed4` 와 같은 기준), 대상은 value_text 가 있는 판정
 * 대상 지표 전부(지표 결과 순서의 첫 줄). 이 판단은 프론트가 여기 한 곳에서 하고 사실 시트에 글자로 싣는다 — 백엔드는 읽기만 한다.
 */
import type { KpiResult } from "../../../types/finalReport.types";
import { isJudged } from "../computeVerdict";
import { formatJudgedValue } from "../judgedNumber";
import { ed4Plain } from "./edition4Number";

/** 같은 원값으로 보는 차이의 상한. */
export const SAME_VALUE_EPS = 1e-9;

/** 판정 대상 지표의 value_text — 사실 시트 `metrics[].value_text` 와 같은 함수·같은 글자. 판정 대상이 아니면 null. */
export function metricValueTextEd4(r: KpiResult): string | null {
  return isJudged(r) && r.threshold !== null
    ? formatJudgedValue(r.value, r.threshold, r.higherIsBetter !== false, r.status === "pass")
    : null;
}

/** 값이 판정 대상 지표의 원값과 같으면 그 지표의 value_text(사실 시트와 같은 함수), 아니면 null. */
export function judgedValueTextEd4(kpiResults: KpiResult[], value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const hit = kpiResults.find((r) => metricValueTextEd4(r) !== null && Math.abs(r.value - value) < SAME_VALUE_EPS);
  return hit ? metricValueTextEd4(hit) : null;
}

/** 판정과 무관한 자리의 값 — 판정 대상 지표와 같은 원값이면 그 value_text, 아니면 plain. */
export function sameValueTextEd4(kpiResults: KpiResult[], value: number): string {
  return judgedValueTextEd4(kpiResults, value) ?? ed4Plain(value);
}
