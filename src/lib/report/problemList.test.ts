import { describe, expect, it } from "vitest";

import {
  buildProblemList,
  labelCautions,
  parseF1ThresholdGain,
  parseImbalanceEffect,
  problemLabel,
  type ProblemListInput,
} from "./problemList";
import type { ReportComposerInput } from "./reportMaterials";
import type {
  ClassReportRow,
  ClassReportTable,
  ImbalanceEffect,
  KpiResult,
} from "../../types/finalReport.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";

/**
 * 9절 문제 목록(서술 설계 D22) — 9종의 조건·경계, 번호 순서, 파서.
 *
 * 경계값은 규칙을 일부러 틀리게 바꾸면 실패하도록 "꼭 기준값"과 "기준값 바로 옆"을 함께 둔다.
 */

function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", ...p };
}

/** 문제가 하나도 없는 기본 입력 — 핵심 M1·M4 합격(여유 있음), 비핵심 없음. */
function input(overrides: Partial<ProblemListInput> = {}): ProblemListInput {
  return {
    kpiResults: [
      kpi({ metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8 }),
      kpi({ metricId: "M4", name: "F1 Score", value: 0.9, threshold: 0.8 }),
    ],
    taskType: "binary",
    coreMetricIds: ["M1", "M4"],
    thresholdGain: null,
    imbalanceEffect: null,
    classReport: null,
    evaluationDistribution: {},
    ...overrides,
  };
}

function composer(p: {
  cards?: Partial<ReportComposerInput["cards"]>;
  trainingData?: ComposerValueMap;
  groundTruth?: ComposerValueMap;
} = {}): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true, ...p.cards } as ReportComposerInput["cards"],
    metrics: {},
    perspective: {},
    trainingData: p.trainingData ?? {},
    testData: {},
    groundTruth: p.groundTruth ?? {},
    modelEnv: {},
  };
}

const kinds = (inp: ProblemListInput) => buildProblemList(inp).map((p) => p.kind);

describe("문제 없음", () => {
  it("모든 조건이 걸리지 않으면 빈 배열(9절은 고정 문구 6)", () => {
    expect(buildProblemList(input())).toEqual([]);
  });
});

describe("판정 사유 — 핵심 미달·판정 불가·비핵심 미달", () => {
  it("핵심 지표 미달은 HIGH, 지표 이름을 괄호에 쉼표로, 근거는 값·목표", () => {
    const [p] = buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M1", name: "Accuracy", value: 0.7, threshold: 0.8, status: "fail" }),
          kpi({ metricId: "M4", name: "F1 Score", value: 0.71, threshold: 0.8, status: "fail" }),
        ],
      }),
    );
    expect(p).toEqual({
      id: "P1",
      kind: "core_fail",
      priority: "HIGH",
      title: "핵심 지표 미달 (Accuracy, F1 Score)",
      source_section: "8.2",
      recommend_section: "9.2",
      evidence: {
        Accuracy: { value: 0.7, target: 0.8 },
        "F1 Score": { value: 0.71, target: 0.8 },
      },
      note: null,
    });
  });

  it("비핵심 지표 미달은 MEDIUM — 핵심 미달과 함께 걸리면 둘 다", () => {
    const problems = buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M1", name: "Accuracy", value: 0.7, status: "fail" }),
          kpi({ metricId: "M4", name: "F1 Score" }),
          kpi({ metricId: "M2", name: "Precision", value: 0.6, status: "fail" }),
        ],
      }),
    );
    expect(problems.map((p) => [p.id, p.kind, p.priority, p.title])).toEqual([
      ["P1", "core_fail", "HIGH", "핵심 지표 미달 (Accuracy)"],
      ["P2", "noncore_fail", "MEDIUM", "비핵심 지표 미달 (Precision)"],
    ]);
  });

  it("판정 불가 — 핵심 지표 산출 실패는 지표 이름, 근거에 원인", () => {
    const [p] = buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M1", name: "Accuracy", status: "unavailable" }),
          kpi({ metricId: "M4", name: "F1 Score" }),
        ],
      }),
    );
    expect(p.kind).toBe("inconclusive");
    expect(p.priority).toBe("HIGH");
    expect(p.title).toBe("판정 불가 원인 (Accuracy)");
    expect(p.evidence).toMatchObject({ cause: "핵심 지표 산출 실패", reason: "core_not_computed" });
  });

  it("판정 불가 — 목표값 없음", () => {
    const [p] = buildProblemList(
      input({ kpiResults: [kpi({ metricId: "M1" }), kpi({ metricId: "M4", name: "F1 Score", threshold: null })] }),
    );
    expect(p.title).toBe("판정 불가 원인 (F1 Score)");
    expect(p.evidence).toMatchObject({ reason: "no_target" });
  });

  it("판정 불가 — 판정 대상 0개는 원인을 괄호에", () => {
    const [p] = buildProblemList(
      input({ kpiResults: [kpi({ metricId: "M2", threshold: null })], coreMetricIds: [] }),
    );
    expect(p.title).toBe("판정 불가 원인 (판정 대상 지표 없음)");
    expect(p.evidence).toMatchObject({ reason: "no_judged", judged_count: 0 });
  });
});

