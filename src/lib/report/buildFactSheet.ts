/**
 * buildFactSheet — 평가 결과를 LLM 서술 생성용 "사실 시트(fact_sheet)"로 조립.
 *
 * 핵심 원칙(REPORT_NARRATIVE_DESIGN.md): LLM은 수치 생산자가 아니라 번역기다.
 * 모든 숫자는 프론트가 여기서 계산/수집해 백엔드(/api/generate-narrative)로 보내고,
 * 백엔드는 이 안의 숫자만 한국어 산문으로 옮긴다(화이트리스트 grounding 검증).
 *
 * 백엔드 schemas.py 의 FactSheet/NarrativeRequest(snake_case)와 1:1 대응한다.
 */
import type {
  ConfusionCounts,
  DerivedPredictionFact,
  ErrorRatios,
  F1ThresholdGain,
  ImbalanceEffect,
  KpiResult,
  LatencyStats,
  Problem,
} from "../../types/finalReport.types";
import type { ConfusionMatrixData } from "../../types/report.types";
import { buildClassReportTable } from "./classReportTable";
import { computeMargin, isJudged, isNearTarget } from "./computeVerdict";

export interface FactSheetMetric {
  metric_id: string;
  display_name: string;
  value: number;
  threshold: number | null;
  status: string;
  /** 핵심 지표 — 미달하면 불합격이다. 판정(D19)의 재료라 서술도 알아야 한다. */
  is_core: boolean;
  /** 95% 신뢰구간(설계 D29). 판정 대상 지표(`isJudged`)에 구간이 붙었을 때만 숫자, 아니면 null. */
  ci_low: number | null;
  ci_high: number | null;
  /**
   * 목표값과의 차이(설계 D12) — 0 이상이면 충족 쪽(낮을수록 좋은 지표는 목표 − 값). 판정 대상 지표만
   * 숫자(소수 4자리), 아니면 null. near_target 은 |margin| < |목표값| × 3% 이고, 판정 대상이 아니면 false.
   */
  margin: number | null;
  near_target: boolean;
}

export interface FactSheetPerClass {
  label: string;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  support: number | null;
}

export interface FactSheet {
  n_samples: number;
  dropped_rows: number;
  metrics: FactSheetMetric[];
  per_class: FactSheetPerClass[];
  /**
   * 클래스별 표(M22)의 평균 줄 — 매크로·가중·마이크로(멀티레이블은 샘플 평균도). 평균 방식
   * 차이를 8.2 에 쓰는 재료다(서술 설계 D17·D39). M22 를 고르지 않으면 빈 배열.
   */
  class_averages: FactSheetPerClass[];
  confusion: { labels: string[]; matrix: number[][]; positive_class: string | null } | null;
  /** TP·TN·FP·FN 건수 — M21 선택과 무관하게 늘 싣는다(재료 목록 9절). */
  confusion_counts: Array<{ label: string; tp: number; fp: number; fn: number; tn: number }>;
  /** 확률에서 예측을 파생했을 때만 — 방법·임계값·출처 컬럼(재료 목록 9절 "파생 예측 사실 — AI 예"). */
  derived_prediction: {
    method: string;
    threshold: number | Record<string, number> | null;
    source_columns: string[];
  } | null;
  /** 경계·확신 오류 비율(서술 설계 D30) — 백엔드 응답 모양 그대로. 확률이 없는 평가는 null. */
  error_ratios: ErrorRatios | null;
  /** 6.0 에 찍은 신뢰구간 방식 한 줄(서술 참고용). 구간이 없는 성적서는 null. */
  ci_method_note: string | null;
  /** 임계값 조정 여지(서술 설계 D40) — 백엔드 응답 모양 그대로. 이진·점수가 없으면 null. */
  f1_threshold_gain: F1ThresholdGain | null;
  /** 불균형 영향(서술 설계 D20) — 백엔드 응답 모양 그대로. 계산하지 않았으면 null. */
  imbalance_effect: ImbalanceEffect | null;
  /**
   * 9절 권고가 대응할 문제 목록(서술 설계 D22, `problemList.ts`) — 성적서에 저장한 것과 같은 모양.
   * 권고는 이 번호(id)에 묶인다. 0개면 빈 배열이고 권고도 없다.
   */
  problems: Problem[];
  distribution: {
    class_distribution: Record<string, number>;
    imbalance_ratio: number | null;
  } | null;
  verdict: string;
  score: number;
  latency: {
    available: boolean;
    mean: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    unit: string;
  };
}

