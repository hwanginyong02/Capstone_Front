import { describe, expect, it } from "vitest";

import { assembleEvaluatedReport, type EvaluatedReportInputs } from "./assembleEvaluatedReport";
import { mapWorkflowToFinalReport } from "./mapWorkflowToFinalReport";
import { SAME_SOURCE_SENTENCE } from "./dataCautionPhrases";
import type { ReportComposerInput } from "./reportMaterials";
import { DEFAULT_BASIC_INFO, type MetricDetailStateMap } from "../../types/workflow.types";

/**
 * 평가 응답 → stage1 성적서·AI 사실 시트 조립(훅 `useReportData` 에서 떼어 낸 순수 함수).
 *
 * 새 선택 키(신뢰구간·아슬아슬·경계/확신 오류·문제 목록·고정 문구 12·11a)를 **저장하는 줄**과
 * **사실 시트에 싣는 줄**이 따로 있다. 줄 하나가 빠지면 이 파일이 실패해야 한다.
 */

/**
 * 백엔드 골든 `tests/golden/evaluate_binary_csv.json` 을 줄인 것 — 곡선 좌표만 3점으로 줄이고
 * 나머지 키·값 모양은 그대로다(2026-10-18 기준).
 */
const GOLDEN_BINARY = {
  class_distribution: { "0": 105, "1": 95 },
  dropped_rows: 0,
  environment: { evaluated_at: "2026-10-18T00:00:00Z", libraries: { "scikit-learn": "1.5.2" } },
  n_samples: 200,
  warnings: [],
  results: {
    failed_metrics: {},
    success_metrics: {
      M1: 0.505,
      M4: 0.5123152709359606,
      M9: 0.5111779448621554,
      M21: { labels: ["0", "1"], matrix: [[49, 56], [43, 52]], type: "multiclass_or_binary" },
      M22: {
        "0": { "f1-score": 0.49746192893401014, precision: 0.532608695652174, recall: 0.4666666666666667, support: 105.0 },
        "1": { "f1-score": 0.5123152709359606, precision: 0.48148148148148145, recall: 0.5473684210526316, support: 95.0 },
        accuracy: 0.505,
        "macro avg": { "f1-score": 0.5048885999349854, precision: 0.5070450885668277, recall: 0.5070175438596491, support: 200.0 },
        "weighted avg": { "f1-score": 0.5045172663849367, precision: 0.508323268921095, recall: 0.505, support: 200.0 },
      },
      M23: 1.105263157894737,
      confidence_intervals: {
        M1: { high: 0.5735, level: 0.95, low: 0.4363, method: "wilson" },
        M4: { high: 0.5909, level: 0.95, low: 0.4271, method: "bootstrap_multinomial", n_resamples: 2000, seed: 4213 },
        M9: { high: 0.5923, level: 0.95, low: 0.4329, method: "bootstrap", n_resamples: 2000, seed: 4213 },
        M23: { high: 1.439, level: 0.95, low: 1.0, method: "bootstrap_multinomial", n_resamples: 2000, seed: 4213 },
      },
      confusion_counts: { fn: 43, fp: 56, positive_class: "1", tn: 49, tp: 52, type: "binary" },
      error_ratios: {
        boundary: null,
        boundary_margin: 0.1,
        boundary_note: "threshold_unknown",
        confident: { count: 31, ratio: 0.3131 },
        confident_level: 0.9,
        misclassified: 99,
        threshold: null,
        unit: "sample",
      },
      f1_threshold_gain: { best_threshold: 0.03, current_f1: 0.5123, gain: 0.136, max_f1: 0.6483 },
      imbalance_effect: {
        accuracy_minus_macro_f1: 0.0001,
        imbalance_ratio: 1.1053,
        level: "mild",
        majority_class: "0",
        majority_minus_minority_f1: -0.0149,
        minority_class: "1",
      },
      roc_curve: { fpr: [0, 0.5, 1], tpr: [0, 0.5, 1] },
      pr_curve: { recall: [0, 0.5, 1], precision: [1, 0.5, 0.475] },
    },
  },
};

