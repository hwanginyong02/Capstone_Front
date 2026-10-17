/**
 * 지표 화면의 목적별 점검 미리보기와 "추천 지표" — 재료 선택 점검 결과를 그대로 읽는다
 * (입력 설계 › 재료 선택 점검 6절 "추천 세트: 같은 점검 표를 입력 화면에 먼저 보여 주는 기능").
 *
 * 판정을 새로 하지 않는다. 성적서를 만드는 같은 경로(매퍼 → `checkMaterialSelection`)에 지금 입력을
 * 넣어 결과를 읽는다. 그래서 "추천대로 고르면 점검은 통과한다"가 생성 전 안내와 같은 규칙으로 성립한다.
 */
import { getRecommendedMetricIds } from "../../data/evaluationData";
import {
  buildReportInput,
  mapWorkflowToFinalReport,
  type ReportInputSource,
} from "../../lib/report/mapWorkflowToFinalReport";
import type { MaterialCheckResult } from "../../types/finalReport.types";
import type { ValidateDataResponseData } from "../../types/validation.types";

export type PurposeSource = ReportInputSource & { validationResult?: ValidateDataResponseData | null };

/** 지금 입력(또는 지표 선택만 바꾼 입력)의 재료 선택 점검 결과. 카드 값이 없으면 undefined. */
export function materialCheckFor(
  state: PurposeSource,
  selectedMetricIds: string[] = state.selectedMetricIds,
): MaterialCheckResult | undefined {
  return mapWorkflowToFinalReport(
    buildReportInput({ ...state, selectedMetricIds }),
    state.validationResult ?? null,
  ).materialCheck;
}

/**
 * 추천 지표 — 유형별 기본 세트에, 그 세트로 점검했을 때 맞지 않는 줄의 추천 지표를 더한다.
 * 예: 이진에서 불균형 비율이 9 를 넘으면 기본 세트의 AUROC 옆에 AUPRC 가 더해진다.
 */
export function recommendedMetricIdsFor(state: PurposeSource): string[] {
  const base = getRecommendedMetricIds(state.taskType);
  const check = materialCheckFor(state, base);
  const extra = (check?.purpose.lines ?? []).filter((line) => !line.met).flatMap((line) => line.recommended);
  return [...new Set([...base, ...extra])];
}
