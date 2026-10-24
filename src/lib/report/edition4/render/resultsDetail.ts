/**
 * 판 4 4.4~4.8 의 표·문장 재료(순수 함수, 갈래 b4). 렌더러 `Ed4ResultsDetail` 이 이 결과를 그대로 그린다.
 *
 * 저장값을 **읽기만** 한다(다시 계산하지 않음): `confusionCounts`·`errorRatioSentence`·`narrativeFacts`(최약 클래스·예측 편향·
 * 최다 오분류 쌍)·`edition4Values.thresholdTable`·`edition4Values.distribution`·`conclusion.benchmarkRefs`·`noBenchmarkSentence`·
 * `charts`·`latency`·`kpiResults`. 숫자 표기는 판 4 함수(`edition4Number`·`classF1TextEd4`·`sameValueTextEd4`), 표 칸의 정수 건수는
 * 천 단위 쉼표(`tableCount` — S6 질문 8).
 * 표 칸은 글자만(렌더 도구가 표 한 행을 한 줄로 뽑는다).
 */
import type { TaskType } from "../../../../data/evaluationData";
import type {
  BenchmarkRef,
  ClassLabelInfo,
  ConfusionCounts,
  FinalReportData,
  KpiResult,
  LatencyStats,
} from "../../../../types/finalReport.types";
import { classDisplayName } from "../../../../components/report/shared/NarrativeFactTables";
import { positionOfQuality } from "../../judgedNumber";
import type { NarrativeFacts } from "../../narrativeFacts";
import { classF1TextEd4 } from "../classF1Ed4";
import type { DistributionEd4 } from "../distributionEd4";
import {
  B15_SUBMITTED_PREDICTION,
  B16_NO_TRAINING_DISTRIBUTION,
  B17_NO_CURVES,
  B33_NO_TRAINING_SAMPLES_DRAFT,
  ED4_DASH,
  EX_4_4_BEST_THRESHOLD,
  EX_4_4_CURRENT_THRESHOLD,
  EX_4_4_GAIN,
  FIXED_24_DISTRIBUTION,
  fillTemplate,
} from "../edition4Text";
import { ed4Latency, ed4Percent, ed4Plain, ed4Target } from "../edition4Number";
import { metricValueTextEd4, sameValueTextEd4 } from "../sameValueEd4";
import type { ThresholdTableEd4 } from "../thresholdGainEd4";
import { ed4TableCount, ed4TableSignedCount } from "./tableCount";
import {
  BIAS_HEAD,
  ED3_BIAS_ALL_LABELS,
  ED3_COUNTS_HEAD_PER_CLASS,
  ED3_COUNTS_PER_CLASS_NOTE,
  ED3_LATENCY_COLUMNS,
  ED3_LATENCY_ROWS,
  ED3_LOWER_IS_BETTER,
  ED3_PAIRS_COLUMNS,
  ED3_PAIRS_TITLE,
  ED3_WEAKEST_LABEL_BASIS_NOTE,
  EX_4_4_BIAS_COLUMNS,
  EX_4_4_BIAS_TITLE,
  EX_4_4_COUNTS_COLUMNS,
  EX_4_4_COUNTS_HEAD_BINARY,
  EX_4_4_COUNTS_TITLE,
  EX_4_4_NO,
  EX_4_4_THRESHOLD_METRIC_HEAD,
  EX_4_4_THRESHOLD_TITLE,
  EX_4_4_WEAKEST_COLUMNS,
  EX_4_4_WEAKEST_NOTE,
  EX_4_4_WEAKEST_TITLE,
  EX_4_4_YES,
  EX_4_5_TRAINING_COLUMNS,
  EX_4_5_TRAINING_TITLE,
  EX_4_6_COLUMNS,
  EX_4_6_NOTE_PREFIX,
  EX_4_7_PR_SCORE,
  EX_4_7_PR_TITLE,
  EX_4_7_ROC_SCORE,
  EX_4_7_ROC_TITLE,
  EX_4_8_NO_LATENCY,
  FIXED_7_MULTILABEL_IMBALANCE,
  TARGET_POSITION_LABEL_ED4,
} from "./resultsDetailText";

/** 표 하나 — 위 소제목(없을 수 있음), 머리 행, 행(글자 칸), 표 아래 줄. */
export interface DetailTable {
  title: string | null;
  columns: string[];
  rows: string[][];
  notes: string[];
}

const fill = (template: string, key: string, value: string) => template.split(`{${key}}`).join(value);

/* ================= 4.4 오분류 ================= */

