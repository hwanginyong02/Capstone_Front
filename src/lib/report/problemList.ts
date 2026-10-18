/**
 * 9절 문제 목록 — 권고가 대응할 문제 9종을 정해진 조건으로 고른다(서술 설계 D22).
 *
 * - 문제는 프론트가 만든다. 판정 사유·산출 실패 지표·고객 선택지가 프론트에만 있고, AI 호출이 실패해도
 *   9절이 찍혀야 하기 때문이다. 백엔드는 AI 권고를 이 번호에 맞추고 폴백 권고를 만든다.
 * - 종류마다 많아야 하나. 지표·클래스가 여럿이면 이름을 괄호에 쉼표로 적는다.
 * - 번호(P1…)는 우선순위 순, 같은 우선순위는 아래 `KINDS` 표 순서다.
 * - 판정 사유는 `computeVerdict`, 아슬아슬은 `isNearTarget` 한 곳이 정한다. 임계값 조정 여지(D40)와
 *   불균형 영향(D20)은 백엔드 평가 엔진이 계산해 실어 보낸 값을 읽기만 한다.
 * - 목록은 생성 때 한 번 만들어 성적서 데이터에 저장한다 — 발급본은 나중에 기준이 바뀌어도 그대로다.
 *
 * 최약 클래스·학습↔평가 분포 차이 두 종은 설계에 기준이 없어 새로 정했다(자체 설정, 설계 문서에 기록).
 */
import type { TaskType } from "../../data/evaluationData";
import type {
  ClassReportTable,
  F1ThresholdGain,
  ImbalanceEffect,
  KpiResult,
  Problem,
  ProblemKind,
} from "../../types/finalReport.types";
import { computeMargin, computeVerdict, isJudged, isNearTarget } from "./computeVerdict";
import { choiceLabel, type ReportComposerInput } from "./reportMaterials";

/** 종류별 우선순위·기본 이름·원천 절 → 권고 절. 이 순서가 번호 순서다(우선순위 순). */
const KINDS: Array<{
  kind: ProblemKind;
  priority: Problem["priority"];
  title: string;
  source: string;
  recommend: string;
}> = [
  { kind: "core_fail", priority: "HIGH", title: "핵심 지표 미달", source: "8.2", recommend: "9.2" },
  { kind: "inconclusive", priority: "HIGH", title: "판정 불가 원인", source: "8.2", recommend: "9.2" },
  { kind: "noncore_fail", priority: "MEDIUM", title: "비핵심 지표 미달", source: "8.2", recommend: "9.2" },
  { kind: "core_near_target", priority: "MEDIUM", title: "핵심 지표 아슬아슬 합격", source: "8.3", recommend: "9.2" },
  { kind: "threshold_tuning", priority: "MEDIUM", title: "임계값 부적합", source: "8.3", recommend: "9.2" },
  { kind: "imbalance_effect", priority: "MEDIUM", title: "불균형 영향 있음", source: "7.2", recommend: "9.1" },
  { kind: "weakest_class", priority: "LOW", title: "최약 클래스", source: "7.1·8.3", recommend: "9.1" },
  { kind: "distribution_shift", priority: "LOW", title: "학습↔평가 분포 차이", source: "7.2", recommend: "9.1" },
  { kind: "label_caution", priority: "LOW", title: "정답 라벨 주의", source: "7.2", recommend: "9.1" },
];

/** 임계값 조정 여지 — 최대 F1 과 실제 F1 의 차이가 이 값 이상이면 문제다(D40). */
export const THRESHOLD_GAIN_MIN = 0.1;
/** 최약 클래스 — 표본 수가 이 값 미만이면 표본 부족이다(자체 설정). */
export const WEAKEST_SUPPORT_MIN = 30;
/** 최약 클래스 — 전체 표본에서 차지하는 몫이 이 값 미만이면 표본 부족이다(자체 설정). */
export const WEAKEST_SHARE_MIN = 0.05;
/** 최약 클래스 — 매크로 F1 보다 이 값 이상 낮으면 문제다(자체 설정). */
export const WEAKEST_F1_GAP = 0.1;
/** 학습↔평가 분포 차이 — 어느 클래스든 비율 차가 이 값(10%p) 이상이면 문제다(자체 설정). */
export const DISTRIBUTION_SHIFT_MIN = 0.1;

/**
 * 두 값의 차를 비교하기 전에 부동소수 끝자리 잡음을 걷어 낸다. 0.85 − 0.75 는 0.0999999… 가 되어
 * "꼭 0.10 차이"가 기준(이상)에서 빠진다. 표의 값은 많아야 소수 4~6자리라 10자리 반올림은 판정을
 * 바꾸지 않는다.
 */
