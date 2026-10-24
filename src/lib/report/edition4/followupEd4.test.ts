/**
 * 판 4 라운드 S2·S3 후속(2026-10-24)의 프론트 몫.
 *
 * - U1(사용자 답 T3) 멀티레이블 4.5 학습·평가 비율의 분모 = 표본 수 — 평가 비율 = 그 레이블이 붙은 평가 표본 / 전체 평가 표본(4.5 분포
 *   문장과 같은 숫자), 학습 비율 = 그 레이블이 붙은 학습 표본 / 의뢰자가 준 학습 표본 수. 학습 표본 수가 없으면 비교하지 않고
 *   생략 이유를 B16(학습 분포 없음)과 다르게 저장한다(training_samples_not_provided — 고객 문장은 아직 없다). 판 3 은 그대로.
 *   숫자는 백엔드 tests/test_p4_followup_ed4.py 와 같은 사례(yeast_strong 평가 917 — Class12 688·Class13 683, 학습 1500 중 1000·900).
 * - U2(오케스트레이터 결정) 클래스별 표 F1 = `classF1TextEd4` — 공통 대조 표 distinct 의 class_table 줄(백엔드 `class_f1_text_ed4` 와
 *   같은 표).
 * - U4 판 4 최약 클래스 문제 근거 f1 = f1_text(plain 과 다른 사례 — M4 목표 0.977 → '0.9767').
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ClassReportTable, KpiResult } from "../../../types/finalReport.types";
import { DEFAULT_BASIC_INFO } from "../../../types/workflow.types";
import { assembleEvaluatedReport, type EvaluatedReportInputs } from "../assembleEvaluatedReport";
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "../mapWorkflowToFinalReport";
import { distributionShift, trainingSampleCount, weakestClass } from "../narrativeFacts";
import { buildProblemList } from "../problemList";
import type { ReportComposerInput } from "../reportMaterials";
import { classF1TextEd4 } from "./classF1Ed4";
import { buildDistributionEd4 } from "./distributionEd4";
import { ed4Plain } from "./edition4Number";

type Json = any;
const YEAST: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/yeast_strong.evaluate.json"), "utf8"));
const BC: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/bc_strong.evaluate.json"), "utf8"));
const TABLE: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/contract/number_wording_ed4.json"), "utf8"));
const SPEC: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/contract/fact_sheet_contract_ed4.json"), "utf8"));

const kpi = (p: Partial<KpiResult>): KpiResult => ({ metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", ...p });

/** ⑥ 학습 데이터 카드 — 학습 클래스 분포와 학습 표본 수("모름"이면 unknownKeys). */
function composer(classes: Record<string, string>, training: string | "unknown" | null): ReportComposerInput {
  const volume =
    training === null
      ? undefined
      : training === "unknown"
        ? // 숫자를 적었다가 "모름"을 고른 칸 — 값이 남아 있어도 모름이 이긴다(reportMaterials `entryOf` 와 같음).
          { entries: [{ key: "Training", value: "1500" }, { key: "Validation", value: "300" }], unknownKeys: ["Training"] }
        : { entries: [{ key: "Training", value: training }, { key: "Validation", value: "300" }] };
  return {
    cards: { trainingData: true, testData: false, groundTruth: false, modelEnv: false },
    metrics: {},
    perspective: {},
    trainingData: {
      trainingClassVolume: { entries: Object.entries(classes).map(([key, value]) => ({ key, value })) },
      ...(volume ? { trainingVolume: volume } : {}),
    },
    testData: {},
    groundTruth: {},
    modelEnv: {},
  } as unknown as ReportComposerInput;
}

// ── U1 ───────────────────────────────────────────────────────────────────────────────────────────────

const YEAST_EVAL: Record<string, number> = YEAST.class_distribution;
/**
 * 학습 클래스 분포 — 평가 레이블을 모두 덮는다. Class12 1000·Class13 900(학습 표본 1,500), 나머지는 평가와 같은 몫(건수 × 1500/917
 * 반올림 — 차이가 10%p 에 한참 못 미친다).
 */
