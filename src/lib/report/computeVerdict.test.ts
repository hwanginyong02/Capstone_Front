import { describe, it, expect } from "vitest";
import { computeVerdict, resolveCoreMetricIds } from "./computeVerdict";
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
