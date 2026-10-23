/**
 * 서술용 파생값(서술 설계 6절) — 사실 시트의 `facts` 칸, 9절 문제 목록, D6 표가 같이 읽는 한 곳.
 *
 * 계약은 `NARRATIVE_ROUND/사실시트_계약.json`(facts-1)이고, 같은 사본이 `src/test/contract/` 에 있다.
 *
 * - 숫자는 여기서 한 번 계산한다. 백엔드 서술은 받은 값을 다시 계산하지 않는다.
 * - 엔진이 계산하는 값(FP/FN = confusion_counts, 신뢰구간, 경계·확신 오류, 불균형 영향, 임계값 조정
 *   여지)은 다시 세지 않는다 — 여기서는 그 값을 묶거나 고른다.
 * - 클래스 수·최약 클래스·작은 표본은 **정답 클래스**(클래스별 표의 줄, support > 0)로 센다. 예측에만
 *   나온 클래스는 혼동행렬의 줄(0)·열로만 남고, 여기서는 예측 편향에만 실제 0 줄로 나온다.
 * - 기준과 비교되는 값은 숫자(반올림 전 값을 9자리로 정리)와 `*_text`(판정과 같은 쪽으로 읽히게 자릿수를
 *   늘린 표기 — `judgedText`)를 함께 싣는다. "넘었나"는 반올림 전 값과 `difference`(1e-10 보정)로 정한다.
 */
import type { TaskType } from "../../data/evaluationData";
import type {
  ClassReportRow,
  ClassReportTable,
  ConfusionCounts,
  KpiResult,
  ReportPurposeKey,
} from "../../types/finalReport.types";
import { computeVerdict, isJudged, type InconclusiveReason } from "./computeVerdict";
import type { RawConfidenceInterval } from "./confidenceIntervals";
import { cleanNumber, difference, factText, judgedText } from "./judgedNumber";
import { REPORT_PURPOSE_LABEL } from "./reportConstants";
import type { ReportComposerInput } from "./reportMaterials";

export const FACTS_CONTRACT = "facts-1";

/** 작은 표본 — support 30건 미만 또는 전체의 5% 미만(서술 설계 D12, 9절 문제 7). */
export const LOW_SUPPORT_MIN = 30;
export const LOW_SHARE_MIN = 0.05;
/** 최약 클래스가 매크로 F1 보다 이만큼 이상 낮으면 문제(9절 문제 7). */
export const WEAKEST_F1_GAP = 0.1;
/** Precision↔Recall 치우침(6절 tradeoff_flag) — |P − R| 이 이 값 이상. */
export const PR_GAP_MIN = 0.1;
/** 학습↔평가 분포 차이(9절 문제 8) — 어느 클래스든 |학습 비율 − 평가 비율| 이 이 값 이상. */
export const DISTRIBUTION_SHIFT_MIN = 0.1;
/** 최다 오분류 쌍은 상위 3개(6절 top_confusion_pairs). */
export const TOP_CONFUSION_PAIRS = 3;

export type RiskDirection = "fn" | "fp" | "similar";
export type ClassPriority = "all_equal" | "larger_first" | "samples_first";
export type UsageMode = "realtime" | "batch";

export interface MetricRef {
  metric_id: string;
  display_name: string;
}

export interface WeakestClassFact {
  label: string;
  f1: number;
  support: number;
  share: number;
  share_text: string;
  macro_f1: number | null;
  gap_from_macro: number | null;
  gap_text: string | null;
  low_support: boolean;
  far_below_macro: boolean;
}

export interface FixedSentenceFact {
  /** 성적서 고정 문구 번호("9"·"17"·"11a"·"16" …). */
  id: string;
  /** 찍히는 소절("7.1"·"7.2"·"8.1"·"8.2"·"8.3"·"9"). */
  section: string;
  text: string;
}

export interface DistributionShiftRow {
  label: string;
  training_ratio: number;
  evaluation_ratio: number;
  difference: number;
  difference_text: string;
  flagged: boolean;
}

