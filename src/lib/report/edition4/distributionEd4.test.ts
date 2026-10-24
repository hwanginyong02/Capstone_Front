/**
 * 판 4 의 4.5 데이터 분포(S3 ⑥, 대응표 28) — 분포·불균형 비율 문장(예시본 4.5), 학습·평가 비율 표(평가 − 학습, %p), 학습
 * 분포가 없을 때의 표지(부록 B16), 학습 분포에 없는 클래스 칸 "—". 표 값은 사실 시트 자르기 전 값.
 */
import { describe, expect, it } from "vitest";

import { distributionShift } from "../narrativeFacts";
import type { ReportComposerInput } from "../reportMaterials";
import { buildDistributionEd4, evaluationMinusTrainingText, imbalanceRatioTextEd4 } from "./distributionEd4";

function composer(training?: Record<string, string>): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
    metrics: {},
    perspective: {},
    trainingData: training
      ? { trainingClassVolume: { entries: Object.entries(training).map(([key, value]) => ({ key, value })) } }
      : {},
    testData: {},
    groundTruth: {},
    modelEnv: {},
  } as ReportComposerInput;
}

const BC_EVAL = { benign: 107, malignant: 64 };
const BC_TRAIN = composer({ malignant: "148", benign: "250" });

function build(c: ReportComposerInput, evaluation: Record<string, number>, over: Partial<Parameters<typeof buildDistributionEd4>[0]> = {}) {
  const shift = distributionShift(c, evaluation, true);
  return buildDistributionEd4({
    taskType: "binary",
    classDistribution: evaluation,
    nSamples: Object.values(evaluation).reduce((a, b) => a + b, 0),
    imbalanceRatio: 1.671875,
    imbalanceEffect: { level: "no_distortion" } as never,
    facts: { distribution_shift_status: shift.status, distribution_shift: shift.rows },
    composer: c,
    ...over,
  });
}

describe("4.5 — RPT-2026-0001 예시본 그대로", () => {
  it("분포 문장·불균형 비율 문장·비율 표", () => {
    expect(build(BC_TRAIN, BC_EVAL)).toEqual({
      distributionSentence: "평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 benign 107건(62.6%), malignant 64건(37.4%)이다.",
      imbalanceRatioText: "1.672",
      imbalanceSentence: "클래스 불균형 비율(Imbalance Ratio)은 1.672이다.",
      training: {
        status: "compared",
        rows: [
          {
            label: "benign",
            trainingRatio: 0.628140704,
            evaluationRatio: 0.625730994,
            evaluationMinusTraining: -0.00240971,
            trainingText: "62.8%",
            evaluationText: "62.6%",
            differenceText: "−0.2%p",
          },
          {
            label: "malignant",
            trainingRatio: 0.371859296,
            evaluationRatio: 0.374269006,
            evaluationMinusTraining: 0.00240971,
            trainingText: "37.2%",
            evaluationText: "37.4%",
            differenceText: "+0.2%p",
          },
        ],
      },
    });
  });

  it("차이는 평가 − 학습 — 사실 시트 판 4 칸과 같은 글자를 %p 로 옮긴 것", () => {
    const rows = distributionShift(BC_TRAIN, BC_EVAL, true).rows;
    expect(rows.map((r) => r.evaluation_minus_training_text)).toEqual(["-0.002", "0.002"]);
    expect(rows.map(evaluationMinusTrainingText)).toEqual(["-0.002", "0.002"]);
  });
});

describe("4.5 — 갈래", () => {
  it("학습 분포가 없으면 표 대신 부록 B16 표지(not_provided, 줄 없음)", () => {
    expect(build(composer(), BC_EVAL).training).toEqual({ status: "not_provided", rows: [] });
  });

  it("학습 분포에 없는 평가 클래스가 있으면 그 클래스의 학습·차이 칸은 null('—'), 나머지는 비교", () => {
    const t = build(composer({ a: "60", b: "40" }), { a: 50, b: 30, c: 20 }).training;
    expect(t.status).toBe("uncovered");
    expect(t.rows).toEqual([
      { label: "a", trainingRatio: 0.6, evaluationRatio: 0.5, evaluationMinusTraining: -0.1, trainingText: "60.0%", evaluationText: "50.0%", differenceText: "−10.0%p" },
      { label: "b", trainingRatio: 0.4, evaluationRatio: 0.3, evaluationMinusTraining: -0.1, trainingText: "40.0%", evaluationText: "30.0%", differenceText: "−10.0%p" },
      { label: "c", trainingRatio: null, evaluationRatio: 0.2, evaluationMinusTraining: null, trainingText: null, evaluationText: "20.0%", differenceText: null },
    ]);
  });

  it("표는 자르기 전 값 — 클래스가 많아도 줄을 줄이지 않는다", () => {
    const labels = Array.from({ length: 300 }, (_, i) => `c${i}`);
    const evaluation = Object.fromEntries(labels.map((l) => [l, 10]));
    const t = build(composer(Object.fromEntries(labels.map((l) => [l, "10"]))), evaluation, { imbalanceRatio: 1, imbalanceEffect: null });
    expect(t.training.rows.length).toBe(300);
  });

  it("멀티레이블 백분율의 분모는 표본 수(판 3 3절과 같음)", () => {
    const d = build(composer(), { x: 30, y: 15 }, { taskType: "multilabel", nSamples: 40, imbalanceRatio: 2, imbalanceEffect: null });
    expect(d.distributionSentence).toBe("평가 데이터셋은 총 40건이며, 클래스(레이블)별 분포는 x 30건(75.0%), y 15건(37.5%)이다.");
  });

  it("분포가 없거나 불균형 비율이 정의되지 않으면 그 문장은 null", () => {
    const d = build(composer(), {}, { imbalanceRatio: null, nSamples: 0 });
    expect([d.distributionSentence, d.imbalanceRatioText, d.imbalanceSentence]).toEqual([null, null, null]);
  });
});

describe("불균형 비율 표기(판 4) — M23 원값 셋째 자리, 엔진 판정과 어긋나 보이면 늘림", () => {
  it("1.671875 → 1.672, 판정 없으면 셋째 자리", () => {
    expect(imbalanceRatioTextEd4(1.671875, { level: "no_distortion" })).toBe("1.672");
    expect(imbalanceRatioTextEd4(1.671875, null)).toBe("1.672");
  });

  it("경미(1.5 미만)인데 셋째 자리가 1.500 이면 늘린다 — 1.49996 → '1.49996'", () => {
    expect(imbalanceRatioTextEd4(1.49996, { level: "mild" })).toBe("1.49996");
    expect(imbalanceRatioTextEd4(1.49996, null)).toBe("1.500");
  });
});
