/**
 * 판 4 사실 시트(S3 ⑦, 공통 계약 `fact_sheet_contract_ed4.json`) — 지표 줄·불균형 표시값·facts 의 판 4 표기, 판 4 전용 키,
 * 판 3 사실 시트에는 판 4 키가 하나도 없음, 미리 자르기가 판 4 키 때문에 facts 를 통째로 잃지 않음, 평가 응답 최상위 판 4 칸.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ClassReportTable, KpiResult } from "../../../types/finalReport.types";
import { buildFactSheet, type BuildFactSheetInput } from "../buildFactSheet";
import { factsLength, fitFactSheet } from "../factSheetFit";
import { MAX_FACTS_CHARS } from "../factSheetLimits";
import {
  averageGap,
  buildNarrativeFacts,
  declaredRiskErrors,
  distributionShift,
  lowSupportClasses,
  precisionRecallGap,
  weakestClass,
} from "../narrativeFacts";
import { parseImbalanceEffect } from "../problemList";
import type { ReportComposerInput } from "../reportMaterials";
import {
  imbalanceEffectEd4,
  metricFieldsEd4,
  parseEngineVersion,
  parseImbalanceRawEd4,
  parseSourceFile,
} from "./factSheetEd4";

const NEW = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/bc_strong.evaluate.json"), "utf8"));
const YEAST = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/yeast_strong.evaluate.json"), "utf8"));

function kpi(over: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.98, threshold: 0.95, status: "pass", higherIsBetter: true, ...over };
}

describe("지표 줄 판 4 칸", () => {
  const m1 = kpi({
    value: 0.9824561403508771,
    ci: { low: 0.9497, high: 0.994, method: "wilson", level: 0.95 } as never,
    ciRaw: { low: 0.9496962348678732, high: 0.9940158635836336 },
    judgmentMargin: "small",
  });

  it("bc_strong M1 — 경계 표기 0.9497·0.994, 포함, 판정 여유 작음, 마진 0.032", () => {
    expect(metricFieldsEd4(m1, 0.03245614)).toEqual({
      near_target: true,
      margin_text: "0.032",
      ci_contains_target: true,
      ci_low_text: "0.9497",
      ci_high_text: "0.994",
    });
  });

  it("near_target 은 저장된 판정 여유만 — 3% 근소(판 3 뜻)가 참이어도 저장값이 충분이면 false", () => {
    const near3 = kpi({ value: 0.951, judgmentMargin: "ample" });
    expect(metricFieldsEd4(near3, 0.001).near_target).toBe(false);
    expect(metricFieldsEd4(kpi({ value: 0.99, judgmentMargin: "small" }), 0.04).near_target).toBe(true);
  });

  it("포함 여부는 반올림 전 경계로 — 넷째 자리 경계가 목표와 같아 보여도 원값이 위면 포함 아님", () => {
    const r = kpi({
      ci: { low: 0.95, high: 0.99, method: "wilson", level: 0.95 } as never,
      ciRaw: { low: 0.95004, high: 0.99 },
      judgmentMargin: "ample",
    });
    expect(metricFieldsEd4(r, 0.03)).toMatchObject({ ci_contains_target: false, ci_low_text: "0.95004" });
    // 원값이 없으면(옛 응답) 넷째 자리 경계로.
    const { ciRaw: _drop, ...old } = r;
    expect(metricFieldsEd4(old, 0.03)).toMatchObject({ ci_contains_target: true, ci_low_text: "0.950" });
  });

  it("판정 대상이 아니거나 구간이 없으면 경계·포함 null(키는 있음)", () => {
    expect(metricFieldsEd4(kpi({ threshold: null }), null)).toEqual({
      near_target: false,
      margin_text: null,
      ci_contains_target: null,
      ci_low_text: null,
      ci_high_text: null,
    });
    expect(metricFieldsEd4(kpi({ judgmentMargin: "ample" }), 0.03).ci_low_text).toBeNull();
  });

  it("미달 지표의 마진 표기는 판정 쪽 — −0.00004 는 '-0.00004'(0 으로 찍혀 충족처럼 읽히지 않게)", () => {
    expect(metricFieldsEd4(kpi({ value: 0.94996, status: "fail", judgmentMargin: "small" }), -0.00004).margin_text).toBe("-0.00004");
  });
});

describe("불균형 영향 판 4 표시값 — 칸 집합은 판 3 과 같고 글자만 판 4", () => {
  it("bc_strong — 계약 값", () => {
    const sm = NEW.results.success_metrics;
    const ed3 = parseImbalanceEffect(sm.imbalance_effect)!;
    const ed4 = imbalanceEffectEd4(ed3, parseImbalanceRawEd4(sm.imbalance_effect, ed3));
    expect(ed4.display).toEqual({
      imbalance_ratio: "1.672",
      accuracy_minus_macro_f1: "0.001",
      majority_minus_minority_f1: "0.009",
      accuracy: "0.982",
      macro_f1: "0.981",
      majority_f1: "0.986",
      minority_f1: "0.977",
    });
    expect(Object.keys(ed4)).toEqual(Object.keys(ed3));
    expect(Object.keys(ed4.display!)).toEqual(Object.keys(ed3.display!));
    // 숫자 칸은 엔진 값 그대로(판 4 글은 display 만 쓴다).
    expect(ed4.imbalance_ratio).toBe(1.6719);
  });

  it("멀티레이블 — 정확도 갈래는 null 그대로, 없는 칸은 없는 그대로", () => {
    const sm = YEAST.results.success_metrics;
    const ed3 = parseImbalanceEffect(sm.imbalance_effect)!;
    const ed4 = imbalanceEffectEd4(ed3, parseImbalanceRawEd4(sm.imbalance_effect, ed3));
    expect(ed4.display).toEqual({
      imbalance_ratio: "52.923",
      accuracy_minus_macro_f1: null,
      majority_minus_minority_f1: "0.702",
      majority_f1: "0.835",
      minority_f1: "0.133",
    });
    expect(Object.keys(ed4.display!)).toEqual(Object.keys(ed3.display!));
  });

  it("원값이 없는 옛 응답이면 넷째 자리 값에서 판 4 표기로", () => {
    const old = { level: "no_distortion", imbalance_ratio: 1.6719, accuracy_minus_macro_f1: 0.0011, majority_minus_minority_f1: 0.0092, majority_class: "a", minority_class: "b", display: { imbalance_ratio: "1.6719", accuracy_minus_macro_f1: "0.0011", majority_minus_minority_f1: "0.0092" } };
    const ed3 = parseImbalanceEffect(old)!;
    expect(imbalanceEffectEd4(ed3, parseImbalanceRawEd4(old, ed3)).display).toEqual({
      imbalance_ratio: "1.672",
      accuracy_minus_macro_f1: "0.001",
      majority_minus_minority_f1: "0.009",
    });
  });
});

describe("facts 의 판 4 표기(계약 edition4_notation)", () => {
  const table: ClassReportTable = {
    rows: [
      { label: "benign", precision: 0.9905660377358491, recall: 0.9813084112149533, f1: 0.9859154929577465, support: 107 },
      { label: "malignant", precision: 0.9692307692307692, recall: 0.984375, f1: 0.9767441860465116, support: 64 },
    ],
    averages: [{ label: "매크로 평균", precision: 0.98, recall: 0.98, f1: 0.981329839502129, support: 171 }],
  } as ClassReportTable;

  it("bc_strong — 최약 클래스 0.374·0.005, P−R -0.015, 위험 쪽 몫 0.333(판 3 은 0.3743·0.0046·-0.0151·0.3333)", () => {
    expect([weakestClass(table, true)!.share_text, weakestClass(table, true)!.gap_text]).toEqual(["0.374", "0.005"]);
    expect([weakestClass(table)!.share_text, weakestClass(table)!.gap_text]).toEqual(["0.3743", "0.0046"]);
    expect(precisionRecallGap(table, "malignant", true)!.difference_text).toBe("-0.015");
    expect(precisionRecallGap(table, "malignant")!.difference_text).toBe("-0.0151");
    const counts = { kind: "binary", rows: [{ label: "malignant", tp: 63, fp: 2, fn: 1, tn: 105 }] } as never;
    expect(declaredRiskErrors("fn", counts, true)!.share_text).toBe("0.333");
    expect(declaredRiskErrors("fn", counts)!.share_text).toBe("0.3333");
  });

  it("작은 표본 몫·평균 차이도 판 4 표기", () => {
    const small: ClassReportTable = {
      rows: [
        { label: "a", precision: 1, recall: 1, f1: 0.9, support: 970 },
        { label: "b", precision: 1, recall: 1, f1: 0.5, support: 30 },
      ],
      averages: [
        { label: "매크로 평균", precision: 1, recall: 1, f1: 0.7, support: 1000 },
        { label: "가중 평균", precision: 1, recall: 1, f1: 0.888, support: 1000 },
      ],
    } as ClassReportTable;
    expect(lowSupportClasses(small, true)).toEqual([{ label: "b", support: 30, share: 0.03, share_text: "0.030" }]);
    expect(lowSupportClasses(small)[0].share_text).toBe("0.03");
    expect(averageGap("multiclass", small, true)!.difference_text).toBe("0.188");
  });

  it("분포 차 — difference_text(학습 − 평가)도 판 4 표기, 판 4 전용 칸(평가 − 학습)은 판 4 에만", () => {
    const c = {
      cards: { trainingData: true },
      trainingData: { trainingClassVolume: { entries: [{ key: "malignant", value: "148" }, { key: "benign", value: "250" }] } },
    } as unknown as ReportComposerInput;
    const four = distributionShift(c, { benign: 107, malignant: 64 }, true).rows;
    expect(four.map((r) => [r.label, r.difference_text, r.evaluation_minus_training_text])).toEqual([
      ["benign", "0.002", "-0.002"],
      ["malignant", "-0.002", "0.002"],
    ]);
    const three = distributionShift(c, { benign: 107, malignant: 64 }).rows;
    expect(three.length).toBe(2);
    for (const r of three) expect(r).not.toHaveProperty("evaluation_minus_training_text");
    expect(three.map((r) => r.difference_text)).toEqual(["0.0024", "-0.0024"]);
  });
});

/**
 * 판 4 사실 시트 한 장 — 클래스가 많은 다중 분류(분포 차 줄이 facts 상한을 넘게). 앞 두 클래스는 학습 몫이 커서 분포 차가
 * 기준(0.1) 이상이다 — 자르기 첫 단계(기준 이상 줄만 남김)에서 남는 줄.
 */
