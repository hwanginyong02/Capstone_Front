import { describe, expect, it } from "vitest";

import type { ClassReportRow, ClassReportTable, ConfusionCounts, KpiResult } from "../../types/finalReport.types";
import {
  averageGap,
  buildNarrativeFacts,
  ciSkipped,
  declarations,
  declaredAverage,
  declaredRiskErrors,
  distributionShift,
  errorTotals,
  lowSupportClasses,
  normalizeLabelText,
  precisionRecallGap,
  predictionBias,
  topConfusionPairs,
  verdictDetail,
  weakestClass,
} from "./narrativeFacts";
import type { ReportComposerInput } from "./reportMaterials";
import type { ComposerValueMap } from "../../types/reportComposer.types";

/**
 * 서술용 파생값(서술 설계 6절, 계약 facts-1). 경계값은 "꼭 기준값"과 "기준값 바로 옆"을 함께 둔다 — 비교를
 * 하나 틀리게 바꾸면 실패해야 한다.
 */

const row = (label: string, f1: number | null, support: number | null, pr: [number, number] = [0.5, 0.5]): ClassReportRow => ({
  label,
  precision: pr[0],
  recall: pr[1],
  f1,
  support,
});

function table(rows: ClassReportRow[], averages: Record<string, number> = {}): ClassReportTable {
  return {
    rows,
    averages: Object.entries(averages).map(([label, f1]) => row(label, f1, 100, [f1, f1])),
  };
}

function composer(p: { perspective?: ComposerValueMap; training?: Record<string, string>; trainingCard?: boolean } = {}): ReportComposerInput {
  return {
    cards: { trainingData: p.trainingCard ?? true, testData: true, groundTruth: true, modelEnv: true } as ReportComposerInput["cards"],
    metrics: {},
    perspective: p.perspective ?? {},
    trainingData: p.training
      ? { trainingClassVolume: { entries: Object.entries(p.training).map(([key, value]) => ({ key, value })) } }
      : {},
    testData: {},
    groundTruth: {},
    modelEnv: {},
  };
}

const binaryCounts = (tp: number, fp: number, fn: number, tn: number, label = "1"): ConfusionCounts => ({
  kind: "binary",
  rows: [{ label, tp, fp, fn, tn }],
});

describe("weakestClass — 정답 클래스 중 F1 최저(지표 선택과 무관)", () => {
  it("예측에만 나온 클래스(support 0)는 고르지 않는다", () => {
    const t = table([row("a", 0.9, 100), row("ghost", 0, 0), row("b", 0.6, 100)], { "매크로 평균": 0.5 });
    expect(weakestClass(t)?.label).toBe("b");
  });

  it("같은 F1 이면 표(엔진) 순서 앞", () => {
    const t = table([row("a", 0.9, 100), row("x", 0.6, 50), row("y", 0.6, 40)], { "매크로 평균": 0.7 });
    expect(weakestClass(t)?.label).toBe("x");
  });

  it("정답 클래스가 하나뿐이면 견줄 클래스가 없어 null(거짓 '최약 클래스' 문제를 막는다)", () => {
    expect(weakestClass(table([row("1", 0.9, 20)], { "매크로 평균": 0.9 }))).toBeNull();
    expect(weakestClass(table([row("1", 0.9, 20), row("0", 0, 0)], { "매크로 평균": 0.45 }))).toBeNull();
    expect(weakestClass(null)).toBeNull();
  });

  it("표본 29건은 부족, 30건은 아니다", () => {
    const t = (n: number) => table([row("a", 0.9, 250), row("b", 0.95, 250), row("c", 0.85, n)], { "매크로 평균": 0.9 });
    expect(weakestClass(t(29))?.low_support).toBe(true);
    expect(weakestClass(t(30))?.low_support).toBe(false);
  });

  it("몫 5% 미만은 부족, 꼭 5% 는 아니다 — share_text 는 판정과 같은 쪽으로 읽힌다", () => {
    // 49 / 999 = 0.04905 < 5%, 50 / 1000 = 꼭 5%
    const t = (n: number) => table([row("a", 0.9, 475), row("b", 0.95, 475), row("c", 0.85, n)], { "매크로 평균": 0.9 });
    expect(weakestClass(t(49))).toMatchObject({ low_support: true, share_text: "0.049" });
    expect(weakestClass(t(50))).toMatchObject({ low_support: false, share_text: "0.05" });
    // 4999 / 100000 → 넷째 자리 0.05 는 기준과 같아 보인다 — 자릿수를 늘린다.
    const near = table([row("a", 0.9, 47_500), row("b", 0.95, 47_501), row("c", 0.85, 4_999)], { "매크로 평균": 0.9 });
    expect(weakestClass(near)).toMatchObject({ low_support: true, share_text: "0.04999" });
  });

  it("매크로 − 최저 꼭 0.10 은 멀다(부동소수 0.0999… 도), 0.0999 는 아니다 — gap_text 도 판정 쪽", () => {
    const t = (f1: number, macro: number) => table([row("a", 0.9, 500), row("c", f1, 500)], { "매크로 평균": macro });
    expect(weakestClass(t(0.75, 0.85))).toMatchObject({ far_below_macro: true, gap_from_macro: 0.1, gap_text: "0.1" });
    expect(weakestClass(t(0.7501, 0.85))).toMatchObject({ far_below_macro: false, gap_text: "0.0999" });
    expect(weakestClass(t(0.75004, 0.85))).toMatchObject({ far_below_macro: false, gap_text: "0.09996" });
  });
});

