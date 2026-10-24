/**
 * 판 4 4.4~4.8 재료 순수 함수(갈래 b4) — 저장값을 읽기만 하고 판 4 표기로 찍는지, 문구가 출처 글자와 같은지.
 * 문구 출처: 고정 문구 7(설계 문서 고정 문구 탭 — 아래에 옮겨 적음), 예시본 4.4~4.8, 판 3 부품 글(치환 없음), 부록 B15·B16·B17·B33.
 */
import { describe, expect, it } from "vitest";

import { MULTILABEL_IMBALANCE_DEFINITION } from "../../narrativeSectionText";
import type { BenchmarkRef, KpiResult } from "../../../../types/finalReport.types";
import type { NarrativeFacts } from "../../narrativeFacts";
import {
  B15_SUBMITTED_PREDICTION,
  B16_NO_TRAINING_DISTRIBUTION,
  B17_NO_CURVES,
  B33_NO_TRAINING_SAMPLES_DRAFT,
  FIXED_24_DISTRIBUTION,
} from "../edition4Text";
import {
  benchmarkModelValueTextEd4,
  benchmarkView,
  confusionCountsTable,
  confusionPairsTable,
  curveLines,
  distributionView,
  latencyView,
  NO_CURVES_TEXT,
  predictionBiasTable,
  thresholdTable,
  weakestClassTable,
} from "./resultsDetail";
import { EX_4_8_NO_LATENCY, FIXED_7_MULTILABEL_IMBALANCE, TARGET_POSITION_LABEL_ED4 } from "./resultsDetailText";

const kpi = (over: Partial<KpiResult>): KpiResult =>
  ({ metricId: "M1", name: "Accuracy", value: 0.5, threshold: null, higherIsBetter: true, status: "pass", isCore: false, ...over }) as KpiResult;

describe("문구 출처 글자", () => {
  it("고정 문구 7 — 설계 문서 글자, 판 3 상수와 같다", () => {
    // 고정 문구 탭 7번: "다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다."
    expect(FIXED_7_MULTILABEL_IMBALANCE).toBe("다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다.");
    expect(FIXED_7_MULTILABEL_IMBALANCE).toBe(MULTILABEL_IMBALANCE_DEFINITION);
  });

  it("예시본 4.8 문장, 4.6 위치 이름(우수·미흡 없음)", () => {
    expect(EX_4_8_NO_LATENCY).toBe("제공되지 않음 — 응답시간(latency) 자료가 제공되지 않아 측정하지 않았다.");
    expect(TARGET_POSITION_LABEL_ED4).toEqual({ below: "범위보다 낮음", within: "범위 안", above: "범위보다 높음" });
    expect(NO_CURVES_TEXT).toBe(B17_NO_CURVES);
  });
});

describe("4.4 혼동 행렬 건수", () => {
  it("이진 — 양성 클래스 한 줄, 설명 없음", () => {
    expect(confusionCountsTable({ kind: "binary", rows: [{ label: "malignant", tp: 63, tn: 105, fp: 2, fn: 1 }] })).toEqual({
      title: "혼동 행렬 건수",
      columns: ["양성 클래스", "TP", "TN", "FP", "FN"],
      rows: [["malignant", "63", "105", "2", "1"]],
      notes: [],
    });
  });

  it("다중·멀티 — 머리 '클래스', 판 3 설명 줄", () => {
    const t = confusionCountsTable({ kind: "perClass", rows: [{ label: "a", tp: 1, tn: 2, fp: 3, fn: 4 }] })!;
    expect(t.columns[0]).toBe("클래스");
    expect(t.rows).toEqual([["a", "1", "2", "3", "4"]]);
    expect(t.notes).toEqual(["클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다."]);
  });

  it("없음·빈 줄 → null", () => {
    expect(confusionCountsTable(null)).toBeNull();
    expect(confusionCountsTable(undefined)).toBeNull();
    expect(confusionCountsTable({ kind: "binary", rows: [] })).toBeNull();
  });
});

