/**
 * ② 합격 기준 — 지표마다 목표값과 핵심 지표(docs/MATERIAL_PICKER.md §3·§5).
 *
 * 합격 목표값은 평가 **전에** 지표와 합격 기준 화면에서 받는다. 결과와의 비교는 성적서가 한다.
 * 종전에는 Details(의뢰자 정보) 화면의 표였는데, 레지스트리상 ② 소속이라 지표 화면으로 합쳤다.
 *
 * 순수 함수다. 화면은 결과로 다음 버튼을 잠근다.
 */
import { getSelectedMetrics, type MetricDefinition, type TaskType } from "../../data/evaluationData";
import { resolveCoreMetricIds } from "../../lib/report/computeVerdict";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import type { MetricDetailStateMap } from "../../types/workflow.types";
import {
  fitsTargetDigits,
  getTargetValueRule,
  metricNeedsTargetValue,
  parseNumericValue,
} from "./validation";

/** 목표값 칸 하나의 문제. 없으면 null. */
export function targetValueError(metricId: string, raw: string): string | null {
  if (raw.trim() === "") return "목표값을 넣으세요.";
  const parsed = parseNumericValue(raw);
  if (parsed === null) return "목표값은 숫자여야 합니다.";
  const rangeError = getTargetValueRule(metricId).validate(parsed);
  if (rangeError) return rangeError;
  // 성적서가 찍는 자릿수(`TARGET_DIGITS` = 3)까지만 받는다(B10) — 인쇄값과 판정값이 같아야 한다.
  return fitsTargetDigits(parsed) ? null : "목표값은 소수 셋째 자리까지 넣으세요.";
}

export interface PassCriteriaState {
  /** 목표값을 받는 지표(혼동행렬처럼 값이 없는 지표는 빠진다). */
  targetMetrics: MetricDefinition[];
  /** 핵심 지표. 고르지 않았으면 유형별 기본값이다(`resolveCoreMetricIds`). */
  coreMetricIds: string[];
  targetsValid: boolean;
  /**
   * 목표값이 있는 지표가 있으면 핵심 지표를 1개 이상 골라야 한다(재료 목록 7절). 없으면 판정
   * 규칙의 첫 줄("핵심 지표가 하나라도 미달하면 불합격")이 성립하지 않는다.
   */
  coreValid: boolean;
}

export function passCriteriaState(
  taskType: TaskType | "",
  selectedMetricIds: string[],
  metricDetails: MetricDetailStateMap,
  composerMetrics: ComposerValueMap,
): PassCriteriaState {
  const resolved = taskType || "multiclass";
  const targetMetrics = getSelectedMetrics(resolved, selectedMetricIds).filter((metric) =>
    metricNeedsTargetValue(metric.id),
  );
  const coreMetricIds = resolveCoreMetricIds(resolved, selectedMetricIds, composerMetrics);
  return {
    targetMetrics,
    coreMetricIds,
    targetsValid: targetMetrics.every(
      (metric) => targetValueError(metric.id, metricDetails[metric.id]?.targetValue ?? "") === null,
    ),
    coreValid: targetMetrics.length === 0 || coreMetricIds.length > 0,
  };
}