describe("lowSupportClasses — 30건·5% 미만, 정답 클래스만", () => {
  it("걸린 클래스만 표 순서로, 정답 클래스 둘 미만이면 []", () => {
    const t = table([row("a", 0.9, 1000), row("b", 0.9, 29), row("ghost", 0, 0), row("c", 0.9, 30)]);
    expect(lowSupportClasses(t).map((r) => r.label)).toEqual(["b", "c"]); // c: 30/1059 = 2.8% < 5%
    expect(lowSupportClasses(table([row("a", 0.9, 10)]))).toEqual([]);
  });
});

describe("errorTotals — 자르기 전 엔진 건수로(혼동행렬이 잘려도 남는다)", () => {
  it("이진 fp + fn / 표본, 다중 Σfn / 표본, 멀티 Σ(fp + fn) / 레이블 칸", () => {
    expect(errorTotals("binary", binaryCounts(52, 56, 43, 49), 200)).toEqual({ unit: "sample", total: 200, misclassified: 99 });
    const per: ConfusionCounts = {
      kind: "perClass",
      rows: [
        { label: "a", tp: 21, fp: 38, fn: 48, tn: 93 },
        { label: "b", tp: 17, fp: 50, fn: 40, tn: 93 },
      ],
    };
    expect(errorTotals("multiclass", per, 200)).toEqual({ unit: "sample", total: 200, misclassified: 88 });
    expect(errorTotals("multilabel", per, 200)).toEqual({ unit: "label_cell", total: 400, misclassified: 176 });
    expect(errorTotals("binary", null, 200)).toBeNull();
  });
});

describe("topConfusionPairs — 비대각 상위 3, 동률은 정답·예측의 엔진 순서", () => {
  it("건수 내림차순, 같으면 정답 클래스 순서 앞 → 예측 클래스 순서 앞, 0건은 싣지 않는다", () => {
    const labels = ["a", "b", "c", "d"];
    const matrix = [
      [9, 5, 0, 5],
      [5, 9, 7, 0],
      [0, 7, 9, 0],
      [0, 0, 1, 9],
    ];
    const pairs = topConfusionPairs({ labels, matrix });
    expect(pairs.map((p) => `${p.actual}>${p.predicted}:${p.count}`)).toEqual(["b>c:7", "c>b:7", "a>b:5"]);
    expect(pairs[0].share_of_errors).toBe(0.233333333); // 7 / 30
  });
  it("오분류가 없으면 []", () => {
    expect(topConfusionPairs({ labels: ["a", "b"], matrix: [[3, 0], [0, 4]] })).toEqual([]);
    expect(topConfusionPairs(null)).toEqual([]);
  });
});