const YEAST_TRAIN: Record<string, string> = Object.fromEntries(
  Object.entries(YEAST_EVAL).map(([l, n]) => [l, l === "Class12" ? "1000" : l === "Class13" ? "900" : String(Math.round((n * 1500) / 917))]),
);
const YEAST_TRAIN_SUM = Object.values(YEAST_TRAIN).reduce((a, v) => a + Number(v), 0);
const ML_SELECTED = ["M2", "M3", "M4", "M15", "M16", "M17", "M18", "M23"];

function multilabelRun(c: ReportComposerInput | undefined, contentSchema: 3 | 4) {
  const base = mapWorkflowToFinalReport(
    {
      basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "후속 주식회사", modelName: "FollowupModel" },
      taskType: "multilabel",
      selectedMetricIds: ML_SELECTED,
      metricDetails: {} as MapWorkflowToReportInput["metricDetails"],
      uploadedFile: null,
      trainingExampleFiles: [],
      trainingUnsuitableExampleFiles: [],
      columnMapping: [],
      classLabelDescriptions: {},
      metadata: null,
    },
    null,
    { contentSchema },
  );
  const inputs: EvaluatedReportInputs = {
    taskType: "multilabel",
    selectedMetricIds: ML_SELECTED,
    metricDetails: Object.fromEntries(
      ML_SELECTED.map((id) => [id, { targetValue: "", beta: "", positiveClass: "", completed: true }]),
    ) as never,
    composerMetrics: undefined,
    columnMapping: [],
    metadata: { detected_labels: Object.keys(YEAST_EVAL), class_distribution: YEAST_EVAL },
    composer: c,
  };
  return assembleEvaluatedReport(base, structuredClone(YEAST), inputs);
}

describe("U1 — 멀티레이블 4.5 학습·평가 비율의 분모는 표본 수(판 4)", () => {
  const { stage1Report, factSheet } = multilabelRun(composer(YEAST_TRAIN, "1,500"), 4);
  const facts = factSheet.facts!;
  const dist = stage1Report.edition4Values!.distribution;
  const shift = Object.fromEntries(facts.distribution_shift.map((r) => [r.label, r]));
  const table = Object.fromEntries(dist.training.rows.map((r) => [r.label, r]));

  it("사실 시트 distribution_shift — 평가 = 레이블 붙은 평가 표본 / 917, 학습 = 학습 건수 / 1,500", () => {
    expect(facts.distribution_shift_status).toBe("compared");
    expect(shift.Class12).toEqual({
      label: "Class12",
      training_ratio: 0.666666667,
      evaluation_ratio: 0.750272628,
      difference: -0.083605962,
      difference_text: "-0.084",
      flagged: false,
      evaluation_minus_training_text: "0.084",
    });
    expect(shift.Class13).toEqual({
      label: "Class13",
      training_ratio: 0.6,
      evaluation_ratio: 0.744820065,
      difference: -0.144820065,
      difference_text: "-0.145",
      flagged: true,
      evaluation_minus_training_text: "0.145",
    });
    // 평가 비율의 합은 100% 를 넘는다(레이블이 여럿인 표본).
    expect(facts.distribution_shift.reduce((a, r) => a + r.evaluation_ratio, 0)).toBeGreaterThan(1);
  });

  it("4.5 분포 문장과 비율 표가 같은 퍼센트(Class12 75.0%·Class13 74.5%)", () => {
    expect(dist.distributionSentence).toContain("평가 데이터셋은 총 917건이며,");
    expect(dist.distributionSentence).toContain("Class12 688건(75.0%), Class13 683건(74.5%)");
    expect(dist.training.status).toBe("compared");
    expect(table.Class12).toMatchObject({ trainingText: "66.7%", evaluationText: "75.0%", differenceText: "+8.4%p" });
    expect(table.Class13).toMatchObject({ trainingText: "60.0%", evaluationText: "74.5%", differenceText: "+14.5%p" });
    // 표의 모든 평가 칸이 분포 문장의 퍼센트와 같다.
    for (const r of dist.training.rows) expect(dist.distributionSentence).toContain(`${r.label} ${YEAST_EVAL[r.label]}건(${r.evaluationText})`);
  });

  it("레이블 등장 합 분모(종전 — Class12 688/3,899 = 17.6%)가 아니다", () => {
    const occurrences = Object.values(YEAST_EVAL).reduce((a, b) => a + b, 0);
    expect(occurrences).toBe(3899);
    expect(table.Class12.evaluationText).not.toBe("17.6%");
    expect(shift.Class12.evaluation_ratio).not.toBeCloseTo(688 / occurrences, 6);
  });

  it("6절 분포 차 문제는 같은 비율로(10%p 이상인 Class13 만)", () => {
    const p = factSheet.problems.find((x) => x.kind === "distribution_shift");
    expect(p?.evidence).toEqual({ Class13: { training_ratio: "0.600", evaluation_ratio: "0.745", difference: "-0.145" } });
  });

  it("판 3 run 은 그대로 — 레이블 등장 합 분모(판 3 정답과 같은 식)", () => {
    const three = multilabelRun(composer(YEAST_TRAIN, "1,500"), 3).factSheet.facts!;
    const r12 = three.distribution_shift.find((r) => r.label === "Class12")!;
    expect(r12.evaluation_ratio).toBeCloseTo(688 / 3899, 8);
    expect(YEAST_TRAIN_SUM).toBeGreaterThan(1500); // 레이블 등장 합 ≠ 학습 표본 수
    expect(r12.training_ratio).toBeCloseTo(1000 / YEAST_TRAIN_SUM, 8);
    expect(r12).not.toHaveProperty("evaluation_minus_training_text");
  });
});