function difference(a: number, b: number): number {
  return Math.round((a - b) * 1e10) / 1e10;
}

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** 응답의 f1_threshold_gain 을 읽는다. 키가 없거나 모양이 하나라도 틀리면 null(문제로 올리지 않는다). */
export function parseF1ThresholdGain(raw: unknown): F1ThresholdGain | null {
  if (!isRecord(raw)) return null;
  const maxF1 = finite(raw.max_f1);
  const currentF1 = finite(raw.current_f1);
  const gain = finite(raw.gain);
  const best = finite(raw.best_threshold);
  if (maxF1 === null || currentF1 === null || gain === null || best === null || gain < 0) return null;
  return { max_f1: maxF1, current_f1: currentF1, gain, best_threshold: best };
}

const IMBALANCE_LEVELS: readonly ImbalanceEffect["level"][] = ["affected", "no_distortion", "mild"];

/** 응답의 imbalance_effect 를 읽는다. 키가 없거나 모양이 하나라도 틀리면 null. */
export function parseImbalanceEffect(raw: unknown): ImbalanceEffect | null {
  if (!isRecord(raw)) return null;
  const level = IMBALANCE_LEVELS.find((item) => item === raw.level);
  const ratio = finite(raw.imbalance_ratio);
  const accuracyGap = raw.accuracy_minus_macro_f1 === null ? null : finite(raw.accuracy_minus_macro_f1);
  const classGap = finite(raw.majority_minus_minority_f1);
  if (
    level === undefined ||
    ratio === null ||
    (raw.accuracy_minus_macro_f1 !== null && accuracyGap === null) ||
    classGap === null ||
    typeof raw.majority_class !== "string" ||
    typeof raw.minority_class !== "string"
  ) {
    return null;
  }
  return {
    level,
    imbalance_ratio: ratio,
    accuracy_minus_macro_f1: accuracyGap,
    majority_minus_minority_f1: classGap,
    majority_class: raw.majority_class,
    minority_class: raw.minority_class,
  };
}

/** 정답 라벨 주의에 걸린 답 하나 — 무엇(구축 방법/신뢰성)이 어떤 값(성적서 이름)인지. */
export interface LabelCaution {
  aspect: "구축 방법" | "신뢰성";
  value: string;
}

/** 주의할 라벨 구축 방법 — 사람이 정답을 확인하지 않은 경우(규칙·자동, 운영 로그). */
const CAUTION_AUTHORS = ["A program or rule", "Recorded outcomes"];
const CAUTION_REVIEW = "No review";

/**
 * 정답 라벨 주의 판정(서술 설계 D22, 7.2 고정 문구 12). 신뢰성이 "검토 없음"이거나 구축 방법이
 * "규칙·자동"·"운영 로그"이면 걸린다. 정답 라벨 카드를 껐거나 "모름"이면 판단하지 않는다(빈 배열).
 *
 * 9절 문제와 7.2 고정 문구 12 가 이 함수 하나를 본다 — 자리마다 따로 적으면 어긋난다.
 */
export function labelCautions(composer: ReportComposerInput | undefined): LabelCaution[] {
  if (!composer?.cards.groundTruth) return [];
  const { labelAuthor, labelReview } = composer.groundTruth;
  const out: LabelCaution[] = [];
  if (labelAuthor && !labelAuthor.unknown && labelAuthor.text && CAUTION_AUTHORS.includes(labelAuthor.text)) {
    out.push({ aspect: "구축 방법", value: choiceLabel("groundTruth", "labelAuthor", labelAuthor.text) });
  }
  if (labelReview && !labelReview.unknown && labelReview.text === CAUTION_REVIEW) {
    out.push({ aspect: "신뢰성", value: choiceLabel("groundTruth", "labelReview", labelReview.text) });
  }
  return out;
}

/** 편향 감소 노력에 "수행 안 함"을 골랐는지(불균형 영향 문제의 메모). 카드를 껐거나 "모름"이면 아니다. */
function didNothingForImbalance(composer: ReportComposerInput | undefined): boolean {
  if (!composer?.cards.trainingData) return false;
  const value = composer.trainingData.imbalanceHandling;
  return !!value && !value.unknown && (value.choices ?? []).includes("Did nothing");
}

/**
 * 학습 클래스 분포(⑥ "클래스별 데이터 양")를 클래스 → 건수로 읽는다. 카드를 껐거나 "모름"이거나,
 * **한 칸이라도 비었거나 숫자가 아니면** null — 일부 클래스만으로 비율을 내면 그 클래스 몫이 부풀어
 * 차이가 거짓으로 커진다. 합이 0 이어도 null.
 */