describe("핵심 지표 아슬아슬 합격 — 핵심 + 합격 + |마진| < |목표| × 3%", () => {
  // 목표 100, 폭 3: 부동소수 오차 없이 경계를 고정한다.
  const at = (value: number, p: Partial<KpiResult> = {}) =>
    input({
      kpiResults: [
        kpi({ metricId: "M1", name: "Accuracy", value: 200, threshold: 100 }),
        kpi({ metricId: "M4", name: "F1 Score", value, threshold: 100, ...p }),
      ],
    });

  it("마진 2.9 는 아슬아슬 합격, 꼭 3 은 아니다", () => {
    expect(kinds(at(102.9))).toEqual(["core_near_target"]);
    expect(kinds(at(103))).toEqual([]);
  });

  it("제목·근거·원천 절", () => {
    const [p] = buildProblemList(at(102));
    expect(p).toMatchObject({
      priority: "MEDIUM",
      title: "핵심 지표 아슬아슬 합격 (F1 Score)",
      source_section: "8.3",
      recommend_section: "9.2",
      evidence: { "F1 Score": { value: 102, target: 100, margin: 2 } },
    });
  });

  it("비핵심이거나 미달이면 아니다", () => {
    expect(kinds({ ...at(102), coreMetricIds: ["M1"] })).toEqual([]);
    expect(kinds(at(98, { status: "fail" }))).toEqual(["core_fail"]);
  });
});

describe("임계값 부적합 — gain ≥ 0.10 (이진)", () => {
  const gain = (g: number) => ({ max_f1: 0.8, current_f1: 0.8 - g, gain: g, best_threshold: 0.37 });

  it("꼭 0.10 은 문제, 0.0999 는 아니다", () => {
    expect(kinds(input({ thresholdGain: gain(0.1) }))).toEqual(["threshold_tuning"]);
    expect(kinds(input({ thresholdGain: gain(0.0999) }))).toEqual([]);
  });

  it("근거는 응답 값 그대로, 이진이 아니면 보지 않는다", () => {
    const [p] = buildProblemList(input({ thresholdGain: gain(0.2) }));
    expect(p).toMatchObject({ title: "임계값 부적합", priority: "MEDIUM", source_section: "8.3" });
    expect(p.evidence).toEqual(gain(0.2));
    expect(kinds(input({ taskType: "multiclass", thresholdGain: gain(0.2) }))).toEqual([]);
  });
});

