import { describe, expect, it } from "vitest";

import type { FactSheet, NarrativeRequestPayload } from "./buildFactSheet";
import {
  codePointLength,
  factsLength,
  fitFactSheet,
  fitFacts,
  fitNarrativePayload,
  keepTop,
  mustKeepClasses,
  payloadBytes,
} from "./factSheetFit";
import {
  FACTS_LIST_TRIM,
  MAX_CI_METHOD_NOTE_CHARS,
  MAX_CLASS_ENTRIES,
  MAX_FACTS_CHARS,
  MAX_FIXED_SENTENCE_CHARS,
  MAX_METRIC_FACTS,
  MAX_PROBLEM_TEXT_CHARS,
  MAX_PROBLEMS,
  NARRATIVE_BODY_BUDGET_BYTES,
} from "./factSheetLimits";
import type { NarrativeFacts } from "./narrativeFacts";

/**
 * 사실 시트 미리 자르기(계약 size_rules) — 백엔드 상한을 넘는 큰 다중 클래스 성적서가 422·413 으로 서술을
 * 잃지 않게, 그리고 자를 때 최약·작은 클래스가 표에서 빠지지 않게.
 */

function facts(over: Partial<NarrativeFacts> = {}): NarrativeFacts {
  return {
    contract: "facts-1",
    positive_class: null,
    n_classes: null,
    class_share_basis: "samples",
    report_purpose_label: null,
    core_metrics_source: "default",
    selected_metrics: [],
    declarations: { risk_direction: null, class_priority: null, usage_mode: null },
    verdict_detail: {
      verdict: "PASS", judged_count: 0, passed_count: 0, failed_core: [], failed_noncore: [], unavailable_core: [],
      inconclusive_cause: null, inconclusive_metrics: [],
    },
    error_totals: null,
    weakest_class: null,
    low_support_classes: [],
    top_confusion_pairs: [],
    prediction_bias: null,
    declared_risk_errors: null,
    precision_recall_gap: null,
    average_gap: null,
    declared_average: null,
    distribution_shift_status: "not_provided",
    distribution_shift: [],
    ci_available: true,
    ci_skipped: [],
    fixed_sentences: [],
    omitted: {},
    ...over,
  };
}