function trainingCounts(composer: ReportComposerInput | undefined): Record<string, number> | null {
  if (!composer?.cards.trainingData) return null;
  const value = composer.trainingData.trainingClassVolume;
  if (!value || value.unknown) return null;
  const entries = value.entries ?? [];
  if (entries.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const raw = entry.value.trim();
    const parsed = raw === "" ? NaN : Number(raw.replace(/[,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    counts[entry.key] = parsed;
  }
  return Object.values(counts).reduce((a, b) => a + b, 0) > 0 ? counts : null;
}

/** 클래스 → 비율(그 클래스 수 ÷ 전체 합). */
function ratios(counts: Record<string, number>): Record<string, number> {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, total > 0 ? v / total : 0]));
}

export interface ProblemListInput {
  /** 성적서의 지표 결과(`attachNearTarget` 을 거친 값). */
  kpiResults: KpiResult[];
  taskType: TaskType;
  /** 판정에 쓴 핵심 지표(M 표기) — `buildConclusion` 과 같은 목록. */
  coreMetricIds: string[];
  /** 백엔드 f1_threshold_gain(`parseF1ThresholdGain`). */
  thresholdGain: F1ThresholdGain | null;
  /** 백엔드 imbalance_effect(`parseImbalanceEffect`). */
  imbalanceEffect: ImbalanceEffect | null;
  /** 클래스별 표(M22). M22 를 골랐을 때만 있다. */
  classReport: ClassReportTable | null | undefined;
  /** 평가 데이터의 클래스 분포(3절과 같은 값). 멀티레이블은 레이블 등장 횟수다. */
  evaluationDistribution: Record<string, number>;
  /** 성적서 구성 카드의 값 — 학습 분포·편향 감소 노력·정답 라벨. 없으면 그 문제는 판단하지 않는다. */
  composer?: ReportComposerInput;
}

type Found = { title?: string; evidence: Record<string, unknown>; note?: string | null };

function names(kpiResults: KpiResult[], metricIds: string[]): string[] {
  return metricIds.map((id) => kpiResults.find((r) => r.metricId === id)?.name ?? id);
}

function valueEvidence(kpiResults: KpiResult[], metricIds: string[]): Record<string, unknown> {
  return Object.fromEntries(
    metricIds.map((id) => {
      const r = kpiResults.find((item) => item.metricId === id)!;
      return [r.name, { value: r.value, target: r.threshold }];
    }),
  );
}

const INCONCLUSIVE_CAUSE = {
  core_not_computed: "핵심 지표 산출 실패",
  no_target: "핵심 지표 목표값 없음",
  no_judged: "판정 대상 지표 없음",
} as const;

/** 최약 클래스 — M22 클래스 줄 중 F1 최저(같으면 표 순서 앞). 조건에 걸리지 않으면 null. */
function weakestClass(table: ClassReportTable | null | undefined): Found | null {
  if (!table) return null;
  const rows = table.rows.filter((r) => r.f1 !== null);
  if (rows.length === 0) return null;
  const weakest = rows.reduce((min, r) => (r.f1! < min.f1! ? r : min));
  const total = table.rows.reduce((sum, r) => sum + (r.support ?? 0), 0);
  const support = weakest.support;
  const share = support !== null && total > 0 ? support / total : null;
  const lowSupport =
    support !== null && (support < WEAKEST_SUPPORT_MIN || (share !== null && share < WEAKEST_SHARE_MIN));
  const macro = table.averages.find((r) => r.label === "매크로 평균")?.f1 ?? null;
  const gap = macro !== null ? difference(macro, weakest.f1!) : null;
  const farBelow = gap !== null && gap >= WEAKEST_F1_GAP;
  if (!lowSupport && !farBelow) return null;
  return {
    title: weakest.label,
    evidence: {
      [weakest.label]: {
        f1: weakest.f1,
        support,
        share: share === null ? null : round4(share),
        macro_f1: macro,
        gap_from_macro: gap === null ? null : round4(gap),
        low_support: lowSupport,
      },
    },
  };
}

/** 학습↔평가 분포 차이 — 어느 클래스든 |학습 비율 − 평가 비율| ≥ 10%p. 걸린 클래스만 적는다. */
function distributionShift(
  composer: ReportComposerInput | undefined,
  evaluation: Record<string, number>,
): Found | null {
  const training = trainingCounts(composer);
  if (!training || Object.keys(evaluation).length === 0) return null;
  const train = ratios(training);
  const test = ratios(evaluation);
  const classes = [...new Set([...Object.keys(train), ...Object.keys(test)])];
  const shifted = classes.filter(
    (c) => Math.abs(difference(train[c] ?? 0, test[c] ?? 0)) >= DISTRIBUTION_SHIFT_MIN,
  );
  if (shifted.length === 0) return null;
  return {
    title: shifted.join(", "),
    evidence: Object.fromEntries(
      shifted.map((c) => [
        c,
        {
          training_ratio: round4(train[c] ?? 0),
          evaluation_ratio: round4(test[c] ?? 0),
          difference: round4((train[c] ?? 0) - (test[c] ?? 0)),
        },
      ]),
    ),
  };
}