export interface NarrativeFacts {
  contract: typeof FACTS_CONTRACT;
  positive_class: string | null;
  n_classes: number | null;
  class_share_basis: "samples" | "label_occurrences";
  report_purpose_label: string | null;
  core_metrics_source: "default" | "client";
  /**
   * 의뢰자가 고른 지표(M 표기, 표 지표 M21·M22 포함 — 산출 실패도). 사실 시트 지표 목록은 표 지표를 빼므로,
   * 5절의 "M22 를 골랐으면"·"M2·M3 를 골랐으면" 같은 서술 조건은 이 목록으로 본다(백엔드 select_items).
   */
  selected_metrics: string[];
  declarations: {
    risk_direction: RiskDirection | null;
    class_priority: ClassPriority | null;
    usage_mode: UsageMode | null;
  };
  verdict_detail: {
    verdict: string;
    judged_count: number;
    passed_count: number;
    failed_core: MetricRef[];
    failed_noncore: MetricRef[];
    unavailable_core: MetricRef[];
    inconclusive_cause: InconclusiveReason | null;
    inconclusive_metrics: MetricRef[];
  };
  error_totals: { unit: "sample" | "label_cell"; total: number; misclassified: number } | null;
  weakest_class: WeakestClassFact | null;
  low_support_classes: Array<{ label: string; support: number; share: number; share_text: string }>;
  top_confusion_pairs: Array<{ actual: string; predicted: string; count: number; share_of_errors: number }>;
  prediction_bias: {
    unit: "positive_class" | "per_class" | "label_total";
    rows: Array<{ label: string | null; predicted: number; actual: number; difference: number }>;
  } | null;
  declared_risk_errors: {
    side: "fn" | "fp";
    count: number;
    total_errors: number;
    share: number | null;
    share_text: string | null;
  } | null;
  precision_recall_gap: {
    precision: number;
    recall: number;
    difference: number;
    difference_text: string;
    flagged: boolean;
  } | null;
  average_gap: {
    kind: "macro_vs_weighted" | "macro_vs_micro";
    macro_f1: number;
    other_f1: number;
    difference: number;
    /** 넷째 자리 표기 — 아주 작은 차이가 지수 표기(-7.0252e-05)로 직렬화되지 않게. */
    difference_text: string;
    reference_class: { label: string; support: number | null; f1: number | null };
  } | null;
  declared_average: {
    class_priority: ClassPriority;
    average: "weighted" | "micro";
    precision: number | null;
    recall: number | null;
    f1: number | null;
  } | null;
  distribution_shift_status: "compared" | "not_provided" | "uncovered";
  distribution_shift: DistributionShiftRow[];
  ci_available: boolean;
  ci_skipped: Array<{ metric_id: string; display_name: string; reason: string | null }>;
  fixed_sentences: FixedSentenceFact[];
  /** 미리 자르기로 뺀 개수(외 k개) — `fitFactSheet` 가 채운다. */
  omitted: Record<string, number>;
}

/** 혼동행렬(이진·다중 하나, 엔진 순서). 멀티레이블은 레이블별 2×2 라 여기 오지 않는다. */
export interface SingleConfusion {
  labels: string[];
  matrix: number[][];
}

export interface NarrativeFactsInput {
  taskType: TaskType;
  /** `attachNearTarget` 을 거친 지표 결과(산출 실패 포함). */
  kpiResults: KpiResult[];
  /** 판정에 쓴 핵심 지표(M 표기). */
  coreMetricIds: string[];
  coreMetricsSource: "default" | "client";
  /** 늘 계산하는 클래스별 표(엔진 `class_report`, 작업 유형을 넘기고 엔진 순서로 만든 것). */
  classTable: ClassReportTable | null;
  /** 늘 계산하는 혼동행렬(이진·다중). 멀티레이블·없음은 null. */
  confusion: SingleConfusion | null;
  confusionCounts: ConfusionCounts | null;
  positiveClass: string | null;
  reportPurpose: ReportPurposeKey | undefined;
  composer: ReportComposerInput | undefined;
  /** 평가 데이터의 클래스 분포(3절과 같은 값). 멀티레이블은 레이블 등장 횟수. */
  evaluationDistribution: Record<string, number>;
  /** 엔진 신뢰구간 원본(생략 사유를 읽는다). 엔진이 보내지 않았으면 null. */
  confidenceIntervals: Record<string, RawConfidenceInterval> | null;
  fixedSentences: FixedSentenceFact[];
}

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/** 정답 클래스 줄 — support > 0. */
export function groundTruthRows(table: ClassReportTable | null | undefined): ClassReportRow[] {
  return (table?.rows ?? []).filter((r) => r.support !== null && r.support > 0);
}