describe("predictionBias — 예측 − 실제", () => {
  it("이진: 양성 예측(tp + fp) 대 실제 양성(tp + fn), difference = fp − fn", () => {
    expect(predictionBias("binary", null, binaryCounts(52, 56, 43, 49))).toEqual({
      unit: "positive_class",
      rows: [{ label: "1", predicted: 108, actual: 95, difference: 13 }],
    });
  });
  it("다중: 열합 대 줄합 — 예측에만 나온 클래스는 실제 0 줄", () => {
    const bias = predictionBias("multiclass", { labels: ["a", "b", "ghost"], matrix: [[5, 3, 2], [1, 6, 0], [0, 0, 0]] }, null);
    expect(bias?.rows).toEqual([
      { label: "a", predicted: 6, actual: 10, difference: -4 },
      { label: "b", predicted: 9, actual: 7, difference: 2 },
      { label: "ghost", predicted: 2, actual: 0, difference: 2 },
    ]);
  });
  it("다중: 혼동행렬이 없으면 confusion_counts 로", () => {
    const counts: ConfusionCounts = { kind: "perClass", rows: [{ label: "a", tp: 5, fp: 1, fn: 5, tn: 6 }] };
    expect(predictionBias("multiclass", null, counts)?.rows).toEqual([{ label: "a", predicted: 6, actual: 10, difference: -4 }]);
  });
  it("멀티: 레이블 총수", () => {
    const counts: ConfusionCounts = {
      kind: "perClass",
      rows: [
        { label: "x", tp: 45, fp: 50, fn: 62, tn: 43 },
        { label: "y", tp: 51, fp: 43, fn: 51, tn: 55 },
      ],
    };
    expect(predictionBias("multilabel", null, counts)).toEqual({
      unit: "label_total",
      rows: [{ label: null, predicted: 189, actual: 209, difference: -20 }],
    });
  });
});

describe("declarations — 선택지 값 → 코드값, 모름·미제공·다른 유형은 null", () => {
  it("이진은 위험 방향만, 다중·멀티는 클래스 중요도만, 사용 방식은 모두", () => {
    const c = composer({
      perspective: {
        criticalErrorType: { text: "False alarm (FP)" },
        classPriority: { text: "Larger classes first" },
        usageMode: { text: "Batch" },
      },
    });
    expect(declarations(c, "binary")).toEqual({ risk_direction: "fp", class_priority: null, usage_mode: "batch" });
    expect(declarations(c, "multiclass")).toEqual({ risk_direction: null, class_priority: "larger_first", usage_mode: "batch" });
  });
  it("모든 선택지 값이 코드로 바뀐다", () => {
    const code = (field: string, text: string, task: "binary" | "multiclass" = "binary") =>
      declarations(composer({ perspective: { [field]: { text } } }), task);
    expect(code("criticalErrorType", "Missed (FN)").risk_direction).toBe("fn");
    expect(code("criticalErrorType", "Similar").risk_direction).toBe("similar");
    expect(code("classPriority", "All equal", "multiclass").class_priority).toBe("all_equal");
    expect(code("classPriority", "Individual samples first", "multiclass").class_priority).toBe("samples_first");
    expect(code("usageMode", "Real-time").usage_mode).toBe("realtime");
  });
  it("모름·모르는 값·없음은 null(모르는 값이 'toString' 같은 이름이어도)", () => {
    expect(declarations(composer({ perspective: { usageMode: { text: "Real-time", unknown: true } } }), "binary").usage_mode).toBeNull();
    expect(declarations(composer({ perspective: { usageMode: { text: "toString" } } }), "binary").usage_mode).toBeNull();
    expect(declarations(undefined, "binary")).toEqual({ risk_direction: null, class_priority: null, usage_mode: null });
  });
});

