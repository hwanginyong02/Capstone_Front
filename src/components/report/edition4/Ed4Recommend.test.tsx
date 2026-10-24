/**
 * 판 4 6절 개선 권고(갈래 b5) — 세 경로로 그린 글.
 * - bc_strong 발급본: 예시본 "## 6. 개선 권고" 블록과 **줄 단위로 똑같다**(가림 0개).
 * - 다중·멀티: 6.1/6.2 가름(recommend_section), 권고 표 행 정확값(우선순위 글자·"P2 · 판 4 이름"·권고·기대 효과).
 * - 대기·실패, B19(한쪽만 문제), 고정 문구 6(문제 0개), 번호 없는 권고, 9 칸 배지는 픽스처 복사본으로.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { byNumberText, exampleBlock, exampleLines, printText, screenText, type ExampleLine } from "../../../test/edition4/render/renderEd4";
import { loadEd4, loadEd4Issuance } from "../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../types/finalReport.types";
import { NARRATIVE_FAILED_TEXT, NARRATIVE_PENDING_TEXT } from "../shared/narrativePlaceholder";
import { Ed4Recommend } from "./Ed4Recommend";

const HEAD = "| 우선순위 | 대응 문제 번호 | 권고 | 기대 효과";
const BADGE = "규칙 기반 문장";
const NO_PROBLEM = "본 평가에서 지목된 데이터 또는 모델상의 문제점은 없다. 별도 권고 사항 없음.";

function segment(text: string, start: string, end: string): string[] {
  const lines = text.split("\n");
  const s = lines.indexOf(start);
  expect(s, `"${start}" 이 없다`).toBeGreaterThanOrEqual(0);
  expect(lines.indexOf(start, s + 1), `"${start}" 이 둘이다`).toBe(-1);
  const e = lines.indexOf(end, s + 1);
  expect(e, `"${end}" 이 "${start}" 뒤에 없다`).toBeGreaterThan(s);
  return lines.slice(s, e);
}

const asExampleLines = (lines: string[]): ExampleLine[] =>
  lines.map((l) =>
    l.startsWith("|") ? { kind: "row", cells: l.split("|").slice(1).map((c) => c.trim()) } : { kind: "text", text: l },
  );

/** 6절 — 절 제목부터 끝 표시 앞까지(발급본은 발급 이력 앞까지). */
const section6 = (text: string) => {
  const lines = segment(text, "6. 개선 권고", "— 끝 —");
  const history = lines.indexOf("발급 이력");
  return history >= 0 ? lines.slice(0, history) : lines;
};

const copy = (data: FinalReportData): FinalReportData => structuredClone(data);

describe("bc_strong 발급본 — 예시본 6절과 줄 단위로 같다(가림 0개)", () => {
  const want = exampleLines(exampleBlock("## 6. 개선 권고"));

  it("예시본 블록 — 소절 2개, 표 머리 2개, 권고 행 3개(6.1 P2 1행, 6.2 P1 2행)", () => {
    expect(want).toHaveLength(10);
    expect(want.filter((l) => l.kind === "row")).toHaveLength(5);
  });

  it("화면", () => {
    expect(asExampleLines(section6(screenText(loadEd4("bc_strong", "issued"))))).toEqual(want);
  });

  it("인쇄", async () => {
    expect(asExampleLines(section6(await printText(loadEd4("bc_strong", "issued"))))).toEqual(want);
  });

  it("번호 열기", async () => {
    const text = await byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"));
    expect(asExampleLines(section6(text))).toEqual(want);
  });

  it("권고 분류(category)는 찍지 않는다", () => {
    const text = section6(screenText(loadEd4("bc_strong", "issued"))).join("\n");
    for (const rec of loadEd4("bc_strong", "issued").recommendations) expect(text).not.toContain(rec.category);
  });
});