function manyClassSheet(edition4: boolean, n: number) {
  const labels = Array.from({ length: n }, (_, i) => `class_${String(i).padStart(4, "0")}`);
  const training = labels.map((l, i) => ({ key: l, value: String(i < 2 ? 100 * n : 100 + (i % 7)) }));
  const evaluation = Object.fromEntries(labels.map((l, i) => [l, 50 + (i % 5)]));
  const composer = {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
    metrics: {},
    perspective: {},
    trainingData: { trainingClassVolume: { entries: training } },
    testData: {},
    groundTruth: {},
    modelEnv: {},
  } as unknown as ReportComposerInput;
  const kpiResults = [kpi({ judgmentMargin: "ample" })];
  const facts = buildNarrativeFacts({
    taskType: "multiclass",
    kpiResults,
    coreMetricIds: ["M1"],
    coreMetricsSource: "default",
    classTable: null,
    confusion: null,
    confusionCounts: null,
    positiveClass: null,
    reportPurpose: undefined,
    composer,
    evaluationDistribution: evaluation,
    confidenceIntervals: null,
    fixedSentences: [],
    nSamples: Object.values(evaluation).reduce((a, b) => a + b, 0),
    edition4,
  });
  const input: BuildFactSheetInput = {
    kpiResults,
    confusionMatrix: null,
    classDistribution: evaluation,
    nSamples: 100,
    droppedRows: 0,
    verdict: "PASS",
    score: 100,
    classTable: null,
    facts,
    ...(edition4 ? { edition4: { thresholdGainRaw: null, imbalanceRaw: null } } : {}),
  };
  return { raw: facts, fitted: fitFactSheet(buildFactSheet(input)) };
}

