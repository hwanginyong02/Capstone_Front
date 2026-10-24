/**
 * 판 4 표 칸 정수 건수 — 천 단위 쉼표(S6 질문 8). 서술·사실 시트 쪽 공통 함수(`ed4SignedCount`)는 그대로인지도 함께.
 */
import { describe, expect, it } from "vitest";

import { ed4SignedCount } from "../edition4Number";
import { ed4TableCount, ed4TableCountText, ed4TableSignedCount } from "./tableCount";

describe("ed4TableCount·ed4TableSignedCount·ed4TableCountText", () => {
  it.each([
    [0, "0"],
    [7, "7"],
    [999, "999"],
    [1000, "1,000"],
    [3290, "3,290"],
    [1234567, "1,234,567"],
  ])("%i → %s", (n, want) => expect(ed4TableCount(n)).toBe(want));

  it.each([
    [0, "0"],
    [1, "+1"],
    [-609, "−609"],
    [1234, "+1,234"],
    [-1234, "−1,234"],
    [-1000000, "−1,000,000"],
  ])("부호 %i → %s", (n, want) => expect(ed4TableSignedCount(n)).toBe(want));

  it("글자 건수 — 쉼표가 있으면 걷고 다시", () => {
    expect(ed4TableCountText("1234")).toBe("1,234");
    expect(ed4TableCountText("1,234")).toBe("1,234");
    expect(ed4TableCountText("12345678")).toBe("12,345,678");
  });

  it("서술·사실 시트 쪽 ed4SignedCount 는 쉼표 없이 그대로(두 저장소 공통 규칙)", () => {
    expect(ed4SignedCount(-1234)).toBe("−1234");
    expect(ed4SignedCount(1234)).toBe("+1234");
  });
});
