/** 고정 문구 조사 — 끼워 넣는 말의 받침에 맞춘다. */
import { describe, expect, it } from "vitest";

import { josaEunNeun, josaEuroRo } from "./koreanJosa";

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