const weakest = (over: Partial<NonNullable<NarrativeFacts["weakest_class"]>> = {}) => ({
  label: "malignant",
  f1: 0.9767441860465116,
  f1_text: "0.977",
  support: 64,
  share: 0.374269006,
  share_text: "0.374",
  macro_f1: 0.98,
  gap_from_macro: 0.0046,
  gap_text: "0.005",
  low_support: false,
  far_below_macro: false,
  ...over,
});

describe("4.4 최약 클래스", () => {
  it("예시본 한 줄 — 이름(설명), f1_text, %, gap_text, 아니오", () => {
    const t = weakestClassTable({ weakest_class: weakest(), class_share_basis: "samples" }, [], [{ label: "malignant", description: "악성 종양" }])!;
    expect(t.title).toBe("최약 클래스(F1 최저)");
    expect(t.columns).toEqual(["클래스", "F1", "표본 수", "비율", "매크로 F1과의 차이", "작은 표본"]);
    expect(t.rows).toEqual([["malignant(악성 종양)", "0.977", "64", "37.4%", "0.005", "아니오"]]);
    expect(t.notes).toEqual(["매크로 F1과의 차이 = 매크로 F1 − 이 클래스의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다."]);
  });

  it("f1_text 가 F1 칸이다(판 3 넷째 자리·plain 이 아님) — 늘린 표기도 그대로", () => {
    const t = weakestClassTable({ weakest_class: weakest({ f1: 0.97196, f1_text: "0.9720" }), class_share_basis: "samples" }, [], undefined)!;
    expect(t.rows[0][1]).toBe("0.9720");
  });

  it("f1_text 가 없으면 classF1TextEd4 대체(판정 대상 같은 원값 → judged)", () => {
    const k = kpi({ metricId: "M4", name: "F1 Score", value: 0.96996, threshold: 0.97, status: "fail" });
    const t = weakestClassTable({ weakest_class: weakest({ f1: 0.96996, f1_text: undefined }), class_share_basis: "samples" }, [k], undefined)!;
    expect(t.rows[0][1]).toBe("0.96996");
  });

  it("멀티 — 단위 레이블, 비율 분모 설명, 작은 표본 예, gap 없음 '—'", () => {
    const t = weakestClassTable(
      { weakest_class: weakest({ label: "Class9", low_support: true, gap_text: null, share_text: "0.021" }), class_share_basis: "label_occurrences" },
      [],
      undefined,
    )!;
    expect(t.title).toBe("최약 레이블(F1 최저)");
    expect(t.columns[0]).toBe("레이블");
    expect(t.rows[0]).toEqual(["Class9", "0.977", "64", "2.1%", "—", "예"]);
    expect(t.notes[0]).toBe(
      "매크로 F1과의 차이 = 매크로 F1 − 이 레이블의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다. 비율은 전체 표본 수가 아니라 모든 레이블의 등장 횟수 합에 대한 비율입니다.",
    );
  });

  it("최약 클래스가 없으면 null", () => {
    expect(weakestClassTable({ weakest_class: null, class_share_basis: "samples" }, [], undefined)).toBeNull();
    expect(weakestClassTable(undefined, [], undefined)).toBeNull();
  });
});

