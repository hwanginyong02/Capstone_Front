import { describe, it, expect } from "vitest";
import {
  computeMargin,
  computeVerdict,
  coreMetricsSource,
  isJudged,
  isNearTarget,
  resolveCoreMetricIds,
} from "./computeVerdict";
import type { KpiResult } from "../../types/finalReport.types";

function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "x", value: 0, threshold: 0.8, status: "pass", ...p };
}

describe("computeVerdict", () => {
  it("비핵심 지표 미달 → CONDITIONAL_PASS, score 는 통과율", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "pass", threshold: 0.85 }), kpi({ metricId: "M8", status: "fail", threshold: 0.1 })],
      "binary",
    );
    expect(res.verdict).toBe("CONDITIONAL_PASS");
    expect(res.score).toBe(50);
  });

  it("핵심 지표 미달 → FAIL", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "fail", threshold: 0.85 }), kpi({ metricId: "M2", status: "pass", threshold: 0.8 })],
      "binary",
    );
    expect(res.verdict).toBe("FAIL");
  });

  it("D4: unavailable 지표는 분모·판정에서 제외 (비핵심)", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "pass", threshold: 0.85 }), kpi({ metricId: "M9", status: "unavailable", threshold: 0.8 })],
      "binary",
    );
    expect(res.score).toBe(100); // 측정된 1개 중 1개 통과 (M9 제외)
    expect(res.verdict).toBe("PASS");
  });

  it("D19: 핵심 지표가 산출되지 않으면(unavailable) 판정 불가 — 합격처럼 보이게 하지 않는다", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "unavailable", threshold: 0.85 }), kpi({ metricId: "M2", status: "pass", threshold: 0.8 })],
      "binary",
    );
    expect(res.verdict).toBe("INCONCLUSIVE");
  });

  it("D19: 판정 대상 지표가 하나도 없으면 판정 불가, 통과율은 셀 수 없다", () => {
    const res = computeVerdict([kpi({ metricId: "M21", status: "pass", threshold: null })], "binary");
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.judgedCount).toBe(0);
    expect(res.score).toBe(0);
  });
});

/**
 * 사용자가 고른 핵심 지표.
 *
 * 종전에는 유형별 상수였다. 이제 지표와 합격 기준 화면의 합격 기준 표에서 고르고, 고르지 않으면 그 상수가
 * 기본값이다.
 */
describe("핵심 지표를 고른다", () => {
  it("고른 핵심 지표가 미달하면 FAIL 이다 — 기본값에 없는 지표라도", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "pass" }), kpi({ metricId: "M2", status: "fail" })],
      "binary",
      ["M2"],
    );
    expect(res.verdict).toBe("FAIL");
  });

  it("기본 핵심 지표라도 고르지 않았으면 미달해도 조건부 합격이다", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "fail" }), kpi({ metricId: "M2", status: "pass" })],
      "binary",
      ["M2"],
    );
    expect(res.verdict).toBe("CONDITIONAL_PASS");
  });

  it("핵심 지표가 없으면 FAIL 이 나오지 않는다", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "fail" }), kpi({ metricId: "M4", status: "fail" })],
      "binary",
      [],
    );
    expect(res.verdict).toBe("CONDITIONAL_PASS");
  });
});

describe("resolveCoreMetricIds", () => {
  it("고르지 않았으면 유형별 기본값 중 고른 지표만 남긴다", () => {
    expect(resolveCoreMetricIds("multilabel", ["M2", "M4", "M17"])).toEqual(["M4", "M17"]);
    expect(resolveCoreMetricIds("binary", ["M4", "M9"])).toEqual(["M4"]);
  });

  it("사용자가 고른 값이 있으면 그것을 쓴다", () => {
    expect(
      resolveCoreMetricIds("binary", ["M1", "M2", "M4"], { coreMetrics: { choices: ["M2"] } }),
    ).toEqual(["M2"]);
  });

  it("빈 선택은 '핵심 지표 없음'이다 — 기본값으로 되돌리지 않는다", () => {
    expect(resolveCoreMetricIds("binary", ["M1", "M4"], { coreMetrics: { choices: [] } })).toEqual(
      [],
    );
  });

  it("나중에 지표 선택에서 뺀 지표와 목표값이 없는 지표는 빠진다", () => {
    expect(
      resolveCoreMetricIds("binary", ["M1", "M21"], { coreMetrics: { choices: ["M4", "M21", "M1"] } }),
    ).toEqual(["M1"]);
  });
});

