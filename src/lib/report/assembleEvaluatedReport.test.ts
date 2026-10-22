import { describe, expect, it } from "vitest";

import { assembleEvaluatedReport, type EvaluatedReportInputs } from "./assembleEvaluatedReport";
import { mapWorkflowToFinalReport } from "./mapWorkflowToFinalReport";
import { DIFFERENT_SOURCE_SENTENCE, SAME_SOURCE_SENTENCE } from "./dataCautionPhrases";
import { derivationStatement } from "./derivationText";
import { fitNarrativePayload } from "./factSheetFit";
import { NO_PROBLEM_SENTENCE } from "./reportConstants";
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
    expect(stage1Report.datasetDiagnosis).toContain("허용 기준(1.50 미만) 이내이다.");
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

describe("3절 진단 — 엔진 판정(imbalance_effect)이 조립을 거쳐 3절까지 간다", () => {
  /** M23 과 imbalance_effect 를 바꾼 응답. 둘이 다르게 오면 3절은 엔진 판정을 따라야 한다. */
  function withImbalance(m23: number, level: "mild" | "affected", ratio: number) {
    const copy = structuredClone(GOLDEN_BINARY);
    copy.results.success_metrics.M23 = m23;
    copy.results.success_metrics.imbalance_effect = {
      ...copy.results.success_metrics.imbalance_effect,
      level,
      imbalance_ratio: ratio,
    };
    return assembleEvaluatedReport(baseReport(), copy, inputs()).stage1Report.datasetDiagnosis;
  }

  it("mild·IR 1.497 이면 '1.497로' 경미 문장이다(D20 세 갈래의 mild)", () => {
    const text = withImbalance(1.497, "mild", 1.497);
    expect(text).toContain("1.497로");
    expect(text).toContain("허용 기준(1.50 미만) 이내이다.");
  });

  it("M23(1.6)과 판정(mild, 1.497)이 다르면 판정을 따른다", () => {
    // 조립이 imbalanceEffect 를 넘기지 않으면 M23 1.6 으로 "1.60로 … 벗어나" 가 된다.
    const text = withImbalance(1.6, "mild", 1.497);
    expect(text).toContain("1.497로");
    expect(text).toContain("허용 기준(1.50 미만) 이내이다.");
  });

  it("다수·소수 클래스는 3절 클래스 레이블 설명으로 '이름(설명)' 이라 부른다(D37) — 조립이 설명을 넘긴다", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    copy.results.success_metrics.imbalance_effect = {
      ...copy.results.success_metrics.imbalance_effect,
      level: "affected",
      imbalance_ratio: 1.6,
      majority_minus_minority_f1: 0.2,
    };
    const base = baseReport();
    base.datasetInfo = { ...base.datasetInfo, classLabelDescriptions: [{ label: "0", description: "정상" }] };
    const text = assembleEvaluatedReport(base, copy, inputs()).stage1Report.datasetDiagnosis;
    expect(text).toContain("다수 클래스 '0(정상)'과 소수 클래스 '1'의 F1 차이가 0.2로 0.10 이상이어서");
  });

  it("M23(1.4)과 판정(affected, 1.6)이 다르면 판정을 따른다", () => {
    const text = withImbalance(1.4, "affected", 1.6);
    expect(text).toContain("1.60으로");
    expect(text).toContain("허용 기준(1.50 미만)을 벗어나며");
    expect(text).not.toContain("균형 상태");
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

  it("3절 진단은 반올림 전 IR 로 판정한다(엔진 판정이 없을 때 — 종전 두 갈래 문장)", () => {
    expect(stage1Report.datasetDiagnosis).toContain("1.11로");
    expect(stage1Report.datasetDiagnosis).toContain("허용 기준(< 1.50) 이내의 균형 상태이다.");
  });
});

describe("핵심 지표 출처 (W8)", () => {
  it("핵심 지표를 손대지 않았으면 default, 골랐으면 client 를 저장한다", () => {
    expect(assembleEvaluatedReport(baseReport(), GOLDEN_BINARY, inputs()).stage1Report.coreMetricsSource).toBe(
      "default",
    );
    expect(
      assembleEvaluatedReport(
        baseReport(),
        GOLDEN_BINARY,
        inputs({ composerMetrics: { coreMetrics: { choices: ["M1", "M4"] } } }),
      ).stage1Report.coreMetricsSource,
    ).toBe("client");
  });
});

/* ------------------------------------------------------------------ *
 * S4a — 사실 시트 facts 의 배선(검토·변이에서 이빨이 없던 줄들)
 * ------------------------------------------------------------------ */

describe("S4a 배선 — 옛 응답 대체, 새 칸 우선, 양성 클래스 출처", () => {
  it("새 칸이 없는 옛 응답(M21·M22 만)이면 그것으로 사실 시트 표·최약 클래스를 만든다", () => {
    const { factSheet } = assembleEvaluatedReport(baseReport(), GOLDEN_BINARY, inputs());
    expect(factSheet.per_class.map((r) => r.label)).toEqual(["0", "1"]);
    expect(factSheet.confusion?.labels).toEqual(["0", "1"]);
    expect(factSheet.class_averages.map((r) => r.label)).toContain("매크로 평균");
    expect(factSheet.facts?.weakest_class?.label).toBe("0");
  });

  it("새 칸과 M21 이 다르면 사실 시트는 새 칸, 6절 차트는 고른 M21 을 따른다", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    const sm = copy.results.success_metrics as Record<string, unknown>;
    sm.confusion_matrix = { type: "multiclass_or_binary", labels: ["0", "1"], matrix: [[60, 45], [40, 55]], n_samples: 200 };
    sm.class_report = {
      "0": { precision: 0.6, recall: 0.57, "f1-score": 0.58, support: 105 },
      "1": { precision: 0.55, recall: 0.58, "f1-score": 0.56, support: 95 },
      accuracy: 0.575,
      "macro avg": { precision: 0.57, recall: 0.57, "f1-score": 0.57, support: 200 },
      "weighted avg": { precision: 0.57, recall: 0.575, "f1-score": 0.57, support: 200 },
    };
    const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport(), copy, inputs());
    expect(factSheet.confusion?.matrix).toEqual([[60, 45], [40, 55]]);
    expect(factSheet.per_class.find((r) => r.label === "1")?.f1).toBe(0.56);
    expect(factSheet.facts?.weakest_class?.label).toBe("1");
    expect(stage1Report.charts.confusionMatrix?.matrix).toEqual((sm.M21 as { matrix: number[][] }).matrix);
    expect(stage1Report.classReport?.rows.find((r) => r.label === "1")?.f1).not.toBe(0.56);
  });

  it("양성 클래스는 엔진 confusion_counts 에서 — metadata 에 없어도", () => {
    const { factSheet } = assembleEvaluatedReport(
      baseReport(),
      GOLDEN_BINARY,
      inputs({ metadata: { detected_classes: ["0", "1"], class_distribution: { "0": 105, "1": 95 } } }),
    );
    expect(factSheet.facts?.positive_class).toBe("1");
    expect(factSheet.confusion?.positive_class).toBe("1");
    expect(factSheet.facts?.precision_recall_gap).not.toBeNull();
  });
});

