/**
 * 판 4 숫자 표기(판 4 라운드 계획 2.7, 공통 계약 `number_wording_ed4.json` 의 규칙). 백엔드 `ed4_*` 함수와 이름·결과가 같다 —
 * 두 저장소가 같은 대조 표로 시험한다(`src/test/contract/number_wording_ed4.json`).
 *
 * - 표·소견 숫자는 셋째 자리, 끝 0 유지(0.950, 1.000). 반올림은 이진 값 그대로의 절반에서 0에서 먼 쪽(`toFixed`).
 * - 판정 대상 값은 판정과 어긋나 보이면 여섯째 자리까지 늘린다(`ed4Judged` — 판 3 `formatJudgedValue` 와 같은 규칙).
 * - 신뢰구간 경계는 찍힌 경계와 목표의 대소가 반올림 전과 같아질 때까지 늘린다(`ed4CiBound`, 0.9497).
 * - 백분율·%p·부호 있는 건수는 그릴 때만(`ed4Percent`·`ed4PercentPoint`·`ed4SignedCount`). 사실 시트 `*_text` 는 숫자 꼴만 싣는다.
 * - 의뢰자가 준 결정 임계값·판정 기준값은 늘이지도 끝 0 을 채우지도 않는다(`ed4Given` — `String(value)` 와 같은 숫자, 지수 꼴 없이).
 * - 합격 기준(목표값)은 셋째 자리 이하면 셋째 자리, 넷째~여섯째 자리면 받은 글자 그대로(`ed4Target`, D1).
 * - 지연시간은 둘째 자리(`ed4Latency` — 4.8 표의 toFixed(2), D4). 최약 클래스 F1 은 다른 클래스와 달라 보일 때까지(`ed4Distinct`, D3).
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

/**
 * 정수 건수(S6 뒤 사용자 결정 4, 2026-10-24) — 1,000 이상이면 천 단위 쉼표(en-US 묶음: 1197 → "1,197", 2687 → "2,687"), 그 밖은
 * 그대로(999 → "999"). 판 4 고객 글(표·문장·규칙 문장)의 건수가 모두 이 함수다(백엔드 `ed4_count` 와 같은 글자 — 대조 표 count 줄).
 * 소수(지표·비율·지연시간 — D4)·하이퍼파라미터 글자·ID·연도·표준 번호는 건수가 아니라 쓰지 않는다. 로캘을 박는다(de-DE 면 "1.197").
 */
export function ed4Count(n: number): string {
  return n.toLocaleString("en-US");
}

/** 정수 차이 — 양수 '+', 음수 U+2212, 0 은 부호 없음(4.4 예측 편향). 1 → "+1", -3 → "−3". */
export function ed4SignedCount(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${MINUS_SIGN}${-n}`;
  return "0";
}

/**
 * 가장 짧은 십진 표기(round-trip — `String(Number)` 와 같은 숫자)를 지수 꼴 없이. 1e-7 → "0.0000001", 1e21 → "1000…0",
 * 1 → "1", 0.6166 → "0.6166". 백엔드 `_shortest`(repr)와 같은 숫자다.
 */
function shortestDecimal(value: number): string {
  const text = String(value);
  const m = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (!m) return text;
  const [, sign, lead, frac = "", expText] = m;
  const exp = Number(expText);
  const digits = lead + frac;
  if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  return `${sign}${digits.padEnd(exp + 1, "0")}`;
}

/**
 * 의뢰자가 준 결정 임계값·판정 기준값 — 늘이지도 끝 0 을 채우지도 않는다(0.5·0.1·1.5). 정수 꼴은 소수점 없이(1·30),
 * 지수 꼴은 쓰지 않는다(1e-7 → "0.0000001", D7·S2·S3 검토 T15 — 백엔드 `ed4_given` 과 같은 글자).
 */
export function ed4Given(value: number): string {
  return shortestDecimal(value);
}

/**
 * 합격 기준(목표값, D1 — 2026-10-24 사용자 승인). 받은 목표의 가장 짧은 십진 표기가 셋째 자리 이하면 `ed4Plain`(0.950),
 * 넷째~여섯째 자리면 그 글자 그대로(0.8124 — 셋째 자리로 줄이면 넷째 자리 목표와 값의 판정이 어긋나 보인다), 일곱째 자리
 * 이상이면 여섯째 자리로 반올림. 지수 꼴 없이(1e-5 → "0.00001"). 4.3 표·3.1·표지·문제 근거가 모두 이 함수다.
 */
export function ed4Target(threshold: number): string {
  const text = shortestDecimal(threshold);
  const decimals = text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
  if (decimals <= VALUE_DIGITS) return ed4Plain(threshold);
  if (decimals <= MAX_VALUE_DIGITS) return withoutNegativeZero(text);
  return withoutNegativeZero(threshold.toFixed(MAX_VALUE_DIGITS));
}

/** 합격 기준 칸("≥ 0.970", "≤ 0.100", "≥ 0.8124") — 방향 기호 + `ed4Target`. 표지·3.1·4.3 이 같은 글자. */
export function ed4TargetCriteria(threshold: number, higherIsBetter: boolean | undefined): string {
  return `${higherIsBetter === false ? "≤" : "≥"} ${ed4Target(threshold)}`;
}

/** 지연시간 자릿수 — 4.8 표(판 3 `LatencySection` 의 toFixed(2))와 같다. */
export const LATENCY_DIGITS = 2;

/** 지연시간 — 둘째 자리, 끝 0 유지(12.345 → "12.35", 3 → "3.00"). 4.8 표·사실 보기·허용 목록이 같은 글자(D4). */
export function ed4Latency(value: number): string {
  return withoutNegativeZero(value.toFixed(LATENCY_DIGITS));
}

/**
 * 최약 클래스 F1(D3) — 셋째 자리부터 여섯째 자리까지 늘려, 다른 클래스 F1(`others`) 가운데 여섯째 자리로도 같지 않은 것과
 * 모두 달라 보이는 첫 표기. 여섯째 자리로 같은 클래스는 동점이라 늘리는 까닭이 되지 않는다(최약 클래스 고르기의 동점과
 * 같은 기준 — `sameAtMaxDigits`). 0.97196 · [0.97248] → "0.9720", 0.5 · [0.5, 0.75] → "0.500".
 */
export function ed4Distinct(value: number, others: number[]): string {
  const rivals = others.filter((o) => !sameAtMaxDigits(o, value));
  for (let digits = VALUE_DIGITS; digits <= MAX_VALUE_DIGITS; digits += 1) {
    const text = value.toFixed(digits);
    if (rivals.every((o) => o.toFixed(digits) !== text)) return withoutNegativeZero(text);
  }
  return withoutNegativeZero(value.toFixed(MAX_VALUE_DIGITS));
}

/** 두 값이 여섯째 자리 표기로 같은가 — 판 4 최약 클래스 동점의 기준(백엔드 `weakest_ties` 판 4 와 같다, D3). */
export function sameAtMaxDigits(a: number, b: number): boolean {
  return a.toFixed(MAX_VALUE_DIGITS) === b.toFixed(MAX_VALUE_DIGITS);
}
