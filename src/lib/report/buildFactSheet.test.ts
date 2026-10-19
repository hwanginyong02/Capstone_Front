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
import type { KpiResult, Problem } from "../../types/finalReport.types";

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

/** 건수와 파생 예측 사실은 M21 선택과 무관하게 AI 로 간다(재료 목록 9절). */
describe("TP·TN·FP·FN 건수와 파생 예측 사실", () => {
  it("건수를 confusion_counts 로 싣는다 — 혼동행렬이 없어도", () => {
    const fs = buildFactSheet(
      input({
        confusionMatrix: null,
        confusionCounts: { kind: "binary", rows: [{ label: "1", tp: 52, tn: 49, fp: 56, fn: 43 }] },
      }),
    );
    expect(fs.confusion).toBeNull();
    expect(fs.confusion_counts).toEqual([{ label: "1", tp: 52, fp: 56, fn: 43, tn: 49 }]);
  });

  it("파생 예측 사실을 방법·임계값·출처 컬럼으로 싣는다", () => {
    const fs = buildFactSheet(
      input({
        derivedPrediction: { method: "threshold", threshold: 0.35, source_columns: ["score"], target_role: "y_pred" },
      }),
    );
    expect(fs.derived_prediction).toEqual({ method: "threshold", threshold: 0.35, source_columns: ["score"] });
  });

  it("파생이 없으면 null, 건수가 없으면 빈 배열", () => {
    const fs = buildFactSheet(input());
    expect(fs.derived_prediction).toBeNull();
    expect(fs.confusion_counts).toEqual([]);
  });
});

describe("경계·확신 오류 비율 (설계 D30)", () => {
  it("error_ratios 를 응답 모양 그대로 싣는다", () => {
    const errorRatios = {
      unit: "sample" as const,
      misclassified: 12,
      boundary: null,
      boundary_note: "threshold_unknown" as const,
      confident: { count: 2, ratio: 0.1667 },
      boundary_margin: 0.1,
      confident_level: 0.9,
      threshold: null,
    };
    expect(buildFactSheet(input({ errorRatios })).error_ratios).toEqual(errorRatios);
  });

  it("없으면 null", () => {
    expect(buildFactSheet(input()).error_ratios).toBeNull();
  });
});

describe("95% 신뢰구간 (설계 D29)", () => {
  const ci = { low: 0.71, high: 0.83, method: "wilson" };
  const metric = (p: Partial<KpiResult>): KpiResult => ({
    metricId: "M1", name: "Accuracy", value: 0.8, threshold: 0.7, status: "pass", ...p,
  });

  it("판정 대상 지표에만 ci_low·ci_high 를 싣는다", () => {
    const fs = buildFactSheet(
      input({
        kpiResults: [
          metric({ metricId: "M1", ci }),
          metric({ metricId: "M2" }),
          // 판정 대상이 아닌데 구간이 남아 있는 경우도 싣지 않는다(isJudged 한 곳)
          metric({ metricId: "M3", threshold: null, ci }),
        ],
      }),
    );
    expect(fs.metrics.map((m) => [m.metric_id, m.ci_low, m.ci_high])).toEqual([
      ["M1", 0.71, 0.83],
      ["M2", null, null],
      ["M3", null, null],
    ]);
  });

  it("6.0 방식 한 줄을 ci_method_note 로, 없으면 null", () => {
    const note = "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1)으로 산출하였습니다.";
    expect(buildFactSheet(input({ confidenceIntervalNote: note })).ci_method_note).toBe(note);
    expect(buildFactSheet(input()).ci_method_note).toBeNull();
  });
});