function averageRow(table: ClassReportTable | null | undefined, label: string): ClassReportRow | null {
  return table?.averages.find((r) => r.label === label) ?? null;
}

function isLowShare(share: number): boolean {
  return difference(share, LOW_SHARE_MIN) < 0;
}

function isLowSupport(support: number, share: number): boolean {
  return support < LOW_SUPPORT_MIN || isLowShare(share);
}

/**
 * 최약 클래스(서술 설계 D10) — 정답 클래스 중 F1 최저(같으면 엔진 순서 앞). 지표 선택과 무관하게 늘
 * 계산한다(사용자 결정). 정답 클래스가 둘 미만이면 견줄 클래스가 없어 null. 9절 문제 7 은
 * `low_support || far_below_macro` 일 때 이 값을 근거로 쓴다.
 */
export function weakestClass(table: ClassReportTable | null | undefined): WeakestClassFact | null {
  const truth = groundTruthRows(table);
  if (truth.length < 2) return null;
  const weakest = weakestRow(truth);
  if (!weakest) return null;
  const total = truth.reduce((sum, r) => sum + r.support!, 0);
  const support = weakest.support!;
  const share = support / total;
  const macro = averageRow(table, "매크로 평균")?.f1 ?? null;
  const gap = macro !== null ? difference(macro, weakest.f1!) : null;
  const farBelow = gap !== null && gap >= WEAKEST_F1_GAP;
  return {
    label: weakest.label,
    f1: weakest.f1!,
    support,
    share: cleanNumber(share),
    share_text: judgedText(share, LOW_SHARE_MIN, !isLowShare(share)),
    macro_f1: macro,
    gap_from_macro: gap === null ? null : cleanNumber(gap),
    gap_text: gap === null ? null : judgedText(gap, WEAKEST_F1_GAP, farBelow),
    low_support: isLowSupport(support, share),
    far_below_macro: farBelow,
  };
}

function weakestRow(rows: ClassReportRow[]): ClassReportRow | null {
  return rows
    .filter((r) => r.f1 !== null)
    .reduce<ClassReportRow | null>((min, r) => (min === null || r.f1! < min.f1! ? r : min), null);
}

/** 작은 표본 클래스 — 정답 클래스 중 support < 30 또는 전체의 5% 미만, 엔진 순서. 정답 클래스가 둘 미만이면 []. */
export function lowSupportClasses(table: ClassReportTable | null | undefined): NarrativeFacts["low_support_classes"] {
  const truth = groundTruthRows(table);
  if (truth.length < 2) return [];
  const total = truth.reduce((sum, r) => sum + r.support!, 0);
  return truth
    .filter((r) => isLowSupport(r.support!, r.support! / total))
    .map((r) => {
      const share = r.support! / total;
      return {
        label: r.label,
        support: r.support!,
        share: cleanNumber(share),
        share_text: judgedText(share, LOW_SHARE_MIN, !isLowShare(share)),
      };
    });
}

/**
 * 오분류 총건수(7.1 첫 항목) — 자르기 전 엔진 건수로. 혼동행렬이 잘려 null 이어도 남는다.
 * 이진 fp + fn / 표본 수, 다중 Σfn / 표본 수, 멀티 Σ(fp + fn) / 레이블 칸 수.
 */
export function errorTotals(
  taskType: TaskType,
  counts: ConfusionCounts | null,
  nSamples: number,
): NarrativeFacts["error_totals"] {
  const rows = counts?.rows ?? [];
  if (rows.length === 0) return null;
  if (taskType === "binary") {
    const row = rows[0];
    return { unit: "sample", total: row.tp + row.fp + row.fn + row.tn, misclassified: row.fp + row.fn };
  }
  if (taskType === "multilabel") {
    return {
      unit: "label_cell",
      total: rows.reduce((sum, r) => sum + r.tp + r.fp + r.fn + r.tn, 0),
      misclassified: rows.reduce((sum, r) => sum + r.fp + r.fn, 0),
    };
  }
  return { unit: "sample", total: nSamples, misclassified: rows.reduce((sum, r) => sum + r.fn, 0) };
}