/** "혼동 행렬 건수" 표. 이진은 양성 클래스 한 줄(예시본), 다중·멀티는 클래스마다(판 3 표 아래 설명). 건수가 없으면 null. */
export function confusionCountsTable(counts: ConfusionCounts | null | undefined): DetailTable | null {
  if (!counts || counts.rows.length === 0) return null;
  const binary = counts.kind === "binary";
  return {
    title: EX_4_4_COUNTS_TITLE,
    columns: [binary ? EX_4_4_COUNTS_HEAD_BINARY : ED3_COUNTS_HEAD_PER_CLASS, ...EX_4_4_COUNTS_COLUMNS],
    rows: counts.rows.map((r) => [r.label, ed4TableCount(r.tp), ed4TableCount(r.tn), ed4TableCount(r.fp), ed4TableCount(r.fn)]),
    notes: binary ? [] : [ED3_COUNTS_PER_CLASS_NOTE],
  };
}

/**
 * 최약 클래스 표(F1 최저). F1 = `classF1TextEd4`(사실 시트 f1_text — 4.4·5절·사실 시트 같은 글자), 비율 = share_text 의 %(셋째
 * 자리 → 37.4%), 매크로 F1과의 차이 = gap_text. 클래스 이름 뒤 "(설명)". 멀티레이블은 단위 "레이블"과 비율 분모 설명(판 3).
 */
export function weakestClassTable(
  facts: Pick<NarrativeFacts, "weakest_class" | "class_share_basis"> | undefined,
  kpiResults: KpiResult[],
  descriptions: readonly ClassLabelInfo[] | undefined,
): DetailTable | null {
  const w = facts?.weakest_class;
  if (!w) return null;
  const labelBasis = facts.class_share_basis === "label_occurrences";
  const unit = labelBasis ? "레이블" : "클래스";
  const f1 = classF1TextEd4(w.label, w.f1, { weakest: w, kpiResults }) ?? ED4_DASH;
  return {
    title: fill(EX_4_4_WEAKEST_TITLE, "unit", unit),
    columns: [unit, ...EX_4_4_WEAKEST_COLUMNS],
    rows: [
      [
        classDisplayName(w.label, descriptions),
        f1,
        ed4TableCount(w.support),
        ed4Percent(w.share_text),
        w.gap_text ?? ED4_DASH,
        w.low_support ? EX_4_4_YES : EX_4_4_NO,
      ],
    ],
    notes: [fill(EX_4_4_WEAKEST_NOTE, "unit", unit) + (labelBasis ? ED3_WEAKEST_LABEL_BASIS_NOTE : "")],
  };
}

/** 예측 편향 표 — 차이는 부호 있는 건수(U+2212). 멀티레이블은 "전체 레이블" 한 줄. */
export function predictionBiasTable(
  facts: Pick<NarrativeFacts, "prediction_bias"> | undefined,
  descriptions: readonly ClassLabelInfo[] | undefined,
): DetailTable | null {
  const bias = facts?.prediction_bias;
  if (!bias || bias.rows.length === 0) return null;
  return {
    title: EX_4_4_BIAS_TITLE,
    columns: [BIAS_HEAD[bias.unit], ...EX_4_4_BIAS_COLUMNS],
    rows: bias.rows.map((r) => [
      r.label === null ? ED3_BIAS_ALL_LABELS : classDisplayName(r.label, descriptions),
      ed4TableCount(r.predicted),
      ed4TableCount(r.actual),
      ed4TableSignedCount(r.difference),
    ]),
    notes: [],
  };
}

/** 최다 오분류 쌍(다중 클래스만, 판 3 표) — 오분류 중 비율은 판 4 백분율(셋째 자리 → 16.7%). 쌍이 없으면 null. */
export function confusionPairsTable(
  facts: Pick<NarrativeFacts, "top_confusion_pairs"> | undefined,
  taskType: TaskType | undefined,
  descriptions: readonly ClassLabelInfo[] | undefined,
): DetailTable | null {
  if (taskType !== "multiclass") return null;
  const pairs = facts?.top_confusion_pairs ?? [];
  if (pairs.length === 0) return null;
  return {
    title: fill(ED3_PAIRS_TITLE, "n", String(pairs.length)),
    columns: [...ED3_PAIRS_COLUMNS],
    rows: pairs.map((p) => [
      `${classDisplayName(p.actual, descriptions)} → ${classDisplayName(p.predicted, descriptions)}`,
      ed4TableCount(p.count),
      ed4Percent(ed4Plain(p.share_of_errors)),
    ]),
    notes: [],
  };
}

