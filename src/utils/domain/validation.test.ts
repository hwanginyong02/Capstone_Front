import { describe, it, expect } from "vitest";
import {
  DEFAULT_BETA,
  getTargetValueRule,
  isBetaValid,
  metricNeedsTargetValue,
  newMetricDetail,
  resolveBeta,
  resolveTargetValue,
} from "./validation";
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
    // 정보성 지표는 목표값 없음(null)으로 들어오므로 판정 분모에서 빠진다.
    const results = [
      kpi({ metricId: "M1", status: "pass", threshold: 0.85 }),
      kpi({ metricId: "M4", status: "pass", threshold: 0.8 }),
      kpi({ metricId: "M21", status: "pass", threshold: null, value: 0 }),
      kpi({ metricId: "M22", status: "pass", threshold: null, value: 0 }),
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

/**
 * 합격 목표값 — 없으면 null, 0·음수도 그 지표의 허용 범위 안이면 목표값이다(재료 목록 7절
 * "지표별 허용 범위 검사"). 종전에는 0 이 "없음"을 뜻해 MCC 목표 0·음수가 조용히 빠졌다.
 */
describe("resolveTargetValue", () => {
  it("비었거나 숫자가 아니면 목표값이 없다", () => {
    expect(resolveTargetValue("M1", "")).toBeNull();
    expect(resolveTargetValue("M1", undefined)).toBeNull();
    expect(resolveTargetValue("M1", "abc")).toBeNull();
  });

  it("허용 범위 안의 0·음수도 목표값이다 — MCC", () => {
    expect(resolveTargetValue("M20", "0")).toBe(0);
    expect(resolveTargetValue("M20", "-0.2")).toBe(-0.2);
    expect(resolveTargetValue("M1", "0")).toBe(0);
  });

  it("허용 범위를 벗어나면 목표값이 없는 것으로 본다", () => {
    expect(resolveTargetValue("M1", "1.5")).toBeNull();
    expect(resolveTargetValue("M20", "-2")).toBeNull();
  });

  it("정보성 지표(M21·M22)는 저장된 값이 있어도 목표값이 없다", () => {
    expect(resolveTargetValue("M21", "0.5")).toBeNull();
    expect(resolveTargetValue("M22", "0.5")).toBeNull();
  });

  it("MCC 목표 0 은 판정에 들어간다", () => {
    const res = computeVerdict(
      [
        kpi({ metricId: "M1", status: "pass", threshold: 0.8 }),
        kpi({ metricId: "M20", status: "fail", threshold: 0, value: -0.1 }),
      ],
      "binary",
      ["M1"],
    );
    expect(res.judgedCount).toBe(2);
    expect(res.verdict).toBe("CONDITIONAL_PASS");
  });
});

describe("resolveBeta — 평가 요청과 재료 선택 점검이 같은 β", () => {
  it("비었거나 M5 가 없으면 1.0, 적은 값은 숫자로", () => {
    expect(resolveBeta({})).toBe(1);
    expect(resolveBeta(undefined)).toBe(1);
    expect(resolveBeta({ M5: { beta: "" } })).toBe(1);
    expect(resolveBeta({ M5: { beta: "2" } })).toBe(2);
    expect(resolveBeta({ M5: { beta: "0.5" } })).toBe(0.5);
  });
});

describe("β 기본값 한 곳 (B3)", () => {
  it("기본값은 1.0 이다", () => {
    expect(DEFAULT_BETA).toBe("1.0");
  });

  it("M5 의 처음 상세 값은 β 1.0 으로 시작한다 — 목표값을 먼저 적어도 β 가 비지 않는다", () => {
    expect(newMetricDetail("M5", "F-beta Score")).toEqual({
      id: "M5",
      name: "F-beta Score",
      description: "",
      targetValue: "",
      beta: "1.0",
      positiveClass: "",
      completed: false,
    });
    expect(isBetaValid(newMetricDetail("M5", "F-beta Score").beta)).toBe(true);
  });

  it("다른 지표의 β 는 비운다(쓰이지 않음)", () => {
    expect(newMetricDetail("M4", "F1 Score").beta).toBe("");
  });

  it("저장값이 없으면 유효, 비우면 무효", () => {
    expect(isBetaValid(undefined)).toBe(true);
    expect(isBetaValid("")).toBe(false);
    expect(isBetaValid("0")).toBe(false);
    expect(isBetaValid("2")).toBe(true);
  });
});

describe("목표값 범위 — M14·M18 은 0~1 (B9)", () => {
  it.each(["M14", "M18"])("%s 는 1.2 면 오류, 0.3 이면 통과", (id) => {
    expect(getTargetValueRule(id).validate(1.2)).toBe("이 지표의 목표값은 0과 1 사이여야 합니다.");
    expect(getTargetValueRule(id).validate(-0.1)).not.toBeNull();
    expect(getTargetValueRule(id).validate(0.3)).toBeNull();
    expect(getTargetValueRule(id).summary).toBe("0과 1 사이의 숫자를 넣으세요.");
  });

  it("KL Divergence·Log Loss 는 그대로 0 이상(상한 없음)", () => {
    expect(getTargetValueRule("M6").validate(2)).toBeNull();
    expect(getTargetValueRule("M19").validate(2)).toBeNull();
    expect(getTargetValueRule("M6").validate(-0.1)).not.toBeNull();
  });
});