describe("declaredRiskErrors — 선언한 쪽 건수와 전체 오류 중 비율(D24)", () => {
  it("FN·FP 각각, 비슷함·모름은 null, 오류 0 이면 비율 null", () => {
    expect(declaredRiskErrors("fn", binaryCounts(52, 56, 43, 49))).toEqual({
      side: "fn", count: 43, total_errors: 99, share: 0.434343434, share_text: "0.4343",
    });
    expect(declaredRiskErrors("fp", binaryCounts(52, 56, 43, 49))?.count).toBe(56);
    expect(declaredRiskErrors("similar", binaryCounts(1, 1, 1, 1))).toBeNull();
    expect(declaredRiskErrors(null, binaryCounts(1, 1, 1, 1))).toBeNull();
    expect(declaredRiskErrors("fn", binaryCounts(5, 0, 0, 5))).toMatchObject({ share: null, share_text: null });
  });
});

describe("precisionRecallGap — |P − R| ≥ 0.10 이면 치우침", () => {
  const t = (p: number, r: number) => table([row("0", 0.5, 10), row("1", 0.5, 10, [p, r])]);
  it("꼭 0.10 은 치우침(부동소수 포함), 0.0999 는 아니다 — 음수 표기는 부호를 붙인다", () => {
    expect(precisionRecallGap(t(0.85, 0.75), "1")).toMatchObject({ flagged: true, difference: 0.1, difference_text: "0.1" });
    expect(precisionRecallGap(t(0.75, 0.85), "1")).toMatchObject({ flagged: true, difference: -0.1, difference_text: "-0.1" });
    expect(precisionRecallGap(t(0.8499, 0.75), "1")).toMatchObject({ flagged: false, difference_text: "0.0999" });
    expect(precisionRecallGap(t(0.84996, 0.75), "1")).toMatchObject({ flagged: false, difference_text: "0.09996" });
  });
  it("양성 클래스 줄이 없으면 null", () => {
    expect(precisionRecallGap(t(0.9, 0.1), "yes")).toBeNull();
    expect(precisionRecallGap(t(0.9, 0.1), null)).toBeNull();
  });
});

describe("averageGap·declaredAverage — 평균 방식 사이의 차이(D39)와 선언 평균 방식 값(D24·D28)", () => {
  const t = table([row("a", 0.4, 74), row("b", 0.3, 74), row("c", 0.2, 50)], {
    "매크로 평균": 0.3, "가중 평균": 0.32, "마이크로 평균": 0.335,
  });
  it("다중: 가중 − 매크로, 기준 클래스는 support 최대(같으면 앞)", () => {
    expect(averageGap("multiclass", t)).toMatchObject({
      kind: "macro_vs_weighted", difference: 0.02, difference_text: "0.02", reference_class: { label: "a", support: 74 },
    });
  });
  it("멀티: 마이크로 − 매크로, 기준은 F1 최저 레이블", () => {
    expect(averageGap("multilabel", t)).toMatchObject({ kind: "macro_vs_micro", difference: 0.035, reference_class: { label: "c" } });
    expect(averageGap("binary", t)).toBeNull();
  });
  it("선언: 다수 우선 → 가중, 샘플 단위 → 마이크로, 동등·모름 → null", () => {
    expect(declaredAverage("larger_first", t)).toMatchObject({ average: "weighted", f1: 0.32 });
    expect(declaredAverage("samples_first", t)).toMatchObject({ average: "micro", f1: 0.335 });
    expect(declaredAverage("all_equal", t)).toBeNull();
    expect(declaredAverage(null, t)).toBeNull();
  });
});

