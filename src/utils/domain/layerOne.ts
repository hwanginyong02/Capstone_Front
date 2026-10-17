/**
 * 재료 선택 점검 1층 — 없으면 성적서가 성립하지 않는 필수 값(입력 설계 › 재료 선택 점검 4.1).
 *
 * 각 입력 화면이 다음 버튼으로 이미 막는다. 검증 화면의 "다음"이 이 함수로 한 번 더 본다 — 끝난
 * 단계로 돌아가 필수 칸을 지우고 검증까지 다시 온 경우, 성적서가 그 빈칸을 안고 만들어지지 않게 한다.
 * 정답·예측 매핑은 검증(백엔드 dry-run)이 통과해야 "다음"이 열리므로 여기서 다시 보지 않는다.
 */
import { getCard } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerValueMap, MaterialPicks } from "../../types/reportComposer.types";
import type { BasicInfoFormData, MetricDetailStateMap, StepId } from "../../types/workflow.types";
import { isClientInfoValid, isModelInfoValid } from "./basicInfoValidity";
import { getCardIssues } from "./composerFieldGate";
import { passCriteriaState } from "./passCriteria";
import { isBetaValid } from "./validation";

export interface LayerOneGap {
  /** 고칠 단계. */
  stepId: StepId;
  /** 화면에 보이는 단계 이름. */
  label: string;
}

export interface LayerOneSource {
  taskType: TaskType | "";
  basicInfo: BasicInfoFormData;
  selectedMetricIds: string[];
  metricDetails: MetricDetailStateMap;
  composerMetrics: ComposerValueMap;
  composerPerspective: ComposerValueMap;
  materialPicks?: MaterialPicks;
}

/** 1층 빈칸이 있는 단계. 단계 순서대로. 없으면 빈 배열. */
export function layerOneGaps(state: LayerOneSource): LayerOneGap[] {
  const gaps: LayerOneGap[] = [];
  if (!isClientInfoValid(state.basicInfo)) gaps.push({ stepId: "clientInfo", label: "의뢰자 정보" });
  if (!isModelInfoValid(state.basicInfo)) gaps.push({ stepId: "model", label: "평가 대상 모델" });

  // 선언 3개(위험 방향·클래스 중요도·사용 방식) — 3층의 기준점이다.
  const perspectiveIssues = getCardIssues(
    getCard("perspective"),
    state.taskType,
    state.composerPerspective,
    true,
    state.materialPicks?.perspective,
  );
  if (perspectiveIssues.length > 0) gaps.push({ stepId: "perspective", label: "평가 관점" });

  // 지표·목표값·핵심 지표(없으면 판정이 없다)와 Fβ 의 β.
  const criteria = passCriteriaState(
    state.taskType,
    state.selectedMetricIds,
    state.metricDetails,
    state.composerMetrics,
  );
  const betaInvalid = state.selectedMetricIds.includes("M5") && !isBetaValid(state.metricDetails.M5?.beta);
  if (state.selectedMetricIds.length === 0 || !criteria.targetsValid || !criteria.coreValid || betaInvalid) {
    gaps.push({ stepId: "metrics", label: "지표와 합격 기준" });
  }
  return gaps;
}
