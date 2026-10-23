/**
 * 판 4 숫자 표기(판 4 라운드 계획 2.7, 공통 계약 `number_wording_ed4.json` 의 규칙). 백엔드 `ed4_*` 함수와 이름·결과가 같다 —
 * 두 저장소가 같은 대조 표로 시험한다(`src/test/contract/number_wording_ed4.json`).
 *
 * - 표·소견 숫자는 셋째 자리, 끝 0 유지(0.950, 1.000). 반올림은 이진 값 그대로의 절반에서 0에서 먼 쪽(`toFixed`).
 * - 판정 대상 값은 판정과 어긋나 보이면 여섯째 자리까지 늘린다(`ed4Judged` — 판 3 `formatJudgedValue` 와 같은 규칙).
 * - 신뢰구간 경계는 찍힌 경계와 목표의 대소가 반올림 전과 같아질 때까지 늘린다(`ed4CiBound`, 0.9497).
 * - 백분율·%p·부호 있는 건수는 그릴 때만(`ed4Percent`·`ed4PercentPoint`·`ed4SignedCount`). 사실 시트 `*_text` 는 숫자 꼴만 싣는다.
 * - 의뢰자가 준 결정 임계값·판정 기준값은 늘이지도 끝 0 을 채우지도 않는다(`String(value)`).
 * - 음의 0 은 부호 없이("0.000"). 숫자 꼴 칸의 음수는 ASCII '-', 그리는 차이(%p·건수)의 음수는 U+2212.
 *
 * 판 3 잎 함수(`judgedNumber.ts` 의 `formatJudgedValue`·`judgedText`·`percentText` …)는 고치지 않는다 — 판 3 사실 시트는
 * 넷째 자리·끝 0 빼기라 규칙이 다르다.
 */
import { difference, formatJudgedValue, MAX_VALUE_DIGITS, VALUE_DIGITS } from "../judgedNumber";

/** 그리는 차이의 음수 부호(U+2212). */
export const MINUS_SIGN = "−";

/** "-0.000"·"-0" 처럼 0 으로 찍힌 음수의 부호를 뗀다. */
function withoutNegativeZero(text: string): string {
  return text.startsWith("-") && /^[0.]+$/.test(text.slice(1)) ? text.slice(1) : text;
}

/** 판정과 무관한 값 — 셋째 자리, 끝 0 유지. 0.9824561… → "0.982", 1 → "1.000", -0.0004 → "0.000". */
export function ed4Plain(value: number): string {
  return withoutNegativeZero(value.toFixed(VALUE_DIGITS));
}

/**
 * 판정 대상 지표 값과 기준과 비교되는 파생값 — 셋째 자리로 찍되, 찍힌 값을 기준과 비교한 결과(높을수록 좋음 ≥, 낮을수록
 * 좋음 ≤, 1e-10 보정)가 실제 판정(`meets`)과 다르면 같아질 때까지 늘린다(최대 여섯째 자리, 그래도 어긋나면 판정 쪽으로 자름).
 * 판 3 `formatJudgedValue` 와 같은 규칙이고 음의 0 만 부호를 뗀다. 0.9696 · 0.97 · 미달 → "0.9696", 0.004585654 · 0.1 · 미만 → "0.005".
 */
export function ed4Judged(value: number, threshold: number, higherIsBetter: boolean, meets: boolean): string {
  return withoutNegativeZero(formatJudgedValue(value, threshold, higherIsBetter, meets));
}

/**
 * 부호 있는 차이를 크기로 기준과 비교하는 칸(Precision − Recall, 학습↔평가 분포 차) — 크기를 `ed4Judged`(높을수록 좋음)로
 * 찍고 음수면 '-' 를 붙인다. 크기가 0 으로 찍히면 부호 없음. -0.002409709 · 0.1 · 미만 → "-0.002".
 */
export function ed4SignedJudged(value: number, threshold: number, meets: boolean): string {
  const magnitude = ed4Judged(Math.abs(value), threshold, true, meets);
  return value < 0 && /[1-9]/.test(magnitude) ? `-${magnitude}` : magnitude;
}

/**
 * 판정 대상 지표의 신뢰구간 경계 — 반올림 전 경계(`low_raw`·`high_raw`)를 셋째 자리부터 여섯째 자리까지 늘려, 찍힌 경계와
 * 목표의 대소(<·=·>, 1e-10 보정)가 반올림 전 경계와 목표의 대소와 같아지는 첫 표기. 여섯째 자리로도 안 되면 원값 쪽으로
 * 자른다(목표보다 아래면 내림, 위면 올림). 0.9496962… · 0.95 → "0.9497", 1 · 0.95 → "1.000", 0.95 · 0.95 → "0.950".
 */
export function ed4CiBound(raw: number, target: number): string {
  const side = Math.sign(difference(raw, target));
  for (let digits = VALUE_DIGITS; digits <= MAX_VALUE_DIGITS; digits += 1) {
    const text = raw.toFixed(digits);
    if (Math.sign(difference(Number(text), target)) === side) return withoutNegativeZero(text);
  }
  const scale = 10 ** MAX_VALUE_DIGITS;
  const cut = (side < 0 ? Math.floor(raw * scale) : Math.ceil(raw * scale)) / scale;
  return withoutNegativeZero(cut.toFixed(MAX_VALUE_DIGITS));
}

/**
 * 소수 표기 글자의 소수점을 두 칸 옮긴다 — 숫자로 곱하지 않는다(0.285 × 100 = 28.499999…). 소수 자릿수는 (원래 − 2),
 * 최소 1. 부호와 옮긴 몸통을 따로 돌려준다. 숫자 꼴이 아니면 null.
 */
function movePoint(fractionText: string): { negative: boolean; body: string; zero: boolean } | null {
  const m = /^(-?)(\d+)(?:\.(\d*))?$/.exec(fractionText.trim());
  if (!m) return null;
  const [, sign, whole, frac = ""] = m;
  const digits = whole + frac.padEnd(2, "0");
  const point = whole.length + 2;
  const head = digits.slice(0, point).replace(/^0+(?=\d)/, "");
  const tail = digits.slice(point) || "0";
  const body = `${head}.${tail}`;
  return { negative: sign === "-", body, zero: !/[1-9]/.test(body) };
}

/** 백분율 — "0.374" → "37.4%", "0.000" → "0.0%", "0.04996" → "4.996%". 숫자 꼴이 아니면 그대로. */
export function ed4Percent(fractionText: string): string {
  const moved = movePoint(fractionText);
  if (!moved) return fractionText;
  return `${moved.negative && !moved.zero ? "-" : ""}${moved.body}%`;
}

/** 백분율 포인트 차이 — 양수 '+', 음수 U+2212, 0 은 부호 없음. "-0.002" → "−0.2%p", "0.002" → "+0.2%p". */
export function ed4PercentPoint(fractionText: string): string {
  const moved = movePoint(fractionText);
  if (!moved) return fractionText;
  if (moved.zero) return `${moved.body}%p`;
  return `${moved.negative ? MINUS_SIGN : "+"}${moved.body}%p`;
}

/** 정수 차이 — 양수 '+', 음수 U+2212, 0 은 부호 없음(4.4 예측 편향). 1 → "+1", -3 → "−3". */
export function ed4SignedCount(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${MINUS_SIGN}${-n}`;
  return "0";
}