/** 새 키(신뢰구간·오류 비율·임계값 이득·불균형 영향)가 생기기 전 응답 모양. */
function oldShape() {
  const copy = structuredClone(GOLDEN_BINARY);
  const sm = copy.results.success_metrics as Record<string, unknown>;
  delete sm.confidence_intervals;
  delete sm.error_ratios;
  delete sm.f1_threshold_gain;
  delete sm.imbalance_effect;
  return copy;
}

function details(targets: Record<string, string>): MetricDetailStateMap {
  return Object.fromEntries(
    Object.entries(targets).map(([id, targetValue]) => [
      id,
      { id, name: id, description: "", targetValue, beta: "", positiveClass: "", completed: true },
    ]),
  );
}

/** 정답 라벨 "규칙·자동"(고정 문구 12·9절 정답 라벨 주의)과 출처 "같음"(고정 문구 11a). */
const COMPOSER: ReportComposerInput = {
  cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true } as ReportComposerInput["cards"],
  metrics: {},
  perspective: {},
  trainingData: {},
  testData: { testSourceRelation: { text: "Same source", unknown: false } },
  groundTruth: { labelAuthor: { text: "A program or rule", unknown: false } },
  modelEnv: {},
};

const SELECTED = ["M1", "M4", "M9", "M21", "M22"];

function inputs(overrides: Partial<EvaluatedReportInputs> = {}): EvaluatedReportInputs {
  return {
    taskType: "binary",
    selectedMetricIds: SELECTED,
    // M1 0.505 < 0.51 → 미달·근소, M4 0.5123 ≥ 0.5 → 충족·근소, M9 여유 있게 충족.
    metricDetails: details({ M1: "0.51", M4: "0.5", M9: "0.4" }),
    composerMetrics: {},
    columnMapping: [],
    metadata: { positive_class: "1", detected_classes: ["0", "1"], class_distribution: { "0": 105, "1": 95 } },
    composer: COMPOSER,
    ...overrides,
  };
}

function baseReport(composer: ReportComposerInput | undefined = COMPOSER) {
  return mapWorkflowToFinalReport({
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "binary",
    selectedMetricIds: SELECTED,
    metricDetails: {},
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
    composer,
  });
}

