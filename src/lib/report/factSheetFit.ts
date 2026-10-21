/**
 * 사실 시트 미리 자르기 — 백엔드 상한(`factSheetLimits.ts`)에 맞춰 상위 N개만 남기고 뺀 수를 `facts.omitted`
 * 에 적는다(계약 size_rules).
 *
 * - 클래스 표는 "꼭 남길 클래스"를 순위대로 먼저 넣고(최약 → 최다 오분류 쌍 → 평균 차이 기준 → 양성 →
 *   작은 표본은 support 작은 순) 남은 자리를 큰 순으로 채운 뒤 원래(엔진) 순서로 둔다 — 큰 순으로만 자르면
 *   바로 그 작은 클래스가 표에서 빠지고, 작은 표본이 상한보다 많을 때 순위가 없으면 최약 클래스가 밀려난다.
 *   클래스 단위 결론은 facts 가 이미 정했으므로 잘린 표에서 다시 고르지 않는다.
 * - facts 전체가 MAX_FACTS_CHARS 를 넘으면 분포 차(flagged 만) → 예측 편향(상위 20) → 작은 표본(상위 20) →
 *   세 목록 비움 → 고정 문장 비움 순서로 줄인다.
 * - 요청 본문이 NARRATIVE_BODY_BUDGET_BYTES 를 넘으면 클래스 단위 칸을 모두 비운다(백엔드
 *   `jobs._CLASS_LEVEL_KEYS` 와 같은 칸 + facts 의 세 목록).
 */
import type { FactSheet, NarrativeRequestPayload } from "./buildFactSheet";
import {
  FACTS_LIST_TRIM,
  MAX_CI_METHOD_NOTE_CHARS,
  MAX_CLASS_ENTRIES,
  MAX_FACTS_CHARS,
  MAX_FIXED_SENTENCE_CHARS,
  MAX_FIXED_SENTENCES,
  MAX_METRIC_FACTS,
  MAX_PROBLEM_TEXT_CHARS,
  MAX_PROBLEMS,
  NARRATIVE_BODY_BUDGET_BYTES,
} from "./factSheetLimits";
import type { NarrativeFacts } from "./narrativeFacts";

/** 코드포인트 수 — 백엔드 파이썬 len() 과 같은 잣대(UTF-16 길이는 이모지 등에서 다르다). */
export function codePointLength(text: string): number {
  let n = 0;
  for (const _ of text) n += 1;
  return n;
}

/** facts 의 크기 — 공백 없는 JSON 의 코드포인트 수. */
export function factsLength(facts: NarrativeFacts): number {
  return codePointLength(JSON.stringify(facts));
}

function cut(text: string, max: number): string {
  return codePointLength(text) <= max ? text : [...text].slice(0, max).join("");
}

/**
 * `items` 에서 `max` 개를 남긴다 — `priority` 가 숫자인 것을 그 숫자 작은 순으로 먼저, 남은 자리는 `rank` 큰 순.
 * 남긴 것은 원래 순서. 뺀 수를 함께 돌려준다.
 */
export function keepTop<T>(
  items: T[],
  max: number,
  rank: (item: T) => number,
  priority: (item: T) => number | undefined = () => undefined,
): { kept: T[]; dropped: number } {
  if (items.length <= max) return { kept: items, dropped: 0 };
  const indexed = items.map((item, i) => ({ item, i, p: priority(item) }));
  const kept = [...indexed]
    .sort((a, b) => {
      if (a.p !== undefined || b.p !== undefined) {
        if (a.p === undefined) return 1;
        if (b.p === undefined) return -1;
        return a.p - b.p || a.i - b.i;
      }
      return rank(b.item) - rank(a.item) || a.i - b.i;
    })
    .slice(0, max)
    .sort((a, b) => a.i - b.i)
    .map(({ item }) => item);
  return { kept, dropped: items.length - kept.length };
}

/**
 * facts 가 가리키는 클래스와 그 순위(작을수록 먼저 남긴다) — 최약 0, 최다 오분류 쌍 1, 평균 차이 기준 2, 양성 3,
 * 작은 표본은 4 부터 support 작은 순.
 */
