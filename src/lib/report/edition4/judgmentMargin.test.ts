/**
 * 판정 여유(S3 ③, 대응표 24, 계획 6절 3) — 반올림 전 신뢰구간이 목표를 포함하면 작음(경계 포함), 구간이 없으면 목표값과의
 * 차이가 목표값의 3% 엄격 미만이면 작음, 미달 지표에도 적용, 판정 대상이 아니면 없음("—").
 */
import { describe, expect, it } from "vitest";

import type { KpiResult } from "../../../types/finalReport.types";
import { DEFAULT_BASIC_INFO } from "../../../types/workflow.types";
import { assembleEvaluatedReport, type EvaluatedReportInputs } from "../assembleEvaluatedReport";
import { mapWorkflowToFinalReport } from "../mapWorkflowToFinalReport";
import { attachNearTarget } from "../nearTarget";
import {
  attachJudgmentMargin,
  ciContainsTarget,
  judgmentMargin,
  parseRawIntervalBounds,
} from "./judgmentMargin";

function kpi(over: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.98, threshold: 0.95, status: "pass", higherIsBetter: true, ...over };
}

describe("judgmentMargin — 계획 6절 3 의 예", () => {
  it("Accuracy [0.9497, 0.994] · 목표 0.950 → 작음(구간이 목표를 포함)", () => {
    expect(judgmentMargin(kpi({ value: 0.9824561403508771 }), { low: 0.9496962348678732, high: 0.9940158635836336 })).toBe(
      "small",
    );
  });

  it("AUROC [0.997, 1.000] · 목표 0.980 → 충분", () => {
    expect(
      judgmentMargin(kpi({ metricId: "M9", name: "AUROC", value: 0.999269859813084, threshold: 0.98 }), {
        low: 0.9972959243713961,
        high: 1,
      }),
    ).toBe("ample");
  });

  it("낮을수록 좋은 지표도 같은 식 — Log Loss [0.033, 0.079] · 목표 0.100 → 충분, [0.08, 0.12] → 작음", () => {
    const logLoss = kpi({ metricId: "M19", name: "Log Loss", value: 0.0535, threshold: 0.1, higherIsBetter: false });
    expect(judgmentMargin(logLoss, { low: 0.032626482422720565, high: 0.07912002247121414 })).toBe("ample");
    expect(judgmentMargin(logLoss, { low: 0.08, high: 0.12 })).toBe("small");
  });

  it("경계 == 목표 → 작음(아래 경계도 위 경계도 포함)", () => {
    expect(judgmentMargin(kpi({}), { low: 0.95, high: 0.99 })).toBe("small");
    expect(judgmentMargin(kpi({ value: 0.93, status: "fail" }), { low: 0.91, high: 0.95 })).toBe("small");
    // 바로 위·바로 아래는 포함하지 않는다.
    expect(judgmentMargin(kpi({}), { low: 0.95001, high: 0.99 })).toBe("ample");
    expect(judgmentMargin(kpi({ value: 0.93, status: "fail" }), { low: 0.91, high: 0.94999 })).toBe("ample");
  });

  it("구간이 없으면 3% 엄격 미만 — 0.8239 · 0.8 → 작음, 0.824 · 0.8(꼭 3%) → 충분", () => {
    expect(judgmentMargin(kpi({ value: 0.8239, threshold: 0.8 }), null)).toBe("small");
    expect(judgmentMargin(kpi({ value: 0.824, threshold: 0.8 }), null)).toBe("ample");
    expect(judgmentMargin(kpi({ value: 0.9, threshold: 0.8 }), null)).toBe("ample");
  });

  it("미달 지표에도 적용 — 구간이 있으면 구간으로, 없으면 3% 로", () => {
    const fail = kpi({ value: 0.94, status: "fail" });
    expect(judgmentMargin(fail, { low: 0.92, high: 0.96 })).toBe("small");
    expect(judgmentMargin(fail, { low: 0.9, high: 0.94 })).toBe("ample");
    expect(judgmentMargin(fail, null)).toBe("small"); // |0.94 − 0.95| = 0.01 < 0.0285
    expect(judgmentMargin(kpi({ value: 0.9, status: "fail" }), null)).toBe("ample");
  });

  it("구간이 있으면 3% 규칙을 보지 않는다(3% 안이어도 구간이 목표를 피하면 충분, 3% 밖이어도 포함하면 작음)", () => {
    const near = kpi({ value: 0.96, threshold: 0.95 }); // 3% 안
    expect(judgmentMargin(near, { low: 0.955, high: 0.965 })).toBe("ample");
    const far = kpi({ value: 0.99, threshold: 0.9 }); // 3% 밖
    expect(judgmentMargin(far, { low: 0.85, high: 1 })).toBe("small");
  });

  it("판정 대상이 아니면 없음 — 목표값 없음, 측정 불가", () => {
    expect(judgmentMargin(kpi({ threshold: null }), { low: 0.9, high: 1 })).toBeNull();
    expect(judgmentMargin(kpi({ status: "unavailable" }), null)).toBeNull();
  });

  it("ciContainsTarget 은 끝자리 잡음을 걷는다", () => {
    expect(ciContainsTarget(0.95 + 1e-12, 0.99, 0.95)).toBe(true);
    expect(ciContainsTarget(0.9, 0.95 - 1e-12, 0.95)).toBe(true);
    expect(ciContainsTarget(0.9501, 0.99, 0.95)).toBe(false);
  });
});

