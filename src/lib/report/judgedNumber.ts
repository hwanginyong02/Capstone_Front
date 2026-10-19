/**
 * 판정 숫자의 한 곳 — 차이 계산(끝자리 잡음 걷기)과, 판정과 같은 쪽으로 읽히는 표시 문자열(S2).
 *
 * - 부동소수 뺄셈은 끝자리 잡음을 낸다. sklearn 매크로 F1 이 수학적으로 0.8 인데 0.7999999999999999 로 오면
 *   목표 0.8 에 '미달'이 됐고, 정확도 0.824 대 목표 0.8 은 차이가 꼭 3% 인데 0.02399999… 라 '아슬아슬'이
 *   됐다(점검 F2). 판정·마진·아슬아슬·문제 목록이 모두 `difference` 하나로 차이를 잰다 — 종전에는 문제 목록만
 *   잡음을 걷어 기준이 두 벌이었다.
 * - 판정은 실제 값으로 하고, 셋째 자리 반올림이 판정과 어긋나 보이면(실제 미달 0.7996 이 "0.800 / ≥ 0.800 /
 *   불합격") 자릿수를 늘려 찍는다(사용자 결정 2026-10-19 "판정 자릿수"). 백엔드 엔진의 불균형 표시값
 *   (`metrics/display.judged_text`)과 같은 원칙이다.
 */

/**
 * 두 값의 차를 끝자리 잡음 없이. 표의 값은 많아야 소수 4~6자리라 10자리 반올림은 판정을 바꾸지 않는다.
 * 0.85 − 0.75 = 0.0999999… → 0.1, 0.7999999999999999 − 0.8 → 0.
 */
export function difference(a: number, b: number): number {
  const d = Math.round((a - b) * 1e10) / 1e10;
  return d === 0 ? 0 : d; // −0 을 0 으로
}

/** 목표 충족인지 — 높을수록 좋은 지표는 값 ≥ 목표, 낮을수록 좋은 지표는 값 ≤ 목표(잡음을 걷은 차이로). */
export function meetsTarget(value: number, target: number, higherIsBetter: boolean): boolean {
  const d = difference(value, target);
  return higherIsBetter ? d >= 0 : d <= 0;
}

/** 평소 자릿수 — 성적서 지표 값(formatMetricValue)과 같다. */
export const VALUE_DIGITS = 3;
/** 이 자릿수까지 늘린다. 판정은 10자리로 잡음만 걷어 낸 값으로 하므로 그 너머는 뜻이 없다. */
export const MAX_VALUE_DIGITS = 6;

/**
 * 판정 대상 지표 값의 표시 문자열. 평소에는 셋째 자리(`value.toFixed(3)`)이고, 찍힌 숫자를 목표와 비교한
 * 결과가 실제 판정(`pass`)과 다르면 읽는 쪽이 판정과 같아질 때까지 자릿수를 늘린다(최대 여섯째 자리).
 * 여섯째 자리로도 어긋나면 판정 쪽으로 자른다 — 숫자를 지어내지 않되 반대로 읽히지 않게.
 *
 * - 0.7996 · 목표 0.8 · 불합격 → "0.7996" (셋째 자리 "0.800" 은 합격으로 읽힌다)
 * - 0.7999999999999999 · 목표 0.8 · 합격(잡음을 걷으면 같다) → "0.800"
 */
export function formatJudgedValue(
  value: number,
  target: number,
  higherIsBetter: boolean,
  pass: boolean,
): string {
  for (let digits = VALUE_DIGITS; digits <= MAX_VALUE_DIGITS; digits += 1) {
    const printed = value.toFixed(digits);
    if (meetsTarget(Number(printed), target, higherIsBetter) === pass) return printed;
  }
  const scale = 10 ** MAX_VALUE_DIGITS;
  // 판정 쪽으로 자른다: 충족이면 목표 쪽으로 다가가지 않게, 미달이면 목표를 넘지 않게.
  const towardPass = higherIsBetter === pass;
  const cut = (towardPass ? Math.ceil(value * scale) : Math.floor(value * scale)) / scale;
  return cut.toFixed(MAX_VALUE_DIGITS);
}
