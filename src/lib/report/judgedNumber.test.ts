import { describe, it, expect } from "vitest";
import {
  cleanNumber,
  difference,
  factText,
  formatBenchmarkValue,
  formatJudgedValue,
  judgedText,
  meetsTarget,
  percentText,
} from "./judgedNumber";
import type { BenchmarkPosition } from "./judgedNumber";
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

describe("judgedText — 엔진 judged_text 와 같은 규칙(넷째 자리부터, 판정과 반대로 읽히면 아홉째 자리까지)", () => {
  it("평소엔 넷째 자리, 끝의 0 은 뺀다", () => {
    expect(judgedText(0.525, 0.05, true)).toBe("0.525");
    expect(judgedText(0.30000001, 0.05, true)).toBe("0.3");
    expect(judgedText(0.12345678, 0.1, true)).toBe("0.1235");
  });

  it("반올림하면 기준과 같아 보이는 값은 자릿수를 늘린다(백엔드 골든 재현 값)", () => {
    expect(judgedText(1.49996, 1.5, false)).toBe("1.49996");
    expect(judgedText(0.09996, 0.1, false)).toBe("0.09996");
    expect(judgedText(0.04996, 0.05, false)).toBe("0.04996");
  });

  it("마진 −0.00004 는 '0' 이 아니라 미달로 읽히게", () => {
    expect(judgedText(-0.00004, 0, false)).toBe("-0.00004");
    expect(judgedText(0, 0, true)).toBe("0");
  });

  it("아홉째 자리로도 반대면 판정 쪽으로 자른다", () => {
    expect(judgedText(1.4999999999, 1.5, false)).toBe("1.499999999");
  });
});

describe("cleanNumber·factText", () => {
  it("뺄셈 잡음만 걷고(9자리) −0 은 0", () => {
    expect(cleanNumber(0.1 + 0.2)).toBe(0.3);
    expect(cleanNumber(-0)).toBe(0);
    expect(Object.is(cleanNumber(-1e-12), 0)).toBe(true);
  });
  it("factText 는 넷째 자리 — 아주 작은 값도 지수 표기가 아니다", () => {
    expect(factText(-0.000070252)).toBe("-0.0001");
    expect(factText(0.434343434)).toBe("0.4343");
    expect(factText(0.00001)).toBe("0");
    expect(factText(-0.00001)).toBe("0");
  });
});

describe("percentText — 소수 문자열을 %로(글자 옮기기)", () => {
  it.each([
    ["0.285", "28.5%"],
    ["0.2105", "21.05%"],
    ["0.04996", "4.996%"],
    ["0.5", "50%"],
    ["0.05", "5%"],
    ["1", "100%"],
    ["0", "0%"],
    ["0.000123456", "0.0123456%"],
    ["-0.0659", "-6.59%"],
    ["-0", "0%"],
    ["12.3", "1230%"],
  ])("%s → %s", (input, expected) => {
    expect(percentText(input)).toBe(expected);
  });

  it("숫자 꼴이 아니면 그대로", () => {
    expect(percentText("—")).toBe("—");
  });
});

/**
 * 8.1 모델 값 대조 표(판 3 만 — 판 1·2 표는 종전 toFixed(3)) — 백엔드 range_value_text 와 같은 규칙:
 * 최대 여섯째 자리, 여섯째로도 위치와 반대면 위치 쪽으로 자르고, 판정 대상이면 같은 자릿수에서 목표 판정도 맞아야 한다.
 * 둘 다 맞는 자릿수가 없을 때만 목표 판정 우선(formatJudgedValue).
 */
describe("formatBenchmarkValue — 8.1 모델 값(위치·목표 판정과 같은 쪽으로)", () => {
  type Judged = { target: number; higherIsBetter: boolean; pass: boolean };
  it.each([
    // [값, low, high, 위치, 판정, 기대]
    [0.79996, 0.8, 0.92, "below", undefined, "0.79996"],
    [0.8497, 0.85, 0.92, "below", undefined, "0.8497"],
    [0.92049, 0.85, 0.92, "above", undefined, "0.9205"],
    [0.04996, 0.05, 0.1, "below", undefined, "0.04996"], // 낮을수록 좋은 지표 — 위치는 단순 수치 위치
    [0.10004, 0.05, 0.1, "above", undefined, "0.10004"],
    [0.7999612, 0.8, 0.92, "below", undefined, "0.79996"], // 다섯째 자리에서 이미 below — 최소 자릿수
    [0.84999996, 0.85, 0.92, "below", undefined, "0.849999"], // 여섯째 "0.850000" 은 범위 안 → 위치 쪽으로 자름
    [0.849961, 0.85, 0.92, "below", { target: 0.85, higherIsBetter: true, pass: false }, "0.84996"],
    // 판정 대상 + 여섯째로도 안 맞음: 위치 쪽으로 자른 값이 목표 판정도 맞으면 그 값('0.850 | 미흡' 으로 돌아가지 않는다)
    [0.8499999, 0.85, 0.92, "below", { target: 0.8, higherIsBetter: true, pass: true }, "0.849999"],
    [0.84999996, 0.85, 0.92, "below", { target: 0.85, higherIsBetter: true, pass: false }, "0.849999"],
    [0.92000004, 0.85, 0.92, "above", { target: 0.95, higherIsBetter: true, pass: false }, "0.920001"],
    // 둘 다 맞는 자릿수가 없으면 목표 판정 우선(formatJudgedValue) — 값이 이미 범위 끝으로 반올림돼 온 경우
    [0.85, 0.85, 0.92, "below", { target: 0.8, higherIsBetter: true, pass: true }, "0.850"],
  ] as [number, number, number, BenchmarkPosition, Judged | undefined, string][])(
    "%s (%s~%s, %s, 판정 %o) → %s",
    (value, low, high, position, judged, expected) => {
      expect(formatBenchmarkValue(value, low, high, position, judged)).toBe(expected);
    },
  );
});