describe("불균형 영향 있음 — level affected", () => {
  const effect = (level: ImbalanceEffect["level"]): ImbalanceEffect => ({
    level,
    imbalance_ratio: 3.2,
    accuracy_minus_macro_f1: 0.12,
    majority_minus_minority_f1: 0.18,
    majority_class: "neg",
    minority_class: "pos",
  });

  it("affected 만 문제, no_distortion·mild 는 아니다", () => {
    expect(kinds(input({ imbalanceEffect: effect("affected") }))).toEqual(["imbalance_effect"]);
    expect(kinds(input({ imbalanceEffect: effect("no_distortion") }))).toEqual([]);
    expect(kinds(input({ imbalanceEffect: effect("mild") }))).toEqual([]);
  });

  it("편향 감소 노력 '수행 안 함'이면 메모, 아니면 null", () => {
    const didNothing = composer({ trainingData: { imbalanceHandling: { choices: ["Did nothing"] } } });
    const [p] = buildProblemList(input({ imbalanceEffect: effect("affected"), composer: didNothing }));
    expect(p).toMatchObject({
      title: "불균형 영향 있음 (다수 neg · 소수 pos)",
      source_section: "7.2",
      recommend_section: "9.1",
      note: "의뢰자가 편향 감소 노력을 '수행 안 함'으로 밝혔다.",
    });
    const balanced = composer({ trainingData: { imbalanceHandling: { choices: ["Balanced the counts"] } } });
    expect(buildProblemList(input({ imbalanceEffect: effect("affected"), composer: balanced }))[0].note).toBeNull();
    const unknown = composer({ trainingData: { imbalanceHandling: { choices: ["Did nothing"], unknown: true } } });
    expect(buildProblemList(input({ imbalanceEffect: effect("affected"), composer: unknown }))[0].note).toBeNull();
  });
});

describe("최약 클래스 — M22, F1 최저 클래스가 표본 부족(30건·5% 미만)이거나 매크로보다 0.10 이상 낮음", () => {
  const row = (label: string, f1: number, support: number): ClassReportRow => ({
    label, precision: f1, recall: f1, f1, support,
  });
  /** 약한 클래스 "c" 와 넉넉한 클래스 둘. 매크로 F1 은 따로 준다. */
  const table = (weak: { f1: number; support: number }, macro: number, others = 1000): ClassReportTable => ({
    rows: [row("a", 0.9, others), row("b", 0.95, others), row("c", weak.f1, weak.support)],
    averages: [row("매크로 평균", macro, others * 2 + weak.support)],
  });
  const weakestOf = (t: ClassReportTable | null) => kinds(input({ classReport: t }));

  it("표본 29건은 부족, 30건은 아니다(몫 5% 이상, 매크로 차 작음)", () => {
    // 다른 클래스 각 250 → 30/530 = 5.7%
    expect(weakestOf(table({ f1: 0.85, support: 29 }, 0.9, 250))).toEqual(["weakest_class"]);
    expect(weakestOf(table({ f1: 0.85, support: 30 }, 0.9, 250))).toEqual([]);
  });

  it("몫 5% 미만은 부족, 꼭 5% 는 아니다", () => {
    // 49 / (475·2 + 49) < 5%  vs  50 / (475·2 + 50) = 5%
    expect(weakestOf(table({ f1: 0.85, support: 49 }, 0.9, 475))).toEqual(["weakest_class"]);
    expect(weakestOf(table({ f1: 0.85, support: 50 }, 0.9, 475))).toEqual([]);
  });

  it("매크로 F1 − 최저 F1 꼭 0.10 은 문제(부동소수 0.0999… 도), 0.0999 는 아니다", () => {
    expect(weakestOf(table({ f1: 0.75, support: 500 }, 0.85))).toEqual(["weakest_class"]);
    expect(weakestOf(table({ f1: 0.7501, support: 500 }, 0.85))).toEqual([]);
  });

  it("제목·근거 — 최저 클래스 이름과 F1·표본·몫·매크로 차", () => {
    const [p] = buildProblemList(input({ classReport: table({ f1: 0.6, support: 20 }, 0.85) }));
    expect(p).toMatchObject({
      kind: "weakest_class",
      priority: "LOW",
      title: "최약 클래스 (c)",
      source_section: "7.1·8.3",
      recommend_section: "9.1",
      evidence: { c: { f1: 0.6, support: 20, macro_f1: 0.85, gap_from_macro: 0.25, low_support: true } },
    });
  });

  it("F1 최저가 둘 이상이면 표 순서 앞 클래스를 고른다(제목·근거 키 모두)", () => {
    const tied: ClassReportTable = {
      rows: [row("a", 0.9, 1000), row("x", 0.6, 20), row("y", 0.6, 25)],
      averages: [row("매크로 평균", 0.85, 1045)],
    };
    const [p] = buildProblemList(input({ classReport: tied }));
    expect(p.title).toBe("최약 클래스 (x)");
    expect(Object.keys(p.evidence)).toEqual(["x"]);
    expect(p.evidence).toMatchObject({ x: { f1: 0.6, support: 20 } });
  });

  it("M22 표가 없으면 보지 않는다", () => {
    expect(weakestOf(null)).toEqual([]);
  });
});

