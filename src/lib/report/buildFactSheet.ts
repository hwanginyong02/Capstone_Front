/**
 * buildFactSheet — 평가 결과를 LLM 서술 생성용 "사실 시트(fact_sheet)"로 조립.
 *
 * 핵심 원칙(REPORT_NARRATIVE_DESIGN.md): LLM은 수치 생산자가 아니라 번역기다.
 * 모든 숫자는 프론트가 여기서 계산/수집해 백엔드(/api/generate-narrative)로 보내고,
 * 백엔드는 이 안의 숫자만 한국어 산문으로 옮긴다(화이트리스트 grounding 검증).
 *
 * 백엔드 schemas.py 의 FactSheet/NarrativeRequest(snake_case)와 1:1 대응한다.
 */
import type { KpiResult, LatencyStats } from "../../types/finalReport.types";
import type { ConfusionMatrixData } from "../../types/report.types";

export interface FactSheetMetric {
  metric_id: string;
  display_name: string;
  value: number;
  threshold: number | null;
  status: string;
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
  confusion: { labels: string[]; matrix: number[][]; positive_class: string | null } | null;
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
}

export interface BuildFactSheetInput {
  kpiResults: KpiResult[];
  confusionMatrix: ConfusionMatrixData | null;
  classDistribution: Record<string, number>;
  imbalanceRatio?: number;
  droppedRows: number;
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
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** classification report(M22)에서 클래스별 지표를 추출. 집계행(accuracy/avg)은 제외. */
function buildPerClass(
  classReport: Record<string, any> | null | undefined,
  classLabels: string[],
): FactSheetPerClass[] {
  if (!classReport) return [];
  const result: FactSheetPerClass[] = [];
  for (const label of classLabels) {
    const row = classReport[label];
    if (!row || typeof row !== "object") continue;
    result.push({
      label,
      precision: num(row.precision),
      recall: num(row.recall),
      // sklearn classification_report 의 키는 "f1-score"
      f1: num(row["f1-score"] ?? row.f1),
      support: num(row.support),
    });
  }
  return result;
}

export function buildFactSheet(input: BuildFactSheetInput): FactSheet {
  const {
    kpiResults,
    confusionMatrix,
    classDistribution,
    imbalanceRatio,
    droppedRows,
    verdict,
    score,
    classReport,
    classLabels,
    latencyStats,
    positiveClass,
  } = input;

  // 지표: 임계값(threshold)이 없으면(0) 정보 제공(info)으로 표기, threshold 는 null.
  // 계산 실패(unavailable) 지표는 value 0 이 서술로 새지 않도록 아예 제외한다(D4).
  const metrics: FactSheetMetric[] = kpiResults
    .filter((r) => r.status !== "unavailable")
    .map((r) => {
    const isInfoOnly = r.metricId === "M21" || r.metricId === "M22" || r.threshold <= 0;
    return {
      metric_id: r.metricId,
      display_name: r.name,
      value: r.value,
      threshold: isInfoOnly ? null : r.threshold,
      status: isInfoOnly ? "info" : r.status,
    };
  });

  // 평가 샘플 수: 혼동행렬 합계 > 분포 합계 순으로 도출
  const distTotal = Object.values(classDistribution).reduce((a, b) => a + b, 0);
  const nSamples = confusionMatrix?.totalSamples ?? distTotal ?? 0;

  const hasDistribution = Object.keys(classDistribution).length > 0;

  return {
    n_samples: nSamples,
    dropped_rows: droppedRows,
    metrics,
    per_class: buildPerClass(classReport, classLabels),
    confusion: confusionMatrix
      ? {
          labels: confusionMatrix.labels,
          matrix: confusionMatrix.matrix,
          positive_class: positiveClass ?? null,
        }
      : null,
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