describe("U1 — 학습 표본 수가 없으면 비교하지 않고 B16 과 다른 이유를 저장한다", () => {
  it.each([
    ["모름", "unknown"],
    ["빈 칸", ""],
    ["숫자 아님", "많음"],
    ["0", "0"],
    ["칸 없음", null],
  ] as const)("학습 표본 수 %s → training_samples_not_provided, 표·분포 차 없음", (_name, training) => {
    const { stage1Report, factSheet } = multilabelRun(composer(YEAST_TRAIN, training), 4);
    expect([factSheet.facts!.distribution_shift_status, factSheet.facts!.distribution_shift]).toEqual(["training_samples_not_provided", []]);
    expect(stage1Report.edition4Values!.distribution.training).toEqual({ status: "training_samples_not_provided", rows: [] });
    expect(factSheet.problems.some((p) => p.kind === "distribution_shift")).toBe(false);
  });

  it("학습 분포가 없으면 종전대로 not_provided(B16), 판 3 멀티는 학습 표본 수와 무관하게 비교", () => {
    expect(multilabelRun(undefined, 4).factSheet.facts!.distribution_shift_status).toBe("not_provided");
    expect(multilabelRun(composer(YEAST_TRAIN, "unknown"), 3).factSheet.facts!.distribution_shift_status).toBe("compared");
  });

  it("이 상태의 4.5 자리에는 B16 문장이 저장되지 않는다(고객 문장은 아직 정해지지 않음 — 계약 not_decided)", () => {
    const { stage1Report } = multilabelRun(composer(YEAST_TRAIN, "unknown"), 4);
    const text = JSON.stringify(stage1Report.edition4Values!.distribution);
    expect(text).not.toContain("학습 클래스 분포가 제공되지 않아");
    expect((SPEC.not_decided as string[]).some((q) => q.includes("training_samples_not_provided"))).toBe(true);
  });

  it("이진·다중은 학습 표본 수를 보지 않는다(원래 표본 수 분모)", () => {
    const c = composer({ benign: "250", malignant: "148" }, "unknown");
    const binary = distributionShift(c, { benign: 107, malignant: 64 }, true, null);
    expect(binary.status).toBe("compared");
    expect(binary.rows.map((r) => r.evaluation_minus_training_text)).toEqual(["-0.002", "0.002"]);
  });
});

