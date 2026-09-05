/**
 * ISSUES.md E-12 — 단계 진입 가드.
 *
 * 이 가드는 E-01(persist) 이후에야 성립한다. 종전에는 새로고침마다 completedSteps 가
 * 비어서, 가드를 켜면 정상 사용자도 1단계로 튕겼다.
 */
import { describe, expect, it } from "vitest";

import { canEnterStep, resumeStep } from "./stepAccess";

describe("단계 진입 가드", () => {
  it("[E-12] 1단계는 언제나 들어갈 수 있다", () => {
    expect(canEnterStep(1, [])).toBe(true);
  });

  it("[E-12] 선행 단계를 마치지 않았으면 막는다 — URL 직접 진입 차단", () => {
    expect(canEnterStep(5, [])).toBe(false);
    expect(canEnterStep(6, [1, 2, 3])).toBe(false);
  });

  it("[E-12] 바로 앞 단계를 마쳤으면 들어갈 수 있다", () => {
    expect(canEnterStep(2, [1])).toBe(true);
    expect(canEnterStep(5, [1, 2, 3, 4])).toBe(true);
  });

  it("[E-12] 이미 마친 단계는 다시 볼 수 있다 — 뒤로 가서 수정하는 정상 동선", () => {
    expect(canEnterStep(2, [1, 2, 3, 4])).toBe(true);
    expect(canEnterStep(4, [1, 2, 3, 4])).toBe(true);
  });

  it("[E-12] 과거 평가 편집(1~3 완료) 후 4단계로 이어갈 수 있다", () => {
    // loadWorkflowSnapshot 은 파일이 없으므로 [1,2,3] 까지만 완료로 둔다(E-09).
    expect(canEnterStep(4, [1, 2, 3])).toBe(true);
    expect(canEnterStep(5, [1, 2, 3])).toBe(false);
  });

  it("[E-12] 시연 모드(1~4 완료)에서 5단계로 이어갈 수 있다", () => {
    expect(canEnterStep(5, [1, 2, 3, 4])).toBe(true);
  });
});

describe("이어서 할 단계", () => {
  it("아무것도 안 했으면 1단계", () => {
    expect(resumeStep([])).toBe(1);
  });

  it("마친 것 다음 단계로 보낸다", () => {
    expect(resumeStep([1])).toBe(2);
    expect(resumeStep([1, 2, 3])).toBe(4);
  });

  it("순서가 뒤섞여 있어도 가장 뒤를 기준으로 한다", () => {
    expect(resumeStep([3, 1, 2])).toBe(4);
  });
});
