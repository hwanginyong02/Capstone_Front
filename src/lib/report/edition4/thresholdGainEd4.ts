/**
 * 판 4 의 F1 최대 임계값 — 4.4 "임계값 조정 여지" 표와 사실 시트 `f1_threshold_gain` 의 판 4 칸(대응표 26, 공통 계약
 * `fact_sheet_contract_ed4.json`).
 *
 * - 평가 응답 `f1_threshold_gain` 의 새 칸(백엔드 S1: 그 점과 지금의 Recall·Precision, `*_raw`, `best_threshold_text`)은 이 판 4
 *   전용 파서만 읽는다. 판 3 파서 `problemList.parseF1ThresholdGain` 은 아는 키만 읽는 그대로 둔다(판 3 데이터에 새 칸이 새지 않게).
 * - 지금 값은 지표 결과(KPI) 값이다 — 같은 지표를 고르고 산출했으면 4.3 표와 같은 값·같은 글자(판정 대상이면 그 목표로
 *   `ed4Judged`, 아니면 `ed4Plain`). 고르지 않았으면 응답의 지금 값(`current_*_raw`)을 같은 규칙으로 찍는다.
 * - 위험 쪽 지표(의뢰자 선언 FN → Recall(M3), FP → Precision(M2))의 목표 충족은 지금 값은 지표 판정(`status`) 그대로, F1 이
 *   가장 높은 임계값의 값은 반올림 전 값으로 같은 비교(`meetsTarget`)를 해서 정한다. 판정 대상이 아니면 null.
 * - 임계값 표기는 엔진이 정한 글자(`best_threshold_text`, 0.6166)를 그대로 옮긴다 — 프론트는 다시 계산하지 않는다.
 *   지금 결정 임계값은 의뢰자가 준 글자 그대로(`ed4Given`, 0.5 — 지수 꼴 없이).
 * - 반올림 전 값이 없는 옛 백엔드 응답이면 넷째 자리 값(max_f1·current_f1·gain)에서 다시 찍는다(이중 반올림 — 켜는 라운드는
 *   백엔드 먼저 배포가 전제). 그 점의 Recall·Precision 이 없으면 그 줄은 비운다(null).
 */
import { getMetricDisplayId, METRICS } from "../../../data/evaluationData";
import type { DerivedPredictionFact, F1ThresholdGain, KpiResult } from "../../../types/finalReport.types";
import { isJudged } from "../computeVerdict";
import { meetsTarget } from "../judgedNumber";
import type { RiskDirection } from "../narrativeFacts";
import { ed4Given, ed4Judged, ed4Plain } from "./edition4Number";

