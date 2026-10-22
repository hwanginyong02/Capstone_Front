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

/** 참조 범위 대비 단순 수치 위치 — 백엔드 `baselines.benchmark_position` 과 같다(끝은 범위 안). */
export type BenchmarkPosition = "below" | "within" | "above";

export function benchmarkPosition(value: number, low: number, high: number): BenchmarkPosition {
  if (value < low) return "below";
  if (value > high) return "above";
  return "within";
}

/** 방향을 반영한 품질(better·within·worse)을 단순 수치 위치로 되돌린다. 모르는 품질이면 null. */
export function positionOfQuality(quality: string, lowerIsBetter: boolean): BenchmarkPosition | null {
  if (quality === "within") return "within";
  if (quality !== "better" && quality !== "worse") return null;
  return (quality === "better") === lowerIsBetter ? "below" : "above";
}

/**
 * 8.1 벤치마크 모델 값의 표시 문자열(서술 라운드 세션 C) — `formatJudgedValue` 와 같은 원칙.
 * 셋째 자리(`toFixed(3)`)로 찍되, 찍힌 숫자를 참조 범위(low·high)와 비교한 위치가 서버 위치(`position`, 반올림 전
 * 값으로 판정)와 다르면 같아질 때까지 한 자리씩 늘린다(최대 여섯째 자리, 끝의 0 은 그대로 둔다). 판정 대상
 * 지표(`judged`)면 각 자릿수에서 목표 판정(`meetsTarget`)도 함께 맞아야 한다.
 * 여섯째 자리로도 안 맞으면: 판정 대상이면 `formatJudgedValue`(목표 판정 우선), 아니면 위치 쪽으로 자른 값
 * (below 는 내림, above 는 올림)이 위치와 맞을 때만 그 값, 그래도 안 맞으면(값 자체가 이미 반올림돼 와 범위 끝과
 * 같을 때) 숫자를 지어내지 않고 셋째 자리.
 *
 * - 0.8497 · 범위 0.85~0.92 · below → "0.8497" (셋째 자리 "0.850" 은 범위 안으로 읽힌다)
 * - 0.92049 · 범위 0.85~0.92 · above → "0.9205" · 0.79996 · 범위 0.8~0.92 · below → "0.79996"
 */
export function formatBenchmarkValue(
  value: number,
  low: number,
  high: number,
  position: BenchmarkPosition,
  judged?: { target: number; higherIsBetter: boolean; pass: boolean },
): string {
  for (let digits = VALUE_DIGITS; digits <= MAX_VALUE_DIGITS; digits += 1) {
    const printed = value.toFixed(digits);
    const n = Number(printed);
    const targetOk = !judged || meetsTarget(n, judged.target, judged.higherIsBetter) === judged.pass;
    if (targetOk && benchmarkPosition(n, low, high) === position) return printed;
  }
  if (judged) return formatJudgedValue(value, judged.target, judged.higherIsBetter, judged.pass);
  const scale = 10 ** MAX_VALUE_DIGITS;
  const cut = position === "below" ? Math.floor(value * scale) / scale : position === "above" ? Math.ceil(value * scale) / scale : value;
  return benchmarkPosition(cut, low, high) === position ? cut.toFixed(MAX_VALUE_DIGITS) : value.toFixed(VALUE_DIGITS);
}

/** 사실 시트 파생값의 평소 자릿수 — 엔진이 싣는 값(round(x, 4))과 같다. */
export const FACT_DIGITS = 4;
/** 이 자릿수까지 늘린다 — 엔진 `metrics/display.MAX_DIGITS` 와 같다. */
export const MAX_FACT_DIGITS = 9;

function trimmedFixed(value: number, digits: number): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" || text === "" ? "0" : text;
}

/** 반올림 전 값을 9자리로 정리한 숫자(뺄셈 끝자리 잡음만 걷는다). */
export function cleanNumber(value: number): number {
  const v = Number(value.toFixed(MAX_FACT_DIGITS));
  return v === 0 ? 0 : v;
}

/**
 * 기준과 비교되는 파생값의 서술용 표기 — 백엔드 엔진 `metrics/display.judged_text` 와 같은 규칙.
 * 넷째 자리로 찍되(끝의 0 은 뺀다), 찍힌 숫자를 기준과 비교한 결과가 실제 판정(`meets` = 값 ≥ 기준)과
 * 반대로 읽히면 아홉째 자리까지 늘린다. 그래도 반대면 판정 쪽으로 자른다.
 *
 * - 작은 표본 비율 0.04996 · 기준 0.05 · 미만 → "0.04996" (넷째 자리 "0.05" 는 기준과 같아 보인다)
 * - 매크로와의 차 0.09996 · 기준 0.1 · 미만 → "0.09996"
 */
export function judgedText(value: number, threshold: number, meets: boolean): string {
  for (let digits = FACT_DIGITS; digits <= MAX_FACT_DIGITS; digits += 1) {
    const text = trimmedFixed(value, digits);
    if ((difference(Number(text), threshold) >= 0) === meets) return text;
  }
  const scale = 10 ** MAX_FACT_DIGITS;
  const cut = (meets ? Math.ceil(value * scale) : Math.floor(value * scale)) / scale;
  return trimmedFixed(cut, MAX_FACT_DIGITS);
}

/**
 * 소수 표기 문자열을 백분율로 — 소수점을 오른쪽으로 두 칸 옮긴다("0.285" → "28.5%", "0.04996" → "4.996%").
 * 숫자로 곱하지 않고 글자를 옮겨, 판정 쪽으로 늘린 자릿수(`judgedText`)가 부동소수 곱셈으로 흐트러지지 않게
 * 한다(0.285 × 100 = 28.499999999999996). 숫자 꼴이 아니면 그대로 돌려준다.
 */
export function percentText(decimalText: string): string {
  const m = /^(-?)(\d+)(?:\.(\d*))?$/.exec(decimalText.trim());
  if (!m) return decimalText;
  const [, sign, int, frac = ""] = m;
  const digits = int + frac.padEnd(2, "0");
  const point = int.length + 2;
  const whole = digits.slice(0, point).replace(/^0+(?=\d)/, "");
  const rest = digits.slice(point).replace(/0+$/, "");
  const text = rest ? `${whole}.${rest}` : whole;
  return `${sign && text !== "0" ? "-" : ""}${text}%`;
}

/** 기준과 비교하지 않는 파생값의 표기 — 넷째 자리, 끝의 0 은 뺀다. */
export function factText(value: number): string {
  return trimmedFixed(value, FACT_DIGITS);
}
