/**
 * 판 4 4.4 의 M21 혼동 행렬 그림 — 영어 머리글 없이 그림만(S6 질문 3, 2026-10-24 사용자 답 "영어 머리글 빼고 그림만").
 *
 * - M21 을 고른 합성 데이터(`m21Synthetic.ts` — 세 픽스처에 M21 을 고른 run 의 칸을 더함)로 화면·인쇄 두 경로를 본다.
 * - 영어 머리글 0: 판 3 차트 부품의 제목·부제·범례("Confusion Matrix", "Actual versus predicted class counts", "Correct",
 *   "Misclassified")와 요약 상자("Summary", "Total samples", "False positives", "False negatives", "Error rate").
 * - 그림 있음: `data-ed4-figure="M21"` 안에 행렬 칸(이진 4칸·다중 100칸·멀티 레이블마다 4칸)과 칸의 건수.
 * - 판 3 차트 부품의 판 3 모양은 그대로(옵션을 넘기지 않으면 머리글·요약 상자가 있다).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConfusionMatrixChart } from "../../../components/report/sections/ConfusionMatrixChart";
import type { FinalReportData } from "../../../types/finalReport.types";

import type { Ed4Tag } from "./ed4Fixtures";
import { loadEd4WithM21 } from "./m21Synthetic";
import { printText, screenText } from "./renderEd4";

/** 판 3 차트 부품의 영어 머리글·요약 상자 글. */
const ENGLISH_HEAD = [
  "Confusion Matrix",
  "Actual versus predicted",
  "Correct",
  "Misclassified",
  "Summary",
  "Total samples",
  "False positives",
  "False negatives",
  "Error rate",
];

const englishHits = (text: string) => ENGLISH_HEAD.filter((w) => text.includes(w));

/**
 * 4.4 오분류 소절의 글("4.4 오분류" 줄부터 "4.5 데이터 분포" 줄 앞까지). 지표 이름 "Confusion Matrix"(M21 의 이름 — 3.1·3.2·4.3 표에
 * 다른 지표 이름처럼 나온다)는 머리글이 아니므로 그림이 들어가는 4.4 만 본다.
 */
function section44(text: string): string {
  const start = text.search(/^4\.4 오분류$/m);
  const end = text.search(/^4\.5 데이터 분포$/m);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

/** 행렬 칸 수 — 이진 2×2, 다중 10×10, 멀티 14 레이블 × 2×2. */
const CELLS: Record<Ed4Tag, number> = { bc_strong: 4, digits_strong: 100, yeast_strong: 56 };

/** 그림 안 칸의 건수(앞 몇 개, 손으로 옮겨 적음 — 픽스처 혼동 행렬 건수). */
const FIRST_COUNTS: Record<Ed4Tag, string[]> = {
  bc_strong: ["105", "2", "1", "63"],
  digits_strong: ["54", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "55"],
  // Class1: TN 572, FP 59, FN 140, TP 146
  yeast_strong: ["572", "59", "140", "146"],
};

/** 그림의 칸 — 건수 span(굵은 글씨)만. */
function cellCounts(figure: Element): string[] {
  return [...figure.querySelectorAll("span.text-lg")].map((s) => s.textContent ?? "");
}

const TAGS: Ed4Tag[] = ["bc_strong", "digits_strong", "yeast_strong"];

describe("M21 그림 — 판 4 는 영어 머리글 없이 그림만(S6 질문 3)", () => {
  it.each(TAGS)("%s 화면: 영어 머리글 0, 4.4 안에 그림(칸·건수)", (tag) => {
    const data = loadEd4WithM21(tag, "final");
    const part = section44(screenText(data));
    expect(englishHits(part)).toEqual([]);
    // 그림이 4.4(오분류) 안에 있다 — 행렬 칸의 축 글
    expect(part).toContain("Predicted:");
  });

  it.each(TAGS)("%s 화면 DOM: data-ed4-figure 하나, 칸 수·건수, h3 없음", async (tag) => {
    const { ReportSections } = await import("../../../components/report/ReportSections");
    const { normalizeReportContent } = await import("../../../lib/report/normalizeReportContent");
    const { MemoryRouter } = await import("react-router");
    const view = render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(loadEd4WithM21(tag, "final"))} />
      </MemoryRouter>,
    );
    const figures = view.container.querySelectorAll('[data-ed4-figure="M21"]');
    expect(figures).toHaveLength(1);
    expect(englishHits(figures[0].textContent ?? "")).toEqual([]);
    const counts = cellCounts(figures[0]);
    expect(counts).toHaveLength(CELLS[tag]);
    expect(counts.slice(0, FIRST_COUNTS[tag].length)).toEqual(FIRST_COUNTS[tag]);
    // 판 3 부품의 h3("Confusion Matrix")가 4.4(h3)와 같은 깊이로 끼지 않는다
    expect(figures[0].querySelector("h1, h2, h3, h4")).toBeNull();
    view.unmount();
  });

  it.each(TAGS)("%s 인쇄(발급본): 영어 머리글 0, 그림 있음", async (tag) => {
    let figureCells = -1;
    const text = await printText(loadEd4WithM21(tag, "issued"), undefined, {
      inspect: (root) => {
        const fig = root.querySelectorAll('[data-ed4-figure="M21"]');
        expect(fig).toHaveLength(1);
        expect(englishHits(fig[0].textContent ?? "")).toEqual([]);
        figureCells = cellCounts(fig[0]).length;
      },
    });
    const part = section44(text);
    expect(englishHits(part)).toEqual([]);
    expect(figureCells).toBe(CELLS[tag]);
    expect(part).toContain("Predicted:");
  });

  it("합성 데이터는 M21 을 고른 run 이다(3.1 표에 M21 줄, 그림 재료 있음)", () => {
    const data: FinalReportData = loadEd4WithM21("bc_strong", "final");
    expect(data.kpiResults.some((k) => k.metricId === "M21")).toBe(true);
    expect(data.charts?.confusionMatrix?.matrix).toEqual([
      [105, 2],
      [1, 63],
    ]);
    expect(screenText(data)).toContain("| M21 | Confusion Matrix | 없음(참고 지표) | —");
  });
});

describe("판 3 차트 부품은 판 3 모양 그대로(옵션 없음)", () => {
  it("머리글·요약 상자가 있다", () => {
    const view = render(<ConfusionMatrixChart data={{ labels: ["benign", "malignant"], matrix: [[105, 2], [1, 63]], totalSamples: 171 }} />);
    const text = view.container.textContent ?? "";
    expect(englishHits(text)).toEqual(ENGLISH_HEAD);
    expect(view.container.querySelector("h3")?.textContent).toBe("Confusion Matrix");
  });

  it("멀티레이블도 레이블마다 머리글이 있다", () => {
    const per = [
      { label: "a", matrix: [[1, 2], [3, 4]], totalSamples: 10 },
      { label: "b", matrix: [[5, 0], [0, 5]], totalSamples: 10 },
    ];
    const view = render(<ConfusionMatrixChart data={{ labels: [], matrix: [], totalSamples: 10, multilabelMatrices: per }} />);
    expect(view.container.querySelectorAll("h3")).toHaveLength(2);
    expect(view.container.textContent).toContain("Summary");
  });
});
