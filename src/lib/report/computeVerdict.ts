/**
 * 종합 판정(verdict) 및 통과율(score) 규칙 산출.
 *
 * 성적서 6.1·8절의 최종 판정을 LLM이 아닌 결정론적 규칙으로 계산한다.
 *
 * 규칙 — 서술 설계 D19, 성적서 고정 문구 10. 위에서부터 처음 맞는 것:
 *  - 판정 대상 = 목표값이 설정되고(threshold > 0) 산출에 성공한(unavailable 아님) 지표.
 *  ① 핵심 지표가 하나라도 목표에 미달            → FAIL (불합격)
 *  ② 핵심 지표가 산출되지 않았거나 판정 대상 0개 → INCONCLUSIVE (판정 불가)
 *  ③ 핵심 지표는 모두 충족, 그 외 지표에 미달    → CONDITIONAL_PASS (조건부 합격)
 *  ④ 판정 대상 지표가 모두 충족                  → PASS (합격)
 *  - score = 합격 지표 수 / 판정 대상 지표 수 × 100 (통과율, 소수 1자리). **참고 수치일 뿐
 *    판정 근거가 아니다**(D19).
 *
 * 종전에는 ②의 두 경우를 조건부 합격으로 적어, 확인하지 못한 것을 합격처럼 보이게 했다.
 */
import type { TaskType } from "../../data/evaluationData";
import type { KpiResult } from "../../types/finalReport.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import { metricNeedsTargetValue } from "../../utils/domain/validation";

/**
 * 핵심 지표(미달 시 FAIL)의 **기본값** — Metric 표시 ID(M 표기) 기준.
 *  binary:     Accuracy(M1), F1(M4)
 *  multiclass: Accuracy(M1), F1-macro(M4)
 *  multilabel: F1(M4), Jaccard(M17)
 *
 * 사용자는 Details 의 합격 기준 표에서 이것을 바꿀 수 있다(② `coreMetrics`). 고르지 않으면
 * 이 값을 쓴다 — 문서의 기본값과 같다.
 */
export const DEFAULT_CORE_METRIC_IDS: Record<TaskType, string[]> = {
  binary: ["M1", "M4"],
  multiclass: ["M1", "M4"],
  multilabel: ["M4", "M17"],
};

/**
 * 이번 판정에 쓸 핵심 지표.
 *
 * 사용자가 고른 값이 있으면 그것을, 없으면 유형별 기본값을 쓴다. 어느 쪽이든 **고른 지표
 * 중 목표값을 받는 것만** 남긴다 — 고르지 않은 지표나 목표값이 없는 정보성 지표(M21·M22)는
 * 미달할 수가 없어 핵심으로 둘 뜻이 없다. 지표 선택을 나중에 바꿔도 여기서 걸러진다.
 *
 * 빈 배열은 "핵심 지표 없음"이라는 **사용자의 선택**이다. 그때는 FAIL 이 나오지 않는다.
 */
export function resolveCoreMetricIds(
  taskType: TaskType,
  selectedMetricIds: string[],
  composerMetrics?: ComposerValueMap,
): string[] {
  const chosen = composerMetrics?.coreMetrics?.choices;
  const base = chosen ?? DEFAULT_CORE_METRIC_IDS[taskType] ?? [];
  const selected = new Set(selectedMetricIds);
  return base.filter((id) => selected.has(id) && metricNeedsTargetValue(id));
}

export type Verdict = "PASS" | "CONDITIONAL_PASS" | "FAIL" | "INCONCLUSIVE";

export interface VerdictResult {
  verdict: Verdict;
  score: number;
  /** 판정 대상 지표 수. 0 이면 통과율을 셀 수 없다(성적서에는 "—"). */
  judgedCount: number;
}

export function computeVerdict(
  kpiResults: KpiResult[],
  taskType: TaskType,
  coreMetricIds?: string[],
): VerdictResult {
  const coreIds = new Set(coreMetricIds ?? DEFAULT_CORE_METRIC_IDS[taskType] ?? []);

  // 판정 대상 = 목표값이 설정되고 산출에 성공한 지표(고정 문구 10).
  // 계산 실패(unavailable) 지표는 "미달"로 위장하지 않고 분모·판정에서 제외한다(D4).
  const judged = kpiResults.filter((r) => r.threshold > 0 && r.status !== "unavailable");

  const passed = judged.filter((r) => r.status === "pass").length;
  const score = judged.length > 0 ? Math.round((passed / judged.length) * 1000) / 10 : 0;
  const result = (verdict: Verdict): VerdictResult => ({
    verdict,
    score,
    judgedCount: judged.length,
  });

  // ① 핵심 지표가 하나라도 미달하면 불합격.
  if (judged.some((r) => coreIds.has(r.metricId) && r.status === "fail")) {
    return result("FAIL");
  }

  // ② 핵심 지표가 산출되지 않았으면(계산 실패·목표값 없음) 판정할 수 없다. 이번 평가에 없는
  //    지표는 핵심으로 세지 않는다 — 고르지 않은 지표의 기본값이 남아 있을 수 있다.
  const coreNotJudged = kpiResults.some(
    (r) => coreIds.has(r.metricId) && !judged.some((j) => j.metricId === r.metricId),
  );
  if (judged.length === 0 || coreNotJudged) {
    return result("INCONCLUSIVE");
  }

  // ③ 핵심은 모두 충족했지만 그 외 지표에 미달이 있으면 조건부 합격, ④ 아니면 합격.
  return result(judged.some((r) => r.status === "fail") ? "CONDITIONAL_PASS" : "PASS");
}

/**
 * verdict/score 를 계산하고, LLM이 채울 서술 필드(benchmark/narrative/risks)는
 * 빈 문자열로 둔 ConclusionData 를 생성한다. (서술은 LLM 서술 모듈에서 채움)
 */
export function buildConclusion(
  kpiResults: KpiResult[],
  taskType: TaskType,
  coreMetricIds?: string[],
) {
  const { verdict, score, judgedCount } = computeVerdict(kpiResults, taskType, coreMetricIds);
  return { verdict, score, judgedCount, benchmark: "", narrative: "", risks: "" };
}
