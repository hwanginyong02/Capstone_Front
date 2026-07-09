import { describe, it, expect } from "vitest";
import { computeVerdict } from "./computeVerdict";
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

  it("D4: 핵심 지표가 unavailable 이면 PASS 로 단정하지 않고 CONDITIONAL_PASS", () => {
    const res = computeVerdict(
      [kpi({ metricId: "M1", status: "unavailable", threshold: 0.85 }), kpi({ metricId: "M2", status: "pass", threshold: 0.8 })],
      "binary",
    );
    expect(res.verdict).toBe("CONDITIONAL_PASS");
  });

  it("임계값 지표가 하나도 없으면 CONDITIONAL_PASS / score 0", () => {
    const res = computeVerdict([kpi({ metricId: "M21", status: "pass", threshold: 0 })], "binary");
    expect(res.verdict).toBe("CONDITIONAL_PASS");
    expect(res.score).toBe(0);
  });
});
