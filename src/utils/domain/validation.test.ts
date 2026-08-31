import { describe, it, expect } from "vitest";
import { metricNeedsTargetValue } from "./validation";
import { computeVerdict } from "../../lib/report/computeVerdict";
import { getRecommendedMetricIds } from "../../data/evaluationData";
import type { KpiResult } from "../../types/finalReport.types";

function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "x", value: 0, threshold: 0.8, status: "pass", ...p };
}

/**
 * ISSUES.md B-01 회귀 방지.
 *
 * M21/M22 는 백엔드가 dict(행렬·클래스별 표)를 반환해 성적서 변환 계층이 대표 숫자를
 * 뽑지 못하고 값 0 으로 둔다. 이 상태에서 타겟값을 받으면 항상 "0 < 기준" → 미달이 되어
 * 종합판정이 절대 PASS 가 될 수 없었다. 두 지표 모두 추천 세트에 있어 기본 경로에서 발생했고,
 * 표시 계층이 "시각화 참조"로 렌더해 화면에는 드러나지 않았다.
 */
describe("정보성 지표는 판정 기준을 받지 않는다 (B-01)", () => {
  it("M21·M22 는 타겟값을 요구하지 않는다", () => {
    expect(metricNeedsTargetValue("M21")).toBe(false);
    expect(metricNeedsTargetValue("M22")).toBe(false);
  });

  it("일반 지표는 타겟값을 계속 요구한다", () => {
    for (const id of ["M1", "M4", "M9", "M17", "M23"]) {
      expect(metricNeedsTargetValue(id)).toBe(true);
    }
  });

  it("추천 지표 세트를 그대로 쓴 평가에서 PASS 가 나올 수 있다", () => {
    // 정보성 지표는 threshold 0 으로 들어오므로 판정 분모에서 빠진다.
    const results = [
      kpi({ metricId: "M1", status: "pass", threshold: 0.85 }),
      kpi({ metricId: "M4", status: "pass", threshold: 0.8 }),
      kpi({ metricId: "M21", status: "pass", threshold: 0, value: 0 }),
      kpi({ metricId: "M22", status: "pass", threshold: 0, value: 0 }),
    ];
    const res = computeVerdict(results, "binary");
    expect(res.verdict).toBe("PASS");
    expect(res.score).toBe(100);
  });

  it("추천 지표 세트의 정보성 지표는 모두 타겟값 면제 대상이다", () => {
    const infoOnly = ["M21", "M22"];
    for (const taskType of ["binary", "multiclass", "multilabel"] as const) {
      const recommended = getRecommendedMetricIds(taskType);
      for (const id of recommended.filter((m: string) => infoOnly.includes(m))) {
        expect({ taskType, id, needsTarget: metricNeedsTargetValue(id) })
          .toEqual({ taskType, id, needsTarget: false });
      }
    }
  });
});
