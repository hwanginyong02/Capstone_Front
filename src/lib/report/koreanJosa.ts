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