/**
 * "임계값 조정 여지" 표 — 저장된 `thresholdTable` 그대로. 지금 칸 머리는 "현재 결정 임계값 {t}"(예측값 직접 제출이면 부록 B15),
 * 그 점 칸 머리는 "F1이 가장 높은 결정 임계값 {t}". 표 아래 "F1의 최대 상승폭은 {gain}이다.". 표가 없으면(null) 소제목째 없음.
 */
export function thresholdTable(table: ThresholdTableEd4 | null | undefined): DetailTable | null {
  if (!table) return null;
  const currentHead =
    table.current.kind === "submitted"
      ? B15_SUBMITTED_PREDICTION
      : fillTemplate(EX_4_4_CURRENT_THRESHOLD, { threshold: table.current.thresholdText });
  const bestHead = fillTemplate(EX_4_4_BEST_THRESHOLD, { threshold: table.bestThresholdText ?? ED4_DASH });
  return {
    title: EX_4_4_THRESHOLD_TITLE,
    columns: [EX_4_4_THRESHOLD_METRIC_HEAD, currentHead, bestHead],
    rows: table.rows.map((r) => [r.name, r.current ?? ED4_DASH, r.best ?? ED4_DASH]),
    notes: [fillTemplate(EX_4_4_GAIN, { gain: table.gainText })],
  };
}

/* ================= 4.5 데이터 분포 ================= */

export interface DistributionView {
  /** 분포 문장 + (멀티) 고정 문구 7 + 불균형 문장 — 예시본처럼 한 문단. 셋 다 없으면 null. */
  paragraph: string | null;
  /** 학습·평가 비율 표(compared·uncovered). */
  table: DetailTable | null;
  /** 표 대신 찍는 문장(not_provided = B16, training_samples_not_provided = B33 초안). 소제목은 표와 같다(부록 B30 처럼 소제목 아래). */
  replacement: { title: string; text: string } | null;
  /** 고정 문구 24 — 늘. */
  closing: string;
}

export function distributionView(dist: DistributionEd4 | null | undefined, taskType: TaskType | undefined): DistributionView {
  const parts = [
    dist?.distributionSentence ?? null,
    taskType === "multilabel" && dist?.imbalanceSentence ? FIXED_7_MULTILABEL_IMBALANCE : null,
    dist?.imbalanceSentence ?? null,
  ].filter((p): p is string => typeof p === "string" && p !== "");
  const status = dist?.training.status;
  let table: DetailTable | null = null;
  let replacement: DistributionView["replacement"] = null;
  if (status === "not_provided") replacement = { title: EX_4_5_TRAINING_TITLE, text: B16_NO_TRAINING_DISTRIBUTION };
  else if (status === "training_samples_not_provided") replacement = { title: EX_4_5_TRAINING_TITLE, text: B33_NO_TRAINING_SAMPLES_DRAFT };
  else if (dist && dist.training.rows.length > 0) {
    table = {
      title: EX_4_5_TRAINING_TITLE,
      columns: [...EX_4_5_TRAINING_COLUMNS],
      rows: dist.training.rows.map((r) => [
        r.label,
        r.trainingText ?? ED4_DASH,
        r.evaluationText,
        r.differenceText ?? ED4_DASH,
      ]),
      notes: [],
    };
  }
  return { paragraph: parts.length > 0 ? parts.join(" ") : null, table, replacement, closing: FIXED_24_DISTRIBUTION };
}

/* ================= 4.6 참조 범위 비교 ================= */

/**
 * 모델 값 — KPI 원값을 판 4 표기로(계획 2.7: 0.98246 → 0.982, 백엔드 `modelValue`(넷째 자리) 쓰지 않음). 판정 대상이면 4.3 과 같은
 * judged 글자(`metricValueTextEd4`), 아니면 같은 수 같은 글자(`sameValueTextEd4` — 판정 대상 지표와 같은 원값이면 그 글자, 아니면
 * 셋째 자리, 정해진 것 7·D2 — 4.3 과 같은 함수). 같은 이름의 산출된 지표가 없으면 "—".
 */
export function benchmarkModelValueTextEd4(ref: BenchmarkRef, kpiResults: KpiResult[]): string {
  const kpi = kpiResults.find((k) => k.name === ref.metric && k.status !== "unavailable");
  if (!kpi) return ED4_DASH;
  return metricValueTextEd4(kpi) ?? sameValueTextEd4(kpiResults, kpi.value);
}

export interface BenchmarkView {
  table: DetailTable | null;
  /** 기준 없는 지표 문장(고정 문구 16 — 조립 때 저장된 글, 예시본 글자와 같음). */
  noBenchmark: string | null;
}