describe("다중·멀티 — 6.1/6.2 가름과 권고 표 정확값", () => {
  const digits = [
    "6. 개선 권고",
    "6.1 데이터",
    "〔9.1 칸 서술 — digits_strong〕",
    HEAD,
    "| 낮음 | P2 · 정답 라벨 주의 (구축 방법 운영 로그) | 〔P2 권고 — 9.1〕 | 〔P2 기대 효과〕",
    "| 낮음 | P3 · 평가 데이터가 학습과 같은 출처 | 〔P3 권고 — 9.1〕 | 〔P3 기대 효과〕",
    "6.2 모델과 운영",
    "〔9.2 칸 서술 — digits_strong〕",
    HEAD,
    "| 중간 | P1 · 핵심 지표 근소 합격 (Accuracy, F1 Score) | 〔P1 권고 — 9.2〕 | 〔P1 기대 효과〕",
  ];
  const yeast = [
    "6. 개선 권고",
    "6.1 데이터",
    "〔9.1 칸 서술 — yeast_strong〕",
    HEAD,
    "| 중간 | P2 · 불균형 영향 있음 (다수 Class12 · 소수 Class14) | 〔P2 권고 — 9.1〕 | 〔P2 기대 효과〕",
    "| 낮음 | P3 · 최약 클래스 (Class9) | 〔P3 권고 — 9.1〕 | 〔P3 기대 효과〕",
    "| 낮음 | P4 · 평가 데이터가 학습과 같은 출처 | 〔P4 권고 — 9.1〕 | 〔P4 기대 효과〕",
    "6.2 모델과 운영",
    "〔9.2 칸 서술 — yeast_strong〕",
    HEAD,
    "| 중간 | P1 · 비핵심 지표 미달 (F1 Score) | 〔P1 권고 — 9.2〕 | 〔P1 기대 효과〕",
  ];

  it("digits_strong 화면·인쇄", async () => {
    expect(section6(screenText(loadEd4("digits_strong", "issued")))).toEqual(digits);
    expect(section6(await printText(loadEd4("digits_strong", "issued")))).toEqual(digits);
  });

  it("yeast_strong 화면·인쇄 — 드러난 절 '7.1·8.3' 인 P3 도 표에는 절 번호를 찍지 않는다", async () => {
    expect(section6(screenText(loadEd4("yeast_strong", "issued")))).toEqual(yeast);
    expect(section6(await printText(loadEd4("yeast_strong", "issued")))).toEqual(yeast);
  });

  it("yeast_strong 번호 열기", async () => {
    expect(section6(await byNumberText(loadEd4("yeast_strong", "final"), loadEd4Issuance("yeast_strong")))).toEqual(yeast);
  });
});

describe("서술 대기·실패 — 서술 자리표시와 권고 칸 자리표시(판 3 공용), 배지 없음", () => {
  const waiting = (narrative: string, rec: string) => [
    "6. 개선 권고",
    "6.1 데이터",
    narrative,
    HEAD,
    `| 낮음 | P2 · 평가 데이터가 학습과 같은 출처 | ${rec} | —`,
    "6.2 모델과 운영",
    narrative,
    HEAD,
    `| 중간 | P1 · 핵심 지표 근소 합격 (Recall) | ${rec} | —`,
  ];

  it("대기", () => {
    expect(section6(screenText(loadEd4("bc_strong", "pending")))).toEqual(waiting(NARRATIVE_PENDING_TEXT, "권고를 만드는 중"));
  });

  it("실패", () => {
    expect(section6(screenText(loadEd4("bc_strong", "failed")))).toEqual(waiting(NARRATIVE_FAILED_TEXT, "권고를 만들지 못함"));
  });

  it("대기 중에는 9 칸이 fallback 이어도 배지가 없다", () => {
    const data = copy(loadEd4("bc_strong", "pending"));
    data.narrativeSections = { "9": "fallback" };
    expect(section6(screenText(data))).not.toContain(BADGE);
  });
});

