/**
 * ISSUES.md E-04 — 검증 실패·미수행이 '오류 0건'으로 해석되어 진행이 허용되던 문제.
 *
 * 종전 판정: `nextDisabled={(validationData?.error_count ?? 0) > 0 || isLoading}`
 *  - validationData === null(검증 미수행/실패) → `?? 0` 에 흡수되어 통과
 *  - 훅이 반환한 error 는 게이트에 아예 쓰이지 않음
 */
import { describe, expect, it } from "vitest";

import {
  canRunEvaluation,
  describeValidationGate,
  getValidationGateReason,
} from "./validationGate";

const OK = { validationData: { error_count: 0 }, isLoading: false, error: null };

describe("평가 실행 게이트", () => {
  it("[E-04] 검증이 성공하고 오류가 0건이면 진행할 수 있다", () => {
    expect(canRunEvaluation(OK)).toBe(true);
    expect(getValidationGateReason(OK)).toBe("ok");
  });

  it("[E-04] 검증이 수행되지 않았으면(null) 진행을 막는다 — '오류 0건'으로 읽지 않는다", () => {
    const input = { ...OK, validationData: null };
    expect(getValidationGateReason(input)).toBe("not_run");
    expect(canRunEvaluation(input)).toBe(false);
  });

  it("[E-04] 검증 요청이 실패했으면 진행을 막는다", () => {
    const input = { ...OK, validationData: null, error: "Failed to fetch" };
    expect(getValidationGateReason(input)).toBe("failed");
    expect(canRunEvaluation(input)).toBe(false);
  });

  it("[E-04] 서버가 응답했더라도 error 상태면 진행을 막는다", () => {
    // rawFile 이 살아 있어 응답은 받았지만 후속 처리에서 실패한 경우.
    const input = { ...OK, error: "예상치 못한 응답 형식" };
    expect(getValidationGateReason(input)).toBe("failed");
    expect(canRunEvaluation(input)).toBe(false);
  });

  it("[E-04] 차단 오류가 있으면 진행을 막는다(기존 동작 보존)", () => {
    const input = { ...OK, validationData: { error_count: 3 } };
    expect(getValidationGateReason(input)).toBe("blocking_errors");
    expect(canRunEvaluation(input)).toBe(false);
  });

  it("[E-04] 로딩 중에는 아직 판단하지 않고 막는다(기존 동작 보존)", () => {
    const input = { ...OK, isLoading: true };
    expect(getValidationGateReason(input)).toBe("loading");
    expect(canRunEvaluation(input)).toBe(false);
  });

  it("[E-04] error_count 필드가 없는 응답도 통과시킨다(하위호환)", () => {
    expect(canRunEvaluation({ ...OK, validationData: {} })).toBe(true);
  });

  it("차단 사유마다 안내 문장이 있고, 진행 가능/로딩 중에는 없다", () => {
    expect(describeValidationGate("failed")).toContain("검증에 실패");
    expect(describeValidationGate("not_run")).toContain("수행되지 않아");
    expect(describeValidationGate("blocking_errors")).toContain("오류가 발견");
    expect(describeValidationGate("ok")).toBeNull();
    expect(describeValidationGate("loading")).toBeNull();
  });
});