function sheet(over: Partial<FactSheet> = {}): FactSheet {
  return {
    n_samples: 0,
    dropped_rows: 0,
    metrics: [],
    per_class: [],
    class_averages: [],
    confusion: null,
    confusion_counts: [],
    derived_prediction: null,
    error_ratios: null,
    ci_method_note: null,
    f1_threshold_gain: null,
    imbalance_effect: null,
    problems: [],
    distribution: null,
    verdict: "PASS",
    score: 0,
    latency: { available: false, mean: null, p50: null, p95: null, p99: null, unit: "ms" },
    ...over,
  };
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

describe("keepTop — 꼭 남길 것 먼저, 남은 자리는 큰 순, 원래 순서로", () => {
  it("상한 이하면 그대로", () => {
    expect(keepTop([3, 1, 2], 3, (x) => x)).toEqual({ kept: [3, 1, 2], dropped: 0 });
  });
  it("큰 순으로 남기되 원래 순서, 같으면 앞", () => {
    expect(keepTop([1, 5, 3, 5, 2], 3, (x) => x)).toEqual({ kept: [5, 3, 5], dropped: 2 });
    expect(keepTop(["a", "b", "c"], 2, () => 0)).toEqual({ kept: ["a", "b"], dropped: 1 });
  });
  it("순위가 있는 것은 작아도 남고, 순위끼리는 작은 숫자가 먼저", () => {
    expect(keepTop([10, 1, 9, 8], 2, (x) => x, (x) => (x === 1 ? 0 : undefined))).toEqual({ kept: [10, 1], dropped: 2 });
    // 순위 있는 것이 자리보다 많으면 순위 숫자 작은 순 — 엔진 순서(앞)가 아니다.
    expect(keepTop([1, 2, 3, 4], 2, () => 0, (x) => 10 - x)).toEqual({ kept: [3, 4], dropped: 2 });
  });
});

describe("fitFactSheet — 클래스 표", () => {
  it("클래스가 상한을 넘으면 최약·작은 표본·양성 클래스를 먼저 남기고 support 큰 순으로 채운다", () => {
    const n = MAX_CLASS_ENTRIES + 44;
    const perClass = names(n).map((label, i) => ({ label, precision: 1, recall: 1, f1: 1, support: 1000 - i }));
    const weakestLabel = `c${n - 1}`; // support 가장 작음 — 큰 순으로만 자르면 빠진다
    const s = fitFactSheet(
      sheet({
        per_class: perClass,
        confusion_counts: perClass.map(({ label, support }) => ({ label, tp: support, fp: 0, fn: 0, tn: 0 })),
        confusion: { labels: names(n), matrix: [], positive_class: null },
        distribution: { class_distribution: Object.fromEntries(perClass.map((r) => [r.label, r.support])), imbalance_ratio: 2 },
        facts: facts({
          weakest_class: {
            label: weakestLabel, f1: 0.1, support: 957, share: 0.001, share_text: "0.001", macro_f1: 0.9,
            gap_from_macro: 0.8, gap_text: "0.8", low_support: true, far_below_macro: true,
          },
        }),
      }),
    );
    expect(s.per_class).toHaveLength(MAX_CLASS_ENTRIES);
    expect(s.per_class.map((r) => r.label)).toContain(weakestLabel);
    expect(s.per_class[0].label).toBe("c0"); // 원래 순서
    expect(s.confusion_counts.map((r) => r.label)).toContain(weakestLabel);
    expect(Object.keys(s.distribution!.class_distribution)).toContain(weakestLabel);
    expect(Object.keys(s.distribution!.class_distribution)).toHaveLength(MAX_CLASS_ENTRIES);
    expect(s.confusion).toBeNull();
    expect(s.facts?.omitted).toEqual({ per_class: 44, confusion_counts: 44, class_distribution: 44, confusion: n });
  });

  it("작은 표본이 상한보다 많아도 최약·기준·오분류 쌍 클래스가 표에 남는다(엔진 순서 맨 뒤여도)", () => {
    // 300클래스 모두 support 10(전부 5% 미만 = 작은 표본), c280 이 최약, c299 가 support 최대(기준 클래스).
    const n = 300;
    const support = (i: number) => (i === 299 ? 50 : 10);
    const perClass = names(n).map((label, i) => ({ label, precision: 1, recall: 1, f1: i === 280 ? 0.1 : 0.5, support: support(i) }));
    const low = names(n).map((label, i) => ({ label, support: support(i), share: 0.003, share_text: "0.003" }));
    const s = fitFactSheet(
      sheet({
        per_class: perClass,
        confusion_counts: perClass.map(({ label, support: sp }) => ({ label, tp: sp, fp: 0, fn: 0, tn: 0 })),
        facts: facts({
          weakest_class: {
            label: "c280", f1: 0.1, support: 10, share: 0.003, share_text: "0.003", macro_f1: 0.5,
            gap_from_macro: 0.4, gap_text: "0.4", low_support: true, far_below_macro: true,
          },
          low_support_classes: low,
          top_confusion_pairs: [{ actual: "c290", predicted: "c291", count: 3, share_of_errors: 0.5 }],
          average_gap: {
            kind: "macro_vs_weighted", macro_f1: 0.5, other_f1: 0.5, difference: 0, difference_text: "0",
            reference_class: { label: "c299", support: 50, f1: 0.5 },
          },
        }),
      }),
    );
    for (const label of ["c280", "c290", "c291", "c299"]) {
      expect([label, s.per_class.some((r) => r.label === label)]).toEqual([label, true]);
      expect([label, s.confusion_counts.some((r) => r.label === label)]).toEqual([label, true]);
    }
    expect(s.facts?.low_support_classes.some((r) => r.label === "c280")).toBe(true);
    expect(s.per_class).toHaveLength(MAX_CLASS_ENTRIES);
  });

  it("상한 이하면 손대지 않고 omitted 도 비어 있다", () => {
    const perClass = names(3).map((label) => ({ label, precision: 1, recall: 1, f1: 1, support: 1 }));
    const s = fitFactSheet(sheet({ per_class: perClass, facts: facts() }));
    expect(s.per_class).toEqual(perClass);
    expect(s.facts?.omitted).toEqual({});
  });

  it("지표·문제·문장 길이 상한", () => {
    const longText = "가".repeat(MAX_PROBLEM_TEXT_CHARS + 10);
    const s = fitFactSheet(
      sheet({
        metrics: Array.from({ length: MAX_METRIC_FACTS + 1 }, (_, i) => ({ metric_id: `M${i}` }) as FactSheet["metrics"][number]),
        problems: Array.from({ length: MAX_PROBLEMS + 2 }, (_, i) => ({
          id: `P${i + 1}`, kind: "core_fail", priority: "HIGH", title: longText, source_section: "8.2",
          recommend_section: "9.2", evidence: {}, note: longText,
        })) as FactSheet["problems"],
        ci_method_note: "나".repeat(MAX_CI_METHOD_NOTE_CHARS + 1),
      }),
    );
    expect(s.metrics).toHaveLength(MAX_METRIC_FACTS);
    expect(s.problems).toHaveLength(MAX_PROBLEMS);
    expect(codePointLength(s.problems[0].title)).toBe(MAX_PROBLEM_TEXT_CHARS);
    expect(codePointLength(s.problems[0].note!)).toBe(MAX_PROBLEM_TEXT_CHARS);
    expect(codePointLength(s.ci_method_note!)).toBe(MAX_CI_METHOD_NOTE_CHARS);
  });

  it("facts 가 없는 시트에는 facts 를 만들지 않는다", () => {
    expect("facts" in fitFactSheet(sheet())).toBe(false);
  });
});

describe("mustKeepClasses — facts 가 가리키는 클래스", () => {
  it("최약·작은 표본·최다 오분류 쌍 양쪽·평균 차이 기준·양성", () => {
    const order = mustKeepClasses(
      facts({
        positive_class: "p",
        // 작은 표본은 엔진 순서가 아니라 support 작은 순으로 순위를 매긴다(s2 가 먼저).
        low_support_classes: [
          { label: "s", support: 9, share: 0, share_text: "0" },
          { label: "s2", support: 1, share: 0, share_text: "0" },
        ],
        top_confusion_pairs: [{ actual: "a", predicted: "b", count: 1, share_of_errors: 1 }],
        average_gap: {
          kind: "macro_vs_weighted", macro_f1: 0, other_f1: 0, difference: 0, difference_text: "0",
          reference_class: { label: "r", support: 1, f1: 0 },
        },
      }),
    );
    expect([...order]).toEqual([["a", 1], ["b", 1], ["r", 2], ["p", 3], ["s2", 4], ["s", 5]]);
  });
});

describe("fitFacts — facts 안 목록과 전체 길이", () => {
  const shiftRows = (n: number, flaggedEvery = 2) =>
    names(n).map((label, i) => ({
      label, training_ratio: 0.1, evaluation_ratio: 0.1, difference: i / 1000, difference_text: "0",
      flagged: i % flaggedEvery === 0,
    }));

  it("클래스 목록은 MAX_CLASS_ENTRIES 까지 — 편향은 |차이| 큰 순, 작은 표본은 support 작은 순", () => {
    // 한 목록씩 — 둘을 함께 실으면 전체 길이 상한(3만 자)이 먼저 걸린다.
    // 분포 차는 한 줄이 약 110자라 256줄이면 전체 상한이 먼저 걸린다 — 칸별 상한은 줄이 짧은 예측 편향으로 본다.
    const bias = fitFacts(
      facts({
        prediction_bias: {
          unit: "per_class",
          rows: names(MAX_CLASS_ENTRIES + 4).map((label, i) => ({ label, predicted: i, actual: 0, difference: i })),
        },
      }),
    );
    expect(factsLength(bias)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
    expect(bias.prediction_bias!.rows).toHaveLength(MAX_CLASS_ENTRIES);
    expect(bias.prediction_bias!.rows[0].label).toBe("c4"); // |차이| 가 가장 작은 c0~c3 이 빠짐
    expect(bias.omitted).toEqual({ prediction_bias: 4 });
    const low = fitFacts(
      facts({ low_support_classes: names(MAX_CLASS_ENTRIES + 2).map((label, i) => ({ label, support: i, share: 0, share_text: "0" })) }),
    );
    expect(low.low_support_classes.at(-1)?.label).toBe(`c${MAX_CLASS_ENTRIES - 1}`); // 가장 큰 support 둘이 빠짐
    expect(low.omitted).toEqual({ low_support_classes: 2 });
  });

  it("고정 문장은 16개·1000자까지", () => {
    const f = fitFacts(
      facts({ fixed_sentences: Array.from({ length: 20 }, (_, i) => ({ id: `${i}`, section: "7.1", text: "다".repeat(MAX_FIXED_SENTENCE_CHARS + 5) })) }),
    );
    expect(f.fixed_sentences).toHaveLength(16);
    expect(codePointLength(f.fixed_sentences[0].text)).toBe(MAX_FIXED_SENTENCE_CHARS);
  });

  it("전체가 MAX_FACTS_CHARS 를 넘으면 분포 차(flagged 만) → 편향 → 작은 표본 → 세 목록 비움 순서", () => {
    const long = "이름".repeat(40);
    const big = facts({
      distribution_shift: shiftRows(200).map((r) => ({ ...r, label: `${long}${r.label}` })),
      prediction_bias: {
        unit: "per_class",
        rows: names(200).map((label, i) => ({ label: `${long}${label}`, predicted: i, actual: 0, difference: i })),
      },
      low_support_classes: names(200).map((label, i) => ({ label: `${long}${label}`, support: i, share: 0, share_text: "0" })),
    });
    expect(factsLength(big)).toBeGreaterThan(MAX_FACTS_CHARS);
    const f = fitFacts(big);
    expect(factsLength(f)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
    // 1단계: 분포 차는 flagged 만(100개), 2단계: 편향 상위 20(가장 큰 차이부터)
    expect(f.distribution_shift.every((r) => r.flagged)).toBe(true);
    expect(f.prediction_bias!.rows.length).toBeLessThanOrEqual(FACTS_LIST_TRIM);
    if (f.prediction_bias!.rows.length > 0) {
      expect(f.prediction_bias!.rows.at(-1)?.difference).toBe(199);
    }
    expect(f.omitted.distribution_shift).toBe(100);
  });

  it("세 목록을 비워도 넘으면 고정 문장을 비운다", () => {
    // 목록 밖 칸(생략 사유 64개 × 300자)과 고정 문장 1.6만 자를 합치면 목록을 비워도 3만 자를 넘는다.
    const f = fitFacts(
      facts({
        fixed_sentences: Array.from({ length: 16 }, (_, i) => ({ id: `${i}`, section: "7.1", text: "라".repeat(1000) })),
        ci_skipped: Array.from({ length: 64 }, (_, i) => ({ metric_id: `M${i}`, display_name: "지표", reason: "사".repeat(300) })),
        low_support_classes: [{ label: "x", support: 1, share: 0, share_text: "0" }],
      }),
    );
    expect(f.fixed_sentences).toEqual([]);
    expect(f.omitted).toMatchObject({ fixed_sentences: 16, facts_class_lists: 1 });
    expect(factsLength(f)).toBeLessThanOrEqual(MAX_FACTS_CHARS);
  });

  it("작으면 손대지 않는다", () => {
    const small = facts({ distribution_shift: shiftRows(3) });
    expect(fitFacts(small)).toEqual(small);
  });
});

describe("codePointLength — 파이썬 len() 과 같은 잣대", () => {
  it("이모지는 한 글자", () => {
    expect("😀".length).toBe(2);
    expect(codePointLength("😀가a")).toBe(3);
  });
});

describe("fitNarrativePayload — 본문 예산(413 피하기)", () => {
  const payload = (over: Partial<FactSheet> = {}): NarrativeRequestPayload => ({
    task_type: "multiclass",
    report_purpose: "external",
    fact_sheet: sheet({ facts: facts(), ...over }),
  });

  it("예산 안이면 같은 객체 그대로", () => {
    const p = payload();
    expect(fitNarrativePayload(p)).toBe(p);
  });

  it("넘으면 클래스 단위 칸을 모두 비우고 뺀 수를 남긴다", () => {
    const label = "클".repeat(3000);
    const n = 200;
    const per = names(n).map((l) => ({ label: `${label}${l}`, precision: 1, recall: 1, f1: 1, support: 1 }));
    const p = payload({
      per_class: per,
      class_averages: [{ label: "매크로 평균", precision: 1, recall: 1, f1: 1, support: n }],
      confusion_counts: per.map((r) => ({ label: r.label, tp: 1, fp: 0, fn: 0, tn: 0 })),
      confusion: { labels: per.map((r) => r.label), matrix: [], positive_class: null },
      distribution: { class_distribution: { a: 1, b: 2 }, imbalance_ratio: 2 },
      facts: facts({ low_support_classes: [{ label: "x", support: 1, share: 0, share_text: "0" }] }),
    });
    expect(payloadBytes(p)).toBeGreaterThan(NARRATIVE_BODY_BUDGET_BYTES);
    const fitted = fitNarrativePayload(p);
    expect(payloadBytes(fitted)).toBeLessThanOrEqual(NARRATIVE_BODY_BUDGET_BYTES);
    const fs = fitted.fact_sheet;
    expect([fs.per_class, fs.class_averages, fs.confusion_counts, fs.confusion, fs.distribution]).toEqual([[], [], [], null, null]);
    expect(fs.facts?.low_support_classes).toEqual([]);
    expect(fs.facts?.omitted).toEqual({
      per_class: n, confusion_counts: n, confusion: n, class_distribution: 2, facts_class_lists: 1,
    });
  });
});
