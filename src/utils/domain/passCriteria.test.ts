/**
 * 합격 목표값 칸 하나의 문제(`targetValueError`) — 지표 화면과 검증 화면 1층 재확인이 같은 판정을 쓴다.
 */
import { describe, expect, it } from "vitest";

import { targetValueError } from "./passCriteria";
import { fitsTargetDigits, TARGET_DIGITS } from "./validation";

describe("목표값은 소수 셋째 자리까지 (B10)", () => {
  it("자릿수 상한은 3", () => {
    expect(TARGET_DIGITS).toBe(3);
  });

  it("0.855 는 받고 0.8555 는 입력 오류", () => {
    expect(targetValueError("M1", "0.855")).toBeNull();
    expect(targetValueError("M1", "0.8555")).toBe("목표값은 소수 셋째 자리까지 넣으세요.");
  });

  it("부동소수 오차로 셋째 자리 값을 거절하지 않는다", () => {
    for (const raw of ["0.1", "0.29", "0.857", "0.999", "1", "0", "-0.333", "12.345"]) {
      expect(fitsTargetDigits(Number(raw))).toBe(true);
    }
    expect(fitsTargetDigits(0.0001)).toBe(false);
    expect(fitsTargetDigits(1e-4)).toBe(false);
    expect(fitsTargetDigits(12.3456)).toBe(false);
  });

  it("범위 오류가 먼저다", () => {
    expect(targetValueError("M1", "1.2345")).toBe("이 지표의 목표값은 0과 1 사이여야 합니다.");
  });

  it("범위가 넓은 지표(M23)도 같은 자릿수", () => {
    expect(targetValueError("M23", "1.5")).toBeNull();
    expect(targetValueError("M23", "1.5001")).not.toBeNull();
  });
});
