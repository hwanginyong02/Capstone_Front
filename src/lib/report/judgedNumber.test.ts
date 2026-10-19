import { describe, it, expect } from "vitest";
import { difference, formatJudgedValue, meetsTarget } from "./judgedNumber";
import { evaluateStatus } from "./evaluateStatus";
import { computeMargin, isNearTarget } from "./computeVerdict";
import type { KpiResult } from "../../types/finalReport.types";

/** 점검 F2 재현 값 — 백엔드 venv 의 sklearn 매크로 F1 이 수학적으로 0.8 인데 이렇게 왔다. */
const NOISY_EIGHT = 0.7999999999999999;

function kpi(value: number, threshold: number, higherIsBetter = true): KpiResult {
  return {
    metricId: "M1",
    name: "Accuracy",
    value,
    threshold,
    status: evaluateStatus(value, threshold, higherIsBetter),
    higherIsBetter,
  } as KpiResult;
}

describe("difference — 끝자리 잡음을 걷은 차이", () => {
  it("0.85 − 0.75 는 0.1, 0.7999999999999999 − 0.8 은 0", () => {
    expect(difference(0.85, 0.75)).toBe(0.1);
    expect(difference(NOISY_EIGHT, 0.8)).toBe(0);
    expect(Object.is(difference(0.8, NOISY_EIGHT), -0)).toBe(false);
  });

  it("진짜 차이(0.0004)는 걷지 않는다", () => {
    expect(difference(0.7996, 0.8)).toBeCloseTo(-0.0004, 12);
    expect(meetsTarget(0.7996, 0.8, true)).toBe(false);
  });
});

describe("판정·마진·아슬아슬이 같은 차이를 본다(재현 값)", () => {
  it("0.7999999999999999 대 목표 0.8 은 합격(높을수록 좋음)이고 아슬아슬 마진은 0", () => {
    expect(evaluateStatus(NOISY_EIGHT, 0.8, true)).toBe("pass");
    expect(computeMargin(kpi(NOISY_EIGHT, 0.8))).toBe(0);
  });

  it("낮을수록 좋은 지표도 같은 규칙 — 0.1 + 잡음 대 목표 0.1 은 합격", () => {
    expect(evaluateStatus(0.30000000000000004 - 0.2, 0.1, false)).toBe("pass");
  });

  it("0.824 대 목표 0.8 은 차이가 꼭 3% — 아슬아슬이 아니다(엄격 미만)", () => {
    expect(isNearTarget(kpi(0.824, 0.8))).toBe(false);
    expect(computeMargin(kpi(0.824, 0.8))).toBe(0.024);
  });

  it("위아래가 대칭이다 — 0.776 도 아슬아슬이 아니다", () => {
    expect(isNearTarget(kpi(0.776, 0.8))).toBe(false);
  });

  it("0.103 대 목표 0.1(높을수록 좋음)도 꼭 3% 라 아슬아슬이 아니다", () => {
    expect(isNearTarget(kpi(0.103, 0.1))).toBe(false);
  });

  it("폭 쪽의 잡음도 걷는다 — 목표 0.07 × 3% 는 0.0021000000000000003 이라 꼭 3% 인 0.0721·0.0679 가 아슬아슬로 잡혔다", () => {
    expect(isNearTarget(kpi(0.0721, 0.07))).toBe(false);
    expect(isNearTarget(kpi(0.0679, 0.07))).toBe(false);
  });

  it("3% 안쪽은 그대로 아슬아슬이다", () => {
    expect(isNearTarget(kpi(0.8239, 0.8))).toBe(true);
    expect(isNearTarget(kpi(0.7761, 0.8))).toBe(true);
  });
});

describe("formatJudgedValue — 판정과 어긋나 보이면 자릿수를 늘린다", () => {
  it("실제 미달 0.7996 은 셋째 자리 '0.800' 이 합격으로 읽혀 넷째 자리로 찍는다", () => {
    expect(formatJudgedValue(0.7996, 0.8, true, false)).toBe("0.7996");
  });

  it("잡음만 있는 0.7999999999999999 는 합격이고 '0.800' 그대로", () => {
    expect(formatJudgedValue(NOISY_EIGHT, 0.8, true, true)).toBe("0.800");
  });

  it("어긋나지 않으면 셋째 자리 그대로", () => {
    expect(formatJudgedValue(0.8123, 0.8, true, true)).toBe("0.812");
    expect(formatJudgedValue(0.7, 0.8, true, false)).toBe("0.700");
  });

  it("낮을수록 좋은 지표 — 0.1004 대 목표 0.1(≤) 미달은 '0.1004'", () => {
    expect(formatJudgedValue(0.1004, 0.1, false, false)).toBe("0.1004");
  });

  it("여섯째 자리로도 같아 보이면 판정 쪽으로 자른다", () => {
    const printed = formatJudgedValue(0.79999996, 0.8, true, false);
    expect(Number(printed)).toBeLessThan(0.8);
    expect(printed).toBe("0.799999");
  });
});
