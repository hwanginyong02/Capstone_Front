/**
 * 종합 판정(verdict) 및 통과율(score) 규칙 산출.
 *
 * 성적서 6.1·8절의 최종 판정을 LLM이 아닌 결정론적 규칙으로 계산한다.
 *
 * 규칙 — 서술 설계 D19, 성적서 고정 문구 10. 위에서부터 처음 맞는 것:
 *  - 판정 대상 = 목표값이 있고(threshold !== null) 산출에 성공한(unavailable 아님) 지표.
 *    목표값 0·음수도 그 지표의 허용 범위 안이면 판정한다(MCC 등, `resolveTargetValue`).
 *  ① 핵심 지표가 하나라도 목표에 미달            → FAIL (불합격)
 *  ② 핵심 지표가 산출되지 않았거나 판정 대상 0개 → INCONCLUSIVE (판정 불가)
 *  ③ 핵심 지표는 모두 충족, 그 외 지표에 미달    → CONDITIONAL_PASS (조건부 합격)
 *  ④ 판정 대상 지표가 모두 충족                  → PASS (합격)
 *  - score = 합격 지표 수 / 판정 대상 지표 수 × 100 (통과율, 소수 1자리). **참고 수치일 뿐
 *    판정 근거가 아니다**(D19).
 *  - reasons = 어느 지표 때문에 그 판정이 났는지(9절 문제 목록의 재료, `problemList.ts`). 판정 결과는
 *    이 목록과 무관하게 위 규칙대로다.
 *
 * 종전에는 ②의 두 경우를 조건부 합격으로 적어, 확인하지 못한 것을 합격처럼 보이게 했다.
 */
import type { TaskType } from "../../data/evaluationData";
import type { CoreMetricsSource, KpiResult } from "../../types/finalReport.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import { metricNeedsTargetValue } from "../../utils/domain/validation";

/**
 * 핵심 지표(미달 시 FAIL)의 **기본값** — Metric 표시 ID(M 표기) 기준.
 *  binary:     Accuracy(M1), F1(M4)
 *  multiclass: Accuracy(M1), F1-macro(M4)
 *  multilabel: F1(M4), Jaccard(M17)
 *
 * 사용자는 지표와 합격 기준 화면의 합격 기준 표에서 이것을 바꿀 수 있다(② `coreMetrics`). 고르지 않으면
 * 이 값을 쓴다 — 문서의 기본값과 같다.
 */
export const DEFAULT_CORE_METRIC_IDS: Record<TaskType, string[]> = {
  binary: ["M1", "M4"],
  multiclass: ["M1", "M4"],
  multilabel: ["M4", "M17"],
};

/**
 * 핵심 지표를 누가 정했나 — 의뢰자가 합격 기준 표에서 한 번이라도 바꿨으면 "client", 손대지 않아 유형별
 * 기본값을 쓰면 "default"(W8). 바꿨다가 기본값과 같게 되돌려도 "client" 다 — 의뢰자가 고른 것이다.
 * `resolveCoreMetricIds` 가 어느 목록을 쓸지도 이 판정 하나로 정한다. 6.1 판정 규칙 문장이 이 값을 읽는다.
 */
export function coreMetricsSource(composerMetrics?: ComposerValueMap): CoreMetricsSource {
  return composerMetrics?.coreMetrics?.choices !== undefined ? "client" : "default";
}

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
  const base =
    coreMetricsSource(composerMetrics) === "client"
      ? composerMetrics!.coreMetrics!.choices!
      : DEFAULT_CORE_METRIC_IDS[taskType] ?? [];
  const selected = new Set(selectedMetricIds);
  return base.filter((id) => selected.has(id) && metricNeedsTargetValue(id));
}

export type Verdict = "PASS" | "CONDITIONAL_PASS" | "FAIL" | "INCONCLUSIVE";

/** 판정 불가(②)의 원인 — 핵심 지표 산출 실패 / 핵심 지표 목표값 없음 / 판정 대상 0개. */
export type InconclusiveReason = "core_not_computed" | "no_target" | "no_judged";

/**
 * 판정 사유(서술 설계 D22 문제 목록의 재료). 판정 결과를 바꾸지 않고, 판정에 쓴 지표를 그대로 돌려준다.
 * 지표는 KpiResult.metricId(M 표기)로 적는다.
 */
export interface VerdictReasons {
  /** 미달한 판정 대상 핵심 지표(①). */
  coreFailed: string[];
  /** 미달한 판정 대상 비핵심 지표(③). 판정이 FAIL 이어도 센다. */
  nonCoreFailed: string[];
  /**
   * 판정이 INCONCLUSIVE 일 때만 — 원인과 그 원인에 해당하는 핵심 지표. 산출 실패가 하나라도 있으면
   * core_not_computed, 아니면 no_target. 핵심 지표 탓이 아니고 판정 대상이 0개면 no_judged(지표 없음).
   */
  inconclusive: { reason: InconclusiveReason; metricIds: string[] } | null;
}

