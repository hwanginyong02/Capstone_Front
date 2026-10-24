/**
 * 판 4 입구 세 곳(판 4 라운드 계획 2.4) — 판 4 데이터는 판 4 본문(`Edition4Report`)으로만 가고 판 3 절 컴포넌트에 들어가지 않는다.
 * - 화면(`ReportSections`)·인쇄(`ReportPrint`)·번호 열기(`ReportByNumber` — 작성 기록 `NarrativeRecordPanel` 포함) 세 경로를 판 4
 *   픽스처로 그려 판 3 머리글("Section 0N")·판 3 제목이 없고 판 4 절·소절 제목이 예시본 순서로 있음을 본다.
 * - 대조군: 같은 입력의 판 3 실제 발급본(RPT-2026-0001)은 판 3 머리글이 있다 — 단정이 빈 이빨이 아님을 보인다.
 * - 판 2·3 보관본 글이 그대로인지는 `archive/`·`edition3/` 의 정답 시험이 지킨다(이 파일은 판 4 쪽만).
 */
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { Edition4Report } from "../../../components/report/edition4/Edition4Report";
import { NarrativeRecordPanel } from "../../../components/report/NarrativeRecordPanel";
import { ED4_TITLE_NUMBERS, ED4_TITLES } from "../../../lib/report/edition4/edition4Text";
import type { FinalReportData } from "../../../types/finalReport.types";
import { loadEd4, loadEd4Issuance, type Ed4Tag } from "./ed4Fixtures";
import { byNumberText, printText, screenText } from "./renderEd4";

const TAGS: Ed4Tag[] = ["bc_strong", "digits_strong", "yeast_strong"];
const ED3_ISSUED = JSON.parse(
  readFileSync(resolve(__dirname, "../../archive/issued/RPT-2026-0001.content.json"), "utf8"),
) as FinalReportData;
const EXAMPLE = readFileSync(resolve(__dirname, "../rpt0001/example.md"), "utf8").split("\n");

/** 판 4 제목 줄(그린 글 단위) — 절 "1. 시험 개요", 소절 "1.1 의뢰자와 시험기관". 예시본 순서. */
const TITLE_LINES = ED4_TITLE_NUMBERS.map((n) => (n.includes(".") ? `${n} ${ED4_TITLES[n]}` : `${n}. ${ED4_TITLES[n]}`));

/** 판 3 본문에만 있는 글(판 3 절 머리·제목). */
const EDITION3_MARKS = [/Section 0\d/, /시험결과서/, /기술 개선 권고안/, /종합 판정 및 결론/];

function expectInOrder(text: string, lines: string[]) {
  const all = text.split("\n");
  let at = -1;
  for (const line of lines) {
    const next = all.indexOf(line, at + 1);
    expect(next, `"${line}" 이 순서대로 없다`).toBeGreaterThan(at);
    at = next;
  }
}

describe("판 4 제목 = 예시본 글자", () => {
  it("ED4_TITLES 의 절·소절 제목이 예시본의 ## / ### 줄과 같고 같은 순서다", () => {
    const fromExample = EXAMPLE.filter((l) => /^#{2,3} [1-6](\.\d)?\.? /.test(l)).map((l) => l.replace(/^#+ /, ""));
    expect(fromExample).toEqual(TITLE_LINES);
  });
});

describe("판 4 데이터는 판 4 본문으로만 — 세 경로", () => {
  it.each(TAGS)("%s 화면(ReportSections): 판 4 제목이 순서대로, 판 3 글 없음", (tag) => {
    const text = screenText(loadEd4(tag, "final"));
    expectInOrder(text, [loadEd4(tag, "final").meta.title, ...TITLE_LINES]);
    for (const mark of EDITION3_MARKS) expect(text).not.toMatch(mark);
  });

  it.each(TAGS)("%s 인쇄(ReportPrint): 판 4 제목이 순서대로, 판 3 글 없음", async (tag) => {
    const text = await printText(loadEd4(tag, "issued"));
    expectInOrder(text, [loadEd4(tag, "issued").meta.title, ...TITLE_LINES, "발급 이력", "— 끝 —"]);
    for (const mark of EDITION3_MARKS) expect(text).not.toMatch(mark);
  });

  it.each(TAGS)("%s 번호 열기(ReportByNumber): 판 4 본문과 판 4 작성 기록 상자, 판 3 글·판 3 작성 기록 머리 없음", async (tag) => {
    const text = await byNumberText(loadEd4(tag, "final"), loadEd4Issuance(tag));
    expect(text).toContain("서버 보관본");
    expectInOrder(text, ["작성 기록 · 5·6절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)", loadEd4(tag, "final").meta.title, ...TITLE_LINES, "발급 이력", "— 끝 —"]);
    for (const mark of EDITION3_MARKS) expect(text).not.toMatch(mark);
    expect(text).not.toContain("7·8·9절 칸마다");
  });

  it("대조군 — 같은 입력의 판 3 발급본은 판 3 머리글이 있다(위 단정이 빈 이빨이 아님)", () => {
    const text = screenText(ED3_ISSUED);
    expect(text).toMatch(/Section 0\d/);
    expect(text).not.toContain("1. 시험 개요");
  });
});

describe("판 4 본문의 인쇄 묶음 — 인쇄일 때만 PageBreak", () => {
  const breaks = (mode: "screen" | "print") => {
    const view = render(<Edition4Report data={loadEd4("bc_strong", "issued")} mode={mode} />);
    const n = [...view.container.querySelectorAll("div")].filter((d) => d.style.pageBreakBefore === "always").length;
    view.unmount();
    return n;
  };

  it("인쇄는 6번 나눈다(표지+1절 / 2절 / 3절 / 4.1~4.3 / 4.4~4.8 / 5절 / 6절+끝), 화면은 0번", () => {
    expect(breaks("print")).toBe(6);
    expect(breaks("screen")).toBe(0);
  });
});

describe("판 4 작성 기록 상자(NarrativeRecordPanel 입구)", () => {
  const draw = (data: FinalReportData) => {
    const view = render(<NarrativeRecordPanel data={data} />);
    const html = view.container.innerHTML;
    view.unmount();
    return html;
  };

  it("판 4 서술 완료면 판 4 상자(판 3 머리 줄 아님)", () => {
    const html = draw(loadEd4("bc_strong", "final"));
    expect(html).toContain('data-ed4-part="Ed4NarrativeRecord"');
    expect(html).not.toContain("7·8·9절");
  });

  it("판 4 서술 대기·실패면 그리지 않는다(지금은 판 3 showsNarrativeRecord 와 같은 조건)", () => {
    expect(draw(loadEd4("bc_strong", "pending"))).toBe("");
    expect(draw(loadEd4("bc_strong", "failed"))).toBe("");
  });

  it("미발급 판 4 인쇄·화면은 발급 이력 소제목이 없고 '— 끝 —' 은 있다(부록 B1)", () => {
    const text = screenText(loadEd4("bc_strong", "final"));
    expect(text).not.toContain("발급 이력");
    expect(text).toContain("— 끝 —");
  });
});
