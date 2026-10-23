/**
 * 성적서 고정 문구의 조사 — 끼워 넣는 말(선언 이름, 항목 이름, 숫자)의 받침에 맞춘다.
 * 예: "대화형(실시간)"으로 / "샘플 단위로 중요"로 / 12.30으로 / 9.51로.
 */

/** "으로/로" — 받침이 있으면(ㄹ 제외) "으로". */
export function josaEuroRo(word: string): string {
  return nameFinalSound(word) === "other" ? "으로" : "로";
}

/** "은/는" — 이름의 끝소리(`nameFinalSound`)로. 받침(ㄹ 포함)이 있으면 "은". 읽는 소리를 모르면 "은(는)". */
export function josaEunNeun(word: string): string {
  const sound = nameFinalSound(word);
  if (sound === null) return "은(는)";
  return sound === "none" ? "는" : "은";
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

/** `josa` 가 고르는 조사 쌍 — "받침 있을 때/없을 때". */
export type JosaPair = "이/가" | "을/를" | "은/는" | "과/와" | "으로/로";

/**
 * 끼워 넣는 말(이름·숫자 글자) 뒤 조사 하나 — 판 4 라운드 공통 계약(`number_wording_ed4.json` 의 josa 줄, 백엔드
 * `wording.josa` 와 같은 표). 끝소리는 공통 규칙 `nameFinalSound`(따옴표·공백 건너뜀, "이름(설명)"은 괄호 앞 이름, 쉼표로 이은
 * 이름은 끝 글자라 저절로 마지막 이름, 숫자는 읽는 소리)로 고른다. 숫자는 **찍힌 글자**를 넘긴다 — 0.005로, 0.0046으로.
 *
 * - "으로/로"만 ㄹ 받침 뒤에도 "로"(1.672로·0.977로). 나머지 넷은 ㄹ 도 받침이다(0.977이·0.9497을).
 * - 읽는 소리를 모르면 두 꼴을 함께 적는다 — "이(가)"·"을(를)"·"은(는)"·"과(와)"·"(으)로"(고정 문구의 표기).
 *
 * 판 3 이 쓰는 `josaWaGwa`·`josaEunNeun`·`josaEuroRo`·`josaEulReul` 등은 그대로 둔다.
 */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = pair.split("/") as [string, string];
  const sound = nameFinalSound(word);
  if (sound === null) return pair === "으로/로" ? "(으)로" : `${withFinal}(${withoutFinal})`;
  if (sound === "none") return withoutFinal;
  if (sound === "rieul" && pair === "으로/로") return withoutFinal;
  return withFinal;
}

/** 대문자 약어 끝 글자의 이름 중 받침이 있는 것 — L 엘·M 엠·N 엔·R 알(R·L 은 ㄹ). */
const UPPER_FINAL: Record<string, "rieul" | "other"> = { L: "rieul", M: "other", N: "other", R: "rieul" };
const VOWELS = "aeiou";

/**
 * 끼워 넣는 이름의 끝소리 — 받침 없음 "none" · ㄹ 받침 "rieul" · 그 밖의 받침 "other" · 모르면 null.
 * 두 저장소 공통 조사 규칙(서술 라운드 세션 C 마지막 검토 — 백엔드 wording `_final` 과 같은 표를 양쪽 테스트에 둔다):
 * 1. 끝의 따옴표·공백은 건너뛴다.
 * 2. "이름(설명)" 꼴이면 괄호 앞 이름의 끝소리로 고른다(괄호 안은 읽지 않는 것으로 보고 앞말에 맞추는 표기 관례).
 *    괄호 앞이 비어 있으면("(설명)") 괄호 안 말로.
 * 3. 한글 끝 글자는 받침 유무(ㄹ 받침은 "rieul").
 * 4. 숫자로 끝나면 읽는 소리(`numberFinalSound` — 소수는 끝 숫자 한 자, 정수는 끝 0 개수로 십·백·천·만…).
 * 5. 영문 대문자로 끝나면(약어) 알파벳 이름: L 엘·M 엠·N 엔·R 알 만 받침(R·L 은 ㄹ). 앞 글자가 소문자여도 같다('xR'과).
 * 6. 영문 소문자로 끝나면: -ng·-m·-n·-ck 받침, -l 받침(ㄹ), -t 는 바로 앞 글자가 모음일 때만 받침(cat 캣·set 셋),
 *    그 밖(-nt·-st·-s·-r·-k·-d·-g·-e …)은 '…트·…스' 소리라 받침 없음(malignant 멀리그넌트).
 * 7. %(퍼센트)는 받침 없음. 그 밖의 기호만 남으면 null.
 */
function nameFinalSound(word: string): "none" | "rieul" | "other" | null {
  let text = (word ?? "").replace(/['"‘’“”」』\s]+$/, "");
  if (text.endsWith(")")) {
    let depth = 0;
    for (let i = text.length - 1; i >= 0; i -= 1) {
      if (text[i] === ")") depth += 1;
      else if (text[i] === "(") {
        depth -= 1;
        if (depth === 0) {
          const before = text.slice(0, i);
          if (before.trim()) return nameFinalSound(before);
          text = text.slice(i + 1, -1);
          break;
        }
      }
    }
    text = text.replace(/['"‘’“”」』\s]+$/, "");
  }
  const last = text[text.length - 1];
  if (!last) return null;
  if (last >= "가" && last <= "힣") {
    const code = (last.charCodeAt(0) - 0xac00) % 28;
    return code === 0 ? "none" : code === 8 ? "rieul" : "other";
  }
  if (last >= "0" && last <= "9") return numberFinalSound(/\d+(\.\d+)?$/.exec(text)![0]);
  if (last === "%") return "none";
  if (last >= "A" && last <= "Z") return UPPER_FINAL[last] ?? "none";
  if (last >= "a" && last <= "z") {
    if (text.endsWith("ng") || text.endsWith("ck") || last === "m" || last === "n") return "other";
    if (last === "l") return "rieul";
    if (last === "t" && VOWELS.includes(text[text.length - 2] ?? "")) return "other";
    return "none";
  }
  return null;
}

/**
 * 이름 뒤 "과/와" — 3절 D20 '다수 클래스 {A}와/과 소수 클래스'(서술 라운드 세션 C). 받침(ㄹ 포함)이 있으면 "과".
 * 끝소리는 `nameFinalSound`(공통 조사 규칙) — '이름(설명)' 꼴은 괄호 앞 이름으로("2(정상)와", "0(정상)과").
 * 읽는 소리를 모르면(기호·빈 말) "와(과)".
 */
export function josaWaGwa(word: string): string {
  const sound = nameFinalSound(word);
  if (sound === null) return "와(과)";
  return sound === "none" ? "와" : "과";
}