/**
 * 최다 오분류 쌍(다중) — 비대각 칸을 건수 내림차순으로 상위 3. 같으면 정답 클래스의 엔진 순서 앞,
 * 그다음 예측 클래스의 엔진 순서 앞. 0건 칸은 싣지 않는다.
 */
export function topConfusionPairs(confusion: SingleConfusion | null): NarrativeFacts["top_confusion_pairs"] {
  if (!confusion) return [];
  const cells: Array<{ i: number; j: number; count: number }> = [];
  let errors = 0;
  confusion.matrix.forEach((row, i) =>
    row.forEach((count, j) => {
      if (i === j || count <= 0) return;
      errors += count;
      cells.push({ i, j, count });
    }),
  );
  cells.sort((a, b) => b.count - a.count || a.i - b.i || a.j - b.j);
  return cells.slice(0, TOP_CONFUSION_PAIRS).map(({ i, j, count }) => ({
    actual: confusion.labels[i],
    predicted: confusion.labels[j],
    count,
    share_of_errors: cleanNumber(count / errors),
  }));
}

/**
 * 예측 편향(6절 prediction_bias) — difference = 예측 − 실제.
 * 이진은 양성 예측 수(tp + fp) 대 실제 양성(tp + fn)이라 difference = fp − fn. 다중은 클래스별 열합 대
 * 줄합(예측에만 나온 클래스는 실제 0) — 혼동행렬이 없으면 confusion_counts 로(그때는 예측에만 나온
 * 클래스가 빠진다). 멀티는 정답 레이블 집합 안의 예측 레이블 총수 대 실제 레이블 총수.
 */
export function predictionBias(
  taskType: TaskType,
  confusion: SingleConfusion | null,
  counts: ConfusionCounts | null,
): NarrativeFacts["prediction_bias"] {
  const rows = counts?.rows ?? [];
  if (taskType === "binary") {
    const row = counts?.kind === "binary" ? rows[0] : undefined;
    if (!row) return null;
    const predicted = row.tp + row.fp;
    const actual = row.tp + row.fn;
    return { unit: "positive_class", rows: [{ label: row.label, predicted, actual, difference: predicted - actual }] };
  }
  if (taskType === "multilabel") {
    if (counts?.kind !== "perClass" || rows.length === 0) return null;
    const predicted = rows.reduce((sum, r) => sum + r.tp + r.fp, 0);
    const actual = rows.reduce((sum, r) => sum + r.tp + r.fn, 0);
    return { unit: "label_total", rows: [{ label: null, predicted, actual, difference: predicted - actual }] };
  }
  if (confusion && confusion.labels.length > 0) {
    return {
      unit: "per_class",
      rows: confusion.labels.map((label, k) => {
        const actual = (confusion.matrix[k] ?? []).reduce((a, b) => a + b, 0);
        const predicted = confusion.matrix.reduce((sum, row) => sum + (row[k] ?? 0), 0);
        return { label, predicted, actual, difference: predicted - actual };
      }),
    };
  }
  if (counts?.kind !== "perClass" || rows.length === 0) return null;
  return {
    unit: "per_class",
    rows: rows.map((r) => ({ label: r.label, predicted: r.tp + r.fp, actual: r.tp + r.fn, difference: r.fp - r.fn })),
  };
}

const RISK_CODES: Record<string, RiskDirection> = {
  "Missed (FN)": "fn",
  "False alarm (FP)": "fp",
  Similar: "similar",
};
const PRIORITY_CODES: Record<string, ClassPriority> = {
  "All equal": "all_equal",
  "Larger classes first": "larger_first",
  "Individual samples first": "samples_first",
};
const USAGE_CODES: Record<string, UsageMode> = {
  "Real-time": "realtime",
  Batch: "batch",
};

function declared<T>(composer: ReportComposerInput | undefined, fieldId: string, codes: Record<string, T>): T | null {
  const value = composer?.perspective[fieldId];
  if (!value || value.unknown || !value.text || !has(codes, value.text)) return null;
  return codes[value.text];
}

