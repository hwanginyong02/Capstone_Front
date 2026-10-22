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

/** 대문자 약어 끝 글자의 이름 중 받침이 있는 것 — L 엘·M 엠·N 엔·R 알(백엔드 wording `_UPPER_FINAL` 과 같다). */
const UPPER_WITH_FINAL = "LMNR";
/** 영문 낱말 끝 글자 중 받침 소리로 읽는 것 — -n·-m·-l·-t(캣)·-ng(롱)·-ck(블랙). 그 밖(모음·r·s·x·f·k·p·g·d·b …)은 '…으/…스' 소리. */
const LOWER_WITH_FINAL = ["ng", "ck", "n", "m", "l", "t"];

/**
 * 이름 뒤 "과/와" — 3절 D20 '다수 클래스 {A}와/과 소수 클래스'(서술 라운드 세션 C). 받침(ㄹ 포함)이 있으면 "과".
 * - 실제로 찍히는 마지막 글자를 본다: '이름(설명)' 꼴이면 괄호 안 설명의 끝("0(정상)과"), 끝 따옴표는 건너뛴다.
 * - 한글은 받침, 숫자는 읽는 소리(`numberFinalSound` — 0 영·2 이·10 십, "Class12" 는 끝 숫자 12 = 십이).
 * - 영문은 대략의 읽는 소리: 대문자 약어 끝은 글자 이름(L·M·N·R 만 받침), 소문자 낱말 끝은 n·m·l·t·ng·ck 만 받침.
 * 읽는 소리를 모르면(기호·빈 말) "와(과)".
 */
export function josaWaGwa(word: string): string {
  let text = word.trim().replace(/['"‘’“”」』\s]+$/, "");
  if (text.endsWith(")")) text = text.slice(0, -1).trimEnd();
  const last = text[text.length - 1];
  if (!last) return "와(과)";
  let hasFinal: boolean | null = null;
  if (last >= "가" && last <= "힣") hasFinal = (last.charCodeAt(0) - 0xac00) % 28 !== 0;
  else if (last >= "0" && last <= "9") {
    const sound = numberFinalSound(/\d+(\.\d+)?$/.exec(text)![0]);
    hasFinal = sound !== null && sound !== "none";
  } else if (last >= "A" && last <= "Z") {
    // 끝이 대문자면 약어("SVM")로 보고 글자 이름으로 읽는다. 끝이 소문자면("Cat") 아래 낱말 규칙.
    const before = text[text.length - 2];
    hasFinal = UPPER_WITH_FINAL.includes(last) && !(before >= "a" && before <= "z");
  } else if (last >= "a" && last <= "z") {
    hasFinal = LOWER_WITH_FINAL.some((tail) => text.endsWith(tail));
  }
  if (hasFinal === null) return "와(과)";
  return hasFinal ? "과" : "와";
}
