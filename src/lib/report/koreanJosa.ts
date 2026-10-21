/**
 * 성적서 고정 문구의 조사 — 끼워 넣는 말(선언 이름, 항목 이름, 숫자)의 받침에 맞춘다.
 * 예: "대화형(실시간)"으로 / "샘플 단위로 중요"로 / 12.30으로 / 9.51로.
 */

/** 끝 글자의 받침. 숫자는 읽는 소리로(0 영·3 삼·6 육 = 받침, 1 일·7 칠·8 팔 = ㄹ). 모르면 null. */
function finalConsonant(word: string): "none" | "rieul" | "other" | null {
  const last = [...word].reverse().find((ch) => (ch >= "가" && ch <= "힣") || (ch >= "0" && ch <= "9"));
  if (!last) return null;
  if (last >= "0" && last <= "9") return "036".includes(last) ? "other" : "178".includes(last) ? "rieul" : "none";
  const code = (last.charCodeAt(0) - 0xac00) % 28;
  return code === 0 ? "none" : code === 8 ? "rieul" : "other";
}

/** "으로/로" — 받침이 있으면(ㄹ 제외) "으로". */
export function josaEuroRo(word: string): string {
  return finalConsonant(word) === "other" ? "으로" : "로";
}

/** "은/는" — 한글 끝 글자의 받침으로. 한글이 없으면 "은(는)". */
export function josaEunNeun(word: string): string {
  const hangul = [...word].reverse().find((ch) => ch >= "가" && ch <= "힣");
  if (!hangul) return "은(는)";
  return (hangul.charCodeAt(0) - 0xac00) % 28 === 0 ? "는" : "은";
}

/**
 * 숫자를 읽는 소리의 끝 받침(서술 라운드 세션 B, 고정 문구 9 의 "을/를"·3절 불균형 문장의 "로/으로").
 * - 소수(점이 있음)는 마지막 숫자를 한 자씩 읽는다: 0.5 "영점오" · 0.30 "영점삼영".
 * - 정수는 자리 이름까지 읽는다: 끝의 0 이 1~3개면 십(ㅂ)·백(ㄱ)·천(ㄴ), 4개 이상이면 만(ㄴ)·억(ㄱ)·조(받침 없음)·경(ㅇ).
 *   0 자체는 "영".
 * - 숫자 끝 글자: 0 영·3 삼·6 육 = 받침, 1 일·7 칠·8 팔 = ㄹ, 2 이·4 사·5 오·9 구 = 받침 없음.
 * 숫자가 아니면 null.
 */
function numberFinalSound(value: number | string): "none" | "rieul" | "other" | null {
  const text = String(value).trim().replace(/^[-+]/, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const digitSound = (d: string) => ("036".includes(d) ? "other" : "178".includes(d) ? "rieul" : "none");
  if (text.includes(".")) return digitSound(text[text.length - 1]);
  if (/^0+$/.test(text)) return "other"; // 영
  const zeros = text.length - text.replace(/0+$/, "").length;
  if (zeros === 0) return digitSound(text[text.length - 1]);
  if (zeros < 4) return "other"; // 십·백·천
  const bigUnit = Math.floor(zeros / 4); // 1 만 · 2 억 · 3 조 · 4 경
  return bigUnit === 3 ? "none" : "other";
}

/** 숫자 뒤 "을/를" — 읽는 소리에 받침이 있으면(ㄹ 포함) "을". 숫자가 아니면 "을(를)". 예: 0.5를 · 0.3을 · 0.7을 · 10을. */
export function josaEulReul(value: number | string): string {
  const sound = numberFinalSound(value);
  if (sound === null) return "을(를)";
  return sound === "none" ? "를" : "을";
}

/**
 * 숫자 뒤 "으로/로" — 읽는 소리의 끝이 받침 없음·ㄹ이면 "로", 그 밖의 받침이면 "으로". 숫자가 아니면 "(으)로".
 * 예: 1.52로 · 1.57로 · 1.53으로 · 10으로 · 100으로. (`josaEuroRo` 는 끝 숫자 한 자만 보므로 정수의 자리 이름은
 * 이 함수가 맡는다 — 끝의 0 은 십·백·천·만이라 결과가 같지만, 조(10¹²)처럼 받침 없는 자리도 있다.)
 */
export function josaEuroRoNumber(value: number | string): string {
  const sound = numberFinalSound(value);
  if (sound === null) return "(으)로";
  return sound === "other" ? "으로" : "로";
}

/**
 * 숫자 뒤 "과/와" — 숫자를 읽는 끝소리에 받침이 있으면(ㄹ 포함 — 0 영·1 일·3 삼·6 육·7 칠·8 팔, 정수 끝 0 은
 * 십·백·천·만) "과", 없으면(2 이·4 사·5 오·9 구) "와". 숫자가 아니면 "와". 예: 0.83과 / 0.505와.
 */
export function josaWaGwaNumber(value: number | string): string {
  const sound = numberFinalSound(value);
  return sound === null || sound === "none" ? "와" : "과";
}
