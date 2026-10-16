/**
 * 보관된 성적서를 지금 형식으로 옮겨 읽는다 — 판 1 의 `threshold: 0` 은 "목표값 없음"이었다.
 */
import { describe, expect, it } from "vitest";

import { REPORT_CONTENT_SCHEMA, normalizeReportContent } from "./normalizeReportContent";
import type { FinalReportData } from "../../types/finalReport.types";

const legacy = {
  metricList: [
    { metricId: "M1", name: "Accuracy", threshold: 0.8, passCriteria: "≥ 0.80" },
    { metricId: "M21", name: "Confusion Matrix", threshold: 0, passCriteria: "정보 제공" },
  ],
  kpiResults: [
    { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass" },
    { metricId: "M20", name: "MCC", value: 0.4, threshold: 0, status: "pass" },
  ],
} as unknown as FinalReportData;

describe("normalizeReportContent", () => {
  it("판 표시가 없는 옛 보관본은 threshold 0 을 목표값 없음으로 읽는다", () => {
    const read = normalizeReportContent(legacy);

    expect(read.contentSchema).toBe(REPORT_CONTENT_SCHEMA);
    expect(read.metricList.map((m) => m.threshold)).toEqual([0.8, null]);
    expect(read.kpiResults.map((k) => k.threshold)).toEqual([0.8, null]);
  });

  it("보관본 자체는 바꾸지 않는다", () => {
    normalizeReportContent(legacy);
    expect(legacy.kpiResults[1].threshold).toBe(0);
  });

  it("지금 판은 그대로 둔다 — 0 은 목표값 0 이다", () => {
    const current = { ...legacy, contentSchema: REPORT_CONTENT_SCHEMA };
    expect(normalizeReportContent(current)).toBe(current);
  });
});
