/**
 * 판 4 의 4.5 데이터 분포(대응표 28) — 분포 문장과 불균형 비율 문장(예시본 4.5 그대로), 학습·평가 클래스 비율 표(차이 = 평가 −
 * 학습, 학습 분포가 없으면 부록 B16). 진단 판단 문장은 싣지 않는다(판단은 5.3 서술 — J11).
 *
 * - 표 값은 사실 시트 자르기(`fitFactSheet`) **전** 값이다 — 사실 시트는 클래스가 많으면 분포 차 목록을 줄이지만 4.5 표는 모든
 *   클래스를 찍는다. 학습·평가 비율과 차이는 사실 시트 `distribution_shift` 와 같은 함수(`distributionShift`)가 낸 값이다.
 * - 불균형 비율은 M23 원값(1.671875 → 1.672)이다. 엔진 판정(D20 `level`)이 있으면 사실 시트 `display.imbalance_ratio` 와 같은
 *   규칙(1.5 와 비교해 판정 쪽으로 늘림)이라 4.5 와 5.3 이 같은 글자를 쓴다.
 * - 멀티레이블은 비율의 분모가 표본 수다(S2·S3 검토 T3, 2026-10-24 사용자 답) — 평가 = 그 레이블이 붙은 평가 표본 / 평가 표본 수
 *   (분포 문장과 같은 숫자), 학습 = 그 레이블이 붙은 학습 표본 / 의뢰자가 준 학습 표본 수. 학습 표본 수가 없으면 표를 그리지 않는다
 *   (training_samples_not_provided — 부록 B16 과 이유가 달라 B16 문장을 쓰지 않는다. 고객 문장은 아직 정해지지 않았다).
 * - 백분율은 셋째 자리 표기에서 옮긴다(`ed4Percent(ed4Plain(비율))` — 0.374 → 37.4%). 차이는 %p(U+2212).
 */
import type { TaskType } from "../../../data/evaluationData";
import type { ImbalanceEffect } from "../../../types/finalReport.types";
import { difference } from "../judgedNumber";
import {
  evaluationSampleDenominator,
  normalizeLabelText,
  trainingCounts,
  trainingSampleCount,
  type DistributionShiftRow,
  type NarrativeFacts,
} from "../narrativeFacts";
import type { ReportComposerInput } from "../reportMaterials";
import { ed4Judged, ed4Percent, ed4PercentPoint, ed4Plain, ed4SignedJudged } from "./edition4Number";
import { DISTRIBUTION_SENTENCE, fillTemplate, IMBALANCE_RATIO_SENTENCE } from "./edition4Text";

/** D20 의 불균형 기준(서술 설계 — 판 3 `BALANCED_IMBALANCE_RATIO` 와 같은 값). */
const IMBALANCE_RATIO_MIN = 1.5;

/**
 * 건수의 천 단위 쉼표 — 로캘을 박는다('en-US', 2,500). 판 4 분포 문장은 생성 때 저장되는 값이라 브라우저 로캘(de-DE 면 2.500 — 판 4
 * 숫자 규칙에서 점은 소수점)을 따르면 안 된다(S2·S3 검토 T8). 판 3 `buildDatasetDiagnosis` 의 같은 버릇은 얼린 출력이라 그대로다.
 */
