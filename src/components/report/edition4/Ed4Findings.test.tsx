/**
 * 판 4 5절 분석 소견(갈래 b5) — 세 경로로 그린 글.
 * - bc_strong 발급본: 예시본 "## 5. 분석 소견" 블록과 **줄 단위로 똑같다**(가림 0개 — 픽스처 서술이 예시본 글이다).
 * - 다중(digits_strong)·멀티(yeast_strong): 센티널 서술로 칸→자리 배치, 12(다중만), 15(멀티 7.3 빈 글·fixed), 화면 전용 칸 배지(다중 8.1).
 * - 대기·실패: 판 3 공용 자리표시 글. 픽스처에 없는 갈래(B18, 빈 글 자리표시, 11b, 여러 문단)는 복사본의 칸만 바꿔서.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exampleBlock, exampleLines, printText, screenText, byNumberText, type ExampleLine } from "../../../test/edition4/render/renderEd4";
import { loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../types/finalReport.types";
import { NARRATIVE_FAILED_TEXT, NARRATIVE_PENDING_TEXT } from "../shared/narrativePlaceholder";
import { Ed4Findings } from "./Ed4Findings";

const NOTE = "※ 5절은 4절의 시험 결과를 해석한 참고 의견이며, 시험 결과에 해당하지 않습니다.";
const SAME_SOURCE =
  "평가 데이터는 학습 데이터와 동일한 출처에서 수집되었다. 본 결과는 동일 분포 내 성능을 나타내며, 다른 운영 환경에서의 일반화 성능을 보증하지 않는다.";
const LABEL_CAUTION =
  "정답 라벨의 구축 방법이 운영 로그로, 정답 자체의 오류가 성능 수치에 반영되었을 수 있다. 수치 해석 시 이를 고려해야 한다.";
const BADGE = "규칙 기반 문장";
const DRAFT_CONCLUSION = "자동 서술 생성 연동 예정 — 현재는 규칙 기반 판정·점수만 표시됩니다.";
const DRAFT_INTERPRET = "자동 서술 생성 연동 예정 — 계산된 지표·혼동행렬을 바탕으로 한 정밀 분석이 표시됩니다.";

/** 그린 글에서 start 줄부터 end 줄 앞까지(둘 다 정확히 한 번 있어야 한다). */
function segment(text: string, start: string, end: string): string[] {
  const lines = text.split("\n");
  const s = lines.indexOf(start);
  expect(s, `"${start}" 이 없다`).toBeGreaterThanOrEqual(0);
  expect(lines.indexOf(start, s + 1), `"${start}" 이 둘이다`).toBe(-1);
  const e = lines.indexOf(end, s + 1);
  expect(e, `"${end}" 이 "${start}" 뒤에 없다`).toBeGreaterThan(s);
  return lines.slice(s, e);
}

/** 그린 줄을 예시본 줄과 같은 모양으로(표 줄은 칸 배열). */
const asExampleLines = (lines: string[]): ExampleLine[] =>
  lines.map((l) =>
    l.startsWith("|") ? { kind: "row", cells: l.split("|").slice(1).map((c) => c.trim()) } : { kind: "text", text: l },
  );

const section5 = (text: string) => segment(text, "5. 분석 소견", "6. 개선 권고");

const copy = (data: FinalReportData): FinalReportData => structuredClone(data);

