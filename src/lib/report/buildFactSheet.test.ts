/**
 * fact_sheet 표본 수 — ISSUES.md B-02.
 *
 * 멀티레이블에서 `class_distribution` 은 '레이블 등장 횟수'다(한 샘플이 레이블 3개를
 * 가지면 3번 센다). 그런데 `buildFactSheet` 이 M21 미선택 시 혼동행렬이 없어서
 * **분포 합계를 표본 수로 대신 썼다.** 200행 데이터셋이 408건이 된다.
 *
 * 그 값은 LLM 프롬프트의 fact_sheet 로 들어가고 규칙 폴백 문안에도 인쇄되므로,
 * 성적서 6절 '총 검증 건수'(200)와 7·8절 서술(408)이 한 문서에서 갈린다.
 * grounding 화이트리스트가 408 을 근거값으로 갖고 있어 환각 방어에도 안 걸린다.
 *
 * 정본은 서버가 알려주는 `n_samples`(평가 프레임 행 수)다. 프론트가 추측할 자리를 없앤다.
 */
import { describe, expect, it } from "vitest";

import { buildFactSheet, type BuildFactSheetInput } from "./buildFactSheet";

function input(overrides: Partial<BuildFactSheetInput> = {}): BuildFactSheetInput {
  return {
    kpiResults: [],
    confusionMatrix: null,
    classDistribution: {},
    droppedRows: 0,
    verdict: "PASS",
    score: 90,
    classLabels: [],
    nSamples: 0,
    ...overrides,
  };
}

describe("buildFactSheet 의 표본 수", () => {
  it("멀티레이블에서 레이블 등장 횟수 합이 아니라 서버가 준 표본 수를 쓴다", () => {
    const fs = buildFactSheet(
      input({
        // 200행인데 레이블 등장 횟수 합은 408
        classDistribution: { sports: 97, finance: 107, news: 102, tech: 102 },
        confusionMatrix: null, // M21 미선택
        nSamples: 200,
      }),
    );
    expect(fs.n_samples).toBe(200);
  });

  it("혼동행렬이 있어도 서버 값을 쓴다 — 출처가 하나여야 한다", () => {
    const fs = buildFactSheet(
      input({
        classDistribution: { "0": 130, "1": 70 },
        confusionMatrix: {
          labels: ["0", "1"],
          matrix: [[120, 10], [15, 55]],
          totalSamples: 200,
        } as BuildFactSheetInput["confusionMatrix"],
        nSamples: 200,
      }),
    );
    expect(fs.n_samples).toBe(200);
  });

  it("binary 에서는 분포 합계와 같은 값이 나온다 (회귀 방지)", () => {
    const fs = buildFactSheet(
      input({ classDistribution: { "0": 130, "1": 70 }, nSamples: 200 }),
    );
    expect(fs.n_samples).toBe(200);
    expect(fs.n_samples).toBe(
      Object.values({ "0": 130, "1": 70 }).reduce((a, b) => a + b, 0),
    );
  });

  it("dropped_rows 는 그대로 전달된다", () => {
    const fs = buildFactSheet(input({ droppedRows: 3, nSamples: 197 }));
    expect(fs.dropped_rows).toBe(3);
    expect(fs.n_samples).toBe(197);
  });
});


describe("멀티레이블 혼동행렬 — 첫 레이블만 보내던 문제 (ISSUES.md C-08)", () => {
  /**
   * 멀티레이블 혼동행렬은 레이블마다 2x2 가 하나씩 나온다. 종전에는 그중 **첫 번째
   * 레이블의 2x2 만** fact_sheet 에 실렸고, 라벨명은 `Negative (sports)` 처럼 그
   * 레이블 이름을 달고 있었다. LLM 은 그것을 **전체 혼동행렬로 읽고** 서술한다 —
   * 레이블이 넷이면 나머지 셋의 오분류는 서술 근거에서 통째로 빠진다.
   *
   * 레이블별 세부는 이미 `per_class`(M22)로 실려 가므로, 혼동행렬은 **전 레이블 합계**로
   * 보내 '일부를 전체로 보이게 하는' 상태만 없앤다.
   */
  const multilabelMatrix = {
    labels: ["Negative (sports)", "Positive (sports)"],
    matrix: [[10, 2], [3, 5]],
    totalSamples: 20,
    multilabelMatrices: [
      { label: "sports", matrix: [[10, 2], [3, 5]], totalSamples: 20 },
      { label: "news", matrix: [[1, 1], [1, 17]], totalSamples: 20 },
    ],
  };

  it("전 레이블을 합산한 2x2 를 싣는다", () => {
    const sheet = buildFactSheet(input({
      confusionMatrix: multilabelMatrix as any,
    }));

    expect(sheet.confusion?.matrix).toEqual([[11, 3], [4, 22]]);
  });

  it("라벨명이 특정 레이블을 가리키지 않는다", () => {
    const sheet = buildFactSheet(input({
      confusionMatrix: multilabelMatrix as any,
    }));

    expect(sheet.confusion?.labels.join()).not.toContain("sports");
    expect(sheet.confusion?.labels.join()).toMatch(/전체|all/i);
  });

  it("단일 레이블뿐이면 그 값을 그대로 쓴다", () => {
    const sheet = buildFactSheet(input({
      confusionMatrix: {
        labels: ["Negative (sports)", "Positive (sports)"],
        matrix: [[10, 2], [3, 5]],
        totalSamples: 20,
        multilabelMatrices: [{ label: "sports", matrix: [[10, 2], [3, 5]], totalSamples: 20 }],
      } as any,
    }));

    expect(sheet.confusion?.matrix).toEqual([[10, 2], [3, 5]]);
  });

  it("binary/multiclass 는 종전 그대로다(과잉 변경 방지)", () => {
    const sheet = buildFactSheet(input({
      confusionMatrix: { labels: ["0", "1"], matrix: [[5, 1], [2, 4]], totalSamples: 12 } as any,
    }));

    expect(sheet.confusion?.matrix).toEqual([[5, 1], [2, 4]]);
    expect(sheet.confusion?.labels).toEqual(["0", "1"]);
  });
});
