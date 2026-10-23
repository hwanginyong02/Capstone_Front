/**
 * 보관된 성적서를 지금 형식으로 옮겨 읽는다 — 판 1 의 `threshold: 0` 은 "목표값 없음"이었다.
 */
import { describe, expect, it } from "vitest";

import { REPORT_CONTENT_SCHEMA, isLegacyLayout, normalizeReportContent, usesSchema3 } from "./normalizeReportContent";
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

    // 판 표시는 그대로 둔다 — 그 판의 배치로 그린다.
    expect(read.contentSchema).toBeUndefined();
    expect(isLegacyLayout(read)).toBe(true);
    expect(read.metricList.map((m) => m.threshold)).toEqual([0.8, null]);
    expect(read.kpiResults.map((k) => k.threshold)).toEqual([0.8, null]);
  });

  it("보관본 자체는 바꾸지 않는다", () => {
    normalizeReportContent(legacy);
    expect(legacy.kpiResults[1].threshold).toBe(0);
  });

  it("판 2 는 그대로 둔다 — 0 은 목표값 0 이고 파생 예측은 7.1 앞, 판 3 모양은 아니다", () => {
    const schema2 = { ...legacy, contentSchema: 2 };
    expect(normalizeReportContent(schema2)).toBe(schema2);
    expect(isLegacyLayout(schema2)).toBe(false);
    expect(usesSchema3(schema2)).toBe(false);
  });

  it("판 3 은 그대로 둔다 — 판 3 모양으로 그린다", () => {
    const schema3 = { ...legacy, contentSchema: 3 };
    expect(normalizeReportContent(schema3)).toBe(schema3);
    expect(isLegacyLayout(schema3)).toBe(false);
    expect(usesSchema3(schema3)).toBe(true);
  });

  it("판 1(표시 없음)은 판 3 모양이 아니다", () => {
    expect(usesSchema3(legacy)).toBe(false);
    expect(usesSchema3({ contentSchema: 1 })).toBe(false);
  });

  it("지금 판(새 run 이 찍는 판)은 3 이다", () => {
    expect(REPORT_CONTENT_SCHEMA).toBe(3);
  });
});
