/**
 * 문제 목록 판 4 갈래(S3 ④, 대응표 16·25) — 이름 "핵심 지표 근소 합격"(조건은 판정 여유 "작음"), 같은 출처 문제(낮음, LOW 맨 끝,
 * 칸 8.2 → 9.1), 우선순위 표기 높음·중간·낮음(저장 코드값은 그대로). 판 3 목록은 그대로다.
 */
import { describe, expect, it } from "vitest";

import type { KpiResult, Problem } from "../../types/finalReport.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import { SAME_SOURCE_SENTENCE, sourceRelationSentence } from "./dataCautionPhrases";
import { distributionShift, weakestClass } from "./narrativeFacts";
import {
  buildProblemList,
  isSameSourceRelation,
  PRIORITY_LABEL_ED4,
  priorityLabelEd4,
  problemLabel,
  type ProblemListInput,
} from "./problemList";
import type { ReportComposerInput } from "./reportMaterials";

function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", ...p };
}

function composer(testData: ComposerValueMap, p: { cards?: Partial<ReportComposerInput["cards"]>; groundTruth?: ComposerValueMap } = {}): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true, ...p.cards } as ReportComposerInput["cards"],
    metrics: {},
    perspective: {},
    trainingData: {},
    testData,
    groundTruth: p.groundTruth ?? {},
    modelEnv: {},
  };
}

const SAME = composer({ testSourceRelation: { text: "Same source" } });

/** 문제가 하나도 없는 기본 입력(핵심 M1·M4 여유 있게 합격). */
function input(over: Partial<ProblemListInput> = {}): ProblemListInput {
  return {
    kpiResults: [
      kpi({ metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, judgmentMargin: "ample" }),
      kpi({ metricId: "M4", name: "F1 Score", value: 0.9, threshold: 0.8, judgmentMargin: "ample" }),
    ],
    taskType: "binary",
    coreMetricIds: ["M1", "M4"],
    thresholdGain: null,
    imbalanceEffect: null,
    facts: { weakest_class: weakestClass(null), distribution_shift: distributionShift(undefined, {}).rows },
    ...over,
  };
}

const kinds = (inp: ProblemListInput) => buildProblemList(inp).map((p) => p.kind);

describe("같은 출처 문제 — 판 4 에만, 의뢰자가 '같은 출처'를 골랐을 때만", () => {
  it("판 4 · 같은 출처 → 낮음, 8.2 → 9.1, 근거는 의뢰자 답의 성적서 이름", () => {
    const problems = buildProblemList(input({ composer: SAME, edition: 4 }));
    expect(problems).toEqual<Problem[]>([
      {
        id: "P1",
        kind: "same_source",
        priority: "LOW",
        title: "평가 데이터가 학습과 같은 출처",
        source_section: "8.2",
        recommend_section: "9.1",
        evidence: { "학습 데이터와의 관계": "같은 출처" },
        note: null,
      },
    ]);
  });

  it.each([
    ["다른 출처", composer({ testSourceRelation: { text: "Different source" } })],
    ["모름", composer({ testSourceRelation: { text: "Same source", unknown: true } })],
    ["답 없음", composer({})],
    ["⑦ 카드 끔", composer({ testSourceRelation: { text: "Same source" } }, { cards: { testData: false } })],
    ["구성 입력 없음", undefined],
  ])("판 4 · %s → 없음", (_name, c) => {
    expect(kinds(input({ composer: c, edition: 4 }))).not.toContain("same_source");
  });

  it("판 3(기본값·3) · 같은 출처 → 없음", () => {
    expect(kinds(input({ composer: SAME }))).toEqual([]);
    expect(kinds(input({ composer: SAME, edition: 3 }))).toEqual([]);
    expect(kinds(input({ composer: SAME, edition: 4 }))).toEqual(["same_source"]);
  });

  it("판정 함수는 8.2 고정 문구 11a 를 고르는 판단과 결과가 같다(입력 표 전부)", () => {
    const table: Array<ReportComposerInput | undefined> = [
      undefined,
      SAME,
      composer({ testSourceRelation: { text: "Same source", note: "같은 병원" } }),
      composer({ testSourceRelation: { text: "Different source" } }),
      composer({ testSourceRelation: { text: "Same source", unknown: true } }),
      composer({ testSourceRelation: { text: "", unknown: true } }),
      composer({ testSourceRelation: { text: "Other" } }),
      composer({}),
      composer({ testSourceRelation: { text: "Same source" } }, { cards: { testData: false } }),
    ];
    const pairs = table.map((c) => [isSameSourceRelation(c), sourceRelationSentence(c) === SAME_SOURCE_SENTENCE]);
    expect(pairs.some(([a]) => a)).toBe(true);
    expect(pairs.some(([a]) => !a)).toBe(true);
    for (const [ours, eleven] of pairs) expect(ours).toBe(eleven);
    // 판 4 문제 목록도 같은 판단이다.
    for (const c of table) expect(kinds(input({ composer: c, edition: 4 })).includes("same_source")).toBe(isSameSourceRelation(c));
  });
});

