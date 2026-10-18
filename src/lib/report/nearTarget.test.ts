import { describe, it, expect } from "vitest";
import { attachNearTarget, hasNearTargetMarks, nearTargetNote } from "./nearTarget";
import type { KpiResult } from "../../types/finalReport.types";

/**
 * 아슬아슬 지표 — 서술 설계 D12. 판정 대상 지표에만 margin·nearTarget 을 붙이고, 8.3 한 줄을 만든다.
 * 식 자체(3%·엄격 미만·|목표|)는 computeVerdict.test.ts 에서 고정한다.
 */
function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", higherIsBetter: true, ...p };
}

describe("attachNearTarget", () => {
  it("판정 대상 지표에만 margin·nearTarget 을 붙인다", () => {
    const out = attachNearTarget([
      kpi({ metricId: "M4", name: "F1 Score", value: 0.82, threshold: 0.8 }),
      kpi({ metricId: "M1", value: 0.9, threshold: 0.8 }),
      kpi({ metricId: "M22", threshold: null }),
      kpi({ metricId: "M9", value: 0, threshold: 0.8, status: "unavailable" }),
    ]);
    expect(out[0].nearTarget).toBe(true);
    expect(out[0].margin).toBeCloseTo(0.02, 10);
    expect(out[1].nearTarget).toBe(false);
    expect(out[1].margin).toBeCloseTo(0.1, 10);
    expect("nearTarget" in out[2]).toBe(false);
    expect("margin" in out[2]).toBe(false);
    expect("nearTarget" in out[3]).toBe(false);
  });

  it("낮을수록 좋은 지표는 목표 − 값", () => {
    const [r] = attachNearTarget([
      kpi({ metricId: "M8", value: 0.102, threshold: 0.1, higherIsBetter: false, status: "fail" }),
    ]);
    expect(r.margin).toBeCloseTo(-0.002, 10);
    expect(r.nearTarget).toBe(true);
  });
});

describe("hasNearTargetMarks — 6.1 의 3% 문장을 찍을 성적서인지", () => {
  it("키가 하나라도 있으면 true(아슬아슬 지표가 없어도)", () => {
    expect(hasNearTargetMarks(attachNearTarget([kpi({ value: 0.95 })]))).toBe(true);
  });

  it("옛 성적서(키 없음)는 false", () => {
    expect(hasNearTargetMarks([kpi({})])).toBe(false);
  });
});

describe("nearTargetNote — 8.3 한 줄", () => {
  it("아슬아슬 지표를 값·목표·방향·충족 여부와 함께 적는다", () => {
    const rows = attachNearTarget([
      kpi({ metricId: "M4", name: "F1 Score", value: 0.812, threshold: 0.8 }),
      kpi({ metricId: "M1", value: 0.9, threshold: 0.8 }),
      kpi({ metricId: "M8", name: "FPR", value: 0.102, threshold: 0.1, higherIsBetter: false, status: "fail" }),
    ]);
    expect(nearTargetNote(rows)).toBe(
      "목표값과의 차이가 목표값의 3% 미만인 지표(근소 차이): F1 Score(M4) 0.812(목표 0.800 이상, 충족), " +
        "FPR(M8) 0.102(목표 0.100 이하, 미달).",
    );
  });

  it("아슬아슬 지표가 없으면 null", () => {
    expect(nearTargetNote(attachNearTarget([kpi({ value: 0.9 })]))).toBeNull();
  });

  it("키가 없는 지표에서 새로 판정하지 않는다(옛 성적서)", () => {
    expect(nearTargetNote([kpi({ value: 0.801 })])).toBeNull();
  });
});

describe("8.3 의 목표값 자릿수 (B10)", () => {
  it("목표 0.855 는 8.3 에도 0.855 로 찍힌다", () => {
    const note = nearTargetNote(attachNearTarget([kpi({ value: 0.86, threshold: 0.855 })]));
    expect(note).toContain("(목표 0.855 이상, 충족)");
  });
});