describe("학습↔평가 분포 차이 — 어느 클래스든 |학습 비율 − 평가 비율| ≥ 10%p", () => {
  const training = (a: string, b: string) =>
    composer({ trainingData: { trainingClassVolume: { entries: [{ key: "a", value: a }, { key: "b", value: b }] } } });

  it("꼭 10%p 는 문제(0.6 − 0.5 의 부동소수 포함), 9%p 는 아니다", () => {
    const shifted = input({ composer: training("600", "400"), evaluationDistribution: { a: 50, b: 50 } });
    expect(kinds(shifted)).toEqual(["distribution_shift"]);
    const close = input({ composer: training("590", "410"), evaluationDistribution: { a: 50, b: 50 } });
    expect(kinds(close)).toEqual([]);
  });

  it("제목은 걸린 클래스, 근거는 두 비율과 차이(쉼표·공백 있는 숫자도 읽는다)", () => {
    const [p] = buildProblemList(
      input({ composer: training("8,400", "3,600"), evaluationDistribution: { a: 50, b: 50 } }),
    );
    expect(p).toMatchObject({
      title: "학습↔평가 분포 차이 (a, b)",
      priority: "LOW",
      source_section: "7.2",
      evidence: {
        a: { training_ratio: 0.7, evaluation_ratio: 0.5, difference: 0.2 },
        b: { training_ratio: 0.3, evaluation_ratio: 0.5, difference: -0.2 },
      },
    });
  });

  it("학습 분포가 없거나 한 칸이라도 비었거나 '모름'이면 보지 않는다", () => {
    const dist = { a: 50, b: 50 };
    expect(kinds(input({ evaluationDistribution: dist }))).toEqual([]);
    expect(kinds(input({ composer: training("900", ""), evaluationDistribution: dist }))).toEqual([]);
    const unknown = composer({
      trainingData: { trainingClassVolume: { entries: [{ key: "a", value: "900" }, { key: "b", value: "100" }], unknown: true } },
    });
    expect(kinds(input({ composer: unknown, evaluationDistribution: dist }))).toEqual([]);
    const off = { ...training("900", "100"), cards: { ...training("900", "100").cards, trainingData: false } };
    expect(kinds(input({ composer: off, evaluationDistribution: dist }))).toEqual([]);
  });

  it("[B5②] 평가 데이터의 클래스가 학습 분포에 하나라도 없으면 견주지 않는다 — 일부만 적은 분포는 거짓 차이를 낸다", () => {
    // 세 클래스 중 둘만 적으면 a·b 몫이 부풀어(0.5 → 0.5, 0.33 → 0.5) 차이가 생긴 것처럼 보인다.
    const partial = input({ composer: training("500", "500"), evaluationDistribution: { a: 34, b: 33, c: 33 } });
    expect(kinds(partial)).toEqual([]);
    // 옛 클래스 키만 남은 학습 분포(다른 파일의 x·y)도 견주지 않는다.
    const stale = composer({
      trainingData: { trainingClassVolume: { entries: [{ key: "x", value: "900" }, { key: "y", value: "100" }] } },
    });
    expect(kinds(input({ composer: stale, evaluationDistribution: { a: 50, b: 50 } }))).toEqual([]);
  });

  it("[B5②] 평가에 0건인 클래스는 학습 분포에 없어도 된다 — 나머지로 견준다", () => {
    const shifted = input({ composer: training("900", "100"), evaluationDistribution: { a: 50, b: 50, c: 0 } });
    expect(kinds(shifted)).toEqual(["distribution_shift"]);
  });
});