describe("coreMetricsSource — 핵심 지표를 누가 정했나 (W8)", () => {
  it("손대지 않았으면 기본값(default)", () => {
    expect(coreMetricsSource(undefined)).toBe("default");
    expect(coreMetricsSource({})).toBe("default");
    expect(coreMetricsSource({ coreMetrics: {} })).toBe("default");
  });

  it("한 번이라도 골랐으면 의뢰자(client) — 기본값과 같게 되돌려도, 비워도", () => {
    expect(coreMetricsSource({ coreMetrics: { choices: ["M1", "M4"] } })).toBe("client");
    expect(coreMetricsSource({ coreMetrics: { choices: [] } })).toBe("client");
  });
});

/**
 * 서술 설계 D19 — 위에서부터 처음 맞는 규칙으로 판정한다.
 * ① 핵심 미달 → 불합격 ② 핵심 미산출·판정 대상 없음 → 판정 불가 ③ 그 외 미달 → 조건부 합격 ④ 합격
 */
describe("D19 규칙 순서", () => {
  it("핵심 지표 미달이 핵심 지표 미산출보다 앞선다 — 불합격", () => {
    const res = computeVerdict(
      [
        kpi({ metricId: "M1", status: "fail", threshold: 0.9 }),
        kpi({ metricId: "M4", status: "unavailable", threshold: 0.8 }),
      ],
      "binary",
      ["M1", "M4"],
    );
    expect(res.verdict).toBe("FAIL");
  });

  it("목표값이 없는 핵심 지표는 산출되지 않은 것과 같다 — 판정 불가", () => {
    const res = computeVerdict(
      [
        kpi({ metricId: "M1", status: "pass", threshold: 0.9 }),
        kpi({ metricId: "M20", status: "pass", threshold: null }),
      ],
      "binary",
      ["M1", "M20"],
    );
    expect(res.verdict).toBe("INCONCLUSIVE");
  });

  it("이번 평가에 없는 지표는 핵심으로 세지 않는다", () => {
    // 기본 핵심(M1·M4) 중 M4 를 고르지 않은 평가 — M4 가 없다고 판정 불가가 되지 않는다.
    const res = computeVerdict([kpi({ metricId: "M1", status: "pass", threshold: 0.9 })], "binary");
    expect(res.verdict).toBe("PASS");
  });

  it("핵심은 모두 충족, 그 외 미달 → 조건부 합격 / 전부 충족 → 합격", () => {
    const core = kpi({ metricId: "M1", status: "pass", threshold: 0.9 });
    expect(
      computeVerdict([core, kpi({ metricId: "M3", status: "fail", threshold: 0.8 })], "binary", ["M1"])
        .verdict,
    ).toBe("CONDITIONAL_PASS");
    expect(
      computeVerdict([core, kpi({ metricId: "M3", status: "pass", threshold: 0.8 })], "binary", ["M1"])
        .verdict,
    ).toBe("PASS");
  });
});

