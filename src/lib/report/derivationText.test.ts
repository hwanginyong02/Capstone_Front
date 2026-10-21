/** 고정 문구 9 의 조사 — 판 3 은 임계값 숫자를 읽는 소리로 을/를, 판 2 보관본은 발급 당시처럼 늘 "를". */
import { describe, expect, it } from "vitest";

import type { DerivedPredictionFact } from "../../types/finalReport.types";
import { derivationStatement } from "./derivationText";

const fact = (threshold: number): DerivedPredictionFact => ({
  method: "threshold",
  threshold,
  source_columns: ["score"],
  target_role: "y_pred",
});

describe("고정 문구 9 — 결정 임계값 {t}을/를", () => {
  it.each([
    [0.5, "0.5를"],
    [0.35, "0.35를"],
    [0.3, "0.3을"],
    [0.7, "0.7을"],
    [0.8, "0.8을"],
    [0.6, "0.6을"],
  ])("판 3(기본): %s → %s", (t, phrase) => {
    expect(derivationStatement(fact(t))).toBe(`본 평가의 예측값은 제출된 확률값에 결정 임계값 ${phrase} 적용하여 산출하였다.`);
  });

  it.each([0.5, 0.3, 0.7])("판 2(legacyParticle): %s 뒤는 늘 '를'", (t) => {
    expect(derivationStatement(fact(t), { legacyParticle: true })).toBe(
      `본 평가의 예측값은 제출된 확률값에 결정 임계값 ${t}를 적용하여 산출하였다.`,
    );
  });

  it("argmax·레이블별 임계값 문장은 조사와 무관하게 그대로", () => {
    const argmax = { method: "argmax", threshold: null, source_columns: ["a"], target_role: "y_pred" } as DerivedPredictionFact;
    expect(derivationStatement(argmax)).toBe(derivationStatement(argmax, { legacyParticle: true }));
  });
});
