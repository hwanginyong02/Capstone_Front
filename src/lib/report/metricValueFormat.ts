/**
 * 지표 값을 사람이 읽는 문자열로.
 *
 * 평가 결과 화면과 버전 비교 화면이 **같은 규칙**으로 읽어야 한다 — 한쪽이 0.903 을,
 * 다른 쪽이 90.3% 를 보여주면 같은 평가를 두 번 본 사용자가 서로 다른 값으로 기억한다.
 *
 * 전부 %로 바꾸지 않는 이유: M23(불균형비) 같은 지표는 비율이 아니라 배수라
 * 100 을 곱하면 뜻이 달라진다. 그래서 0~1 범위의 비율 지표만 골라 둔다.
 */

/** 값이 0~1 범위의 비율인 지표(ISO/IEC TS 4213 기준). */
export const RATIO_METRIC_IDS = new Set([
  "M1", "M2", "M3", "M4", "M5", "M7", "M8", "M9", "M10", "M11", "M12", "M13",
  "M15", "M16", "M17", "M18",
]);

/** 측정 불가·미선택을 나타내는 표기. 0 과 구분돼야 한다. */
export const NOT_MEASURED = "—";

/**
 * 스칼라 값이 **없는** 지표. M21 은 행렬, M22 는 클래스별 표를 돌려준다.
 *
 * 백엔드 응답이 숫자가 아니라 객체라서 `resolvedValue` 가 0 으로 남는데
 * (`useReportData` 의 dict 분기는 `f1_score` 키가 있을 때만 값을 꺼낸다),
 * 그 0 을 그대로 인쇄하면 화면에 **"Confusion Matrix 0.000"** 이 뜬다.
 * 0 은 측정값이 아니라 '해당 없음'이므로 숫자를 그리지 않는다.
 */
export const VISUAL_ONLY_METRIC_IDS = new Set(["M21", "M22"]);

/** 스칼라 값이 없는 지표가 어디에 그려지는지 알려주는 한 줄. */
export const VISUAL_ONLY_HINT: Record<string, string> = {
  M21: "아래 혼동행렬로 보입니다.",
  M22: "Precision, Recall, F1 을 클래스별로 나눠 보입니다.",
};

/** 소수 표기(항상 3자리). 지표 종류와 무관하게 쓸 수 있는 원값. */
export function formatMetricValue(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return NOT_MEASURED;
  return value.toFixed(3);
}

/** 비율 지표면 백분율 문자열, 아니면 null(호출부가 원값으로 떨어지게). */
export function formatMetricPercent(
  metricId: string,
  value: number | null | undefined,
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!RATIO_METRIC_IDS.has(metricId)) return null;
  if (value < 0 || value > 1) return null;
  return `${(value * 100).toFixed(1)}%`;
}

/** 표 한 칸에 넣을 대표 표기 — 비율이면 %, 아니면 소수. */
export function formatMetricCell(
  metricId: string,
  value: number | null | undefined,
): string {
  return formatMetricPercent(metricId, value) ?? formatMetricValue(value);
}

/**
 * 합격 목표값을 찍을 자릿수가 없던 성적서(`FinalReportData.targetDigits` 없음)의 자릿수. 그때는 목표값을
 * 둘째 자리로 반올림해 찍었다 — 발급본은 그 모양 그대로 다시 그린다.
 */
export const LEGACY_TARGET_DIGITS = 2;

/**
 * 합격 기준 한 칸("≥ 0.855"). 5절 문자열과 6.1·6.2 표가 이 하나로 찍는다. `digits` 는 성적서에 실린
 * `targetDigits`(새 성적서 3) — 없으면 종전 2자리.
 */
export function formatTargetCriteria(
  target: number,
  higherIsBetter: boolean | undefined,
  digits: number = LEGACY_TARGET_DIGITS,
): string {
  return `${higherIsBetter === false ? "≤" : "≥"} ${target.toFixed(digits)}`;
}