describe("distributionShift — 학습↔평가 분포 차(전 클래스)", () => {
  it("꼭 10%p 는 걸리고(0.6 − 0.5 부동소수 포함) 9%p 는 아니다 — 부호는 학습 − 평가", () => {
    const shifted = distributionShift(composer({ training: { a: "600", b: "400" } }), { a: 50, b: 50 });
    expect(shifted.status).toBe("compared");
    expect(shifted.rows).toEqual([
      { label: "a", training_ratio: 0.6, evaluation_ratio: 0.5, difference: 0.1, difference_text: "0.1", flagged: true },
      { label: "b", training_ratio: 0.4, evaluation_ratio: 0.5, difference: -0.1, difference_text: "-0.1", flagged: true },
    ]);
    const close = distributionShift(composer({ training: { a: "590", b: "410" } }), { a: 50, b: 50 });
    expect(close.rows.map((r) => r.flagged)).toEqual([false, false]);
  });
  it("클래스 이름 표기를 맞춘다(' 1.0' = '1') — S2 이전에 저장한 학습 칸 이름", () => {
    const r = distributionShift(composer({ training: { " 1.0": "700", "0": "300" } }), { "1": 50, "0": 50 });
    expect(r.status).toBe("compared");
    expect(r.rows.map((x) => x.label).sort()).toEqual(["0", "1"]);
  });
  it("없음·빈 칸·합 0·카드 끔은 not_provided, 평가 클래스가 학습에 없으면 uncovered", () => {
    expect(distributionShift(undefined, { a: 1 }).status).toBe("not_provided");
    expect(distributionShift(composer({ training: { a: "1", b: "" } }), { a: 1, b: 1 }).status).toBe("not_provided");
    expect(distributionShift(composer({ training: { a: "0", b: "0" } }), { a: 1, b: 1 }).status).toBe("not_provided");
    expect(distributionShift(composer({ training: { a: "1", b: "1" }, trainingCard: false }), { a: 1, b: 1 }).status).toBe("not_provided");
    expect(distributionShift(composer({ training: { a: "1", b: "1" } }), { a: 1, b: 1, c: 1 })).toEqual({ status: "uncovered", rows: [] });
  });
  it("평가 클래스 이름이 'constructor' 여도 학습 분포에 있다고 착각하지 않는다", () => {
    expect(distributionShift(composer({ training: { a: "1" } }), { a: 1, constructor: 1 }).status).toBe("uncovered");
  });
  it("평가에 0건인 클래스는 학습에 없어도 된다", () => {
    expect(distributionShift(composer({ training: { a: "9", b: "1" } }), { a: 5, b: 5, c: 0 }).status).toBe("compared");
  });
});

describe("normalizeLabelText — 백엔드 normalize_label 과 같은 규칙", () => {
  it.each([
    [" cat ", "cat"],
    ["1.0", "1"],
    ["+2.00", "2"],
    ["-3.0", "-3"],
    ["0.0", "0"],
    ["-0.0", "0"],
    ["1.5", "1.5"],
    ["1.0a", "1.0a"],
  ])("%j → %j", (raw, want) => {
    expect(normalizeLabelText(raw)).toBe(want);
  });
});