describe("4.4 예측 편향·최다 오분류 쌍", () => {
  it("편향 — 단위별 머리, 부호(+, U+2212, 0), 멀티 '전체 레이블'", () => {
    const t = predictionBiasTable(
      {
        prediction_bias: {
          unit: "per_class",
          rows: [
            { label: "a", predicted: 5, actual: 3, difference: 2 },
            { label: "b", predicted: 1, actual: 4, difference: -3 },
            { label: "c", predicted: 2, actual: 2, difference: 0 },
          ],
        },
      },
      [{ label: "a", description: "에이" }],
    )!;
    expect(t.columns).toEqual(["클래스", "예측 수", "실제 수", "차이(예측 − 실제)"]);
    expect(t.rows).toEqual([
      ["a(에이)", "5", "3", "+2"],
      ["b", "1", "4", "−3"],
      ["c", "2", "2", "0"],
    ]);
    const bin = predictionBiasTable({ prediction_bias: { unit: "positive_class", rows: [{ label: "m", predicted: 65, actual: 64, difference: 1 }] } }, undefined)!;
    expect(bin.columns[0]).toBe("양성 클래스");
    expect(bin.title).toBe("예측 편향(예측 수 대 실제 수)");
    const ml = predictionBiasTable({ prediction_bias: { unit: "label_total", rows: [{ label: null, predicted: 3290, actual: 3899, difference: -609 }] } }, undefined)!;
    expect(ml.columns[0]).toBe("대상");
    expect(ml.rows).toEqual([["전체 레이블", "3290", "3899", "−609"]]);
    expect(predictionBiasTable({ prediction_bias: null }, undefined)).toBeNull();
    expect(predictionBiasTable({ prediction_bias: { unit: "per_class", rows: [] } }, undefined)).toBeNull();
  });

  it("쌍 — 다중만, 상위 n 제목, 비율 판 4 백분율", () => {
    const facts = {
      top_confusion_pairs: [
        { actual: "5", predicted: "6", count: 1, share_of_errors: 0.166666667 },
        { actual: "6", predicted: "1", count: 2, share_of_errors: 0.3335 },
      ],
    };
    const t = confusionPairsTable(facts, "multiclass", [{ label: "1", description: "숫자 1" }])!;
    expect(t.title).toBe("최다 오분류 쌍(상위 2)");
    expect(t.columns).toEqual(["실제 → 예측", "건수", "오분류 중 비율"]);
    expect(t.rows).toEqual([
      ["5 → 6", "1", "16.7%"],
      ["6 → 1(숫자 1)", "2", "33.4%"],
    ]);
    expect(confusionPairsTable(facts, "binary", undefined)).toBeNull();
    expect(confusionPairsTable(facts, "multilabel", undefined)).toBeNull();
    expect(confusionPairsTable({ top_confusion_pairs: [] }, "multiclass", undefined)).toBeNull();
  });
});

describe("4.4 임계값 조정 여지", () => {
  const table = {
    current: { kind: "threshold" as const, thresholdText: "0.5" },
    bestThresholdText: "0.6166",
    rows: [
      { metricId: "M4", name: "F1 Score", current: "0.977", best: "0.984" },
      { metricId: "M2", name: "Precision", current: null, best: "0.984" },
    ],
    gainText: "0.008",
  };

  it("예시본 머리·행·상승폭 문장", () => {
    expect(thresholdTable(table)).toEqual({
      title: "임계값 조정 여지",
      columns: ["지표", "현재 결정 임계값 0.5", "F1이 가장 높은 결정 임계값 0.6166"],
      rows: [
        ["F1 Score", "0.977", "0.984"],
        ["Precision", "—", "0.984"],
      ],
      notes: ["F1의 최대 상승폭은 0.008이다."],
    });
  });

  it("B15·임계값 표기 없음·null", () => {
    expect(thresholdTable({ ...table, current: { kind: "submitted" } })!.columns[1]).toBe(B15_SUBMITTED_PREDICTION);
    expect(thresholdTable({ ...table, bestThresholdText: null })!.columns[2]).toBe("F1이 가장 높은 결정 임계값 —");
    expect(thresholdTable(null)).toBeNull();
    expect(thresholdTable(undefined)).toBeNull();
  });
});