describe("parseRawIntervalBounds — 평가 응답의 low_raw·high_raw", () => {
  it("두 칸이 숫자이고 low ≤ high 인 항목만, 키는 표시 ID", () => {
    const parsed = parseRawIntervalBounds({
      M1: { low: 0.9497, high: 0.994, low_raw: 0.9496962348678732, high_raw: 0.9940158635836336, level: 0.95, method: "wilson" },
      M9: { low: 0.9973, high: 1, low_raw: null, high_raw: null, method: "skipped" },
      M4: { low: 0.4, high: 0.5 },
      M3: { low_raw: 0.6, high_raw: 0.5 },
      M2: "깨진 값",
    });
    expect(parsed).toEqual({ M1: { low: 0.9496962348678732, high: 0.9940158635836336 } });
  });

  it("읽을 항목이 없으면 null", () => {
    expect(parseRawIntervalBounds(undefined)).toBeNull();
    expect(parseRawIntervalBounds([])).toBeNull();
    expect(parseRawIntervalBounds({ M1: { low: 0.9, high: 1 } })).toBeNull();
  });
});

describe("attachJudgmentMargin — 판정 대상 지표에만, 판 3 nearTarget 은 그대로", () => {
  const withCi = (over: Partial<KpiResult>) => kpi({ ci: { low: 0.95, high: 0.99, method: "wilson" }, ...over });

  it("반올림 전 경계로 본다 — 넷째 자리 경계 0.9500 은 목표 0.95 를 포함하지만 원값 0.95004 는 아니다", () => {
    const [r] = attachJudgmentMargin([withCi({})], { M1: { low: 0.95004, high: 0.99 } });
    expect(r.judgmentMargin).toBe("ample");
    expect(r.ciRaw).toEqual({ low: 0.95004, high: 0.99 });
    // 반올림 전 경계가 없으면(옛 백엔드) 넷째 자리 경계로 — 같은 지표가 작음이 된다.
    const [old] = attachJudgmentMargin([withCi({})], null);
    expect(old.judgmentMargin).toBe("small");
    expect(old).not.toHaveProperty("ciRaw");
  });

  it("구간이 붙지 않은 지표(ci 없음)는 응답에 원값이 있어도 3% 규칙 — 구간이 있는지는 판 3 과 같은 한 곳(ci)으로 본다", () => {
    const [r] = attachJudgmentMargin([kpi({ value: 0.96 })], { M1: { low: 0.97, high: 0.99 } });
    expect(r.judgmentMargin).toBe("small");
    expect(r).not.toHaveProperty("ciRaw");
  });

  it("판정 대상이 아니면 키를 두지 않는다", () => {
    const out = attachJudgmentMargin(
      [kpi({ metricId: "M21", threshold: null }), kpi({ metricId: "M3", status: "unavailable" })],
      { M21: { low: 0, high: 1 }, M3: { low: 0, high: 1 } },
    );
    for (const r of out) {
      expect(r).not.toHaveProperty("judgmentMargin");
      expect(r).not.toHaveProperty("ciRaw");
    }
  });

  it("판 3 의 margin·nearTarget(3% 뜻)은 덮지 않는다", () => {
    const [before] = attachNearTarget([withCi({ value: 0.96 })]);
    expect(before.nearTarget).toBe(true);
    const [after] = attachJudgmentMargin([before], { M1: { low: 0.955, high: 0.97 } });
    expect(after.judgmentMargin).toBe("ample");
    expect(after.nearTarget).toBe(true);
    expect(after.margin).toBe(before.margin);
  });
});