export interface NarrativeRequestPayload {
  task_type: string;
  report_purpose: string;
  fact_sheet: FactSheet;
  /**
   * 고객이 제공한 입력(서술 설계 D25). 회사·과제 정보는 넣지 않는다(D34).
   * 만드는 곳은 `lib/report/reportMaterials.ts` 의 `buildClientInputs`.
   */
  client_inputs?: Record<string, unknown>;
}

export interface BuildFactSheetInput {
  kpiResults: KpiResult[];
  confusionMatrix: ConfusionMatrixData | null;
  /**
   * 클래스별 등장 횟수. multilabel 은 **레이블 등장 횟수**라 합계가 표본 수를 넘는다
   * — 표본 수로 쓰면 안 된다(ISSUES.md B-02). 표본 수는 nSamples 를 쓸 것.
   */
  classDistribution: Record<string, number>;
  imbalanceRatio?: number;
  droppedRows: number;
  /**
   * 서버가 확정한 평가 표본 수(EvaluateResponse.n_samples — 결측 제거 후 실제로 지표를
   * 계산한 행 수). 종전에는 이 값을 혼동행렬 합계나 분포 합계로 **추측**했고, M21
   * 미선택 멀티레이블에서 200행이 408 이 됐다. 추측하는 자리를 없애기 위해 필수다.
   */
  nSamples: number;
  verdict: string;
  score: number;
  /** success_metrics.M22 (classification report) — 클래스별 precision/recall/f1/support */
  classReport?: Record<string, any> | null;
  /** per_class 순서를 정하는 클래스 라벨 목록 (감지된 클래스/레이블 또는 y_true 고유값) */
  classLabels: string[];
  /** latency 컬럼이 매핑/측정된 경우의 통계 (미측정이면 null/undefined) */
  latencyStats?: LatencyStats | null;
  /** 양성 클래스 라벨 (2x2 혼동행렬 FN/FP 매핑 기준, binary) */
  positiveClass?: string | null;
  /** TP·TN·FP·FN 건수(백엔드 confusion_counts). 없으면 빈 배열로 싣는다. */
  confusionCounts?: ConfusionCounts | null;
  /** 파생 예측 사실(백엔드 derived_prediction). */
  derivedPrediction?: DerivedPredictionFact | null;
  /** 경계·확신 오류 비율(백엔드 error_ratios 를 `parseErrorRatios` 로 읽은 값). */
  errorRatios?: ErrorRatios | null;
  /** 6.0 신뢰구간 방식 한 줄(`confidenceIntervalNote`). */
  confidenceIntervalNote?: string | null;
  /** 백엔드 f1_threshold_gain(`parseF1ThresholdGain`). */
  thresholdGain?: F1ThresholdGain | null;
  /** 백엔드 imbalance_effect(`parseImbalanceEffect`). */
  imbalanceEffect?: ImbalanceEffect | null;
  /** 문제 목록(`buildProblemList`). 없으면 빈 배열로 싣는다. */
  problems?: Problem[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 소수 4자리 반올림. 숫자가 아니면 null. */
function round4(v: number | null): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n * 1e4) / 1e4;
}

/**
 * fact_sheet 의 혼동행렬 — 멀티레이블은 **전 레이블 합계**로 보낸다 (ISSUES.md C-08).
 *
 * 멀티레이블 혼동행렬은 레이블마다 2x2 가 하나씩 나온다. 종전에는 그중 **첫 번째
 * 레이블의 2x2 만** 실렸고 라벨명도 `Negative (sports)` 처럼 그 레이블 이름을 달고
 * 있었다. LLM 은 그것을 **전체 혼동행렬로 읽고** 서술한다 — 레이블이 넷이면 나머지
 * 셋의 오분류가 서술 근거에서 통째로 빠진다.
 *
 * 레이블별 세부는 이미 `per_class`(M22)로 실려 가므로, 여기서는 '일부를 전체로 보이게
 * 하는' 상태만 없앤다. binary/multiclass 는 원래 행렬이 하나뿐이라 종전 그대로다.
 */