const kpi = (p: Partial<KpiResult>): KpiResult => ({ metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", ...p });

describe("verdictDetail·ciSkipped — computeVerdict 한 곳을 옮긴다", () => {
  it("판정 대상·통과 수(산출 실패 제외), 미달·산출 실패 핵심 지표", () => {
    const rows = [
      kpi({ metricId: "M1", status: "fail", value: 0.7 }),
      kpi({ metricId: "M4", name: "F1 Score", status: "unavailable", value: 0 }),
      kpi({ metricId: "M2", name: "Precision", status: "pass" }),
      kpi({ metricId: "M3", name: "Recall", status: "fail", value: 0.1 }),
    ];
    expect(verdictDetail(rows, "binary", ["M1", "M4"])).toEqual({
      verdict: "FAIL",
      judged_count: 3,
      passed_count: 1,
      failed_core: [{ metric_id: "M1", display_name: "Accuracy" }],
      failed_noncore: [{ metric_id: "M3", display_name: "Recall" }],
      unavailable_core: [{ metric_id: "M4", display_name: "F1 Score" }],
      inconclusive_cause: null,
      inconclusive_metrics: [],
    });
  });
  it("판정 불가면 원인과 그 지표", () => {
    const rows = [kpi({ metricId: "M1" }), kpi({ metricId: "M4", name: "F1 Score", status: "unavailable" })];
    expect(verdictDetail(rows, "binary", ["M1", "M4"])).toMatchObject({
      verdict: "INCONCLUSIVE",
      inconclusive_cause: "core_not_computed",
      inconclusive_metrics: [{ metric_id: "M4", display_name: "F1 Score" }],
    });
  });
  it("ci_skipped: 판정 대상인데 구간 없는 지표와 엔진 사유, 엔진이 구간을 안 보냈으면 []", () => {
    const rows = [
      kpi({ metricId: "M1", ci: { low: 0.8, high: 0.95, method: "wilson" } }),
      kpi({ metricId: "M10", name: "AUPRC" }),
      kpi({ metricId: "M2", name: "Precision", threshold: null }),
    ];
    expect(ciSkipped(rows, { M10: { low: null, high: null, method: "skipped", reason: " 점추정 불일치 " } })).toEqual([
      { metric_id: "M10", display_name: "AUPRC", reason: "점추정 불일치" },
    ]);
    expect(ciSkipped(rows, {})).toEqual([{ metric_id: "M10", display_name: "AUPRC", reason: null }]);
    expect(ciSkipped(rows, null)).toEqual([]);
  });
});

describe("buildNarrativeFacts — 갈래 배선", () => {
  const base = {
    kpiResults: [kpi({})],
    coreMetricIds: ["M1"],
    coreMetricsSource: "default" as const,
    classTable: table([row("0", 0.4, 100), row("1", 0.6, 100, [0.9, 0.3])], { "매크로 평균": 0.5, "가중 평균": 0.5 }),
    confusion: { labels: ["0", "1"], matrix: [[80, 20], [30, 70]] },
    confusionCounts: binaryCounts(70, 20, 30, 80),
    positiveClass: "1",
    reportPurpose: "project" as const,
    composer: composer({ perspective: { criticalErrorType: { text: "Missed (FN)" } } }),
    evaluationDistribution: { "0": 100, "1": 100 },
    confidenceIntervals: null,
    fixedSentences: [{ id: "6", section: "9", text: "문구" }],
    nSamples: 200,
  };
  it("이진: 양성·위험 쪽·P↔R 은 있고 다중 전용 칸은 비어 있다", () => {
    const f = buildNarrativeFacts({ ...base, taskType: "binary" });
    expect(f).toMatchObject({
      contract: "facts-1",
      positive_class: "1",
      n_classes: 2,
      class_share_basis: "samples",
      report_purpose_label: "과제 산출물",
      core_metrics_source: "default",
      declared_risk_errors: { side: "fn", count: 30 },
      precision_recall_gap: { flagged: true },
      top_confusion_pairs: [],
      average_gap: null,
      ci_available: false,
      fixed_sentences: [{ id: "6", section: "9", text: "문구" }],
      omitted: {},
    });
  });
  it("다중: 양성·위험 쪽·P↔R 없이 최다 오분류 쌍·평균 차이, 멀티는 분모가 레이블 등장 수", () => {
    const m = buildNarrativeFacts({ ...base, taskType: "multiclass" });
    expect(m).toMatchObject({ positive_class: null, declared_risk_errors: null, precision_recall_gap: null });
    expect(m.top_confusion_pairs.length).toBe(2);
    expect(m.average_gap?.kind).toBe("macro_vs_weighted");
    expect(buildNarrativeFacts({ ...base, taskType: "multilabel", confusion: null }).class_share_basis).toBe("label_occurrences");
  });
});