// ── 배선: 판 4 run 의 조립이 판정 여유를 저장하고, 판 3 run 은 저장하지 않는다 ───────────────────

const RESULT = {
  class_distribution: { "0": 107, "1": 64 },
  dropped_rows: 0,
  environment: { evaluated_at: "2026-10-22T09:45:00Z", libraries: {} },
  n_samples: 171,
  warnings: [],
  results: {
    failed_metrics: {},
    success_metrics: {
      M1: 0.9824561403508771,
      M3: 0.984375,
      M9: 0.999269859813084,
      M10: 0.9988367417279411,
      confidence_intervals: {
        // 넷째 자리 하한 0.9500 은 목표를 포함하는 것처럼 보이지만 원값은 목표 위 — 판 4 는 충분, 넷째 자리로 보면 작음.
        M1: { low: 0.95, high: 0.994, low_raw: 0.95004, high_raw: 0.9940158635836336, level: 0.95, method: "wilson" },
        M3: { low: 0.9167, high: 0.9972, low_raw: 0.9166589839990573, high_raw: 0.9972364580766624, level: 0.95, method: "wilson" },
        M9: { low: 0.9973, high: 1, low_raw: 0.9972959243713961, high_raw: 1, level: 0.95, method: "delong" },
        M10: { low: 0.99, high: 1, low_raw: 0.99, high_raw: 1, level: 0.95, method: "bootstrap", n_resamples: 2000, seed: 4213 },
      },
    },
  },
};

const SELECTED = ["M1", "M3", "M9", "M10"];

function inputs(): EvaluatedReportInputs {
  const details = (target: string) => ({ targetValue: target, beta: "", positiveClass: "", completed: true }) as never;
  return {
    taskType: "binary",
    selectedMetricIds: SELECTED,
    metricDetails: { M1: details("0.95"), M3: details("0.97"), M9: details("0.98"), M10: details("") },
    composerMetrics: {},
    columnMapping: [],
    metadata: { positive_class: "1", detected_classes: ["0", "1"], class_distribution: { "0": 107, "1": 64 } },
    composer: undefined,
  };
}

function base(contentSchema: 3 | 4) {
  return mapWorkflowToFinalReport(
    {
      basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
      taskType: "binary",
      selectedMetricIds: SELECTED,
      metricDetails: {},
      uploadedFile: null,
      trainingExampleFiles: [],
      trainingUnsuitableExampleFiles: [],
      columnMapping: [],
      classLabelDescriptions: {},
      metadata: null,
    },
    null,
    { contentSchema },
  );
}

describe("assembleEvaluatedReport 배선 — 찍힌 판으로만", () => {
  it("판 4 run: 판정 대상 지표마다 판정 여유와 반올림 전 경계를 저장한다", () => {
    const { stage1Report } = assembleEvaluatedReport(base(4), structuredClone(RESULT), inputs());
    const byId = Object.fromEntries(stage1Report.kpiResults.map((r) => [r.metricId, r]));
    expect(Object.keys(byId).sort()).toEqual([...SELECTED].sort());
    expect(byId.M1.judgmentMargin).toBe("ample"); // 원값 0.95004 > 0.95
    expect(byId.M1.ciRaw).toEqual({ low: 0.95004, high: 0.9940158635836336 });
    expect(byId.M3.judgmentMargin).toBe("small");
    expect(byId.M9.judgmentMargin).toBe("ample");
    expect(byId.M10).not.toHaveProperty("judgmentMargin"); // 목표 없음 — 판정 대상 아님
    // 판 3 근소 표시(3%)는 그대로 붙어 있다 — 뜻이 다른 두 칸.
    expect(byId.M3.nearTarget).toBe(true);
  });

  it("판 3 run: 같은 응답이어도 판정 여유·반올림 전 경계 키가 하나도 없다", () => {
    const { stage1Report, factSheet } = assembleEvaluatedReport(base(3), structuredClone(RESULT), inputs());
    expect(stage1Report.kpiResults.length).toBe(SELECTED.length);
    for (const r of stage1Report.kpiResults) {
      expect(r).not.toHaveProperty("judgmentMargin");
      expect(r).not.toHaveProperty("ciRaw");
    }
    expect(JSON.stringify(factSheet)).not.toMatch(/judgmentMargin|ciRaw|_raw/);
  });
});