describe("정답 라벨 주의 — 신뢰성 '검토 없음' 또는 구축 방법 '규칙·자동'·'운영 로그'", () => {
  const gt = (labelAuthor?: string, labelReview?: string, unknown = false) =>
    composer({
      groundTruth: {
        ...(labelAuthor ? { labelAuthor: { text: labelAuthor, unknown } } : {}),
        ...(labelReview ? { labelReview: { text: labelReview, unknown } } : {}),
      },
    });

  it("세 값 각각 걸린다", () => {
    expect(labelCautions(gt("A program or rule"))).toEqual([{ aspect: "구축 방법", value: "규칙·자동" }]);
    expect(labelCautions(gt("Recorded outcomes"))).toEqual([{ aspect: "구축 방법", value: "운영 로그" }]);
    expect(labelCautions(gt(undefined, "No review"))).toEqual([{ aspect: "신뢰성", value: "검토 없음" }]);
  });

  it("그 밖의 답·'모름'·카드 끔·재료 없음은 걸리지 않는다", () => {
    expect(labelCautions(gt("Domain experts", "One reviewer"))).toEqual([]);
    expect(labelCautions(gt("Outside workers", "Several reviewers"))).toEqual([]);
    expect(labelCautions(gt("A program or rule", "No review", true))).toEqual([]);
    const off = gt("A program or rule");
    expect(labelCautions({ ...off, cards: { ...off.cards, groundTruth: false } })).toEqual([]);
    expect(labelCautions(undefined)).toEqual([]);
  });

  it("문제 제목과 근거 — 두 답이 모두 걸리면 함께", () => {
    const [p] = buildProblemList(input({ composer: gt("A program or rule", "No review") }));
    expect(p).toMatchObject({
      kind: "label_caution",
      priority: "LOW",
      title: "정답 라벨 주의 (구축 방법 규칙·자동, 신뢰성 검토 없음)",
      evidence: { "정답 라벨 구축 방법": "규칙·자동", "정답 라벨 신뢰성": "검토 없음" },
    });
  });
});