describe("핵심 지표 근소 합격 — 판 4 는 판정 여유 '작음'(저장값 하나)", () => {
  it("핵심 · 합격 · 작음 → '핵심 지표 근소 합격 (이름)' 중간, 8.3 → 9.2", () => {
    const [p] = buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M3", name: "Recall", value: 0.984375, threshold: 0.97, judgmentMargin: "small", nearTarget: true }),
          kpi({ metricId: "M1", name: "Accuracy", judgmentMargin: "ample" }),
        ],
        coreMetricIds: ["M3"],
        edition: 4,
      }),
    );
    expect(p).toMatchObject({
      id: "P1",
      kind: "core_near_target",
      priority: "MEDIUM",
      title: "핵심 지표 근소 합격 (Recall)",
      source_section: "8.3",
      recommend_section: "9.2",
    });
    // 근거 숫자는 판 4 글자(S2·S3 검토 D6 — 종전 판 3 모양 {0.984375, 0.97, 0.0144} 에서 고침): 값 = value_text, 목표 = ed4Target,
    // 마진 = margin_text(judged(0.014375, 0, 충족)).
    expect(p.evidence).toEqual({ Recall: { value: "0.984", target: "0.970", margin: "0.014" } });
    expect(problemLabel(p)).toBe("P1 · 핵심 지표 근소 합격 (Recall)");
  });

  it("판 4 는 3% 근소(nearTarget)가 아니라 판정 여유를 본다 — 두 조건이 갈리는 두 경우", () => {
    // 3% 안이지만 구간이 목표를 피함 → 판 4 문제 없음, 판 3 문제 있음.
    const near3 = [kpi({ metricId: "M1", value: 0.81, threshold: 0.8, judgmentMargin: "ample" })];
    expect(kinds(input({ kpiResults: near3, coreMetricIds: ["M1"], edition: 4 }))).toEqual([]);
    expect(kinds(input({ kpiResults: near3, coreMetricIds: ["M1"] }))).toEqual(["core_near_target"]);
    // 3% 밖이지만 구간이 목표를 포함 → 판 4 문제 있음, 판 3 문제 없음.
    const wide = [kpi({ metricId: "M1", value: 0.9, threshold: 0.8, judgmentMargin: "small" })];
    expect(kinds(input({ kpiResults: wide, coreMetricIds: ["M1"], edition: 4 }))).toEqual(["core_near_target"]);
    expect(kinds(input({ kpiResults: wide, coreMetricIds: ["M1"] }))).toEqual([]);
  });

  it("판 4 · 작음이어도 미달이거나 비핵심이면 근소 합격이 아니다", () => {
    const failing = [kpi({ metricId: "M1", value: 0.79, threshold: 0.8, status: "fail", judgmentMargin: "small" })];
    expect(kinds(input({ kpiResults: failing, coreMetricIds: ["M1"], edition: 4 }))).toEqual(["core_fail"]);
    const nonCore = [
      kpi({ metricId: "M1", judgmentMargin: "ample" }),
      kpi({ metricId: "M2", name: "Precision", judgmentMargin: "small" }),
    ];
    expect(kinds(input({ kpiResults: nonCore, coreMetricIds: ["M1"], edition: 4 }))).toEqual([]);
  });

  it("판 3 이름은 종전 그대로('아슬아슬')", () => {
    const [p] = buildProblemList(
      input({ kpiResults: [kpi({ metricId: "M1", value: 0.81, threshold: 0.8 })], coreMetricIds: ["M1"] }),
    );
    expect(p.title).toBe("핵심 지표 아슬아슬 합격 (Accuracy)");
  });
});

