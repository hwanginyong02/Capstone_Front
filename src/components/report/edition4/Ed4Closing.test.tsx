/**
 * 판 4 끝부분(갈래 b5) — 발급 이력(발급본에만, 부록 B1)과 "— 끝 —"(늘).
 * bc_strong 발급본은 예시본의 "발급 이력" 줄부터 끝까지와 줄 단위로 같다(부록 1 은 범위 밖이라 그 앞에서 자름).
 */
import { describe, expect, it } from "vitest";

import { byNumberText, exampleBlock, exampleLines, printText, screenText, type ExampleLine } from "../../../test/edition4/render/renderEd4";
import { loadEd4, loadEd4Issuance, type Ed4Tag } from "../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../types/finalReport.types";

const asExampleLines = (lines: string[]): ExampleLine[] =>
  lines.map((l) =>
    l.startsWith("|") ? { kind: "row", cells: l.split("|").slice(1).map((c) => c.trim()) } : { kind: "text", text: l },
  );

/** 그린 글의 끝부분 — "발급 이력"(없으면 6절 마지막 줄 다음)부터 끝까지. */
function closing(text: string): string[] {
  const lines = text.split("\n").filter((l) => l !== "");
  const end = lines.lastIndexOf("— 끝 —");
  expect(end).toBeGreaterThan(0);
  expect(lines.indexOf("— 끝 —")).toBe(end);
  const history = lines.indexOf("발급 이력");
  return lines.slice(history >= 0 ? history : end, end + 1);
}

/** 예시본 마지막 블록에서 "발급 이력" 줄부터(부록 1.4 본문은 뺌). */
function exampleClosing(): ExampleLine[] {
  const lines = exampleLines(exampleBlock("### 부록 1.4 점검 방법과 한계"));
  const at = lines.findIndex((l) => l.kind === "text" && l.text === "발급 이력");
  expect(at).toBeGreaterThan(0);
  return lines.slice(at);
}

describe("bc_strong 발급본 — 예시본 끝부분과 줄 단위로 같다", () => {
  const want = exampleClosing();

  it("예시본 끝부분 — 소제목, 표 머리, 1행, 끝 표시(4줄)", () => {
    expect(want).toEqual([
      { kind: "text", text: "발급 이력" },
      { kind: "row", cells: ["버전", "발급일", "비고"] },
      { kind: "row", cells: ["v1.0", "2026-10-22", "최초 발급"] },
      { kind: "text", text: "— 끝 —" },
    ]);
  });

  it("화면·인쇄·번호 열기", async () => {
    expect(asExampleLines(closing(screenText(loadEd4("bc_strong", "issued"))))).toEqual(want);
    expect(asExampleLines(closing(await printText(loadEd4("bc_strong", "issued"))))).toEqual(want);
    expect(asExampleLines(closing(await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"))))).toEqual(want);
  });
});

describe("미발급·발급 기록 여럿", () => {
  it.each<Ed4Tag>(["bc_strong", "digits_strong", "yeast_strong"])("%s 미발급(final) — 발급 이력 없이 '— 끝 —' 만(화면·인쇄)", async (tag) => {
    expect(closing(screenText(loadEd4(tag, "final")))).toEqual(["— 끝 —"]);
    expect(closing(await printText(loadEd4(tag, "final")))).toEqual(["— 끝 —"]);
  });

  it("대기 화면도 '— 끝 —' 은 있다", () => {
    expect(closing(screenText(loadEd4("bc_strong", "pending")))).toEqual(["— 끝 —"]);
  });

  it("발급 기록이 여럿이면 저장 순서대로 행마다(버전·발급일·비고 칸 자리)", () => {
    const data: FinalReportData = structuredClone(loadEd4("digits_strong", "issued"));
    data.signature.history = [
      { version: "v1.0", issuedAt: "2026-10-22", note: "최초 발급" },
      { version: "v1.1", issuedAt: "2026-10-30", note: "〔재발급 비고〕" },
    ];
    expect(closing(screenText(data))).toEqual([
      "발급 이력",
      "| 버전 | 발급일 | 비고",
      "| v1.0 | 2026-10-22 | 최초 발급",
      "| v1.1 | 2026-10-30 | 〔재발급 비고〕",
      "— 끝 —",
    ]);
  });
});
