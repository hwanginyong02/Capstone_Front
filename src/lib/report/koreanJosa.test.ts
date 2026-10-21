/** 고정 문구 조사 — 끼워 넣는 말의 받침에 맞춘다. */
import { describe, expect, it } from "vitest";

import { josaEulReul, josaEunNeun, josaEuroRo, josaEuroRoNumber, josaWaGwaNumber } from "./koreanJosa";

describe("으로/로", () => {
  it.each([
    ["대화형(실시간)", "으로"],
    ["FN이 더 위험", "으로"],
    ["모든 클래스가 동등", "으로"],
    ["다수 클래스 우선", "으로"],
    ["샘플 단위로 중요", "로"],
    ["서울", "로"],
    ["12.30", "으로"],
    ["10.63", "으로"],
    ["15.26", "으로"],
    ["9.51", "로"],
    ["9.57", "로"],
    ["9.58", "로"],
    ["9.52", "로"],
  ])("%s → %s", (word, josa) => {
    expect(josaEuroRo(word)).toBe(josa);
  });
});

describe("은/는", () => {
  it("받침으로 고르고, 괄호 뒤는 그 앞 한글로", () => {
    expect(josaEunNeun("추론 효율성(지연시간)")).toBe("은");
    expect(josaEunNeun("하이퍼파라미터")).toBe("는");
  });
});

describe("숫자 뒤 을/를 — 읽는 소리의 끝 받침(고정 문구 9)", () => {
  it.each([
    // 소수는 마지막 숫자: 0 영·1 일·3 삼·6 육·7 칠·8 팔 → 을, 2 이·4 사·5 오·9 구 → 를
    [0.5, "를"],
    [0.2, "를"],
    [0.4, "를"],
    [0.9, "를"],
    [0.3, "을"],
    [0.6, "을"],
    [0.1, "을"],
    [0.7, "을"],
    [0.8, "을"],
    ["0.50", "을"],
    ["0.35", "를"],
    // 정수 — 끝 숫자, 끝의 0 은 자리 이름(십·백·천·만·억 → 을, 조 → 를), 0 은 영
    [0, "을"],
    [1, "을"],
    [2, "를"],
    [5, "를"],
    [10, "을"],
    [20, "을"],
    [100, "을"],
    [1000, "을"],
    [10000, "을"],
    [100000, "을"],
    [100000000, "을"],
    ["1000000000000", "를"],
    [12, "를"],
    [-0.5, "를"],
  ])("%s → %s", (value, josa) => {
    expect(josaEulReul(value)).toBe(josa);
  });

  it("숫자가 아니면 둘 다 적는다", () => {
    expect(josaEulReul("abc")).toBe("을(를)");
    expect(josaEulReul("")).toBe("을(를)");
  });
});

describe("숫자 뒤 로/으로 — josaEuroRoNumber(3절 불균형 비율 등)", () => {
  it.each([
    // 받침 없음(2·4·5·9)·ㄹ(1·7·8) → 로, 그 밖(0·3·6) → 으로
    ["1.52", "로"],
    ["1.54", "로"],
    ["1.55", "로"],
    ["1.59", "로"],
    ["1.51", "로"],
    ["1.57", "로"],
    ["1.58", "로"],
    ["1.53", "으로"],
    ["1.56", "으로"],
    ["1.50", "으로"],
    [0, "으로"],
    [10, "으로"],
    [100, "으로"],
    [1000, "으로"],
    [10000, "으로"],
    [7, "로"],
    ["1000000000000", "로"],
  ])("%s → %s", (value, josa) => {
    expect(josaEuroRoNumber(value)).toBe(josa);
  });

  it("숫자 문자열에서는 josaEuroRo 와 같은 답(정수 자리 이름 0 도 '으로'로 같다)", () => {
    const samples = ["0.10", "1.53", "2.4", "9.51", "10", "100", "1000", "10000", "3", "8"];
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) expect(josaEuroRoNumber(s)).toBe(josaEuroRo(s));
  });

  it("숫자가 아니면 (으)로", () => {
    expect(josaEuroRoNumber("x")).toBe("(으)로");
  });
});

describe("숫자 뒤 과/와 — josaWaGwaNumber(3절 D20 '정확도 {acc}와 매크로 F1')", () => {
  it.each([
    ["0.83", "과"], // 삼 — 받침
    ["0.505", "와"], // 오 — 받침 없음
    ["0.81", "과"], // 일 — ㄹ 도 받침
    ["0.87", "과"], // 칠
    ["0.9", "와"], // 구
    ["10", "과"], // 십
    ["1000000000000", "와"], // 조 — 받침 없는 자리 이름
    [0.6, "과"], // 육(숫자로 받아도)
  ] as const)("%s%s", (value, expected) => {
    expect(josaWaGwaNumber(value)).toBe(expected);
  });

  it("숫자가 아니면 와", () => {
    expect(josaWaGwaNumber("abc")).toBe("와");
    expect(josaWaGwaNumber("—")).toBe("와");
  });
});

describe("소수의 끝 0 — 자리 이름이 아니라 끝 숫자로 읽는다", () => {
  it("소수점 뒤 끝 0 이 12개여도 '영'으로 읽어 '을'(정수였다면 '조'라 '를')", () => {
    expect(josaEulReul("1.000000000000")).toBe("을");
    expect(josaEulReul("1000000000000")).toBe("를");
  });
});

