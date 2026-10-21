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
 * 숫자 뒤 "으로/로" — 숫자를 읽는 끝소리로(서술 라운드 세션 B). 끝소리가 ㄹ(1 일·7 칠·8 팔)이거나 받침이 없으면
 * (2 이·4 사·5 오·9 구) "로", 그 밖(0 영·3 삼·6 육)은 "으로". 정수 끝의 0 은 십·백·천·만으로 읽혀 역시 "으로".
 * 예: 1.53으로 / 1.57로 / 0.1177로 / 10으로. 숫자가 아니면 끝 글자의 받침으로(`josaEuroRo`).
 */
export function josaEuroRoNumber(value: string): string {
  const last = [...value.trim()].reverse().find((ch) => ch >= "0" && ch <= "9");
  if (last === undefined) return josaEuroRo(value);
  return "036".includes(last) ? "으로" : "로";
}

/**
 * 숫자 뒤 "과/와" — 숫자를 읽는 끝소리에 받침이 있으면(0 영·1 일·3 삼·6 육·7 칠·8 팔, 정수 끝 0 은 십·백·천·만)
 * "과", 없으면(2 이·4 사·5 오·9 구) "와". 예: 0.83과 / 0.505와.
 */
export function josaWaGwaNumber(value: string): string {
  const last = [...value.trim()].reverse().find((ch) => ch >= "0" && ch <= "9");
  if (last === undefined) return "와";
  return "2459".includes(last) ? "와" : "과";
}