describe("4.5 데이터 분포", () => {
  const dist = (status: "compared" | "uncovered" | "not_provided" | "training_samples_not_provided", rows = [
    { label: "benign", trainingRatio: 0.628, evaluationRatio: 0.626, evaluationMinusTraining: -0.0024, trainingText: "62.8%", evaluationText: "62.6%", differenceText: "−0.2%p" },
    { label: "x", trainingRatio: null, evaluationRatio: 0.1, evaluationMinusTraining: null, trainingText: null, evaluationText: "10.0%", differenceText: null },
  ]) => ({
    distributionSentence: "평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 a 1건(1.0%)이다.",
    imbalanceRatioText: "1.672",
    imbalanceSentence: "클래스 불균형 비율(Imbalance Ratio)은 1.672이다.",
    training: { status, rows },
  });

  it("이진·다중 — 두 문장 한 문단, 표(null 칸 '—'), 24", () => {
    const v = distributionView(dist("uncovered"), "binary");
    expect(v.paragraph).toBe("평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 a 1건(1.0%)이다. 클래스 불균형 비율(Imbalance Ratio)은 1.672이다.");
    expect(v.table).toEqual({
      title: "학습·평가 클래스 비율",
      columns: ["클래스", "학습 비율", "평가 비율", "차이"],
      rows: [
        ["benign", "62.8%", "62.6%", "−0.2%p"],
        ["x", "—", "10.0%", "—"],
      ],
      notes: [],
    });
    expect(v.replacement).toBeNull();
    expect(v.closing).toBe(FIXED_24_DISTRIBUTION);
    expect(distributionView(dist("compared"), "multiclass").paragraph).not.toContain(FIXED_7_MULTILABEL_IMBALANCE);
  });

  it("멀티 — 불균형 문장 앞에 고정 문구 7", () => {
    expect(distributionView(dist("compared"), "multilabel").paragraph).toBe(
      `평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 a 1건(1.0%)이다. ${FIXED_7_MULTILABEL_IMBALANCE} 클래스 불균형 비율(Imbalance Ratio)은 1.672이다.`,
    );
    // 불균형 문장이 없으면 7 도 없다
    const noIr = { ...dist("compared"), imbalanceSentence: null };
    expect(distributionView(noIr, "multilabel").paragraph).toBe("평가 데이터셋은 총 171건이며, 클래스(레이블)별 분포는 a 1건(1.0%)이다.");
  });

  it("not_provided → B16, training_samples_not_provided → B33(B16 아님), 표 없음", () => {
    const a = distributionView(dist("not_provided", []), "binary");
    expect(a.table).toBeNull();
    expect(a.replacement).toEqual({ title: "학습·평가 클래스 비율", text: B16_NO_TRAINING_DISTRIBUTION });
    const b = distributionView(dist("training_samples_not_provided", []), "multilabel");
    expect(b.table).toBeNull();
    expect(b.replacement).toEqual({ title: "학습·평가 클래스 비율", text: B33_NO_TRAINING_SAMPLES_DRAFT });
  });

  it("생성값이 없으면 문단·표 없이 24 만", () => {
    expect(distributionView(undefined, "binary")).toEqual({ paragraph: null, table: null, replacement: null, closing: FIXED_24_DISTRIBUTION });
  });
});

const ref = (over: Partial<BenchmarkRef>): BenchmarkRef => ({
  metric: "Accuracy",
  modelValue: 0.9825,
  refLow: 0.85,
  refHigh: 0.92,
  quality: "better",
  direction: "higher",
  sourceNote: "내부 참조 기준치 v1 (공개 벤치마크 평균이 아닌 자체 설정 기준이며, 도메인별로 상이할 수 있음)",
  targetValue: 0.95,
  targetPosition: "above",
  ...over,
});