/**
 * 선언 코드값(재-3) — 화면 글자가 아니라 선택지 값에서. "모름"·미제공·이 유형에 없는 선언은 null.
 * 화면 글자와 덧붙인 글은 종전처럼 client_inputs.declarations 로 간다.
 */
export function declarations(
  composer: ReportComposerInput | undefined,
  taskType: TaskType,
): NarrativeFacts["declarations"] {
  return {
    risk_direction: taskType === "binary" ? declared(composer, "criticalErrorType", RISK_CODES) : null,
    class_priority: taskType !== "binary" ? declared(composer, "classPriority", PRIORITY_CODES) : null,
    usage_mode: declared(composer, "usageMode", USAGE_CODES),
  };
}

/** 선언한 위험 쪽 오류(D24, 이진) — 그쪽 건수와 전체 오류(fp + fn) 중 비율. */
export function declaredRiskErrors(
  risk: RiskDirection | null,
  counts: ConfusionCounts | null,
): NarrativeFacts["declared_risk_errors"] {
  if (risk !== "fn" && risk !== "fp") return null;
  const row = counts?.kind === "binary" ? counts.rows[0] : undefined;
  if (!row) return null;
  const count = risk === "fn" ? row.fn : row.fp;
  const total = row.fn + row.fp;
  const share = total > 0 ? count / total : null;
  return {
    side: risk,
    count,
    total_errors: total,
    share: share === null ? null : cleanNumber(share),
    share_text: share === null ? null : factText(share),
  };
}

/** Precision↔Recall 치우침(이진, 6절 tradeoff_flag) — 양성 클래스 줄의 P − R. */
export function precisionRecallGap(
  table: ClassReportTable | null,
  positiveClass: string | null,
): NarrativeFacts["precision_recall_gap"] {
  if (positiveClass === null) return null;
  const row = table?.rows.find((r) => r.label === positiveClass);
  if (!row || row.precision === null || row.recall === null) return null;
  const gap = difference(row.precision, row.recall);
  const flagged = difference(Math.abs(gap), PR_GAP_MIN) >= 0;
  const magnitude = judgedText(Math.abs(gap), PR_GAP_MIN, flagged);
  return {
    precision: row.precision,
    recall: row.recall,
    difference: cleanNumber(gap),
    difference_text: gap < 0 && magnitude !== "0" ? `-${magnitude}` : magnitude,
    flagged,
  };
}

/**
 * 평균 방식 사이의 차이(D17·D39) — 다중은 가중 − 매크로 F1 과 support 최대 정답 클래스(같으면 엔진 순서
 * 앞), 멀티는 마이크로 − 매크로 F1 과 F1 최저 레이블. 정답 클래스가 둘 미만이면 null.
 */
export function averageGap(taskType: TaskType, table: ClassReportTable | null): NarrativeFacts["average_gap"] {
  if (taskType === "binary") return null;
  const macro = averageRow(table, "매크로 평균")?.f1 ?? null;
  const other = averageRow(table, taskType === "multiclass" ? "가중 평균" : "마이크로 평균")?.f1 ?? null;
  const truth = groundTruthRows(table);
  if (macro === null || other === null || truth.length < 2) return null;
  const reference =
    taskType === "multiclass"
      ? truth.reduce((max, r) => (r.support! > max.support! ? r : max))
      : weakestRow(truth);
  if (!reference) return null;
  return {
    kind: taskType === "multiclass" ? "macro_vs_weighted" : "macro_vs_micro",
    macro_f1: macro,
    other_f1: other,
    difference: cleanNumber(difference(other, macro)),
    difference_text: factText(difference(other, macro)),
    reference_class: { label: reference.label, support: reference.support, f1: reference.f1 },
  };
}

/**
 * 선언한 평균 방식으로 본 값(D24·D28, 다중·멀티) — 다수 클래스 우선 = 가중 평균, 샘플 단위 = 마이크로
 * 평균(다중은 accuracy 로 만든 줄). 모든 클래스 동등·모름이면 확인할 선언이 없어 null.
 */
export function declaredAverage(
  priority: ClassPriority | null,
  table: ClassReportTable | null,
): NarrativeFacts["declared_average"] {
  if (priority !== "larger_first" && priority !== "samples_first") return null;
  const average = priority === "larger_first" ? "weighted" : "micro";
  const row = averageRow(table, average === "weighted" ? "가중 평균" : "마이크로 평균");
  if (!row) return null;
  return { class_priority: priority, average, precision: row.precision, recall: row.recall, f1: row.f1 };
}