describe("bc_strong 발급본 — 예시본 5절과 줄 단위로 같다(가림 0개)", () => {
  const want = exampleLines(exampleBlock("## 5. 분석 소견"));

  it("예시본 블록은 제목·※·소절 6개·서술 6문단·11a 한 줄 — 15줄", () => {
    expect(want).toHaveLength(15);
    expect(want.filter((l) => l.kind === "text" && /^5\.\d /.test(l.text))).toHaveLength(6);
  });

  it("화면", () => {
    expect(asExampleLines(section5(screenText(loadEd4("bc_strong", "issued"))))).toEqual(want);
  });

  it("인쇄", async () => {
    expect(asExampleLines(section5(await printText(loadEd4("bc_strong", "issued"))))).toEqual(want);
  });

  it("번호 열기", async () => {
    const text = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"));
    expect(asExampleLines(section5(text))).toEqual(want);
  });

  it("5.1 서술 뒤에 저장된 11a 문장, 서술은 따옴표·blockquote 없는 문단", () => {
    const lines = section5(screenText(loadEd4("bc_strong", "issued")));
    const at = lines.indexOf("5.1 판정과 불확실성");
    expect(lines[at + 1]).toBe(loadEd4("bc_strong", "issued").conclusion.narrative);
    expect(lines[at + 2]).toBe(SAME_SOURCE);
    expect(lines[at + 3]).toBe("5.2 오분류");
    expect(lines.filter((l) => /^["“]/.test(l))).toEqual([]);
  });
});

describe("다중(digits_strong) — 칸→자리, 12 는 5.3 서술 앞, 8.1 규칙 기반 배지는 화면에만", () => {
  const body = [
    "5. 분석 소견",
    NOTE,
    "5.1 판정과 불확실성",
    "〔8.2 칸 서술 — digits_strong〕",
    SAME_SOURCE,
    "5.2 오분류",
    "〔7.1 칸 서술 — digits_strong〕",
    "5.3 데이터 분포",
    LABEL_CAUTION,
    "〔7.2 칸 서술 — digits_strong〕",
    "5.4 참조 범위",
  ];
  const tail = [
    "〔8.1 칸 서술 — digits_strong〕",
    "5.5 운영 위험",
    "〔8.3 칸 서술 — digits_strong〕",
    "5.6 추가 관찰",
    "〔7.3 칸 서술 — digits_strong〕",
  ];

  it("화면 — 5.4 제목 옆 배지", () => {
    expect(section5(screenText(loadEd4("digits_strong", "issued")))).toEqual([...body, BADGE, ...tail]);
  });

  it("인쇄 — 배지 없음", async () => {
    expect(section5(await printText(loadEd4("digits_strong", "issued")))).toEqual([...body, ...tail]);
  });

  it("부품 직접 — mode=print 면 배지 요소 자체를 그리지 않는다(print:hidden 에만 기대지 않음), screen 은 1개", () => {
    const data = loadEd4("digits_strong", "issued");
    const print = render(<Ed4Findings data={data} mode="print" />);
    expect(print.container.textContent).not.toContain(BADGE);
    print.unmount();
    const screen = render(<Ed4Findings data={data} mode="screen" />);
    expect(screen.container.textContent!.split(BADGE)).toHaveLength(2);
    screen.unmount();
  });

  it("번호 열기(화면 본문) — 배지 있음", async () => {
    const text = await byNumberText(loadEd4("digits_strong", "final"), loadEd4Issuance("digits_strong"));
    expect(section5(text)).toEqual([...body, BADGE, ...tail]);
  });
});

describe("멀티(yeast_strong) — 7.3 빈 글·fixed 면 고정 문구 15, 12 없음", () => {
  const want = [
    "5. 분석 소견",
    NOTE,
    "5.1 판정과 불확실성",
    "〔8.2 칸 서술 — yeast_strong〕",
    SAME_SOURCE,
    "5.2 오분류",
    "〔7.1 칸 서술 — yeast_strong〕",
    "5.3 데이터 분포",
    "〔7.2 칸 서술 — yeast_strong〕",
    "5.4 참조 범위",
    "〔8.1 칸 서술 — yeast_strong〕",
    "5.5 운영 위험",
    "〔8.3 칸 서술 — yeast_strong〕",
    "5.6 추가 관찰",
    "해당 없음",
  ];

  it("화면", () => {
    expect(section5(screenText(loadEd4("yeast_strong", "issued")))).toEqual(want);
  });

  it("인쇄", async () => {
    expect(section5(await printText(loadEd4("yeast_strong", "issued")))).toEqual(want);
  });
});

describe("서술 대기·실패 — 판 3 공용 자리표시, 배지 없음, 11a 는 그대로", () => {
  const waiting = (placeholder: string) => [
    "5. 분석 소견",
    NOTE,
    "5.1 판정과 불확실성",
    placeholder,
    SAME_SOURCE,
    "5.2 오분류",
    placeholder,
    "5.3 데이터 분포",
    placeholder,
    "5.4 참조 범위",
    placeholder,
    "5.5 운영 위험",
    placeholder,
    "5.6 추가 관찰",
    placeholder,
  ];

  it("대기(bc_strong)", () => {
    expect(section5(screenText(loadEd4("bc_strong", "pending")))).toEqual(waiting(NARRATIVE_PENDING_TEXT));
  });

  it("실패(bc_strong)", () => {
    expect(section5(screenText(loadEd4("bc_strong", "failed")))).toEqual(waiting(NARRATIVE_FAILED_TEXT));
  });

  it("대기(digits_strong) — 12 는 서술 앞에 그대로", () => {
    const lines = section5(screenText(loadEd4("digits_strong", "pending")));
    const at = lines.indexOf("5.3 데이터 분포");
    expect(lines.slice(at, at + 4)).toEqual(["5.3 데이터 분포", LABEL_CAUTION, NARRATIVE_PENDING_TEXT, "5.4 참조 범위"]);
  });

  it("대기 중에는 칸 출처가 fallback·fixed 여도 배지·빈 칸 문구를 쓰지 않는다", () => {
    const data = copy(loadEd4("digits_strong", "pending"));
    data.narrativeSections = { "8.1": "fallback", "7.3": "fixed", "8.2": "fallback" };
    data.interpretation.additionalObservations = "";
    const lines = section5(screenText(data));
    expect(lines).not.toContain(BADGE);
    expect(lines).not.toContain("해당 없음");
    expect(lines.filter((l) => l === NARRATIVE_PENDING_TEXT)).toHaveLength(6);
  });
});

describe("픽스처에 없는 갈래(복사본)", () => {
  it("B18 — 8.1 빈 글·fixed 면 5.4 에 '해당 없음'(배지 없음)", () => {
    const data = copy(loadEd4("digits_strong", "issued"));
    data.conclusion.benchmark = "";
    data.narrativeSections = { ...data.narrativeSections, "8.1": "fixed" };
    const lines = section5(screenText(data));
    const at = lines.indexOf("5.4 참조 범위");
    expect(lines.slice(at, at + 3)).toEqual(["5.4 참조 범위", "해당 없음", "5.5 운영 위험"]);
  });

  it("8.1 빈 글인데 fixed 가 아니면 B18 이 아니라 판 3 자리표시(판 3 규칙)", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.conclusion.benchmark = "";
    const lines = section5(screenText(data));
    const at = lines.indexOf("5.4 참조 범위");
    expect(lines.slice(at, at + 3)).toEqual(["5.4 참조 범위", DRAFT_CONCLUSION, "5.5 운영 위험"]);
  });

  it("7.3 키가 없는 초안이면 15 가 아니라 자리표시, 다른 칸 빈 글도 자리표시(8.x·7.x 글이 다름)", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    delete data.interpretation.additionalObservations;
    data.interpretation.confusionAnalysis = "";
    data.conclusion.risks = "  ";
    const lines = section5(screenText(data));
    expect(lines[lines.indexOf("5.6 추가 관찰") + 1]).toBe(DRAFT_INTERPRET);
    expect(lines[lines.indexOf("5.2 오분류") + 1]).toBe(DRAFT_INTERPRET);
    expect(lines[lines.indexOf("5.5 운영 위험") + 1]).toBe(DRAFT_CONCLUSION);
  });

  it("11b(다른 출처) — 저장 문장을 5.1 서술 뒤에 그대로, 문장이 없으면 아무것도", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.sourceRelationSentence = "〔11b 저장 문장〕";
    let lines = section5(screenText(data));
    expect(lines.slice(lines.indexOf("5.1 판정과 불확실성") + 2, lines.indexOf("5.2 오분류"))).toEqual(["〔11b 저장 문장〕"]);
    delete data.sourceRelationSentence;
    lines = section5(screenText(data));
    expect(lines.indexOf("5.2 오분류") - lines.indexOf("5.1 판정과 불확실성")).toBe(2);
  });

  it("서술이 여러 문단이면 문단마다 한 줄, 칸마다 배지(화면)", () => {
    const data = copy(loadEd4("digits_strong", "issued"));
    data.interpretation.confusionAnalysis = "첫 문단이다.\n\n둘째 문단이다.";
    data.narrativeSections = { ...data.narrativeSections, "7.1": "fallback", "8.1": "llm", "7.3": "fallback" };
    const lines = section5(screenText(data));
    const at = lines.indexOf("5.2 오분류");
    expect(lines.slice(at, at + 5)).toEqual(["5.2 오분류", BADGE, "첫 문단이다.", "둘째 문단이다.", "5.3 데이터 분포"]);
    expect(lines.filter((l) => l === BADGE)).toHaveLength(2);
    expect(lines[lines.indexOf("5.6 추가 관찰") + 1]).toBe(BADGE);
    expect(lines[lines.indexOf("5.4 참조 범위") + 1]).toBe("〔8.1 칸 서술 — digits_strong〕");
  });
});