describe("4.6 참조 범위 비교", () => {
  it("모델 값 — KPI 원값 판 4 표기(백엔드 modelValue 아님), 판정 대상은 judged, 없으면 '—'", () => {
    const acc = kpi({ value: 0.9824561403508771, threshold: 0.95, status: "pass" });
    expect(benchmarkModelValueTextEd4(ref({}), [acc])).toBe("0.982");
    // 판정 대상: 셋째 자리로 판정과 어긋나 보이면 늘린다
    expect(benchmarkModelValueTextEd4(ref({}), [kpi({ value: 0.94996, threshold: 0.95, status: "fail" })])).toBe("0.94996");
    // 참고 지표: 셋째 자리, 끝 0 유지
    expect(benchmarkModelValueTextEd4(ref({ metric: "Precision" }), [kpi({ name: "Precision", value: 0.95 })])).toBe("0.950");
    // 산출 실패·없음 → "—"
    expect(benchmarkModelValueTextEd4(ref({}), [kpi({ status: "unavailable" })])).toBe("—");
    expect(benchmarkModelValueTextEd4(ref({}), [])).toBe("—");
  });

  it("행 — 참조 범위 둘째 자리, 위치는 수치 위치(낮을수록 좋음 반영), 목표값 ed4Target, 목표값 수준", () => {
    const v = benchmarkView({
      conclusion: {
        benchmarkRefs: [
          ref({}),
          ref({ metric: "Hamming Loss", direction: "lower", quality: "worse", refLow: 0.05, refHigh: 0.2, targetValue: 0.22, targetPosition: "above" }),
          ref({ metric: "Precision", quality: "within", targetValue: null, targetPosition: null }),
          ref({ metric: "Recall", quality: "mystery", targetValue: 0.8124, targetPosition: "below" }),
        ],
      } as never,
      kpiResults: [
        kpi({ value: 0.9824561403508771, threshold: 0.95 }),
        kpi({ metricId: "M15", name: "Hamming Loss", value: 0.2093, threshold: 0.22, higherIsBetter: false }),
        kpi({ metricId: "M2", name: "Precision", value: 0.9 }),
        kpi({ metricId: "M3", name: "Recall", value: 0.81, threshold: 0.8124, status: "fail" }),
      ],
      noBenchmarkSentence: "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: Log Loss.",
    });
    expect(v.table!.columns).toEqual(["지표", "모델 값", "참조 범위", "위치", "목표값", "목표값 수준"]);
    expect(v.table!.rows).toEqual([
      ["Accuracy", "0.982", "0.85 ~ 0.92", "범위보다 높음", "0.950", "범위보다 높음"],
      ["Hamming Loss (낮을수록 좋음)", "0.209", "0.05 ~ 0.20", "범위보다 높음", "0.220", "범위보다 높음"],
      ["Precision", "0.900", "0.85 ~ 0.92", "범위 안", "—", "—"],
      ["Recall", "0.810", "0.85 ~ 0.92", "—", "0.8124", "범위보다 낮음"],
    ]);
    // 출처 글 한 줄(같은 글은 한 번)
    expect(v.table!.notes).toEqual(["※ 내부 참조 기준치 v1 (공개 벤치마크 평균이 아닌 자체 설정 기준이며, 도메인별로 상이할 수 있음)"]);
    expect(v.noBenchmark).toBe("다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: Log Loss.");
  });

  it("better·낮을수록 좋음 → 범위보다 낮음", () => {
    const v = benchmarkView({
      conclusion: { benchmarkRefs: [ref({ metric: "Log Loss", direction: "lower", quality: "better", targetValue: null, targetPosition: null })] } as never,
      kpiResults: [kpi({ name: "Log Loss", value: 0.05 })],
      noBenchmarkSentence: undefined,
    });
    expect(v.table!.rows[0][3]).toBe("범위보다 낮음");
    expect(v.noBenchmark).toBeNull();
  });

  it("출처 글이 둘이면 둘, 빈 글은 뺌; 참조 범위 없으면 표 null", () => {
    const v = benchmarkView({
      conclusion: { benchmarkRefs: [ref({}), ref({ metric: "F1 Score", sourceNote: "다른 기준" }), ref({ metric: "AUROC", sourceNote: "" })] } as never,
      kpiResults: [],
      noBenchmarkSentence: "  ",
    });
    expect(v.table!.notes).toEqual([
      "※ 내부 참조 기준치 v1 (공개 벤치마크 평균이 아닌 자체 설정 기준이며, 도메인별로 상이할 수 있음)",
      "※ 다른 기준",
    ]);
    expect(v.noBenchmark).toBeNull();
    expect(benchmarkView({ conclusion: { benchmarkRefs: [] } as never, kpiResults: [], noBenchmarkSentence: "x" })).toEqual({ table: null, noBenchmark: "x" });
  });
});

