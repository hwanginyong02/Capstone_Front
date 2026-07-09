/**
 * 종합 판정(verdict) 및 종합 점수(score) 규칙 산출.
 *
 * 성적서 8절의 최종 판정/점수를 LLM이 아닌 결정론적 규칙으로 계산한다.
 * (가짜 MOCK "PASS / 94.4%" 를 대체)
 *
 * 규칙 (확정):
 *  - 판정 대상 = 임계값(threshold > 0)이 설정된 지표만. "정보 제공" 지표(threshold 0)는 제외.
 *  - verdict:
 *      · 대상 지표 전부 통과            → PASS (최종 합격)
 *      · 일부 미달이나 핵심 지표는 통과 → CONDITIONAL_PASS (조건부 합격)
 *      · 핵심 지표 미달                 → FAIL (최종 불합격)
 *  - score = 합격 지표 수 / 전체 대상 지표 수 × 100 (통과율, 소수 1자리)
 *
 * 향후 백엔드 이관 시 동일 로직을 verdict_rules.py 로 옮기면 된다(설계 문서 §5 참조).
 */
import type { TaskType } from "../../data/evaluationData";
import type { KpiResult } from "../../types/finalReport.types";

/**
 * 핵심 지표(미달 시 FAIL) — Metric 표시 ID(M 표기) 기준.
 *  binary:     Accuracy(M1), F1(M4)
 *  multiclass: Accuracy(M1), F1-macro(M4)
 *  multilabel: F1(M4), Jaccard(M17)
 */
const CORE_METRIC_IDS: Record<TaskType, string[]> = {
  binary: ["M1", "M4"],
  multiclass: ["M1", "M4"],
  multilabel: ["M4", "M17"],
};

export interface VerdictResult {
  verdict: "PASS" | "CONDITIONAL_PASS" | "FAIL";
  score: number;
}

export function computeVerdict(
  kpiResults: KpiResult[],
  taskType: TaskType,
): VerdictResult {
  const coreIds = new Set(CORE_METRIC_IDS[taskType] ?? []);

  // 판정 대상 = 임계값이 설정되고 계산에 성공한(measurable) 지표만.
  // 계산 실패(unavailable) 지표는 "미달"로 위장하지 않고 분모·판정에서 제외한다(D4).
  const target = kpiResults.filter((r) => r.threshold > 0 && r.status !== "unavailable");

  // 합격 기준이 하나도 없으면 판정 불가(정보 제공 평가) → 조건부로 표기, 점수 0
  if (target.length === 0) {
    return { verdict: "CONDITIONAL_PASS", score: 0 };
  }

  const passed = target.filter((r) => r.status === "pass").length;
  const score = Math.round((passed / target.length) * 1000) / 10;

  const anyFailed = target.some((r) => r.status === "fail");
  const coreFailed = target.some((r) => coreIds.has(r.metricId) && r.status === "fail");
  // 핵심 지표가 계산 불가라 확인 자체가 안 되면 PASS 로 단정하지 않고 조건부로 하향.
  const coreUnavailable = kpiResults.some(
    (r) => coreIds.has(r.metricId) && r.status === "unavailable",
  );

  let verdict: VerdictResult["verdict"];
  if (coreFailed) {
    verdict = "FAIL";
  } else if (anyFailed || coreUnavailable) {
    verdict = "CONDITIONAL_PASS";
  } else {
    verdict = "PASS";
  }

  return { verdict, score };
}

/**
 * verdict/score 를 계산하고, LLM이 채울 서술 필드(benchmark/narrative/risks)는
 * 빈 문자열로 둔 ConclusionData 를 생성한다. (서술은 LLM 서술 모듈에서 채움)
 */
export function buildConclusion(kpiResults: KpiResult[], taskType: TaskType) {
  const { verdict, score } = computeVerdict(kpiResults, taskType);
  return { verdict, score, benchmark: "", narrative: "", risks: "" };
}