describe("새 키가 있는 응답(백엔드 골든 이진) — 성적서 저장과 사실 시트 양쪽에 싣는다", () => {
  const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport(), GOLDEN_BINARY, inputs());
  const m1 = stage1Report.kpiResults.find((r) => r.metricId === "M1")!;
  const sheetM1 = factSheet.metrics.find((m) => m.metric_id === "M1")!;

  it("판정 지표에 신뢰구간·margin·nearTarget 을 붙여 저장한다", () => {
    expect(m1.ci).toMatchObject({ low: 0.4363, high: 0.5735, method: "wilson" });
    expect(m1.margin).toBeCloseTo(-0.005, 4);
    expect(m1.nearTarget).toBe(true);
    // 정보성 지표(M21·M22)는 판정 대상이 아니라 구간·margin 이 없다.
    expect(stage1Report.kpiResults.every((r) => r.metricId !== "M22" || r.ci === undefined)).toBe(true);
  });

  it("6.0 방식 한 줄·8.3 근소 한 줄을 저장한다", () => {
    expect(stage1Report.confidenceIntervalNote).toEqual(expect.stringContaining("Wilson"));
    expect(stage1Report.nearTargetNote).toEqual(expect.stringContaining("Accuracy(M1)"));
  });

  it("경계·확신 오류 비율과 7.1 문장을 저장한다", () => {
    expect(stage1Report.errorRatios).toMatchObject({ misclassified: 99, confident: { count: 31, ratio: 0.3131 } });
    expect(stage1Report.errorRatioSentence).toEqual(expect.stringContaining("31"));
  });

  it("고정 문구 12(7.2)·11a(8.2)를 저장한다", () => {
    expect(stage1Report.labelCautionSentence).toEqual(expect.stringContaining("규칙·자동"));
    expect(stage1Report.sourceRelationSentence).toBe(SAME_SOURCE_SENTENCE);
  });

  it("9절 문제 목록을 저장한다 — 핵심 미달·임계값 조정 여지·정답 라벨 주의", () => {
    const kinds = stage1Report.problems!.map((p) => p.kind);
    expect(kinds).toContain("core_fail");
    expect(kinds).toContain("threshold_tuning");
    expect(kinds).toContain("label_caution");
    // 불균형 영향은 mild 라 문제가 아니다.
    expect(kinds).not.toContain("imbalance_effect");
  });

  it("3절 진단은 엔진의 불균형 판정(mild)을 따른다", () => {
    expect(stage1Report.datasetDiagnosis).toContain("1.11로");
    expect(stage1Report.datasetDiagnosis).toContain("균형 상태이다.");
  });

  it("사실 시트: 신뢰구간·margin·near_target", () => {
    expect(sheetM1).toMatchObject({ ci_low: 0.4363, ci_high: 0.5735, near_target: true });
    expect(sheetM1.margin).toBeCloseTo(-0.005, 4);
  });

  it("사실 시트: 오류 비율·임계값 이득·불균형 영향·방식 한 줄·문제 목록", () => {
    expect(factSheet.error_ratios).toMatchObject({ misclassified: 99, boundary_note: "threshold_unknown" });
    expect(factSheet.f1_threshold_gain).toEqual({ best_threshold: 0.03, current_f1: 0.5123, gain: 0.136, max_f1: 0.6483 });
    expect(factSheet.imbalance_effect).toMatchObject({ level: "mild", imbalance_ratio: 1.1053 });
    expect(factSheet.ci_method_note).toBe(stage1Report.confidenceIntervalNote);
    expect(factSheet.problems).toEqual(stage1Report.problems);
    expect(factSheet.problems.length).toBeGreaterThan(0);
  });

  it("평가 전처리 경고를 성적서 데이터로 나른다(ISSUES.md D-16)", () => {
    const withWarnings = { ...GOLDEN_BINARY, warnings: ["2개 행이 제외되었습니다"] };
    const assembled = assembleEvaluatedReport(baseReport(), withWarnings, inputs());
    expect(assembled.stage1Report.evaluationWarnings).toEqual(["2개 행이 제외되었습니다"]);
  });

  it("판정·표본 수는 응답 그대로다", () => {
    expect(stage1Report.conclusion.verdict).toBe(factSheet.verdict);
    expect(factSheet.n_samples).toBe(200);
    expect(stage1Report.datasetInfo.sampleCount).toBe(200);
  });
});

describe("옛 모양 응답(새 키 없음) — 선택 키를 두지 않는다", () => {
  // 목표값을 넉넉히 둬 근소 지표가 없고, 구성 카드 값도 없다.
  const { stage1Report, factSheet } = assembleEvaluatedReport(
    baseReport(undefined),
    oldShape(),
    inputs({ metricDetails: details({ M1: "0.3", M4: "0.3", M9: "0.3" }), composer: undefined }),
  );

  it("성적서에 선택 키가 하나도 없다", () => {
    for (const key of [
      "confidenceIntervalNote",
      "nearTargetNote",
      "labelCautionSentence",
      "sourceRelationSentence",
      "errorRatios",
      "errorRatioSentence",
    ]) {
      expect(stage1Report, key).not.toHaveProperty(key);
    }
    expect(stage1Report.kpiResults.every((r) => r.ci === undefined && r.nearTarget !== true)).toBe(true);
    expect(stage1Report.problems).toEqual([]);
  });

  it("사실 시트의 새 칸은 null(또는 빈 값)이다", () => {
    expect(factSheet.error_ratios).toBeNull();
    expect(factSheet.f1_threshold_gain).toBeNull();
    expect(factSheet.imbalance_effect).toBeNull();
    expect(factSheet.ci_method_note).toBeNull();
    expect(factSheet.problems).toEqual([]);
    expect(factSheet.metrics.every((m) => m.ci_low === null && m.ci_high === null && !m.near_target)).toBe(true);
  });

  it("3절 진단은 반올림 전 IR 로 판정한다(엔진 판정이 없을 때)", () => {
    expect(stage1Report.datasetDiagnosis).toContain("1.11로");
    expect(stage1Report.datasetDiagnosis).toContain("균형 상태이다.");
  });
});