export function benchmarkView(data: Pick<FinalReportData, "conclusion" | "kpiResults" | "noBenchmarkSentence">): BenchmarkView {
  const refs = data.conclusion?.benchmarkRefs ?? [];
  const kpis = data.kpiResults ?? [];
  const table: DetailTable | null =
    refs.length === 0
      ? null
      : {
          title: null,
          columns: [...EX_4_6_COLUMNS],
          rows: refs.map((r) => {
            const position = positionOfQuality(r.quality, r.direction === "lower");
            const hasTarget = typeof r.targetValue === "number" && Number.isFinite(r.targetValue);
            return [
              r.direction === "lower" ? `${r.metric} ${ED3_LOWER_IS_BETTER}` : r.metric,
              benchmarkModelValueTextEd4(r, kpis),
              `${r.refLow.toFixed(2)} ~ ${r.refHigh.toFixed(2)}`,
              position ? TARGET_POSITION_LABEL_ED4[position] : ED4_DASH,
              hasTarget ? ed4Target(r.targetValue as number) : ED4_DASH,
              hasTarget && r.targetPosition ? TARGET_POSITION_LABEL_ED4[r.targetPosition] : ED4_DASH,
            ];
          }),
          notes: [...new Set(refs.map((r) => r.sourceNote).filter((n) => typeof n === "string" && n !== ""))].map(
            (n) => `${EX_4_6_NOTE_PREFIX}${n}`,
          ),
        };
  const noBenchmark = data.noBenchmarkSentence?.trim() ? data.noBenchmarkSentence : null;
  return { table, noBenchmark };
}

/* ================= 4.7 곡선 ================= */

export interface CurveLine {
  kind: "roc" | "pr";
  /** "ROC Curve (Y: … / X: …) — AUROC: 0.999" */
  title: string;
}

/** 넓이 값 — 같은 원값의 판정 대상 지표가 있으면 그 judged 글자(4.3 과 같음, D2), 아니면 셋째 자리. */
const areaText = (value: number, kpiResults: KpiResult[]) => sameValueTextEd4(kpiResults, value);

/** 곡선 제목 줄(있는 곡선만, ROC → PR). 둘 다 없으면 빈 배열(그리는 쪽이 부록 B17). */
export function curveLines(charts: FinalReportData["charts"] | undefined, kpiResults: KpiResult[]): CurveLine[] {
  const out: CurveLine[] = [];
  const roc = charts?.rocCurve;
  if (roc) {
    const score = typeof roc.auroc === "number" ? fill(EX_4_7_ROC_SCORE, "value", areaText(roc.auroc, kpiResults)) : "";
    out.push({ kind: "roc", title: `${EX_4_7_ROC_TITLE}${score}` });
  }
  const pr = charts?.prCurve;
  if (pr) {
    const score = typeof pr.auprc === "number" ? fill(EX_4_7_PR_SCORE, "value", areaText(pr.auprc, kpiResults)) : "";
    out.push({ kind: "pr", title: `${EX_4_7_PR_TITLE}${score}` });
  }
  return out;
}

export const NO_CURVES_TEXT = B17_NO_CURVES;

/** 곡선 그림 한 점. */
export interface CurvePointEd4 {
  x: number;
  y: number;
}

/**
 * 4.7 곡선 그림의 점 배열 — ROC 는 x = FPR·y = TPR, PR 는 x = Recall·y = Precision(판 3 `RocCurveChart`·`PrCurveChart` 와 같은 축).
 * 그 곡선이 없으면 null.
 */
export function curvePointsEd4(charts: FinalReportData["charts"] | undefined, kind: CurveLine["kind"]): CurvePointEd4[] | null {
  if (kind === "roc") {
    const roc = charts?.rocCurve;
    return roc ? roc.fpr.map((x, i) => ({ x, y: roc.tpr[i] })) : null;
  }
  const pr = charts?.prCurve;
  return pr ? pr.recall.map((x, i) => ({ x, y: pr.precision[i] })) : null;
}

/* ================= 4.8 응답시간 ================= */

export interface LatencyView {
  table: DetailTable | null;
  /** 지연시간이 없을 때의 예시본 문장. */
  missing: string | null;
}

/** 지연시간 표(판 3 줄 이름, 값은 판 4 `ed4Latency` 둘째 자리 + 단위). 없으면 예시본 "제공되지 않음 — …". */
export function latencyView(latency: LatencyStats | null | undefined): LatencyView {
  if (!latency) return { table: null, missing: EX_4_8_NO_LATENCY };
  return {
    table: {
      title: null,
      columns: [...ED3_LATENCY_COLUMNS],
      rows: ED3_LATENCY_ROWS.map(({ label, key }) => [label, `${ed4Latency(latency[key])} ${latency.unit}`]),
      notes: [],
    },
    missing: null,
  };
}