/**
 * 클래스 이름 표기 맞추기 — 백엔드 `labels.normalize_label` 과 같은 규칙(앞뒤 공백, 정수 소수 '1.0' → '1').
 * S2 이전에 저장한 학습 분포 칸 이름이 평가 응답의 정규화된 이름과 어긋나지 않게.
 */
export function normalizeLabelText(label: string): string {
  const text = label.trim();
  if (!/^[+-]?\d+\.0+$/.test(text)) return text;
  const digits = text.replace(/\.0+$/, "").replace(/^\+/, "");
  return digits.replace(/^-/, "").replace(/^0+/, "") === "" ? "0" : digits;
}

/**
 * 학습 클래스 분포(⑥ "클래스별 데이터 양")를 클래스 → 건수로 읽는다(클래스 이름은 `normalizeLabelText`).
 * 카드를 껐거나 "모름"이거나, **한 칸이라도 비었거나 숫자가 아니면** null — 일부 클래스만으로 비율을
 * 내면 그 클래스 몫이 부풀어 차이가 거짓으로 커진다. 합이 0 이어도 null.
 */
export function trainingCounts(composer: ReportComposerInput | undefined): Map<string, number> | null {
  if (!composer?.cards.trainingData) return null;
  const value = composer.trainingData.trainingClassVolume;
  if (!value || value.unknown) return null;
  const entries = value.entries ?? [];
  if (entries.length === 0) return null;
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const raw = entry.value.trim();
    const parsed = raw === "" ? NaN : Number(raw.replace(/[,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    const key = normalizeLabelText(entry.key);
    counts.set(key, (counts.get(key) ?? 0) + parsed);
  }
  return [...counts.values()].reduce((a, b) => a + b, 0) > 0 ? counts : null;
}

/** 클래스 → 비율(그 클래스 수 ÷ 전체 합). */
function ratios(counts: Map<string, number>): Map<string, number> {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return new Map([...counts].map(([k, v]) => [k, total > 0 ? v / total : 0]));
}

/**
 * 학습↔평가 분포 차이(6절 dist_diff) — 대상은 평가 정답 클래스 ∪ 학습 칸. difference = 학습 비율 − 평가
 * 비율. 평가 데이터의 클래스가 학습 분포에 하나라도 없으면 견주지 않는다(B5② — uncovered). 9절 문제 8 은
 * flagged 인 클래스만 쓴다.
 */
export function distributionShift(
  composer: ReportComposerInput | undefined,
  evaluation: Record<string, number>,
): { status: NarrativeFacts["distribution_shift_status"]; rows: DistributionShiftRow[] } {
  const training = trainingCounts(composer);
  const evalCounts = new Map<string, number>();
  for (const [name, count] of Object.entries(evaluation)) {
    const key = normalizeLabelText(name);
    evalCounts.set(key, (evalCounts.get(key) ?? 0) + count);
  }
  const evalTotal = [...evalCounts.values()].reduce((a, b) => a + b, 0);
  if (!training || evalTotal <= 0) return { status: "not_provided", rows: [] };
  if ([...evalCounts].some(([name, count]) => count > 0 && !training.has(name))) {
    return { status: "uncovered", rows: [] };
  }
  const train = ratios(training);
  const test = ratios(evalCounts);
  const classes = [...new Set([...test.keys(), ...train.keys()])];
  const rows = classes.map((label) => {
    const t = train.get(label) ?? 0;
    const e = test.get(label) ?? 0;
    const gap = difference(t, e);
    const flagged = Math.abs(gap) >= DISTRIBUTION_SHIFT_MIN;
    const magnitude = judgedText(Math.abs(gap), DISTRIBUTION_SHIFT_MIN, flagged);
    return {
      label,
      training_ratio: cleanNumber(t),
      evaluation_ratio: cleanNumber(e),
      difference: cleanNumber(gap),
      difference_text: gap < 0 && magnitude !== "0" ? `-${magnitude}` : magnitude,
      flagged,
    };
  });
  return { status: "compared", rows };
}

const CI_REASON_MAX_CHARS = 300;

/** 판정 대상인데 신뢰구간이 없는 지표와 그 사유(나-9) — 전부 생략돼도 남는다. 엔진이 구간을 보내지 않았으면 []. */
export function ciSkipped(
  kpiResults: KpiResult[],
  intervals: Record<string, RawConfidenceInterval> | null,
): NarrativeFacts["ci_skipped"] {
  if (!intervals) return [];
  return kpiResults
    .filter((r) => isJudged(r) && !r.ci)
    .map((r) => {
      const reason = intervals[r.metricId]?.reason;
      return {
        metric_id: r.metricId,
        display_name: r.name,
        reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, CI_REASON_MAX_CHARS) : null,
      };
    });
}

function refs(kpiResults: KpiResult[], ids: string[]): MetricRef[] {
  return ids.map((id) => ({ metric_id: id, display_name: kpiResults.find((r) => r.metricId === id)?.name ?? id }));
}

/** 판정 근거(D19) — `computeVerdict` 한 곳의 결과를 옮긴다. 통과 수는 참고 수치. */
export function verdictDetail(
  kpiResults: KpiResult[],
  taskType: TaskType,
  coreMetricIds: string[],
): NarrativeFacts["verdict_detail"] {
  const { verdict, judgedCount, reasons } = computeVerdict(kpiResults, taskType, coreMetricIds);
  const core = new Set(coreMetricIds);
  return {
    verdict,
    judged_count: judgedCount,
    passed_count: kpiResults.filter((r) => isJudged(r) && r.status === "pass").length,
    failed_core: refs(kpiResults, reasons.coreFailed),
    failed_noncore: refs(kpiResults, reasons.nonCoreFailed),
    unavailable_core: refs(
      kpiResults,
      kpiResults.filter((r) => core.has(r.metricId) && r.status === "unavailable").map((r) => r.metricId),
    ),
    inconclusive_cause: reasons.inconclusive?.reason ?? null,
    inconclusive_metrics: refs(kpiResults, reasons.inconclusive?.metricIds ?? []),
  };
}

/** 서술용 파생값 전체(자르기 전). 자르기(상한)는 `fitFactSheet` 가 한다. */
export function buildNarrativeFacts(input: NarrativeFactsInput & { nSamples: number }): NarrativeFacts {
  const { taskType, kpiResults, classTable, confusion, confusionCounts, composer } = input;
  const decl = declarations(composer, taskType);
  const positiveClass = taskType === "binary" ? input.positiveClass : null;
  const truth = groundTruthRows(classTable);
  const shift = distributionShift(composer, input.evaluationDistribution);
  return {
    contract: FACTS_CONTRACT,
    positive_class: positiveClass,
    n_classes: truth.length > 0 ? truth.length : null,
    class_share_basis: taskType === "multilabel" ? "label_occurrences" : "samples",
    report_purpose_label: input.reportPurpose ? REPORT_PURPOSE_LABEL[input.reportPurpose] ?? null : null,
    core_metrics_source: input.coreMetricsSource,
    selected_metrics: kpiResults.map((r) => r.metricId),
    declarations: decl,
    verdict_detail: verdictDetail(kpiResults, taskType, input.coreMetricIds),
    error_totals: errorTotals(taskType, confusionCounts, input.nSamples),
    weakest_class: weakestClass(classTable),
    low_support_classes: lowSupportClasses(classTable),
    top_confusion_pairs: taskType === "multiclass" ? topConfusionPairs(confusion) : [],
    prediction_bias: predictionBias(taskType, confusion, confusionCounts),
    declared_risk_errors: taskType === "binary" ? declaredRiskErrors(decl.risk_direction, confusionCounts) : null,
    precision_recall_gap: taskType === "binary" ? precisionRecallGap(classTable, positiveClass) : null,
    average_gap: averageGap(taskType, classTable),
    declared_average: declaredAverage(decl.class_priority, classTable),
    distribution_shift_status: shift.status,
    distribution_shift: shift.rows,
    ci_available: input.confidenceIntervals !== null,
    ci_skipped: ciSkipped(kpiResults, input.confidenceIntervals),
    fixed_sentences: input.fixedSentences,
    omitted: {},
  };
}