function buildConfusionFact(
  confusionMatrix: ConfusionMatrixData | null,
  positiveClass: string | null,
) {
  if (!confusionMatrix) return null;

  const perLabel = (confusionMatrix as { multilabelMatrices?: Array<{ matrix: number[][] }> })
    .multilabelMatrices;

  if (!perLabel || perLabel.length <= 1) {
    return {
      labels: confusionMatrix.labels,
      matrix: confusionMatrix.matrix,
      positive_class: positiveClass,
    };
  }

  const summed = perLabel.reduce<number[][]>(
    (acc, { matrix }) =>
      acc.map((row, i) => row.map((cell, j) => cell + (matrix[i]?.[j] ?? 0))),
    [[0, 0], [0, 0]],
  );

  return {
    labels: ["Negative (전체 레이블 합계)", "Positive (전체 레이블 합계)"],
    matrix: summed,
    positive_class: positiveClass,
  };
}

export function buildFactSheet(input: BuildFactSheetInput): FactSheet {
  const {
    kpiResults,
    confusionMatrix,
    classDistribution,
    nSamples,
    imbalanceRatio,
    droppedRows,
    verdict,
    score,
    classReport,
    classLabels,
    latencyStats,
    positiveClass,
    confusionCounts,
    derivedPrediction,
    errorRatios,
    confidenceIntervalNote,
    thresholdGain,
    imbalanceEffect,
    problems,
  } = input;

  // 지표: 목표값이 없으면(null) 정보 제공(info)으로 표기한다.
  // 계산 실패(unavailable) 지표는 value 0 이 서술로 새지 않도록 아예 제외한다(D4).
  const metrics: FactSheetMetric[] = kpiResults
    .filter((r) => r.status !== "unavailable")
    .map((r) => {
    const isInfoOnly = r.metricId === "M21" || r.metricId === "M22" || r.threshold === null;
    return {
      metric_id: r.metricId,
      display_name: r.name,
      value: r.value,
      threshold: isInfoOnly ? null : r.threshold,
      status: isInfoOnly ? "info" : r.status,
      is_core: Boolean(r.isCore),
      // 판정 대상 여부는 판정과 같은 식 하나로 본다 — 구간은 판정 대상 지표에만 싣는다.
      ci_low: r.ci && isJudged(r) ? r.ci.low : null,
      ci_high: r.ci && isJudged(r) ? r.ci.high : null,
      // 아슬아슬도 판정과 같은 식으로 본다. 마진은 뺄셈 끝자리 잡음(0.02399999…)이 서술로 새지 않게
      // 4자리로 반올림해 싣는다 — 아슬아슬 판정은 반올림 전 값으로 이미 했다.
      margin: round4(computeMargin(r)),
      near_target: isNearTarget(r),
    };
  });

  const hasDistribution = Object.keys(classDistribution).length > 0;
  const classTable = buildClassReportTable(classReport, classLabels);

  return {
    n_samples: nSamples,
    dropped_rows: droppedRows,
    metrics,
    per_class: classTable?.rows ?? [],
    class_averages: classTable?.averages ?? [],
    confusion: buildConfusionFact(confusionMatrix, positiveClass ?? null),
    confusion_counts: (confusionCounts?.rows ?? []).map(({ label, tp, fp, fn, tn }) => ({ label, tp, fp, fn, tn })),
    derived_prediction: derivedPrediction
      ? {
          method: derivedPrediction.method,
          threshold: derivedPrediction.threshold,
          source_columns: derivedPrediction.source_columns,
        }
      : null,
    error_ratios: errorRatios ?? null,
    ci_method_note: confidenceIntervalNote ?? null,
    f1_threshold_gain: thresholdGain ?? null,
    imbalance_effect: imbalanceEffect ?? null,
    problems: problems ?? [],
    distribution: hasDistribution
      ? {
          class_distribution: classDistribution,
          imbalance_ratio: num(imbalanceRatio),
        }
      : null,
    verdict,
    score,
    // latency 컬럼이 매핑/측정된 경우만 실측값, 아니면 미측정으로 표기
    latency: latencyStats
      ? {
          available: true,
          mean: latencyStats.mean,
          p50: latencyStats.p50,
          p95: latencyStats.p95,
          p99: latencyStats.p99,
          unit: latencyStats.unit,
        }
      : {
          available: false,
          mean: null,
          p50: null,
          p95: null,
          p99: null,
          unit: "ms",
        },
  };
}