describe("U1 — 학습 분포에 없는 레이블이 있을 때(uncovered)도 같은 분모", () => {
  it("평가 = 건수 / 평가 표본 수, 학습 = 건수 / 학습 표본 수, 학습에 없는 레이블은 '—'", () => {
    const c = composer({ a: "60", b: "30" }, "100");
    const evaluation = { a: 40, b: 30, c: 10 };
    const shift = distributionShift(c, evaluation, true, 50);
    expect(shift.status).toBe("uncovered");
    const d = buildDistributionEd4({
      taskType: "multilabel",
      classDistribution: evaluation,
      nSamples: 50,
      imbalanceRatio: 4,
      imbalanceEffect: null,
      facts: { distribution_shift_status: shift.status, distribution_shift: shift.rows },
      composer: c,
    });
    expect(d.distributionSentence).toBe("평가 데이터셋은 총 50건이며, 클래스(레이블)별 분포는 a 40건(80.0%), b 30건(60.0%), c 10건(20.0%)이다.");
    expect(d.training.rows.map((r) => [r.label, r.trainingText, r.evaluationText, r.differenceText])).toEqual([
      ["a", "60.0%", "80.0%", "+20.0%p"],
      ["b", "30.0%", "60.0%", "+30.0%p"],
      ["c", null, "20.0%", null],
    ]);
  });

  it("평가 표본 수가 0(서버 값 없음)이면 평가 분모는 레이블 등장 합으로 대신한다(4.5 분포 문장과 같은 대체)", () => {
    const c = composer({ a: "60", b: "30" }, "100");
    const shift = distributionShift(c, { a: 30, b: 10 }, true, 0);
    expect(shift.rows.map((r) => [r.label, r.evaluation_ratio, r.training_ratio])).toEqual([
      ["a", 0.75, 0.6],
      ["b", 0.25, 0.3],
    ]);
  });

  it("학습 표본 수가 없으면 uncovered 보다 먼저 training_samples_not_provided(학습 칸 비율을 낼 수 없다)", () => {
    expect(distributionShift(composer({ a: "60" }, null), { a: 40, c: 10 }, true, 50).status).toBe("training_samples_not_provided");
  });
});

describe("U1 — 학습 표본 수 읽기(trainingSampleCount)", () => {
  it("쉼표·공백을 걷고, 모름·빈 칸·0·숫자 아님·카드 끔은 null", () => {
    expect(trainingSampleCount(composer({}, "1,500"))).toBe(1500);
    expect(trainingSampleCount(composer({}, " 12 000 "))).toBe(12000);
    for (const t of ["unknown", "", "0", "-3", "많음", null] as const) expect([t, trainingSampleCount(composer({}, t))]).toEqual([t, null]);
    const off = composer({}, "1500");
    expect(trainingSampleCount({ ...off, cards: { ...off.cards, trainingData: false } })).toBeNull();
  });
});

// ── U2 ───────────────────────────────────────────────────────────────────────────────────────────────

const CLASS_ROWS: Json[] = (TABLE.number_cases as Json[]).filter((c) => c.rule === "distinct" && c.class_table);

