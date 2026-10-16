/**
 * 클래스별 표(M22) — 평균 줄을 버리지 않는다(재료 목록 9절 "M22 집계행", 서술 설계 D17·D39).
 */
import { describe, expect, it } from "vitest";

import { buildClassReportTable } from "./classReportTable";

const multiclassReport = {
  cat: { precision: 0.9, recall: 0.8, "f1-score": 0.85, support: 50 },
  dog: { precision: 0.7, recall: 0.75, "f1-score": 0.72, support: 40 },
  bird: { precision: 0.6, recall: 0.5, "f1-score": 0.55, support: 10 },
  accuracy: 0.78,
  "macro avg": { precision: 0.73, recall: 0.68, "f1-score": 0.71, support: 100 },
  "weighted avg": { precision: 0.79, recall: 0.78, "f1-score": 0.78, support: 100 },
};

describe("buildClassReportTable", () => {
  it("클래스 줄은 감지된 클래스 순서로, 평균 줄은 매크로·가중 순서로 남긴다", () => {
    const table = buildClassReportTable(multiclassReport, ["dog", "cat", "bird"]);

    expect(table?.rows.map((r) => r.label)).toEqual(["dog", "cat", "bird"]);
    expect(table?.averages.map((r) => r.label)).toEqual(["매크로 평균", "가중 평균"]);
    expect(table?.averages[0]).toEqual({ label: "매크로 평균", precision: 0.73, recall: 0.68, f1: 0.71, support: 100 });
  });

  it("accuracy 는 표의 줄이 아니다 — Accuracy 는 M1 이다", () => {
    const table = buildClassReportTable(multiclassReport, []);
    expect(table?.rows.map((r) => r.label)).not.toContain("accuracy");
  });

  it("감지된 목록에 없는 클래스도 뒤에 붙여 버리지 않는다", () => {
    const table = buildClassReportTable(multiclassReport, ["cat"]);
    expect(table?.rows.map((r) => r.label)).toEqual(["cat", "dog", "bird"]);
  });

  it("멀티레이블은 마이크로·샘플 평균도 남긴다", () => {
    const table = buildClassReportTable(
      {
        a: { precision: 1, recall: 1, "f1-score": 1, support: 3 },
        "micro avg": { precision: 0.9, recall: 0.8, "f1-score": 0.85, support: 6 },
        "samples avg": { precision: 0.8, recall: 0.8, "f1-score": 0.8, support: 6 },
      },
      ["a"],
    );
    expect(table?.averages.map((r) => r.label)).toEqual(["마이크로 평균", "샘플 평균"]);
  });

  it("M22 가 없으면 표도 없다", () => {
    expect(buildClassReportTable(undefined, ["a"])).toBeNull();
    expect(buildClassReportTable(null, ["a"])).toBeNull();
  });
});