describe("미리 자르기 — 판 4 키가 들어가도 facts 를 통째로 잃지 않는다(백엔드 상한 초과면 facts 를 버린다)", () => {
  it("클래스 600개: 자르기 전 facts 는 상한을 넘고, 자른 뒤에는 상한 안이며 남은 분포 차 줄은 판 4 칸을 가진다", () => {
    const { raw, fitted } = manyClassSheet(true, 600);
    expect(raw.distribution_shift.length).toBe(600);
    expect(factsLength(raw)).toBeGreaterThan(MAX_FACTS_CHARS);
    expect(fitted.facts).toBeDefined();
    expect(factsLength(fitted.facts!)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
    expect(fitted.facts!.fixed_sentences).toEqual([]);
    // 기준 이상인 두 줄이 남고, 그 줄에 판 4 칸이 있다(평가 − 학습 — 학습 몫이 커서 음수). 뺀 줄 수는 omitted 에.
    const kept = fitted.facts!.distribution_shift;
    expect(kept.map((r) => r.label)).toEqual(["class_0000", "class_0001"]);
    for (const r of kept) {
      expect(r.flagged).toBe(true);
      expect(r.evaluation_minus_training_text).toMatch(/^-0\.\d{3,}$/);
    }
    expect(fitted.facts!.omitted.distribution_shift).toBe(598);
  });

  it("판 4 칸 때문에 판 3 보다 더 길어지지만 같은 상한 안으로 들어간다(줄 수 차이는 그 칸만큼)", () => {
    const four = manyClassSheet(true, 200);
    const three = manyClassSheet(false, 200);
    expect(factsLength(four.raw)).toBeGreaterThan(factsLength(three.raw));
    expect(factsLength(four.fitted.facts!)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
    expect(factsLength(three.fitted.facts!)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
  });
});

describe("판 3 사실 시트에는 판 4 키가 없다(기본값 = 판 3)", () => {
  it("지표 줄·분포 차 줄·f1_threshold_gain", () => {
    const { fitted } = manyClassSheet(false, 3);
    for (const m of fitted.metrics) {
      expect(m).not.toHaveProperty("ci_low_text");
      expect(m).not.toHaveProperty("ci_high_text");
    }
    expect(fitted.facts!.distribution_shift.length).toBe(3);
    for (const r of fitted.facts!.distribution_shift) expect(r).not.toHaveProperty("evaluation_minus_training_text");
  });
});

describe("평가 응답 최상위 판 4 칸", () => {
  it("파일 해시·크기 — 소문자 64자와 정수만", () => {
    expect(parseSourceFile(NEW.source_file)).toEqual({
      sha256: "4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d",
      sizeBytes: 3727,
    });
    expect(parseSourceFile(undefined)).toBeNull();
    expect(parseSourceFile({ sha256: NEW.source_file.sha256.toUpperCase(), size_bytes: 3727 })).toBeNull();
    expect(parseSourceFile({ sha256: NEW.source_file.sha256.slice(1), size_bytes: 3727 })).toBeNull();
    expect(parseSourceFile({ sha256: NEW.source_file.sha256, size_bytes: 3727.5 })).toBeNull();
  });

  it("평가 엔진 버전 — 문자열만", () => {
    expect(parseEngineVersion(NEW.engine_version)).toBe("1.0.0");
    expect(parseEngineVersion(undefined)).toBeNull();
    expect(parseEngineVersion("")).toBeNull();
    expect(parseEngineVersion(1)).toBeNull();
  });
});