describe("4.7 곡선", () => {
  const roc = { fpr: [0, 1], tpr: [0, 1], auroc: 0.999269859813084 };
  const pr = { recall: [0, 1], precision: [1, 0.5], auprc: 0.9988367417279411 };

  it("예시본 두 줄 — 넓이 값은 4.3 과 같은 글자", () => {
    const auroc = kpi({ metricId: "M9", name: "AUROC", value: 0.999269859813084, threshold: 0.98 });
    expect(curveLines({ confusionMatrix: null, rocCurve: roc, prCurve: pr }, [auroc])).toEqual([
      { kind: "roc", title: "ROC Curve (Y: true positive rate / X: false positive rate) — AUROC: 0.999" },
      { kind: "pr", title: "Precision-Recall Curve (Y: precision / X: recall) — AUPRC: 0.999" },
    ]);
  });

  it("판정 대상 넓이가 판정과 어긋나 보이면 늘린 글자(4.3 과 같음), 끝 0 유지", () => {
    const auroc = kpi({ metricId: "M9", name: "AUROC", value: 0.97996, threshold: 0.98, status: "fail" });
    expect(curveLines({ confusionMatrix: null, rocCurve: { ...roc, auroc: 0.97996 }, prCurve: { ...pr, auprc: 0.9 } }, [auroc])).toEqual([
      { kind: "roc", title: "ROC Curve (Y: true positive rate / X: false positive rate) — AUROC: 0.97996" },
      { kind: "pr", title: "Precision-Recall Curve (Y: precision / X: recall) — AUPRC: 0.900" },
    ]);
  });

  it("넓이 값이 없으면 제목만, 곡선이 없으면 빈 목록", () => {
    expect(curveLines({ confusionMatrix: null, rocCurve: { fpr: [0], tpr: [0] }, prCurve: null }, [])).toEqual([
      { kind: "roc", title: "ROC Curve (Y: true positive rate / X: false positive rate)" },
    ]);
    expect(curveLines({ confusionMatrix: null, rocCurve: null, prCurve: null }, [])).toEqual([]);
    expect(curveLines(undefined, [])).toEqual([]);
  });
});

describe("4.8 응답시간", () => {
  it("있으면 판 3 줄 이름 + 둘째 자리(ed4Latency) + 단위", () => {
    const v = latencyView({ mean: 0.125, min: 0, p50: 1.005, p95: 2, p99: 9.999, max: 100.1, unit: "s" });
    expect(v.missing).toBeNull();
    expect(v.table!.columns).toEqual(["항목", "값"]);
    expect(v.table!.rows).toEqual([
      ["평균 응답시간 (Mean Latency)", `${(0.125).toFixed(2)} s`],
      ["최소 응답시간 (Min Latency)", "0.00 s"],
      ["P50 응답시간", `${(1.005).toFixed(2)} s`],
      ["P95 응답시간", "2.00 s"],
      ["P99 응답시간", "10.00 s"],
      ["최대 응답시간 (Max Latency)", "100.10 s"],
    ]);
  });

  it("없으면 예시본 문장", () => {
    expect(latencyView(null)).toEqual({ table: null, missing: EX_4_8_NO_LATENCY });
    expect(latencyView(undefined)).toEqual({ table: null, missing: EX_4_8_NO_LATENCY });
  });
});