describe("S4a 배선 — 7~9절 고정 문장 목록(9·17·12·11b·18 / 6)", () => {
  it("파생 예측·경계 오류·라벨 주의·다른 출처·근소 차이가 있으면 그 문장을 성적서에 저장한 문장 그대로 싣는다", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    const derived = { method: "threshold" as const, threshold: 0.5, source_columns: ["prob"], target_role: "y_pred" };
    (copy.results.success_metrics as Record<string, unknown>).derived_prediction = derived;
    const composer: ReportComposerInput = {
      ...COMPOSER,
      testData: { testSourceRelation: { text: "Different source", unknown: false } },
    };
    const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport(composer), copy, inputs({ composer }));
    expect(factSheet.facts?.fixed_sentences).toEqual([
      { id: "9", section: "7.1", text: derivationStatement(derived) },
      { id: "17", section: "7.1", text: stage1Report.errorRatioSentence },
      { id: "12", section: "7.2", text: stage1Report.labelCautionSentence },
      { id: "11b", section: "8.2", text: DIFFERENT_SOURCE_SENTENCE },
      { id: "18", section: "8.3", text: stage1Report.nearTargetNote },
    ]);
    expect(stage1Report.sourceRelationSentence).toBe(DIFFERENT_SOURCE_SENTENCE);
  });

  it("고정 문구 16 — 기준표에 없는 서술 지표가 있으면 12 와 11a·11b 사이(8.1)에 싣고 성적서에도 같은 문장을 저장", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    const selected = ["M1", "M4", "M5", "M7", "M9", "M21", "M22"];
    const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport(), copy, inputs({ selectedMetricIds: selected }));
    const text = "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: F-beta Score, Specificity.";
    expect(stage1Report.noBenchmarkSentence).toBe(text);
    const ids = factSheet.facts!.fixed_sentences.map((s) => s.id);
    expect(ids).toEqual(["17", "12", "16", "11a", "18"]);
    expect(factSheet.facts!.fixed_sentences[2]).toEqual({ id: "16", section: "8.1", text });
  });

  it("고정 문구 16 — 서술 지표 모두에 기준치가 없으면 '전부' 문장", () => {
    const { stage1Report, factSheet } = assembleEvaluatedReport(
      baseReport(),
      structuredClone(GOLDEN_BINARY),
      inputs({ selectedMetricIds: ["M5", "M7", "M21"], metricDetails: details({ M5: "0.5" }) }),
    );
    const text = "선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다.";
    expect(stage1Report.noBenchmarkSentence).toBe(text);
    expect(factSheet.facts!.fixed_sentences.find((s) => s.id === "16")).toEqual({ id: "16", section: "8.1", text });
  });

  it("고정 문구 16 — 고른 지표가 모두 기준표에 있으면 싣지도 저장하지도 않는다", () => {
    const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport(), GOLDEN_BINARY, inputs());
    expect(SELECTED.filter((id) => !["M21", "M22"].includes(id)).length).toBeGreaterThan(0);
    expect(stage1Report).not.toHaveProperty("noBenchmarkSentence");
    expect(factSheet.facts!.fixed_sentences.map((s) => s.id)).not.toContain("16");
  });

  it("문제가 0개면 9절 고정 문구 6, 있으면 없다", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    delete (copy.results.success_metrics as Record<string, unknown>).f1_threshold_gain;
    const quiet: ReportComposerInput = { ...COMPOSER, groundTruth: {}, testData: {} };
    const ok = assembleEvaluatedReport(
      baseReport(quiet),
      copy,
      inputs({ composer: quiet, metricDetails: details({ M1: "0.3", M4: "0.3", M9: "0.3" }) }),
    );
    expect(ok.stage1Report.problems).toEqual([]);
    expect(ok.factSheet.facts?.fixed_sentences).toEqual([
      { id: "17", section: "7.1", text: ok.stage1Report.errorRatioSentence },
      { id: "6", section: "9", text: NO_PROBLEM_SENTENCE },
    ]);
    const withProblems = assembleEvaluatedReport(baseReport(), GOLDEN_BINARY, inputs());
    expect(withProblems.factSheet.facts?.fixed_sentences.map((s) => s.id)).not.toContain("6");
  });

  describe("판 3 전용 고정 문장은 판 3 바탕에만(옛 판 run 을 새 코드로 조립해도 그 판 화면과 같은 글)", () => {
    const derived = { method: "threshold" as const, threshold: 0.3, source_columns: ["prob"], target_role: "y_pred" };
    const selected = ["M1", "M4", "M5", "M9", "M21", "M22"];
    const assemble = (contentSchema: number) => {
      const copy = structuredClone(GOLDEN_BINARY);
      (copy.results.success_metrics as Record<string, unknown>).derived_prediction = derived;
      const base = { ...baseReport(), contentSchema };
      return assembleEvaluatedReport(base, copy, inputs({ selectedMetricIds: selected }));
    };
    const nine = (r: ReturnType<typeof assemble>) => r.factSheet.facts!.fixed_sentences.find((f) => f.id === "9")?.text;

    it("전제 — 매퍼가 찍는 판은 3", () => {
      expect(baseReport().contentSchema).toBe(3);
    });

    it("판 3 바탕: 16 을 싣고 저장, 9 는 숫자 읽는 소리 조사(0.3을)", () => {
      const r = assemble(3);
      expect(r.factSheet.facts!.fixed_sentences.map((f) => f.id)).toContain("16");
      expect(r.stage1Report.noBenchmarkSentence).toBe("다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: F-beta Score.");
      expect(nine(r)).toBe("본 평가의 예측값은 제출된 확률값에 결정 임계값 0.3을 적용하여 산출하였다.");
    });

    it.each([2, 1])("판 %s 바탕: 16 없음·저장 없음, 9 는 그 판 화면처럼 '를'(0.3를)", (schema) => {
      const r = assemble(schema);
      expect(r.factSheet.facts!.fixed_sentences.length).toBeGreaterThan(0);
      expect(r.factSheet.facts!.fixed_sentences.map((f) => f.id)).not.toContain("16");
      expect(r.stage1Report).not.toHaveProperty("noBenchmarkSentence");
      expect(nine(r)).toBe("본 평가의 예측값은 제출된 확률값에 결정 임계값 0.3를 적용하여 산출하였다.");
    });
  });

  it("최약 클래스 문제는 facts 의 최약 클래스로 만든다(M22 를 고르지 않아도)", () => {
    const copy = structuredClone(GOLDEN_BINARY);
    const sm = copy.results.success_metrics as Record<string, unknown>;
    delete sm.M22;
    sm.class_report = {
      "0": { precision: 0.9, recall: 0.9, "f1-score": 0.9, support: 180 },
      "1": { precision: 0.3, recall: 0.3, "f1-score": 0.3, support: 20 },
      accuracy: 0.84,
      "macro avg": { precision: 0.6, recall: 0.6, "f1-score": 0.6, support: 200 },
      "weighted avg": { precision: 0.84, recall: 0.84, "f1-score": 0.84, support: 200 },
    };
    const { stage1Report, factSheet } = assembleEvaluatedReport(
      baseReport(),
      copy,
      inputs({ selectedMetricIds: ["M1", "M4", "M9"] }),
    );
    expect(stage1Report.classReport).toBeNull();
    const weakest = stage1Report.problems?.find((p) => p.kind === "weakest_class");
    expect(weakest?.title).toBe("최약 클래스 (1)");
    expect(factSheet.problems).toEqual(stage1Report.problems);
  });
});