export function mustKeepClasses(facts: NarrativeFacts | null | undefined): Map<string, number> {
  const order = new Map<string, number>();
  if (!facts) return order;
  const add = (label: string, p: number) => {
    if (!order.has(label)) order.set(label, p);
  };
  if (facts.weakest_class) add(facts.weakest_class.label, 0);
  facts.top_confusion_pairs.forEach((pair) => {
    add(pair.actual, 1);
    add(pair.predicted, 1);
  });
  if (facts.average_gap) add(facts.average_gap.reference_class.label, 2);
  if (facts.positive_class) add(facts.positive_class, 3);
  [...facts.low_support_classes]
    .sort((a, b) => a.support - b.support)
    .forEach((r, k) => add(r.label, 4 + k));
  return order;
}


function emptyFactLists(facts: NarrativeFacts, omitted: Record<string, number>): NarrativeFacts {
  const removed =
    facts.low_support_classes.length + (facts.prediction_bias?.rows.length ?? 0) + facts.distribution_shift.length;
  if (removed > 0) omitted.facts_class_lists = (omitted.facts_class_lists ?? 0) + removed;
  return {
    ...facts,
    low_support_classes: [],
    prediction_bias: facts.prediction_bias ? { ...facts.prediction_bias, rows: [] } : null,
    distribution_shift: [],
  };
}

/** facts 안 목록의 칸별 상한과 facts 전체 길이 상한. */
export function fitFacts(input: NarrativeFacts): NarrativeFacts {
  const omitted: Record<string, number> = { ...input.omitted };
  const note = (key: string, n: number) => {
    if (n > 0) omitted[key] = (omitted[key] ?? 0) + n;
  };

  const weakest = input.weakest_class?.label;
  const lowSupport = keepTop(input.low_support_classes, MAX_CLASS_ENTRIES, (r) => -r.support, (r) =>
    r.label === weakest ? 0 : undefined,
  );
  note("low_support_classes", lowSupport.dropped);
  const bias = input.prediction_bias
    ? keepTop(input.prediction_bias.rows, MAX_CLASS_ENTRIES, (r) => Math.abs(r.difference))
    : null;
  note("prediction_bias", bias?.dropped ?? 0);
  const shift = keepTop(input.distribution_shift, MAX_CLASS_ENTRIES, (r) => Math.abs(r.difference));
  note("distribution_shift", shift.dropped);

  const vd = input.verdict_detail;
  let facts: NarrativeFacts = {
    ...input,
    low_support_classes: lowSupport.kept,
    prediction_bias: input.prediction_bias && bias ? { ...input.prediction_bias, rows: bias.kept } : null,
    distribution_shift: shift.kept,
    verdict_detail: {
      ...vd,
      failed_core: vd.failed_core.slice(0, MAX_METRIC_FACTS),
      failed_noncore: vd.failed_noncore.slice(0, MAX_METRIC_FACTS),
      unavailable_core: vd.unavailable_core.slice(0, MAX_METRIC_FACTS),
      inconclusive_metrics: vd.inconclusive_metrics.slice(0, MAX_METRIC_FACTS),
    },
    ci_skipped: input.ci_skipped.slice(0, MAX_METRIC_FACTS),
    fixed_sentences: input.fixed_sentences
      .slice(0, MAX_FIXED_SENTENCES)
      .map((s) => ({ ...s, text: cut(s.text, MAX_FIXED_SENTENCE_CHARS) })),
    omitted,
  };

  // 전체 길이 — 덜 중요한 목록부터 줄인다.
  const steps: Array<(f: NarrativeFacts) => NarrativeFacts> = [
    (f) => {
      const flagged = f.distribution_shift.filter((r) => r.flagged);
      note("distribution_shift", f.distribution_shift.length - flagged.length);
      return { ...f, distribution_shift: flagged };
    },
    (f) => {
      if (!f.prediction_bias) return f;
      const top = keepTop(f.prediction_bias.rows, FACTS_LIST_TRIM, (r) => Math.abs(r.difference));
      note("prediction_bias", top.dropped);
      return { ...f, prediction_bias: { ...f.prediction_bias, rows: top.kept } };
    },
    (f) => {
      const top = keepTop(f.low_support_classes, FACTS_LIST_TRIM, (r) => -r.support, (r) =>
        r.label === f.weakest_class?.label ? 0 : undefined,
      );
      note("low_support_classes", top.dropped);
      return { ...f, low_support_classes: top.kept };
    },
    (f) => emptyFactLists(f, omitted),
    (f) => {
      note("fixed_sentences", f.fixed_sentences.length);
      return { ...f, fixed_sentences: [] };
    },
  ];
  for (const step of steps) {
    if (factsLength(facts) <= MAX_FACTS_CHARS) break;
    facts = { ...step(facts), omitted };
  }
  return facts;
}