/**
 * 문제 목록을 만든다(결정적). 걸린 종류만 `KINDS` 순서로 담고 P1… 번호를 붙인다. 0개면 빈 배열 —
 * 9절은 고정 문구 6("지목된 문제점 없음")을 찍는다.
 */
export function buildProblemList(input: ProblemListInput): Problem[] {
  const { kpiResults, taskType, coreMetricIds, thresholdGain, imbalanceEffect, composer } = input;
  const { verdict, reasons } = computeVerdict(kpiResults, taskType, coreMetricIds);
  const found: Partial<Record<ProblemKind, Found>> = {};

  if (reasons.coreFailed.length > 0) {
    found.core_fail = {
      title: names(kpiResults, reasons.coreFailed).join(", "),
      evidence: valueEvidence(kpiResults, reasons.coreFailed),
    };
  }

  if (verdict === "INCONCLUSIVE" && reasons.inconclusive) {
    const { reason, metricIds } = reasons.inconclusive;
    const cause = INCONCLUSIVE_CAUSE[reason];
    found.inconclusive = {
      // 지표 탓이 아니면(판정 대상 0개) 원인을 괄호에 적는다.
      title: metricIds.length > 0 ? names(kpiResults, metricIds).join(", ") : cause,
      evidence: {
        cause,
        reason,
        metrics: names(kpiResults, metricIds),
        judged_count: kpiResults.filter(isJudged).length,
      },
    };
  }

  if (reasons.nonCoreFailed.length > 0) {
    found.noncore_fail = {
      title: names(kpiResults, reasons.nonCoreFailed).join(", "),
      evidence: valueEvidence(kpiResults, reasons.nonCoreFailed),
    };
  }

  // 핵심이고 합격인데 목표값과의 차이가 목표값의 3% 미만 — 판정은 `isNearTarget` 한 곳의 식이다.
  // 핵심 여부는 판정과 같은 목록(coreMetricIds)으로 본다.
  const coreIds = new Set(coreMetricIds);
  const near = kpiResults.filter((r) => coreIds.has(r.metricId) && r.status === "pass" && isNearTarget(r));
  if (near.length > 0) {
    found.core_near_target = {
      title: near.map((r) => r.name).join(", "),
      evidence: Object.fromEntries(
        near.map((r) => [
          r.name,
          { value: r.value, target: r.threshold, margin: round4(computeMargin(r) ?? 0) },
        ]),
      ),
    };
  }

  if (taskType === "binary" && thresholdGain && thresholdGain.gain >= THRESHOLD_GAIN_MIN) {
    found.threshold_tuning = { evidence: { ...thresholdGain } };
  }

  if (imbalanceEffect?.level === "affected") {
    found.imbalance_effect = {
      title: `다수 ${imbalanceEffect.majority_class} · 소수 ${imbalanceEffect.minority_class}`,
      evidence: { ...imbalanceEffect },
      note: didNothingForImbalance(composer)
        ? "의뢰자가 편향 감소 노력을 '수행 안 함'으로 밝혔다."
        : null,
    };
  }

  const weakest = weakestClass(input.classReport);
  if (weakest) found.weakest_class = weakest;

  const shift = distributionShift(composer, input.evaluationDistribution);
  if (shift) found.distribution_shift = shift;

  const cautions = labelCautions(composer);
  if (cautions.length > 0) {
    found.label_caution = {
      title: cautions.map((c) => `${c.aspect} ${c.value}`).join(", "),
      evidence: Object.fromEntries(cautions.map((c) => [`정답 라벨 ${c.aspect}`, c.value])),
    };
  }

  return KINDS.filter(({ kind }) => found[kind]).map(({ kind, priority, title, source, recommend }, i) => {
    const hit = found[kind]!;
    return {
      id: `P${i + 1}`,
      kind,
      priority,
      title: hit.title ? `${title} (${hit.title})` : title,
      source_section: source,
      recommend_section: recommend,
      evidence: hit.evidence,
      note: hit.note ?? null,
    };
  });
}

/** 9절 "대응 문제 번호" 칸에 찍는 이름 — "P1 · 핵심 지표 미달 (F1 Score)". */
export function problemLabel(problem: Problem): string {
  return `${problem.id} · ${problem.title}`;
}