/** 평가 응답 `f1_threshold_gain` 의 판 4 가 읽는 칸(반올림 전 값). 없는 칸은 null. */
export interface F1ThresholdGainRawEd4 {
  bestThresholdText: string | null;
  maxF1: number | null;
  currentF1: number | null;
  gain: number | null;
  bestRecall: number | null;
  bestPrecision: number | null;
  currentRecall: number | null;
  currentPrecision: number | null;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 숫자 꼴 글자(사실 시트 NumText 와 같은 꼴)인가. */
const NUM_TEXT = /^-?\d+(\.\d+)?$/;

/**
 * 판 4 전용 파서. 판 3 파서(`parseF1ThresholdGain`)가 읽는 모양(max_f1·current_f1·gain·best_threshold)이 맞을 때만 — 판 3 쪽이
 * null 이면(이진이 아님·점수 없음·모양 틀림) 이것도 null. 반올림 전 칸이 없으면 넷째 자리 칸으로 대신한다.
 */
export function parseF1ThresholdGainEd4(raw: unknown, ed3: F1ThresholdGain | null): F1ThresholdGainRawEd4 | null {
  if (!ed3 || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.best_threshold_text === "string" && NUM_TEXT.test(r.best_threshold_text) ? r.best_threshold_text : null;
  return {
    bestThresholdText: text,
    maxF1: finite(r.max_f1_raw) ?? ed3.max_f1,
    currentF1: finite(r.current_f1_raw) ?? ed3.current_f1,
    gain: finite(r.gain_raw) ?? ed3.gain,
    bestRecall: finite(r.best_recall_raw) ?? finite(r.best_recall),
    bestPrecision: finite(r.best_precision_raw) ?? finite(r.best_precision),
    currentRecall: finite(r.current_recall_raw) ?? finite(r.current_recall),
    currentPrecision: finite(r.current_precision_raw) ?? finite(r.current_precision),
  };
}

/** 4.4 표의 세 줄 — F1·Recall·Precision 과 그 지표(M4·M3·M2). 예시본 4.4 의 줄 순서. */
const ROWS = [
  { metricId: "M4", best: "maxF1", current: "currentF1" },
  { metricId: "M3", best: "bestRecall", current: "currentRecall" },
  { metricId: "M2", best: "bestPrecision", current: "currentPrecision" },
] as const;

function metricName(metricId: string): string {
  return METRICS.find((m) => getMetricDisplayId(m.id) === metricId)?.name ?? metricId;
}

/** 한 지표의 값 글자 — 판정 대상이면 그 목표로 늘린 표기(충족은 `meets`), 아니면 셋째 자리. */
function valueText(value: number, kpi: KpiResult | undefined, meets: boolean | null): string {
  if (kpi && isJudged(kpi) && kpi.threshold !== null && meets !== null) {
    return ed4Judged(value, kpi.threshold, kpi.higherIsBetter !== false, meets);
  }
  return ed4Plain(value);
}

/** 산출에 성공한 지표 결과(KPI) — 지금 값의 출처. */
function computedKpi(kpiResults: KpiResult[], metricId: string): KpiResult | undefined {
  return kpiResults.find((r) => r.metricId === metricId && r.status !== "unavailable");
}

interface Cell {
  value: number;
  text: string;
  /** 판정 대상 지표일 때만 — 목표 충족. */
  meets: boolean | null;
}

function cells(raw: F1ThresholdGainRawEd4, kpiResults: KpiResult[]) {
  return ROWS.map(({ metricId, best, current }) => {
    const kpi = computedKpi(kpiResults, metricId);
    const judged = kpi && isJudged(kpi) && kpi.threshold !== null ? kpi : undefined;
    const cell = (value: number | null, meets: boolean | null): Cell | null =>
      value === null ? null : { value, text: valueText(value, judged, meets), meets };
    // 지금 값의 충족은 지표 판정 그대로(판정 지점을 둘로 두지 않는다), 그 점의 값은 같은 비교로.
    const now = cell(kpi ? kpi.value : raw[current], judged ? judged.status === "pass" : null);
    const bestValue = raw[best];
    const atBest = cell(
      bestValue,
      judged && bestValue !== null ? meetsTarget(bestValue, judged.threshold!, judged.higherIsBetter !== false) : null,
    );
    return { metricId, name: metricName(metricId), now, atBest };
  });
}

/** 4.4 임계값 조정 여지 표(판 4 run 에 저장 — 그릴 때 다시 계산하지 않는다). */
export interface ThresholdTableEd4 {
  /** 지금 칸 머리 — 확률에 결정 임계값을 적용했으면 그 글자(의뢰자가 준 값 그대로), 예측값을 직접 냈으면 "submitted"(부록 B15). */
  current: { kind: "threshold"; thresholdText: string } | { kind: "submitted" };
  /** F1 이 가장 높은 결정 임계값 — 엔진 표기 그대로. 옛 응답이라 표기가 없으면 null. */
  bestThresholdText: string | null;
  /** F1 Score·Recall·Precision 세 줄. 값이 없는 칸은 null. */
  rows: Array<{ metricId: string; name: string; current: string | null; best: string | null }>;
  /** "F1의 최대 상승폭은 {값}이다." 의 값 — 사실 시트 gain_text 와 같은 글자. */
  gainText: string;
}

/** gain_text(판 4) — judged(반올림 전 상승폭, 0.1, 충족 = 엔진 판정 notable). notable 이 없는 옛 응답은 넷째 자리 gain ≥ 0.1. */
export function gainTextEd4(raw: F1ThresholdGainRawEd4, ed3: F1ThresholdGain): string {
  const notable = ed3.notable ?? ed3.gain >= 0.1;
  return ed4Judged(raw.gain ?? ed3.gain, 0.1, true, notable);
}

export function buildThresholdTableEd4(
  raw: F1ThresholdGainRawEd4,
  ed3: F1ThresholdGain,
  kpiResults: KpiResult[],
  derivedPrediction: DerivedPredictionFact | undefined,
): ThresholdTableEd4 {
  const threshold = derivedPrediction?.method === "threshold" && typeof derivedPrediction.threshold === "number"
    ? derivedPrediction.threshold
    : null;
  return {
    current: threshold === null ? { kind: "submitted" } : { kind: "threshold", thresholdText: ed4Given(threshold) },
    bestThresholdText: raw.bestThresholdText,
    rows: cells(raw, kpiResults).map((c) => ({
      metricId: c.metricId,
      name: c.name,
      current: c.now?.text ?? null,
      best: c.atBest?.text ?? null,
    })),
    gainText: gainTextEd4(raw, ed3),
  };
}

/** 사실 시트 `f1_threshold_gain.risk_side`(계약 판 4 전용 키). */
export interface RiskSideFact {
  side: "fn" | "fp";
  metric_id: "M3" | "M2";
  display_name: string;
  meets_target_now: boolean | null;
  meets_target_at_best: boolean | null;
}

/** 사실 시트 `f1_threshold_gain` 의 판 4 칸(계약 순서 — 판 3 칸 뒤에 이 순서로 붙는다). */
export interface F1ThresholdGainTextsEd4 {
  best_threshold_text: string | null;
  max_f1_text: string | null;
  current_f1_text: string | null;
  best_recall_text: string | null;
  best_precision_text: string | null;
  current_recall_text: string | null;
  current_precision_text: string | null;
  risk_side: RiskSideFact | null;
}

/**
 * 사실 시트의 판 4 칸. 값 글자는 4.4 표와 같은 함수(`cells`)에서 — 같은 값이 4.3·4.4·사실 시트에 같은 글자로 찍힌다.
 * `riskDirection` 은 사실 시트 `declarations.risk_direction`(이진에서만 값이 있다).
 */
export function f1ThresholdGainTextsEd4(
  raw: F1ThresholdGainRawEd4,
  kpiResults: KpiResult[],
  riskDirection: RiskDirection | null,
): F1ThresholdGainTextsEd4 {
  const [f1, recall, precision] = cells(raw, kpiResults);
  const side = riskDirection === "fn" ? recall : riskDirection === "fp" ? precision : null;
  return {
    best_threshold_text: raw.bestThresholdText,
    max_f1_text: f1.atBest?.text ?? null,
    current_f1_text: f1.now?.text ?? null,
    best_recall_text: recall.atBest?.text ?? null,
    best_precision_text: precision.atBest?.text ?? null,
    current_recall_text: recall.now?.text ?? null,
    current_precision_text: precision.now?.text ?? null,
    risk_side:
      side && (riskDirection === "fn" || riskDirection === "fp")
        ? {
            side: riskDirection,
            metric_id: side.metricId as "M3" | "M2",
            display_name: side.name,
            meets_target_now: side.now?.meets ?? null,
            meets_target_at_best: side.atBest?.meets ?? null,
          }
        : null,
  };
}