/** 아슬아슬(설계 D12) — 판정과 같은 식(computeMargin·isNearTarget)으로 margin·near_target 을 싣는다. */
describe("아슬아슬 margin·near_target (설계 D12)", () => {
  const metric = (p: Partial<KpiResult>): KpiResult => ({
    metricId: "M1", name: "Accuracy", value: 0.8, threshold: 0.7, status: "pass", ...p,
  });

  it("판정 대상 지표는 margin(4자리)과 near_target, 아니면 null·false", () => {
    const fs = buildFactSheet(
      input({
        kpiResults: [
          metric({ metricId: "M4", value: 0.81234, threshold: 0.8 }),
          metric({ metricId: "M8", value: 0.102, threshold: 0.1, higherIsBetter: false, status: "fail" }),
          metric({ metricId: "M1", value: 0.9, threshold: 0.8 }),
          metric({ metricId: "M2", threshold: null }),
        ],
      }),
    );
    expect(fs.metrics.map((m) => [m.metric_id, m.margin, m.near_target])).toEqual([
      ["M4", 0.0123, true], // 싣는 값은 4자리 — 뺄셈 끝자리 잡음이 서술로 새지 않는다
      ["M8", -0.002, true],
      ["M1", 0.1, false],
      ["M2", null, false],
    ]);
  });

  it("value_text — 판정 대상 지표의 인쇄 문자열(S2): 셋째 자리, 판정과 어긋나 보이면 자릿수를 늘림", () => {
    const fs = buildFactSheet(
      input({
        kpiResults: [
          metric({ metricId: "M4", value: 0.7996, threshold: 0.8, status: "fail" }), // "0.800" 은 합격으로 읽힘
          metric({ metricId: "M1", value: 0.7999999999999999, threshold: 0.8, status: "pass" }),
          metric({ metricId: "M8", value: 0.1004, threshold: 0.1, higherIsBetter: false, status: "fail" }),
          metric({ metricId: "M2", value: 0.7996, threshold: null }),
        ],
      }),
    );
    expect(fs.metrics.map((m) => [m.metric_id, m.value_text])).toEqual([
      ["M4", "0.7996"],
      ["M1", "0.800"],
      ["M8", "0.1004"],
      ["M2", null], // 판정 대상이 아니면 싣지 않는다
    ]);
  });

  it("음수 목표(MCC −0.1)", () => {
    const fs = buildFactSheet(input({ kpiResults: [metric({ metricId: "M5", value: -0.0985, threshold: -0.1 })] }));
    expect(fs.metrics[0].margin).toBe(0.0015);
    expect(fs.metrics[0].near_target).toBe(true);
  });
});

/** 문제 목록(설계 D22)과 그 재료(D40·D20) — 성적서에 저장한 것과 같은 모양 그대로 싣는다. */
describe("문제 목록·임계값 조정 여지·불균형 영향", () => {
  const problem: Problem = {
    id: "P1",
    kind: "core_fail",
    priority: "HIGH",
    title: "핵심 지표 미달 (F1 Score)",
    source_section: "8.2",
    recommend_section: "9.2",
    evidence: { "F1 Score": { value: 0.71, target: 0.8 } },
    note: null,
  };
  // S2: 엔진 판정(notable)·표시 문자열(gain_text·display)도 함께 실려 서술(백엔드)이 같은 판정·표기를 읽는다.
  const gain = { max_f1: 0.8421, current_f1: 0.7012, gain: 0.1409, best_threshold: 0.37, notable: true, gain_text: "0.1409" };
  const effect = {
    level: "affected" as const,
    imbalance_ratio: 3.2,
    accuracy_minus_macro_f1: 0.12,
    majority_minus_minority_f1: 0.18,
    majority_class: "neg",
    minority_class: "pos",
    display: { imbalance_ratio: "3.2", accuracy_minus_macro_f1: "0.12", majority_minus_minority_f1: "0.18" },
  };

  it("problems·f1_threshold_gain·imbalance_effect 를 그대로 싣는다", () => {
    const fs = buildFactSheet(input({ problems: [problem], thresholdGain: gain, imbalanceEffect: effect }));
    expect(fs.problems).toEqual([problem]);
    expect(fs.f1_threshold_gain).toEqual(gain);
    expect(fs.imbalance_effect).toEqual(effect);
  });

  it("없으면 빈 배열·null", () => {
    const fs = buildFactSheet(input());
    expect(fs.problems).toEqual([]);
    expect(fs.f1_threshold_gain).toBeNull();
    expect(fs.imbalance_effect).toBeNull();
  });
});