describe("U2 — 클래스별 표 F1(classF1TextEd4) = 공통 대조 표 class_table 줄", () => {
  it("줄 다섯, others 는 최약 F1 하나, 함수 이름은 명세 약속", () => {
    expect(CLASS_ROWS.length).toBe(5);
    expect(CLASS_ROWS.every((c) => c.others.length === 1)).toBe(true);
    expect(SPEC.function_names.class_f1.frontend).toMatch(/^classF1TextEd4 /);
  });

  it.each(CLASS_ROWS.map((c) => [c.expected, c] as const))("%s", (_name, c) => {
    // 최약 = others[0](f1_text 는 판 4 사실 시트처럼 실려 있다), 판정 대상 지표 원값과는 다르다(D2 가 끼지 않음).
    const weakest = { label: "9", f1: c.others[0], f1_text: "0.9720" };
    const kpis = [kpi({ metricId: "M1", value: 0.9888888888888889, threshold: 0.95 })];
    expect(classF1TextEd4("5", c.value, { weakest, kpiResults: kpis })).toBe(c.expected);
  });

  it("최약 클래스 칸은 사실 시트 f1_text(4.4·5절과 같은 글자), 없으면 같은 규칙으로 다시 낸다", () => {
    const rows = [
      { label: "5", precision: 1, recall: 1, f1: 0.9724770642201835, support: 55 },
      { label: "9", precision: 1, recall: 1, f1: 0.9719626168224299, support: 54 },
      { label: "3", precision: 1, recall: 1, f1: 0.9906542056074766, support: 54 },
    ];
    const t: ClassReportTable = { rows, averages: [] };
    const w = weakestClass(t, true, [])!;
    expect([w.label, w.f1_text]).toEqual(["9", "0.9720"]);
    const ctx = { weakest: w, kpiResults: [] };
    expect(rows.map((r) => classF1TextEd4(r.label, r.f1, ctx))).toEqual(["0.9725", "0.9720", "0.991"]);
    // f1_text 가 없는 사실(판 3 고르기)이면 클래스 줄로 다시 낸다 — 같은 글자.
    const bare = { label: w.label, f1: w.f1 };
    expect(classF1TextEd4("9", w.f1, { weakest: bare, kpiResults: [], classRows: rows })).toBe("0.9720");
  });

  it("같은 원값의 판정 대상 지표가 있으면 그 value_text 가 먼저(D2) — 최약과 부딪쳐도", () => {
    const weakest = { label: "9", f1: 0.9719626168224299, f1_text: "0.9720" };
    const kpis = [kpi({ metricId: "M4", name: "F1 Score", value: 0.9724770642201835, threshold: 0.97 })];
    // value_text: 0.972 는 목표 0.970 과 겨뤄 충족으로 읽혀 셋째 자리 — distinct 라면 0.9725.
    expect(classF1TextEd4("5", 0.9724770642201835, { weakest, kpiResults: kpis })).toBe("0.972");
    expect(classF1TextEd4("5", 0.9724770642201835, { weakest, kpiResults: [] })).toBe("0.9725");
  });

  it("최약 클래스가 없으면 D2 → plain, 값이 없으면 null", () => {
    expect(classF1TextEd4("a", 0.97248, { weakest: null, kpiResults: [] })).toBe("0.972");
    const kpis = [kpi({ metricId: "M4", value: 0.9696, threshold: 0.97, status: "fail" })];
    expect(classF1TextEd4("a", 0.9696, { weakest: null, kpiResults: kpis })).toBe("0.9696");
    expect(classF1TextEd4("a", null, { weakest: null, kpiResults: [] })).toBeNull();
  });
});

// ── U4 ───────────────────────────────────────────────────────────────────────────────────────────────

