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