describe("픽스처에 없는 갈래(복사본)", () => {
  it("B19 — 6.1 쪽 문제가 없으면 6.1 은 소제목과 서술만, 표 없음", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.problems = data.problems!.filter((p) => p.id === "P1");
    const lines = section6(screenText(data));
    expect(lines.slice(0, 4)).toEqual(["6. 개선 권고", "6.1 데이터", data.recommendationNarrative.dataQuality, "6.2 모델과 운영"]);
    expect(lines.filter((l) => l === HEAD)).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith("| 중간 | P1 · "))).toHaveLength(2);
  });

  it("B19 — 6.2 쪽 문제가 없으면 6.2 는 소제목과 서술만", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.problems = data.problems!.filter((p) => p.id === "P2");
    const lines = section6(screenText(data));
    expect(lines.slice(-2)).toEqual(["6.2 모델과 운영", data.recommendationNarrative.modelOps]);
    expect(lines.filter((l) => l === HEAD)).toHaveLength(1);
  });

  it("문제 0개 — 고정 문구 6 만(6.1·6.2 소제목·서술·표·배지 없음), 화면·인쇄", async () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.problems = [];
    data.narrativeSections = { ...data.narrativeSections, "9": "fallback" };
    expect(section6(screenText(data))).toEqual(["6. 개선 권고", NO_PROBLEM]);
    expect(section6(await printText(data))).toEqual(["6. 개선 권고", NO_PROBLEM]);
  });

  it("문제 번호가 없거나 모르는 번호인 권고는 찍지 않는다", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    const base = data.recommendations[2];
    data.recommendations.push({ ...base, problemId: undefined, action: "〔번호 없는 권고〕" });
    data.recommendations.push({ ...base, problemId: "P9", action: "〔모르는 번호 권고〕" });
    const text = section6(screenText(data)).join("\n");
    expect(text).not.toContain("〔번호 없는 권고〕");
    expect(text).not.toContain("〔모르는 번호 권고〕");
    expect(section6(screenText(data)).filter((l) => l.startsWith("| ") && l !== HEAD)).toHaveLength(3);
  });

  it("우선순위 칸은 문제의 우선순위(판 4 글자) — 권고 행의 값이 달라도", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.problems![0] = { ...data.problems![0], priority: "HIGH" };
    data.recommendations = data.recommendations.map((r) => ({ ...r, priority: "LOW" as const }));
    const lines = section6(screenText(data));
    expect(lines.filter((l) => l.startsWith("| 높음 | P1 · "))).toHaveLength(2);
    expect(lines.filter((l) => l.startsWith("| 낮음 | P2 · "))).toHaveLength(1);
  });

  it("서술이 끝났는데 권고가 없는 문제는 자리표시 행 '권고 생성 예정 | —'", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.recommendations = data.recommendations.filter((r) => r.problemId !== "P2");
    const lines = section6(screenText(data));
    expect(lines).toContain("| 낮음 | P2 · 평가 데이터가 학습과 같은 출처 | 권고 생성 예정 | —");
  });

  it("9 칸이 규칙 기반이면 절 제목 옆 배지 — 화면에만, 소절 옆에는 없음", async () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.narrativeSections = { ...data.narrativeSections, "9": "fallback" };
    const screen = section6(screenText(data));
    expect(screen.slice(0, 3)).toEqual(["6. 개선 권고", BADGE, "6.1 데이터"]);
    expect(screen.filter((l) => l === BADGE)).toHaveLength(1);
    expect(section6(await printText(data))).not.toContain(BADGE);
    // 부품 직접 — mode=print 면 배지 요소 자체가 없다(print:hidden 에만 기대지 않음).
    const print = render(<Ed4Recommend data={data} mode="print" />);
    expect(print.container.textContent).not.toContain(BADGE);
    print.unmount();
  });

  it("6.1·6.2 서술 빈 글(서술 끝남)은 판 3 자리표시 글", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.recommendationNarrative = { dataQuality: "", modelOps: "첫 문단.\n\n둘째 문단." };
    const lines = section6(screenText(data));
    expect(lines[2]).toBe("자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.");
    const at = lines.indexOf("6.2 모델과 운영");
    expect(lines.slice(at + 1, at + 3)).toEqual(["첫 문단.", "둘째 문단."]);
  });
});