describe("U4 — 판 4 최약 클래스 문제 근거 f1 = f1_text(plain 과 다른 사례)", () => {
  // F1 Score 목표 0.977: 원값 0.976744… 은 미달인데 셋째 자리 0.977 은 충족처럼 보여 value_text 가 0.9767 로 늘어난다(D2).
  const m4 = kpi({ metricId: "M4", name: "F1 Score", value: 0.9767441860465116, threshold: 0.977, status: "fail" });
  const t: ClassReportTable = {
    rows: [
      { label: "benign", precision: 0.99, recall: 0.98, f1: 0.9859154929577465, support: 500 },
      { label: "malignant", precision: 0.98, recall: 0.97, f1: 0.9767441860465116, support: 12 },
    ],
    averages: [],
  };

  it("support 를 작게 해 문제 조건(작은 표본)에 걸리면 근거 f1 = '0.9767'(plain 이라면 '0.977')", () => {
    const w = weakestClass(t, true, [m4])!;
    expect([w.label, w.low_support, w.f1_text, ed4Plain(w.f1)]).toEqual(["malignant", true, "0.9767", "0.977"]);
    const p = buildProblemList({
      kpiResults: [m4],
      taskType: "binary",
      coreMetricIds: [],
      thresholdGain: null,
      imbalanceEffect: null,
      facts: { weakest_class: w, distribution_shift: [] },
      edition: 4,
    }).find((x) => x.kind === "weakest_class")!;
    expect(p.evidence).toEqual({
      malignant: { f1: "0.9767", support: 12, share: "0.023", macro_f1: null, gap_from_macro: null, low_support: true },
    });
  });

  it("D3 로 늘어난 f1_text 도 그대로 — 같은 원값의 판정 대상 지표가 없고 다른 클래스와 셋째 자리로 같으면 '0.9720'(D2·plain 이라면 '0.972')", () => {
    // 후속 검토 지적: 위 사례는 f1_text 와 D2(같은 원값 지표의 value_text)가 같은 글자라, 근거 f1 을 D2·plain 으로 다시 내도 가리지 못했다.
    // 대조 표 distinct class_table 줄의 digits_strong 숫자(최약 9 0.97196…, 5 0.97248…) — M4 원값은 어느 클래스와도 다르다.
    const m4other = kpi({ metricId: "M4", name: "F1 Score", value: 0.98, threshold: 0.95, status: "pass" });
    const d: ClassReportTable = {
      rows: [
        { label: "5", precision: 0.98, recall: 0.97, f1: 0.9724770642201835, support: 500 },
        { label: "9", precision: 0.97, recall: 0.97, f1: 0.9719626168224299, support: 12 },
      ],
      averages: [],
    };
    const w = weakestClass(d, true, [m4other])!;
    expect([w.label, w.low_support, w.f1_text, ed4Plain(w.f1)]).toEqual(["9", true, "0.9720", "0.972"]);
    const p = buildProblemList({
      kpiResults: [m4other],
      taskType: "multiclass",
      coreMetricIds: [],
      thresholdGain: null,
      imbalanceEffect: null,
      facts: { weakest_class: w, distribution_shift: [] },
      edition: 4,
    }).find((x) => x.kind === "weakest_class")!;
    expect((p.evidence as Json)["9"].f1).toBe("0.9720");
    // 같은 표의 클래스별 F1(U2)과도 맞물린다 — 5 는 최약과 부딪쳐 넷째 자리.
    expect(classF1TextEd4("5", 0.9724770642201835, { weakest: w, kpiResults: [m4other] })).toBe("0.9725");
  });

  it("조립 배선 — bc_strong 판 4 run(M4 목표 0.977)의 사실 시트 최약 클래스 문제 근거도 같은 글자", () => {
    // bc_strong 의 malignant support 는 64(작은 표본 아님) — 응답 사본에서 support 를 12 로 줄여 문제 조건에 걸리게 한다.
    const evaluate = structuredClone(BC);
    const malignant = evaluate.results.success_metrics.class_report.malignant;
    expect([malignant["f1-score"], malignant.support]).toEqual([0.9767441860465116, 64]);
    malignant.support = 12;
    const selected = ["M1", "M2", "M3", "M4", "M9", "M10", "M19", "M23"];
    const targets: Record<string, string> = { M1: "0.95", M3: "0.97", M4: "0.977", M9: "0.98", M19: "0.1" };
    const base = mapWorkflowToFinalReport(
      {
        basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "후속 주식회사", modelName: "FollowupModel" },
        taskType: "binary",
        selectedMetricIds: selected,
        metricDetails: {} as MapWorkflowToReportInput["metricDetails"],
        uploadedFile: null,
        trainingExampleFiles: [],
        trainingUnsuitableExampleFiles: [],
        columnMapping: [],
        classLabelDescriptions: {},
        metadata: null,
      },
      null,
      { contentSchema: 4 },
    );
    const { factSheet } = assembleEvaluatedReport(base, evaluate, {
      taskType: "binary",
      selectedMetricIds: selected,
      metricDetails: Object.fromEntries(
        selected.map((id) => [id, { targetValue: targets[id] ?? "", beta: "", positiveClass: "", completed: true }]),
      ) as never,
      composerMetrics: { coreMetrics: { choices: ["M3"] } },
      columnMapping: [],
      metadata: { positive_class: "malignant", detected_classes: ["benign", "malignant"], class_distribution: { benign: 107, malignant: 64 } },
      composer: undefined,
    });
    const w = factSheet.facts!.weakest_class!;
    expect([w.label, w.support, w.low_support, w.f1_text]).toEqual(["malignant", 12, true, "0.9767"]);
    const p = factSheet.problems.find((x) => x.kind === "weakest_class")!;
    expect((p.evidence as Json).malignant.f1).toBe("0.9767");
  });
});

