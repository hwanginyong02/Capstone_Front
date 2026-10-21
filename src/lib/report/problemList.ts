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
 * 두 종의 값은 서술용 파생값(`narrativeFacts.ts`)이 계산한 것을 받아 쓴다 — 사실 시트·D6 표와 같은 값(S4a).
 * 최약 클래스는 지표 선택과 무관하게 늘 본다(종전 "M22 를 골랐고" 조건 삭제 — 사용자 결정).
 */
import type { TaskType } from "../../data/evaluationData";
import type {
  F1ThresholdGain,
  ImbalanceEffect,
  KpiResult,
  Problem,
  ProblemKind,
} from "../../types/finalReport.types";
import { computeMargin, computeVerdict, isJudged, isNearTarget } from "./computeVerdict";
// 차이는 판정·마진과 같은 함수 하나로 잰다(끝자리 잡음을 걷음 — 0.85 − 0.75 가 "꼭 0.10 차이"로 남게).
import { difference } from "./judgedNumber";
import {
  DISTRIBUTION_SHIFT_MIN,
  LOW_SHARE_MIN,
  LOW_SUPPORT_MIN,
  WEAKEST_F1_GAP,
  type NarrativeFacts,
} from "./narrativeFacts";
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
/** 최약 클래스 — 표본 수가 이 값 미만이면 표본 부족이다(자체 설정, 값은 `narrativeFacts` 한 곳). */
export const WEAKEST_SUPPORT_MIN = LOW_SUPPORT_MIN;
/** 최약 클래스 — 전체 표본에서 차지하는 몫이 이 값 미만이면 표본 부족이다(자체 설정). */
export const WEAKEST_SHARE_MIN = LOW_SHARE_MIN;
export { DISTRIBUTION_SHIFT_MIN, WEAKEST_F1_GAP };

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
  const parsed: F1ThresholdGain = { max_f1: maxF1, current_f1: currentF1, gain, best_threshold: best };
  // 엔진 판정(S2) — 모양이 맞을 때만 싣는다. 없으면(옛 백엔드) 문제 목록이 4자리 gain 으로 판정한다.
  if (typeof raw.notable === "boolean") parsed.notable = raw.notable;
  if (typeof raw.gain_text === "string") parsed.gain_text = raw.gain_text;
  return parsed;
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
  const parsed: ImbalanceEffect = {
    level,
    imbalance_ratio: ratio,
    accuracy_minus_macro_f1: accuracyGap,
    majority_minus_minority_f1: classGap,
    majority_class: raw.majority_class,
    minority_class: raw.minority_class,
  };
  // 차이를 만든 값 넷(서술 라운드 세션 B 엔진부터) — 칸마다 모양이 맞을 때만 싣는다. 없거나 틀리면 그 칸만 없다
  // (3절 문장이 차이만 찍는다). 멀티레이블은 정확도·매크로 F1 이 null 이라 싣지 않는다(정확도 갈래가 없다).
  const accuracy = finite(raw.accuracy);
  if (accuracy !== null) parsed.accuracy = accuracy;
  const macroF1 = finite(raw.macro_f1);
  if (macroF1 !== null) parsed.macro_f1 = macroF1;
  const majorityF1 = finite(raw.majority_f1);
  if (majorityF1 !== null) parsed.majority_f1 = majorityF1;
  const minorityF1 = finite(raw.minority_f1);
  if (minorityF1 !== null) parsed.minority_f1 = minorityF1;
  const display = parseImbalanceDisplay(raw.display, accuracyGap === null);
  if (display) parsed.display = display;
  return parsed;
}

/** 불균형 영향의 표시 문자열(S2). 모양이 하나라도 틀리면 null — 숫자 칸만으로 그대로 간다. */
function parseImbalanceDisplay(raw: unknown, noAccuracyGap: boolean): ImbalanceEffect["display"] | null {
  if (!isRecord(raw)) return null;
  const { imbalance_ratio: ir, accuracy_minus_macro_f1: acc, majority_minus_minority_f1: cls } = raw;
  if (typeof ir !== "string" || typeof cls !== "string") return null;
  if (noAccuracyGap ? acc !== null : typeof acc !== "string") return null;
  const display: NonNullable<ImbalanceEffect["display"]> = {
    imbalance_ratio: ir,
    accuracy_minus_macro_f1: acc as string | null,
    majority_minus_minority_f1: cls,
  };
  // 새 칸(세션 B 엔진부터)은 문자열일 때만 — 없거나 null 이면 그 칸만 없다.
  for (const key of ["accuracy", "macro_f1", "majority_f1", "minority_f1"] as const) {
    if (typeof raw[key] === "string") display[key] = raw[key] as string;
  }
  return display;
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
  /**
   * 서술용 파생값 중 최약 클래스·학습↔평가 분포 차이(`buildNarrativeFacts`) — 사실 시트·D6 표와 같은 값.
   * 최약 클래스는 지표 선택과 무관하게 엔진이 늘 계산하는 클래스별 표에서 나온다.
   */
  facts: Pick<NarrativeFacts, "weakest_class" | "distribution_shift">;
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

/** 최약 클래스 문제 — 표본이 작거나(30건·5% 미만) 매크로 F1 보다 0.10 이상 낮을 때만. 근거 키는 종전 그대로. */
function weakestClassProblem(weakest: NarrativeFacts["weakest_class"]): Found | null {
  if (!weakest || !(weakest.low_support || weakest.far_below_macro)) return null;
  return {
    title: weakest.label,
    evidence: {
      [weakest.label]: {
        f1: weakest.f1,
        support: weakest.support,
        share: weakest.share,
        macro_f1: weakest.macro_f1,
        gap_from_macro: weakest.gap_from_macro,
        low_support: weakest.low_support,
      },
    },
  };
}

/**
 * 학습↔평가 분포 차이 문제 — 어느 클래스든 |학습 비율 − 평가 비율| ≥ 10%p(flagged). 걸린 클래스만 적는다.
 * 차이의 절댓값 합은 2 를 넘지 못해 걸리는 클래스는 많아야 20개다 — 근거를 따로 자르지 않는다.
 */
function distributionShiftProblem(rows: NarrativeFacts["distribution_shift"]): Found | null {
  const flagged = rows.filter((r) => r.flagged);
  if (flagged.length === 0) return null;
  return {
    title: flagged.map((r) => r.label).join(", "),
    evidence: Object.fromEntries(
      flagged.map((r) => [
        r.label,
        { training_ratio: r.training_ratio, evaluation_ratio: r.evaluation_ratio, difference: r.difference },
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

  // 임계값 부적합은 엔진이 반올림 전 값으로 정한 notable 을 따른다(S2). 옛 응답(키 없음)만 4자리 gain 으로.
  if (taskType === "binary" && thresholdGain && (thresholdGain.notable ?? thresholdGain.gain >= THRESHOLD_GAIN_MIN)) {
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

  const weakest = weakestClassProblem(input.facts.weakest_class);
  if (weakest) found.weakest_class = weakest;

  const shift = distributionShiftProblem(input.facts.distribution_shift);
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