describe("번호 — 우선순위 순, 같은 우선순위는 표 순서, P1… 연속", () => {
  it("9종이 모두 걸리면 P1~P9 가 표 순서다", () => {
    const all = buildProblemList({
      kpiResults: [
        kpi({ metricId: "M1", name: "Accuracy", value: 0.7, status: "fail" }), // 핵심 미달
        kpi({ metricId: "M4", name: "F1 Score", value: 102, threshold: 100 }), // 핵심 아슬아슬 합격
        kpi({ metricId: "M2", name: "Precision", value: 0.6, status: "fail" }), // 비핵심 미달
      ],
      taskType: "binary",
      coreMetricIds: ["M1", "M4"],
      thresholdGain: { max_f1: 0.9, current_f1: 0.7, gain: 0.2, best_threshold: 0.3 },
      imbalanceEffect: {
        level: "affected", imbalance_ratio: 3, accuracy_minus_macro_f1: 0.1,
        majority_minus_minority_f1: 0.2, majority_class: "a", minority_class: "b",
      },
      classReport: {
        rows: [
          { label: "a", precision: 1, recall: 1, f1: 0.9, support: 100 },
          { label: "b", precision: 1, recall: 1, f1: 0.5, support: 10 },
        ],
        averages: [{ label: "매크로 평균", precision: 1, recall: 1, f1: 0.7, support: 110 }],
      },
      evaluationDistribution: { a: 100, b: 10 },
      composer: composer({
        trainingData: { trainingClassVolume: { entries: [{ key: "a", value: "50" }, { key: "b", value: "50" }] } },
        groundTruth: { labelReview: { text: "No review" } },
      }),
    });
    // FAIL 이라 판정 불가는 나오지 않는다 — 나머지 8종의 순서를 본다.
    expect(all.map((p) => `${p.id}:${p.kind}:${p.priority}`)).toEqual([
      "P1:core_fail:HIGH",
      "P2:noncore_fail:MEDIUM",
      "P3:core_near_target:MEDIUM",
      "P4:threshold_tuning:MEDIUM",
      "P5:imbalance_effect:MEDIUM",
      "P6:weakest_class:LOW",
      "P7:distribution_shift:LOW",
      "P8:label_caution:LOW",
    ]);
  });

  it("판정 불가는 핵심 미달 다음, 비핵심 미달 앞(같은 HIGH)", () => {
    const problems = buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M1", name: "Accuracy", status: "unavailable" }),
          kpi({ metricId: "M4", name: "F1 Score" }),
          kpi({ metricId: "M2", name: "Precision", status: "fail" }),
        ],
        composer: composer({ groundTruth: { labelAuthor: { text: "Recorded outcomes" } } }),
      }),
    );
    expect(problems.map((p) => `${p.id}:${p.kind}`)).toEqual([
      "P1:inconclusive",
      "P2:noncore_fail",
      "P3:label_caution",
    ]);
  });

  it("결정적이다 — 같은 입력이면 같은 목록", () => {
    const inp = input({ composer: composer({ groundTruth: { labelReview: { text: "No review" } } }) });
    expect(buildProblemList(inp)).toEqual(buildProblemList(inp));
  });

  it("9절 칸 이름은 'P1 · 문제 이름'", () => {
    const [p] = buildProblemList(input({ composer: composer({ groundTruth: { labelReview: { text: "No review" } } }) }));
    expect(problemLabel(p)).toBe("P1 · 정답 라벨 주의 (신뢰성 검토 없음)");
  });
});

describe("파서 — 모양이 틀리면 null", () => {
  it("f1_threshold_gain", () => {
    const ok = { max_f1: 0.8421, current_f1: 0.7012, gain: 0.1409, best_threshold: 0.37 };
    expect(parseF1ThresholdGain(ok)).toEqual(ok);
    expect(parseF1ThresholdGain(undefined)).toBeNull();
    expect(parseF1ThresholdGain([])).toBeNull();
    expect(parseF1ThresholdGain({ ...ok, gain: "0.2" })).toBeNull();
    expect(parseF1ThresholdGain({ ...ok, gain: -0.1 })).toBeNull();
    expect(parseF1ThresholdGain({ ...ok, best_threshold: null })).toBeNull();
  });

  it("imbalance_effect", () => {
    const ok = {
      level: "affected",
      imbalance_ratio: 3.2,
      accuracy_minus_macro_f1: 0.12,
      majority_minus_minority_f1: 0.18,
      majority_class: "neg",
      minority_class: "pos",
    };
    expect(parseImbalanceEffect(ok)).toEqual(ok);
    // 멀티레이블은 accuracy_minus_macro_f1 이 null 이다.
    expect(parseImbalanceEffect({ ...ok, accuracy_minus_macro_f1: null })).toEqual({ ...ok, accuracy_minus_macro_f1: null });
    expect(parseImbalanceEffect({ ...ok, level: "severe" })).toBeNull();
    expect(parseImbalanceEffect({ ...ok, imbalance_ratio: null })).toBeNull();
    expect(parseImbalanceEffect({ ...ok, accuracy_minus_macro_f1: "x" })).toBeNull();
    expect(parseImbalanceEffect({ ...ok, minority_class: 1 })).toBeNull();
    expect(parseImbalanceEffect(null)).toBeNull();
  });
});