/** 사실 시트의 칸별 상한 — 클래스 표·지표·문제·문장 길이. facts 가 있으면 함께 줄인다. */
export function fitFactSheet(sheet: FactSheet): FactSheet {
  const facts = sheet.facts ? fitFacts(sheet.facts) : sheet.facts;
  const omitted: Record<string, number> = { ...(facts?.omitted ?? {}) };
  const note = (key: string, n: number) => {
    if (n > 0) omitted[key] = (omitted[key] ?? 0) + n;
  };
  const keep = mustKeepClasses(facts);

  const perClass = keepTop(sheet.per_class, MAX_CLASS_ENTRIES, (r) => r.support ?? 0, (r) => keep.get(r.label));
  note("per_class", perClass.dropped);
  const counts = keepTop(
    sheet.confusion_counts,
    MAX_CLASS_ENTRIES,
    (r) => r.tp + r.fn,
    (r) => keep.get(r.label),
  );
  note("confusion_counts", counts.dropped);

  let confusion = sheet.confusion;
  if (confusion && confusion.labels.length > MAX_CLASS_ENTRIES) {
    note("confusion", confusion.labels.length);
    confusion = null;
  }

  let distribution = sheet.distribution;
  if (distribution) {
    const entries = Object.entries(distribution.class_distribution);
    const top = keepTop(entries, MAX_CLASS_ENTRIES, ([, n]) => n, ([name]) => keep.get(name));
    note("class_distribution", top.dropped);
    if (top.dropped > 0) distribution = { ...distribution, class_distribution: Object.fromEntries(top.kept) };
  }

  const problems = sheet.problems.slice(0, MAX_PROBLEMS).map((p) => ({
    ...p,
    title: cut(p.title, MAX_PROBLEM_TEXT_CHARS),
    ...(p.note ? { note: cut(p.note, MAX_PROBLEM_TEXT_CHARS) } : {}),
  }));

  return {
    ...sheet,
    metrics: sheet.metrics.slice(0, MAX_METRIC_FACTS),
    per_class: perClass.kept,
    confusion_counts: counts.kept,
    confusion,
    distribution,
    ci_method_note: sheet.ci_method_note === null ? null : cut(sheet.ci_method_note, MAX_CI_METHOD_NOTE_CHARS),
    problems,
    // 표를 자른 수(omitted)를 더하면 facts 가 다시 길어질 수 있다 — 마지막 모양으로 한 번 더 잰다(S4b 검토 BE-06).
    ...(facts ? { facts: fitFacts({ ...facts, omitted }) } : {}),
  };
}

/** 요청 본문의 UTF-8 바이트 수. */
export function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

/**
 * 요청 본문이 예산을 넘으면 클래스 단위 칸을 모두 비운다(백엔드 413 을 피한다). 예산 안이면 그대로 돌려준다.
 */
export function fitNarrativePayload(payload: NarrativeRequestPayload): NarrativeRequestPayload {
  if (payloadBytes(payload) <= NARRATIVE_BODY_BUDGET_BYTES) return payload;
  const sheet = payload.fact_sheet;
  const omitted: Record<string, number> = { ...(sheet.facts?.omitted ?? {}) };
  const note = (key: string, n: number) => {
    if (n > 0) omitted[key] = (omitted[key] ?? 0) + n;
  };
  note("per_class", sheet.per_class.length);
  note("confusion_counts", sheet.confusion_counts.length);
  note("confusion", sheet.confusion?.labels.length ?? 0);
  note("class_distribution", Object.keys(sheet.distribution?.class_distribution ?? {}).length);
  const facts = sheet.facts ? emptyFactLists({ ...sheet.facts, omitted }, omitted) : sheet.facts;
  return {
    ...payload,
    fact_sheet: {
      ...sheet,
      per_class: [],
      class_averages: [],
      confusion: null,
      confusion_counts: [],
      distribution: null,
      ...(facts ? { facts: { ...facts, omitted } } : {}),
    },
  };
}