describe("isJudged — 판정 대상 한 곳 (신뢰구간 등도 이 식을 본다)", () => {
  it("목표값이 있고 산출에 성공하면 판정 대상 — 목표값 0 도 목표값이다", () => {
    expect(isJudged(kpi({ threshold: 0.8, status: "fail" }))).toBe(true);
    expect(isJudged(kpi({ threshold: 0, status: "pass" }))).toBe(true);
  });

  it("목표값이 없거나(null) 산출에 실패하면(unavailable) 판정 대상이 아니다", () => {
    expect(isJudged(kpi({ threshold: null }))).toBe(false);
    expect(isJudged(kpi({ threshold: 0.8, status: "unavailable" }))).toBe(false);
  });

  it("computeVerdict 의 판정 대상 수와 같다", () => {
    const rows = [
      kpi({ metricId: "M1", threshold: 0.8 }),
      kpi({ metricId: "M2", threshold: null }),
      kpi({ metricId: "M3", threshold: 0.5, status: "unavailable" }),
    ];
    expect(computeVerdict(rows, "binary", []).judgedCount).toBe(rows.filter(isJudged).length);
  });
});

/**
 * 아슬아슬(근소 차이) — 서술 설계 D12, 고정 문구 10 마지막 문장. |마진| < |목표값| × 3% (엄격 미만).
 * 설계 원문의 "목표값 × 3%" 를 목표값 절댓값으로 고쳤다 — 목표가 음수(MCC)여도 폭이 양수다.
 * 경계값 테스트는 부동소수 오차가 없는 수(목표 100 → 폭 3)로 고정한다.
 */
describe("computeMargin·isNearTarget — 아슬아슬 한 곳 (D12)", () => {
  it("높을수록 좋은 지표: 마진 = 값 − 목표(미달이면 음수)", () => {
    expect(computeMargin(kpi({ value: 103, threshold: 100 }))).toBe(3);
    expect(computeMargin(kpi({ value: 97, threshold: 100, status: "fail" }))).toBe(-3);
  });

  it("낮을수록 좋은 지표: 마진 = 목표 − 값(충족이면 양수)", () => {
    expect(computeMargin(kpi({ value: 97, threshold: 100, higherIsBetter: false }))).toBe(3);
    expect(computeMargin(kpi({ value: 103, threshold: 100, higherIsBetter: false, status: "fail" }))).toBe(-3);
  });

  it("판정 대상이 아니면 마진 null, 아슬아슬 아님", () => {
    const noTarget = kpi({ value: 0.8, threshold: null });
    const unavailable = kpi({ value: 0, threshold: 0.8, status: "unavailable" });
    expect(computeMargin(noTarget)).toBeNull();
    expect(computeMargin(unavailable)).toBeNull();
    expect(isNearTarget(noTarget)).toBe(false);
    // 측정 불가 지표는 value 0 이라 목표 0 근처면 아슬아슬처럼 보일 수 있다 — 판정 대상이 아니다.
    expect(isNearTarget(kpi({ value: 0, threshold: 0.001, status: "unavailable" }))).toBe(false);
  });

  it("경계: |마진| 이 꼭 목표의 3% 이면 아슬아슬이 아니다(엄격 미만) — 합격·미달 양쪽", () => {
    expect(isNearTarget(kpi({ value: 103, threshold: 100 }))).toBe(false);
    expect(isNearTarget(kpi({ value: 97, threshold: 100, status: "fail" }))).toBe(false);
    expect(isNearTarget(kpi({ value: 102.99, threshold: 100 }))).toBe(true);
    expect(isNearTarget(kpi({ value: 97.01, threshold: 100, status: "fail" }))).toBe(true);
  });

  it("3% 안팎 — 목표 0.8 에서 차이 0.02 는 아슬아슬, 0.032(4%)는 아니다", () => {
    expect(isNearTarget(kpi({ value: 0.82, threshold: 0.8 }))).toBe(true);
    expect(isNearTarget(kpi({ value: 0.78, threshold: 0.8, status: "fail" }))).toBe(true);
    expect(isNearTarget(kpi({ value: 0.832, threshold: 0.8 }))).toBe(false);
    expect(isNearTarget(kpi({ value: 0.768, threshold: 0.8, status: "fail" }))).toBe(false);
  });

  it("음수 목표(MCC −0.1)에서도 폭은 |목표| × 3% = 0.003 이다", () => {
    expect(isNearTarget(kpi({ metricId: "M5", value: -0.0985, threshold: -0.1 }))).toBe(true);
    expect(isNearTarget(kpi({ metricId: "M5", value: -0.1015, threshold: -0.1, status: "fail" }))).toBe(true);
    expect(isNearTarget(kpi({ metricId: "M5", value: -0.09, threshold: -0.1 }))).toBe(false);
  });

  it("낮을수록 좋은 지표(FPR 목표 0.1): 0.102 미달도 아슬아슬, 0.09 는 아니다", () => {
    expect(isNearTarget(kpi({ metricId: "M8", value: 0.102, threshold: 0.1, higherIsBetter: false, status: "fail" }))).toBe(true);
    expect(isNearTarget(kpi({ metricId: "M8", value: 0.09, threshold: 0.1, higherIsBetter: false }))).toBe(false);
  });

  it("목표 0 이면 폭이 0 이라 아슬아슬이 나오지 않는다", () => {
    expect(isNearTarget(kpi({ value: 0, threshold: 0 }))).toBe(false);
    expect(isNearTarget(kpi({ value: 0.0001, threshold: 0 }))).toBe(false);
  });
});