describe("U1 — 분포 차 문제 근거는 백엔드 상한 안(판 4 멀티는 걸리는 레이블 수에 상한이 없다)", () => {
  /** 파이썬 json.dumps(ensure_ascii=False) 길이 — 이름에 따옴표·쌍점·쉼표가 없는 이 사례에서는 구분자에 빈칸을 더한 것. */
  const pyLength = (v: unknown) => JSON.stringify(v).replace(/":/g, '": ').replace(/,"/g, ', "').length;
  const row = (i: number, gap: number) => ({
    label: `레이블-${String(i).padStart(3, "0")}-${"x".repeat(20)}`,
    training_ratio: 0.1,
    evaluation_ratio: 0.1 + gap,
    difference: -gap,
    difference_text: (-gap).toFixed(3),
    flagged: true,
    evaluation_minus_training_text: gap.toFixed(3),
  });
  const problem = (rows: ReturnType<typeof row>[], edition: 3 | 4) =>
    buildProblemList({
      kpiResults: [],
      taskType: "multilabel",
      coreMetricIds: [],
      thresholdGain: null,
      imbalanceEffect: null,
      facts: { weakest_class: null, distribution_shift: rows },
      edition,
    }).find((p) => p.kind === "distribution_shift")!;

  it("넘치면 |차이| 가 큰 레이블부터 들어가는 만큼만, 원래 순서로", () => {
    const rows = Array.from({ length: 256 }, (_, i) => row(i, 0.1 + (i % 50) / 100));
    const ev = problem(rows, 4).evidence as Record<string, Json>;
    expect(pyLength(Object.fromEntries(rows.map((r) => [r.label, { training_ratio: "0.100", evaluation_ratio: r.evaluation_ratio.toFixed(3), difference: r.difference_text }])))).toBeGreaterThan(20_000);
    const kept = Object.keys(ev);
    expect(kept.length).toBeLessThan(256);
    expect(pyLength(ev)).toBeLessThanOrEqual(20_000);
    // 빠진 레이블의 |차이| 는 남은 어느 레이블보다 크지 않다.
    const gapOf = (label: string) => Math.abs(rows.find((r) => r.label === label)!.difference);
    const minKept = Math.min(...kept.map(gapOf));
    expect(rows.filter((r) => !(r.label in ev)).every((r) => Math.abs(r.difference) <= minKept)).toBe(true);
    expect(kept).toEqual(rows.map((r) => r.label).filter((l) => l in ev));
  });

  it("상한은 파이썬 길이(구분자 빈칸 포함)로 잰다 — JSON.stringify 로는 들어가도 넘치면 자른다", () => {
    // 압축 길이는 상한 안, 파이썬 길이는 상한 밖인 줄 수를 찾는다.
    const evidence = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => row(i, 0.2)).map((r) => [r.label, { training_ratio: "0.100", evaluation_ratio: "0.300", difference: "-0.200" }]));
    let n = 1;
    while (pyLength(evidence(n + 1)) <= 20_000) n += 1;
    expect(JSON.stringify(evidence(n + 1)).length).toBeLessThanOrEqual(20_000);
    const ev = problem(Array.from({ length: n + 1 }, (_, i) => row(i, 0.2)), 4).evidence;
    expect(Object.keys(ev).length).toBe(n);
  });

  it("들어가면 그대로, 판 3 은 자르지 않는다(판 3 정답 불변)", () => {
    const few = Array.from({ length: 5 }, (_, i) => row(i, 0.2));
    expect(Object.keys(problem(few, 4).evidence).length).toBe(5);
    const many = Array.from({ length: 256 }, (_, i) => row(i, 0.2));
    expect(Object.keys(problem(many, 3).evidence).length).toBe(256);
  });
});
