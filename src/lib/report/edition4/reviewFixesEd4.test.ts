/**
 * S2·S3 검토 반영(2026-10-24 사용자 답변·오케스트레이터 결정)의 프론트 몫 — 판 4 생성값과 판 4 사실 시트 글자.
 *
 * - D1 목표값: 넷째 자리 이상 목표는 받은 글자 그대로(3.1 metricList·표지 핵심 지표 줄·문제 근거). 판 3 run 은 셋째 자리 그대로.
 * - D2 같은 수는 같은 글자: 최약 클래스 F1(f1_text)·불균형 표시값 넷이 판정 대상 지표 원값과 같으면 그 value_text.
 * - D3 최약 클래스 동점: 여섯째 자리 표기로 같으면 동점(엔진 순서 앞), 셋째 자리로 같아 보이면 늘림.
 * - D6 문제 근거: 임계값 조정은 엔진 칸 다섯만 판 4 글자로, 분포 차는 difference_text.
 * - D7·T15 결정 임계값: 지수 꼴·정수 꼴도 `ed4Given`(고정 문구 9, 4.4 머리).
 * - T8 분포 문장 건수: 로캘을 박는다('en-US').
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClassReportTable, KpiResult } from "../../../types/finalReport.types";
import { DEFAULT_BASIC_INFO } from "../../../types/workflow.types";
import { assembleEvaluatedReport, type EvaluatedReportInputs } from "../assembleEvaluatedReport";
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "../mapWorkflowToFinalReport";
import { averageGap, distributionShift, weakestClass, type DistributionShiftRow } from "../narrativeFacts";
import { buildProblemList, type ProblemListInput } from "../problemList";
import type { ReportComposerInput } from "../reportMaterials";
import { buildDistributionEd4, countText } from "./distributionEd4";
import { derivationStatementEd4 } from "./edition4Text";
import { buildThresholdTableEd4, type F1ThresholdGainRawEd4 } from "./thresholdGainEd4";

type Json = any;
const NEW: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/bc_strong.evaluate.json"), "utf8"));
const SELECTED = ["M1", "M2", "M3", "M4", "M9", "M10", "M19", "M23"];

function inputs(targets: Record<string, string>): EvaluatedReportInputs {
  const details = (target: string) => ({ targetValue: target, beta: "", positiveClass: "", completed: true }) as never;
  return {
    taskType: "binary",
    selectedMetricIds: SELECTED,
    metricDetails: Object.fromEntries(SELECTED.map((id) => [id, details(targets[id] ?? "")])),
    composerMetrics: { coreMetrics: { choices: ["M3"] } },
    columnMapping: [],
    metadata: { positive_class: "malignant", detected_classes: ["benign", "malignant"], class_distribution: { benign: 107, malignant: 64 } },
    composer: undefined,
  };
}

function base(contentSchema: 3 | 4, metricDetails: Record<string, { targetValue: string }> = {}) {
  return mapWorkflowToFinalReport(
    {
      basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "검토 주식회사", modelName: "ReviewModel" },
      taskType: "binary",
      selectedMetricIds: SELECTED,
      metricDetails: metricDetails as unknown as MapWorkflowToReportInput["metricDetails"],
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
}

const kpi = (p: Partial<KpiResult>): KpiResult => ({ metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", ...p });
const row = (label: string, f1: number, support = 50) => ({ label, precision: f1, recall: f1, f1, support });

describe("D1 — 넷째 자리 목표는 받은 글자 그대로(목표 0.9844 · Recall 0.984375 미달)", () => {
  const targets = { M1: "0.95", M3: "0.9844", M4: "0.95", M9: "0.98", M19: "0.1" };

  it("3.1 합격 기준: 판 4 '≥ 0.9844', 판 3 은 셋째 자리 '≥ 0.984' 그대로", () => {
    const details = Object.fromEntries(Object.entries(targets).map(([id, t]) => [id, { targetValue: t }]));
    const criteria = (schema: 3 | 4) =>
      Object.fromEntries(base(schema, details).metricList.map((m) => [m.metricId, m.passCriteria]));
    expect(criteria(4)).toMatchObject({ M3: "≥ 0.9844", M1: "≥ 0.950", M19: "≤ 0.100" });
    expect(criteria(3)).toMatchObject({ M3: "≥ 0.984", M1: "≥ 0.950", M19: "≤ 0.100" });
  });

  it("표지 핵심 지표 줄과 핵심 미달 근거 — 값 0.984 는 기준 0.9844 와 겨뤄 미달로 읽힌다", () => {
    const { stage1Report, factSheet } = assembleEvaluatedReport(base(4), structuredClone(NEW), inputs(targets));
    const core = stage1Report.edition4Values!.coverResultRows.find((r) => r.label === "핵심 지표")!;
    expect(core.value).toMatch(/^Recall 0\.984 \(합격 기준 ≥ 0\.9844, 미달, /);
    const fail = factSheet.problems.find((p) => p.kind === "core_fail")!;
    expect(fail.evidence).toEqual({ Recall: { value: "0.984", target: "0.9844" } });
    expect(factSheet.metrics.find((m) => m.metric_id === "M3")!.value_text).toBe("0.984");
  });
});

describe("D2 — 최약 클래스 F1 과 불균형 표시값은 판정 대상 지표와 같은 원값이면 그 value_text", () => {
  // F1 Score 목표 0.977: 원값 0.976744… 은 미달인데 셋째 자리 0.977 은 충족처럼 보여 value_text 가 0.9767 로 늘어난다.
  const targets = { M1: "0.95", M3: "0.97", M4: "0.977", M9: "0.98", M19: "0.1" };
  const { factSheet } = assembleEvaluatedReport(base(4), structuredClone(NEW), inputs(targets));
  const m4 = factSheet.metrics.find((m) => m.metric_id === "M4")!;

  it("최약 클래스 malignant F1 = M4 원값 → f1_text 는 M4 value_text '0.9767'(distinct 라면 '0.977')", () => {
    expect(m4.value_text).toBe("0.9767");
    const w = factSheet.facts!.weakest_class!;
    expect([w.label, w.f1]).toEqual(["malignant", m4.value]);
    expect(w.f1_text).toBe("0.9767");
  });

  it("불균형 표시값 minority_f1(malignant F1)도 같은 글자, 다른 값은 plain", () => {
    expect(factSheet.imbalance_effect!.display).toMatchObject({ minority_f1: "0.9767", majority_f1: "0.986", accuracy: "0.982" });
  });

  it("판 3 run 에는 f1_text 키가 없다", () => {
    const three = assembleEvaluatedReport(base(3), structuredClone(NEW), inputs(targets)).factSheet;
    expect(three.facts!.weakest_class).not.toHaveProperty("f1_text");
  });
});

describe("D3 — 최약 클래스 동점·늘림", () => {
  const table = (rows: ReturnType<typeof row>[]): ClassReportTable => ({ rows, averages: [] });

  it("셋째 자리로 같아 보이면 늘린다(0.97196 · 0.97248 → '0.9720')", () => {
    const w = weakestClass(table([row("a", 0.99), row("5", 0.9724770642201835), row("9", 0.9719626168224299)]), true)!;
    expect([w.label, w.f1_text]).toEqual(["9", "0.9720"]);
  });

  it("여섯째 자리로 같으면 동점 — 엔진 순서 앞, 늘리지 않는다(판 3 은 원값 최저)", () => {
    const rows = [row("x", 0.9721004), row("y", 0.9721001), row("z", 0.99)];
    const four = weakestClass(table(rows), true)!;
    expect([four.label, four.f1_text]).toEqual(["x", "0.972"]);
    expect(weakestClass(table(rows), false)!.label).toBe("y");
    expect(weakestClass(table(rows), false)).not.toHaveProperty("f1_text");
  });

  it("멀티레이블 평균 차이의 기준 레이블도 같은 고르기", () => {
    const t: ClassReportTable = {
      rows: [row("x", 0.9721004), row("y", 0.9721001), row("z", 0.99)],
      averages: [row("매크로 평균", 0.98), row("마이크로 평균", 0.985)],
    };
    expect(averageGap("multilabel", t, true)!.reference_class.label).toBe("x");
    expect(averageGap("multilabel", t, false)!.reference_class.label).toBe("y");
  });

  it("판정 대상 지표와 같은 원값이면 그 value_text 가 먼저(D2 > D3)", () => {
    const t = table([row("a", 0.99), row("b", 0.9696)]);
    const kpis = [kpi({ metricId: "M4", name: "F1 Score", value: 0.9696, threshold: 0.97, status: "fail" })];
    expect(weakestClass(t, true, kpis)!.f1_text).toBe("0.9696");
    expect(weakestClass(t, true, [])!.f1_text).toBe("0.970");
  });
});

describe("D6 — 문제 근거의 판 4 글자", () => {
  const facts = { weakest_class: null, distribution_shift: [] as DistributionShiftRow[] };
  const base6: ProblemListInput = {
    kpiResults: [kpi({ metricId: "M4", name: "F1 Score", value: 0.9, threshold: 0.8 })],
    taskType: "binary",
    coreMetricIds: ["M4"],
    thresholdGain: null,
    imbalanceEffect: null,
    facts,
    edition: 4,
  };
  const raw: F1ThresholdGainRawEd4 = {
    bestThresholdText: "0.00001",
    maxF1: 0.95,
    currentF1: 0.8,
    gain: 0.15,
    bestRecall: 0.9,
    bestPrecision: 0.9,
    currentRecall: 0.7,
    currentPrecision: 0.7,
  };
  const ed3 = { max_f1: 0.95, current_f1: 0.8, gain: 0.15, best_threshold: 1e-5, notable: true, gain_text: "0.15" };

  it("임계값 조정 — 엔진 칸 다섯만, 판 4 글자로(판 4 파서의 *_raw·best_recall·판 3 gain_text 는 섞이지 않는다)", () => {
    const [p] = buildProblemList({ ...base6, thresholdGain: ed3, thresholdGainRaw: raw });
    expect(p.kind).toBe("threshold_tuning");
    // 지금 F1 은 사실 시트 current_f1_text 와 같은 규칙 — 산출한 F1 Score(M4) 가 있으면 그 값(0.9, 4.3 과 같은 글자).
    expect(p.evidence).toEqual({ max_f1: "0.950", current_f1: "0.900", gain: "0.150", best_threshold: "0.00001", notable: true });
    // 판 3 run 은 판 3 파서 결과를 그대로 펼친다(바이트 불변).
    const [three] = buildProblemList({ ...base6, thresholdGain: ed3, edition: 3 });
    expect(three.evidence).toEqual(ed3);
  });

  it("임계값 조정 — 엔진 표기가 없으면 best_threshold 는 ed4Given(지수 꼴 없이 — String(1e-7) 은 '1e-7')", () => {
    const [p] = buildProblemList({
      ...base6,
      thresholdGain: { ...ed3, best_threshold: 1e-7 },
      thresholdGainRaw: { ...raw, bestThresholdText: null },
    });
    expect(p.evidence).toMatchObject({ best_threshold: "0.0000001" });
  });

  it("최약 클래스 — f1·share·gap 은 사실 칸 글자, 매크로 F1 은 판정 대상 지표와 같은 원값이면 그 value_text(D2)", () => {
    const t: ClassReportTable = {
      rows: [row("a", 0.99, 500), row("b", 0.8, 10)],
      averages: [row("매크로 평균", 0.9696)],
    };
    const kpis = [kpi({ metricId: "M4", name: "F1 Score", value: 0.9696, threshold: 0.97, status: "fail" })];
    const w = weakestClass(t, true, kpis)!;
    const p = buildProblemList({ ...base6, kpiResults: kpis, coreMetricIds: [], facts: { weakest_class: w, distribution_shift: [] } }).find(
      (x) => x.kind === "weakest_class",
    )!;
    expect(p.evidence).toEqual({
      b: { f1: "0.800", support: 10, share: "0.020", macro_f1: "0.9696", gap_from_macro: "0.170", low_support: true },
    });
    expect([w.f1_text, w.share_text, w.gap_text]).toEqual(["0.800", "0.020", "0.170"]);
  });

  it("분포 차 — difference_text, 비율은 plain", () => {
    const shift: DistributionShiftRow = {
      label: "a",
      training_ratio: 0.5,
      evaluation_ratio: 0.6234,
      difference: 0.1234,
      difference_text: "0.123",
      flagged: true,
    };
    const [p] = buildProblemList({ ...base6, facts: { weakest_class: null, distribution_shift: [shift] } });
    expect(p.evidence).toEqual({ a: { training_ratio: "0.500", evaluation_ratio: "0.623", difference: "0.123" } });
  });
});

describe("D6 — 조립에서 임계값 조정 근거 = 사실 시트 f1_threshold_gain 의 판 4 글자(반올림 전 값을 넘기는 배선)", () => {
  it("넷째 자리 max_f1 0.9846 이 아니라 원값 0.98444 로 '0.984', 다섯 칸만", () => {
    const r = structuredClone(NEW);
    const g = r.results.success_metrics.f1_threshold_gain;
    Object.assign(g, { max_f1: 0.9846, max_f1_raw: 0.98444, gain: 0.15, gain_raw: 0.15, notable: true });
    const targets = { M1: "0.95", M3: "0.97", M4: "0.95", M9: "0.98", M19: "0.1" };
    const { factSheet } = assembleEvaluatedReport(base(4), r, inputs(targets));
    const p = factSheet.problems.find((x) => x.kind === "threshold_tuning")!;
    const fg = factSheet.f1_threshold_gain!;
    expect(p.evidence).toEqual({
      max_f1: fg.max_f1_text,
      current_f1: fg.current_f1_text,
      gain: fg.gain_text,
      best_threshold: fg.best_threshold_text,
      notable: true,
    });
    expect(p.evidence).toEqual({ max_f1: "0.984", current_f1: "0.977", gain: "0.150", best_threshold: "0.6166", notable: true });
  });
});

describe("D7·T15 — 결정 임계값은 ed4Given(정수 꼴 소수점 없이, 지수 꼴 없이)", () => {
  it("고정 문구 9", () => {
    expect(derivationStatementEd4({ method: "threshold", threshold: 1e-7 })).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.0000001을 적용하여 산출하였습니다.",
    );
    expect(derivationStatementEd4({ method: "threshold", threshold: 1 })).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 1을 적용하여 산출하였습니다.",
    );
  });

  it("4.4 임계값 표 머리", () => {
    const ed3 = { max_f1: 0.95, current_f1: 0.8, gain: 0.15, best_threshold: 0.3 };
    const raw: F1ThresholdGainRawEd4 = {
      bestThresholdText: "0.3",
      maxF1: 0.95,
      currentF1: 0.8,
      gain: 0.15,
      bestRecall: null,
      bestPrecision: null,
      currentRecall: null,
      currentPrecision: null,
    };
    const table = buildThresholdTableEd4(raw, ed3, [], { method: "threshold", threshold: 1e-7 } as never);
    expect(table.current).toEqual({ kind: "threshold", thresholdText: "0.0000001" });
  });
});

describe("T8 — 분포 문장 건수는 로캘과 무관하게 천 단위 쉼표", () => {
  afterEach(() => vi.restoreAllMocks());

  it("로캘 인자 없이 부르면 다른 글자가 나오게 해도(브라우저 로캘 흉내) 문장은 2,500·1,500", () => {
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (this: number, ...args: unknown[]) {
      return args.length === 0 || args[0] === undefined ? "BROWSER" : original.apply(this, args as never);
    });
    expect(countText(2500)).toBe("2,500");
    const c = {
      cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
      metrics: {},
      perspective: {},
      trainingData: {},
      testData: {},
      groundTruth: {},
      modelEnv: {},
    } as unknown as ReportComposerInput;
    const evaluation = { a: 1500, b: 1000 };
    const shift = distributionShift(c, evaluation, true);
    const d = buildDistributionEd4({
      taskType: "binary",
      classDistribution: evaluation,
      nSamples: 2500,
      imbalanceRatio: 1.5,
      imbalanceEffect: null,
      facts: { distribution_shift_status: shift.status, distribution_shift: shift.rows },
      composer: c,
    });
    expect(d.distributionSentence).toBe("평가 데이터셋은 총 2,500건이며, 클래스(레이블)별 분포는 a 1,500건(60.0%), b 1,000건(40.0%)이다.");
  });
});