describe("판 4 순서와 우선순위 표기", () => {
  const everything = (edition: 3 | 4) =>
    buildProblemList(
      input({
        kpiResults: [
          kpi({ metricId: "M1", name: "Accuracy", value: 0.7, status: "fail", judgmentMargin: "ample" }),
          kpi({ metricId: "M4", name: "F1 Score", value: 102, threshold: 100, judgmentMargin: "small" }),
          kpi({ metricId: "M2", name: "Precision", value: 0.6, status: "fail", judgmentMargin: "ample" }),
        ],
        coreMetricIds: ["M1", "M4"],
        thresholdGain: { max_f1: 0.9, current_f1: 0.7, gain: 0.2, best_threshold: 0.3 },
        imbalanceEffect: {
          level: "affected", imbalance_ratio: 3, accuracy_minus_macro_f1: 0.1,
          majority_minus_minority_f1: 0.2, majority_class: "a", minority_class: "b",
        },
        facts: {
          weakest_class: weakestClass({
            rows: [
              { label: "a", precision: 1, recall: 1, f1: 0.9, support: 100 },
              { label: "b", precision: 1, recall: 1, f1: 0.5, support: 10 },
            ],
            averages: [{ label: "매크로 평균", precision: 1, recall: 1, f1: 0.7, support: 110 }],
          }),
          distribution_shift: distributionShift(
            { ...SAME, trainingData: { trainingClassVolume: { entries: [{ key: "a", value: "50" }, { key: "b", value: "50" }] } } },
            { a: 100, b: 10 },
          ).rows,
        },
        composer: composer({ testSourceRelation: { text: "Same source" } }, { groundTruth: { labelReview: { text: "No review" } } }),
        edition,
      }),
    );

  it("판 4: 같은 출처는 LOW 맨 끝(정답 라벨 주의 다음), 나머지 순서·우선순위는 판 3 과 같다", () => {
    const ed4 = everything(4);
    const ed3 = everything(3);
    expect(ed4.map((p) => `${p.id}:${p.kind}:${p.priority}`)).toEqual([
      "P1:core_fail:HIGH",
      "P2:noncore_fail:MEDIUM",
      "P3:core_near_target:MEDIUM",
      "P4:threshold_tuning:MEDIUM",
      "P5:imbalance_effect:MEDIUM",
      "P6:weakest_class:LOW",
      "P7:distribution_shift:LOW",
      "P8:label_caution:LOW",
      "P9:same_source:LOW",
    ]);
    expect(ed3.map((p) => p.kind)).toEqual(ed4.slice(0, -1).map((p) => p.kind));
    // 이름은 근소 합격만 다르다.
    const titles = (list: Problem[]) => Object.fromEntries(list.map((p) => [p.kind, p.title]));
    const t3 = titles(ed3);
    const t4 = titles(ed4);
    expect(Object.keys(t3).filter((k) => t3[k] !== t4[k])).toEqual(["core_near_target"]);
    expect(t4.core_near_target).toBe("핵심 지표 근소 합격 (F1 Score)");
  });

  it("우선순위 표기 — 높음·중간·낮음, 저장값은 HIGH/MEDIUM/LOW 그대로", () => {
    expect(PRIORITY_LABEL_ED4).toEqual({ HIGH: "높음", MEDIUM: "중간", LOW: "낮음" });
    const ed4 = everything(4);
    expect(new Set(ed4.map((p) => p.priority))).toEqual(new Set(["HIGH", "MEDIUM", "LOW"]));
    expect(ed4.map((p) => priorityLabelEd4(p.priority))).toEqual(["높음", "중간", "중간", "중간", "중간", "낮음", "낮음", "낮음", "낮음"]);
  });
});