export function countText(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * 불균형 비율 표기(판 4). 엔진 판정이 있으면 1.5 와 비교한 판정(불균형 = level ≠ mild) 쪽으로 늘리고, 없으면 셋째 자리.
 * 4.5 문장과 사실 시트 `imbalance_effect.display.imbalance_ratio` 가 이 함수 하나를 쓴다.
 */
export function imbalanceRatioTextEd4(ratio: number, effect: Pick<ImbalanceEffect, "level"> | null): string {
  return effect ? ed4Judged(ratio, IMBALANCE_RATIO_MIN, true, effect.level !== "mild") : ed4Plain(ratio);
}

/** 학습·평가 클래스 비율 표 한 줄. 학습 분포에 없는 클래스는 학습 칸·차이 칸이 null("—"). */
export interface DistributionRowEd4 {
  label: string;
  trainingRatio: number | null;
  evaluationRatio: number;
  /** 평가 − 학습(반올림 전 값을 9자리로 정리 — 사실 시트와 같음). */
  evaluationMinusTraining: number | null;
  trainingText: string | null;
  evaluationText: string;
  /** "−0.2%p" — 사실 시트 `evaluation_minus_training_text` 를 %p 로 옮긴 글자. */
  differenceText: string | null;
}

export interface DistributionEd4 {
  /** 첫 문장("평가 데이터셋은 총 171건이며, …이다."). 분포가 없으면 null. */
  distributionSentence: string | null;
  /** M23 원값의 표기(1.672). 클래스가 둘 미만이라 정의되지 않으면 null. */
  imbalanceRatioText: string | null;
  /** "클래스 불균형 비율(Imbalance Ratio)은 1.672이다." — 멀티레이블은 그 앞에 고정 문구 7 을 그린다(렌더러). */
  imbalanceSentence: string | null;
  /**
   * 학습·평가 비율 표. compared = 학습 분포가 평가 클래스를 모두 덮음, uncovered = 학습 분포에 없는 평가 클래스가 있음(그
   * 클래스 칸은 "—"), not_provided = 학습 분포가 없음(부록 B16 — 표 대신 "제공되지 않음" 문장), training_samples_not_provided =
   * 멀티레이블인데 학습 표본 수가 없음(표 없음, 생략 이유만 — B16 문장이 아니다).
   */
  training: { status: NarrativeFacts["distribution_shift_status"]; rows: DistributionRowEd4[] };
}

function percentOf(ratio: number): string {
  return ed4Percent(ed4Plain(ratio));
}

/** 사실 시트 `distribution_shift[].evaluation_minus_training_text` — signed_judged(평가 − 학습, 0.1, 충족 = flagged). */
export function evaluationMinusTrainingText(row: Pick<DistributionShiftRow, "training_ratio" | "evaluation_ratio" | "flagged">): string {
  return ed4SignedJudged(difference(row.evaluation_ratio, row.training_ratio), 0.1, row.flagged);
}

function comparedRow(row: DistributionShiftRow): DistributionRowEd4 {
  const text = row.evaluation_minus_training_text ?? evaluationMinusTrainingText(row);
  return {
    label: row.label,
    trainingRatio: row.training_ratio,
    evaluationRatio: row.evaluation_ratio,
    evaluationMinusTraining: difference(row.evaluation_ratio, row.training_ratio),
    trainingText: percentOf(row.training_ratio),
    evaluationText: percentOf(row.evaluation_ratio),
    differenceText: ed4PercentPoint(text),
  };
}

/**
 * 학습 분포가 평가 클래스를 다 덮지 못할 때의 표 — 평가 클래스 ∪ 학습 칸, 학습에 없는 클래스는 "—". 멀티레이블은 분모가
 * 표본 수(`distributionShift` 와 같은 분모 — 이 갈래에 왔으면 학습 표본 수가 있다).
 */
function uncoveredRows(
  composer: ReportComposerInput | undefined,
  evaluation: Record<string, number>,
  multilabelSamples: number | null,
): DistributionRowEd4[] {
  const training = trainingCounts(composer);
  if (!training) return [];
  const evalCounts = new Map<string, number>();
  for (const [name, count] of Object.entries(evaluation)) {
    const key = normalizeLabelText(name);
    evalCounts.set(key, (evalCounts.get(key) ?? 0) + count);
  }
  const occurrences = [...evalCounts.values()].reduce((a, b) => a + b, 0);
  const trainOccurrences = [...training.values()].reduce((a, b) => a + b, 0);
  const sampleBasis = multilabelSamples !== null;
  const evalTotal = sampleBasis ? evaluationSampleDenominator(multilabelSamples, occurrences) : occurrences;
  const trainTotal = (sampleBasis ? trainingSampleCount(composer) : null) ?? trainOccurrences;
  const labels = [...new Set([...evalCounts.keys(), ...training.keys()])];
  return labels.map((label) => {
    const e = (evalCounts.get(label) ?? 0) / evalTotal;
    const t = training.has(label) ? training.get(label)! / trainTotal : null;
    const gap = t === null ? null : difference(e, t);
    return {
      label,
      trainingRatio: t,
      evaluationRatio: e,
      evaluationMinusTraining: gap,
      trainingText: t === null ? null : percentOf(t),
      evaluationText: percentOf(e),
      differenceText:
        gap === null ? null : ed4PercentPoint(ed4SignedJudged(gap, 0.1, difference(Math.abs(gap), 0.1) >= 0)),
    };
  });
}

export interface DistributionEd4Input {
  taskType: TaskType;
  /** 평가 데이터 클래스 분포(4.5·사실 시트와 같은 값, 멀티레이블은 레이블 등장 횟수). */
  classDistribution: Record<string, number>;
  /** 평가 표본 수(서버 확정값). 멀티레이블 백분율의 분모. */
  nSamples: number | undefined;
  /** M23 원값(없으면 분포로 계산한 값). */
  imbalanceRatio: number | null;
  imbalanceEffect: ImbalanceEffect | null;
  /** 자르기 전 사실(`buildNarrativeFacts` 결과). */
  facts: Pick<NarrativeFacts, "distribution_shift_status" | "distribution_shift">;
  composer: ReportComposerInput | undefined;
}

export function buildDistributionEd4(input: DistributionEd4Input): DistributionEd4 {
  const entries = Object.entries(input.classDistribution).filter(([, n]) => typeof n === "number");
  let distributionSentence: string | null = null;
  if (entries.length > 0) {
    const sum = entries.reduce((acc, [, n]) => acc + n, 0);
    const total = input.nSamples && input.nSamples > 0 ? input.nSamples : sum;
    // 판 3 3절과 같은 분모 — 멀티레이블은 표본 수(합이 100% 를 넘을 수 있다), 그 밖은 분포 합.
    const denominator = input.taskType === "multilabel" ? total : sum;
    const list = entries
      .map(([label, n]) => `${label} ${countText(n)}건(${denominator > 0 ? percentOf(n / denominator) : "0.0%"})`)
      .join(", ");
    distributionSentence = fillTemplate(DISTRIBUTION_SENTENCE, { total: countText(total), 목록: list });
  }
  const irText = input.imbalanceRatio === null ? null : imbalanceRatioTextEd4(input.imbalanceRatio, input.imbalanceEffect);
  const { distribution_shift_status: status, distribution_shift: rows } = input.facts;
  return {
    distributionSentence,
    imbalanceRatioText: irText,
    imbalanceSentence: irText === null ? null : fillTemplate(IMBALANCE_RATIO_SENTENCE, { IR: irText }),
    training: {
      status,
      rows:
        status === "compared"
          ? rows.map(comparedRow)
          : status === "uncovered"
            ? uncoveredRows(
                input.composer,
                input.classDistribution,
                input.taskType === "multilabel" ? (input.nSamples ?? 0) : null,
              )
            : [],
    },
  };
}