describe("S4a 배선 — 조립이 백엔드 상한에 맞춰 미리 자른다(본문 예산 아래)", () => {
  it("클래스 300개·짧은 이름: 표는 256개(꼭 남길 클래스 포함), 혼동행렬은 비우고, 본문 예산 단계는 손대지 않는다", () => {
    const labels = Array.from({ length: 300 }, (_, i) => `c${i}`);
    const support = (i: number) => (i === 0 ? 400 : 10);
    const response = {
      n_samples: 3390,
      dropped_rows: 0,
      class_distribution: Object.fromEntries(labels.map((l, i) => [l, support(i)])),
      warnings: [],
      results: {
        failed_metrics: {},
        success_metrics: {
          M1: 0.5,
          confusion_matrix: {
            type: "multiclass_or_binary",
            labels,
            matrix: labels.map((_, i) => labels.map((__, j) => (i === j ? support(i) : 0))),
            n_samples: 3390,
          },
          class_report: {
            ...Object.fromEntries(
              labels.map((l, i) => [l, { precision: 0.5, recall: 0.5, "f1-score": i === 299 ? 0.01 : 0.5, support: support(i) }]),
            ),
            accuracy: 0.5,
            "macro avg": { precision: 0.5, recall: 0.5, "f1-score": 0.5, support: 3390 },
            "weighted avg": { precision: 0.5, recall: 0.5, "f1-score": 0.5, support: 3390 },
          },
          confusion_counts: { type: "per_class", rows: labels.map((label, i) => ({ label, tp: support(i), fp: 0, fn: 0, tn: 0 })) },
        },
      },
    };
    const { factSheet } = assembleEvaluatedReport(
      baseReport(),
      response,
      inputs({ taskType: "multiclass", selectedMetricIds: ["M1"], metadata: { detected_classes: labels } }),
    );
    expect(factSheet.per_class).toHaveLength(256);
    expect(factSheet.per_class.map((r) => r.label)).toContain("c299"); // 최약 — 엔진 순서 맨 뒤
    expect(factSheet.confusion).toBeNull();
    expect(factSheet.facts?.weakest_class?.label).toBe("c299");
    expect(factSheet.facts?.omitted).toMatchObject({ per_class: 44, confusion_counts: 44, class_distribution: 44, confusion: 300 });
    const payload = fitNarrativePayload({ task_type: "multiclass", report_purpose: "external", fact_sheet: factSheet });
    expect(payload.fact_sheet).toBe(factSheet);
  });
});
