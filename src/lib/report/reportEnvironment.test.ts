import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEvalEnvironment } from "./reportEnvironment";
import { DEFAULT_EVAL_ENV_CONSTANTS } from "./reportConstants";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

/**
 * ISSUES.md F-08 · F-09 (2026-09-07 ★확정된 제품 결정 4 — 앞으로 것만 정정).
 */

describe("F-09 — 평가 도구·일시는 서버 실측값을 쓴다", () => {
  it("백엔드가 준 라이브러리 버전을 그대로 인쇄한다", () => {
    const env = buildEvalEnvironment({
      libraries: { python: "3.12.4", "scikit-learn": "1.5.1", pandas: "2.2.2", numpy: "1.26.4" },
      evaluated_at: "2026-09-07T12:34:56+09:00",
    });

    expect(env.tools).toContain("scikit-learn 1.5.1");
    expect(env.tools).toContain("Python 3.12.4");
  });

  it("평가 일시도 실측값이다", () => {
    const env = buildEvalEnvironment({
      libraries: {},
      evaluated_at: "2026-09-07T12:34:56+09:00",
    });

    expect(env.evaluatedAt).toBe("2026-09-07T12:34:56+09:00");
  });

  it("구 스냅샷(환경 정보 없음)은 종전 상수로 폴백한다", () => {
    // 결정 4 — 이미 발급된 성적서의 표시를 바꾸지 않는다.
    const env = buildEvalEnvironment(undefined);

    expect(env.tools).toEqual(DEFAULT_EVAL_ENV_CONSTANTS.tools);
    expect(env.evaluatedAt).toBeUndefined();
  });

  it("버전 목록이 비어 있으면 상수로 폴백한다(빈 표를 인쇄하지 않는다)", () => {
    const env = buildEvalEnvironment({ libraries: {}, evaluated_at: "x" });

    expect(env.tools).toEqual(DEFAULT_EVAL_ENV_CONSTANTS.tools);
  });
});

describe("F-08 — '평가 엔진 버전' 자리에 사용자 모델 버전이 인쇄되던 문제", () => {
  it.each([
    "components/report/sections/EvalEnvSection.tsx",
    "components/report/sections/SignatureSection.tsx",
  ])("%s 가 evalScope.version 을 '평가 엔진 버전'이라 부르지 않는다", (path) => {
    const source = read(path);
    const engineLabelLine = source
      .split("\n")
      .find((line) => line.includes("평가 엔진 버전"));

    if (engineLabelLine) {
      expect(engineLabelLine).not.toContain("evalScope.version");
    }
  });

  it("사용자가 입력한 모델 버전은 성적서에서 사라지지 않는다", () => {
    // 라벨만 바로잡는다 — 값을 지우면 필수 입력받은 모델 버전이 어디에도 인쇄되지 않는다.
    const source = read("components/report/sections/EvalEnvSection.tsx");
    expect(source).toContain("대상 모델 버전");
    expect(source).toContain("evalScope.version");
  });
});