/** 판정 사유(9절 문제 목록의 재료) — 판정 결과는 바꾸지 않고 어느 지표 때문인지를 돌려준다. */
describe("computeVerdict 판정 사유", () => {
  it("핵심·비핵심 미달 지표를 나눠 적는다 — FAIL 이어도 비핵심 미달을 센다", () => {
    const res = computeVerdict(
      [
        kpi({ metricId: "M1", status: "fail" }),
        kpi({ metricId: "M4", status: "pass" }),
        kpi({ metricId: "M8", status: "fail", threshold: 0.1 }),
        kpi({ metricId: "M9", status: "unavailable" }),
      ],
      "binary",
    );
    expect(res.verdict).toBe("FAIL");
    expect(res.reasons).toEqual({ coreFailed: ["M1"], nonCoreFailed: ["M8"], inconclusive: null });
  });

  it("합격·조건부 합격에는 판정 불가 사유가 없다", () => {
    const pass = computeVerdict([kpi({ metricId: "M1" }), kpi({ metricId: "M4" })], "binary");
    expect(pass.reasons).toEqual({ coreFailed: [], nonCoreFailed: [], inconclusive: null });
    const conditional = computeVerdict(
      [kpi({ metricId: "M1" }), kpi({ metricId: "M4" }), kpi({ metricId: "M2", status: "fail" })],
      "binary",
    );
    expect(conditional.verdict).toBe("CONDITIONAL_PASS");
    expect(conditional.reasons.nonCoreFailed).toEqual(["M2"]);
  });

  it("핵심 지표 산출 실패 → core_not_computed (목표 없는 핵심이 함께 있어도)", () => {
    const res = computeVerdict(
      [
        kpi({ metricId: "M1", status: "unavailable" }),
        kpi({ metricId: "M4", threshold: null }),
        kpi({ metricId: "M2" }),
      ],
      "binary",
    );
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.reasons.inconclusive).toEqual({ reason: "core_not_computed", metricIds: ["M1"] });
  });

  it("핵심 지표 목표값 없음 → no_target", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1" }), kpi({ metricId: "M4", threshold: null })],
      "binary",
    );
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.reasons.inconclusive).toEqual({ reason: "no_target", metricIds: ["M4"] });
  });

  it("판정 대상 0개(핵심 지표 탓 아님) → no_judged", () => {
    const res = computeVerdict([kpi({ metricId: "M2", threshold: null })], "binary", []);
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.reasons.inconclusive).toEqual({ reason: "no_judged", metricIds: [] });
  });
});
