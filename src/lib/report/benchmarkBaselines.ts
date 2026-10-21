/**
 * 8.1 내부 참조 기준표의 **지표 이름** 사본과 고정 문구 16(서술 라운드 세션 B, 사용자 결정 5).
 *
 * 기준표(참조 범위)는 백엔드 `app/narrative/baselines.py` 의 `BASELINES` 가 권위다. 8.1 표는 서술 작업 생성
 * 응답(`benchmark_refs`)으로 오지만, 고정 문구 16 은 그보다 먼저 보내는 사실 시트(`facts.fixed_sentences`)에
 * 실어야 하므로 프론트가 이름만 따로 든다. 두 사본이 어긋나지 않게 계약 JSON(`constants.benchmark_metric_names`)
 * 에 같은 목록을 두고 양쪽 테스트가 자기 코드와 같은지 단언한다(옆 저장소를 읽지 않는다).
 *
 * 집합 규칙은 백엔드 `required_items._no_benchmark` 와 같다 — 고른 지표 중 산출 실패(unavailable)와 표 지표
 * (M21 혼동행렬·M22 클래스별 표)를 뺀 "서술 지표" 가운데 기준표에 이름이 없는 것.
 */
import type { TaskType } from "../../data/evaluationData";
import type { KpiResult } from "../../types/finalReport.types";

/** 유형별로 기준표에 있는 지표 이름(백엔드 BASELINES 의 키, 표시 이름 그대로). */
export const BENCHMARK_METRIC_NAMES: Record<TaskType, readonly string[]> = {
  binary: ["Accuracy", "Precision", "Recall", "F1 Score", "AUROC", "AUPRC", "MCC"],
  multiclass: ["Accuracy", "Precision", "Recall", "F1 Score"],
  multilabel: ["F1 Score", "Jaccard Index", "Hamming Loss"],
};

/** 서술 지표가 아닌 표 지표 — 혼동행렬(M21)·클래스별 표(M22). */
const TABLE_METRIC_IDS = new Set(["M21", "M22"]);

/** 고정 문구 16 — 일부 지표에 기준치가 없을 때(승인 문안 그대로, 지표 이름은 쉼표+공백으로 잇는다). */
export function partialNoBenchmarkSentence(names: readonly string[]): string {
  return `다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: ${names.join(", ")}.`;
}

/** 고정 문구 16 — 고른 서술 지표 모두에 기준치가 없을 때. */
export const ALL_NO_BENCHMARK_SENTENCE = "선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다.";

/** 기준치가 없는 서술 지표 이름(고른 순서). 서술 지표가 없으면 빈 목록. */
export function metricsWithoutBenchmark(kpiResults: readonly KpiResult[], taskType: TaskType): string[] {
  const names = new Set(BENCHMARK_METRIC_NAMES[taskType]);
  return narrativeMetrics(kpiResults)
    .map((r) => r.name)
    .filter((name) => !names.has(name));
}

function narrativeMetrics(kpiResults: readonly KpiResult[]): KpiResult[] {
  return kpiResults.filter((r) => r.status !== "unavailable" && !TABLE_METRIC_IDS.has(r.metricId));
}

/**
 * 8.1 표 아래 고정 문구 16. 찍지 않을 때(모두 기준이 있음·서술 지표 자체가 없음)는 null.
 * - 일부: "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: {이름, …}."
 * - 전부: "선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다."
 */
export function noBenchmarkSentence(kpiResults: readonly KpiResult[], taskType: TaskType): string | null {
  const narrative = narrativeMetrics(kpiResults);
  if (narrative.length === 0) return null;
  const missing = metricsWithoutBenchmark(kpiResults, taskType);
  if (missing.length === 0) return null;
  if (missing.length === narrative.length) return ALL_NO_BENCHMARK_SENTENCE;
  return partialNoBenchmarkSentence(missing);
}