export interface VerdictResult {
  verdict: Verdict;
  score: number;
  /** 판정 대상 지표 수. 0 이면 통과율을 셀 수 없다(성적서에는 "—"). */
  judgedCount: number;
  reasons: VerdictReasons;
}

/**
 * 판정 대상 = 목표값이 설정되고 산출에 성공한 지표(고정 문구 10).
 * 계산 실패(unavailable) 지표는 "미달"로 위장하지 않고 분모·판정에서 제외한다(D4).
 *
 * 판정과 판정 대상에만 붙는 정보(신뢰구간 등)가 이 식 하나를 본다 — 자리마다 따로 적으면 어긋난다.
 */
export function isJudged(r: KpiResult): boolean {
  return r.threshold !== null && r.status !== "unavailable";
}

/**
 * 아슬아슬(근소 차이)의 폭 — 목표값 크기의 3%(서술 설계 D12, 성적서 고정 문구 10 마지막 문장).
 * 설계 원문은 "목표값 × 3%" 였으나 목표 0 이하(MCC 등)에서 폭이 음수가 되어 **목표값 절댓값**으로 고쳤다.
 */
export const NEAR_TARGET_RATIO = 0.03;

/**
 * 목표값과의 차이(마진). 판정 대상 지표만 숫자, 아니면 null.
 * 높을수록 좋은 지표는 값 − 목표, 낮을수록 좋은 지표는 목표 − 값 — 즉 0 이상이면 충족 쪽이다.
 */
export function computeMargin(r: KpiResult): number | null {
  if (!isJudged(r) || r.threshold === null) return null;
  return r.higherIsBetter === false ? r.threshold - r.value : r.value - r.threshold;
}

/**
 * 아슬아슬 = 판정 대상이고 |마진| < |목표값| × 3% (엄격 미만 — 꼭 3% 는 아니다).
 * 합격·미달을 가리지 않는다. 목표 0 이면 폭이 0 이라 아슬아슬이 나오지 않는다.
 * 6.1 문장·8.3 표시·9절 문제·AI 사실 시트가 모두 이 식 하나를 본다.
 */
export function isNearTarget(r: KpiResult): boolean {
  const margin = computeMargin(r);
  if (margin === null || r.threshold === null) return false;
  return Math.abs(margin) < Math.abs(r.threshold) * NEAR_TARGET_RATIO;
}

export function computeVerdict(
  kpiResults: KpiResult[],
  taskType: TaskType,
  coreMetricIds?: string[],
): VerdictResult {
  const coreIds = new Set(coreMetricIds ?? DEFAULT_CORE_METRIC_IDS[taskType] ?? []);

  const judged = kpiResults.filter(isJudged);

  const passed = judged.filter((r) => r.status === "pass").length;
  const score = judged.length > 0 ? Math.round((passed / judged.length) * 1000) / 10 : 0;
  const failed = judged.filter((r) => r.status === "fail");
  const coreFailed = failed.filter((r) => coreIds.has(r.metricId)).map((r) => r.metricId);
  const nonCoreFailed = failed.filter((r) => !coreIds.has(r.metricId)).map((r) => r.metricId);
  const result = (
    verdict: Verdict,
    inconclusive: VerdictReasons["inconclusive"] = null,
  ): VerdictResult => ({
    verdict,
    score,
    judgedCount: judged.length,
    reasons: { coreFailed, nonCoreFailed, inconclusive },
  });

  // ① 핵심 지표가 하나라도 미달하면 불합격.
  if (coreFailed.length > 0) {
    return result("FAIL");
  }

  // ② 핵심 지표가 산출되지 않았으면(계산 실패·목표값 없음) 판정할 수 없다. 이번 평가에 없는
  //    지표는 핵심으로 세지 않는다 — 고르지 않은 지표의 기본값이 남아 있을 수 있다.
  const coreNotJudged = kpiResults.filter(
    (r) => coreIds.has(r.metricId) && !judged.some((j) => j.metricId === r.metricId),
  );
  if (judged.length === 0 || coreNotJudged.length > 0) {
    const notComputed = coreNotJudged.filter((r) => r.status === "unavailable");
    if (notComputed.length > 0) {
      return result("INCONCLUSIVE", {
        reason: "core_not_computed",
        metricIds: notComputed.map((r) => r.metricId),
      });
    }
    if (coreNotJudged.length > 0) {
      return result("INCONCLUSIVE", {
        reason: "no_target",
        metricIds: coreNotJudged.map((r) => r.metricId),
      });
    }
    return result("INCONCLUSIVE", { reason: "no_judged", metricIds: [] });
  }

  // ③ 핵심은 모두 충족했지만 그 외 지표에 미달이 있으면 조건부 합격, ④ 아니면 합격.
  return result(failed.length > 0 ? "CONDITIONAL_PASS" : "PASS");
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
