/**
 * 재료 선택 점검 1층 — 없으면 성적서가 성립하지 않는 필수 값(입력 설계 › 재료 선택 점검 4.1).
 *
 * 각 입력 화면이 다음 버튼으로 이미 막는다. 검증 화면의 "다음"이 이 함수로 한 번 더 본다 — 끝난
 * 단계로 돌아가 필수 칸을 지우고 검증까지 다시 온 경우, 성적서가 그 빈칸을 안고 만들어지지 않게 한다.
 * 정답·예측 매핑은 검증(백엔드 dry-run)이 통과해야 "다음"이 열리므로 여기서 다시 보지 않는다.
 *
 * 고른 지표를 지금 매핑으로 계산할 수 있는지도 본다(B8). 지표 화면은 들어올 때 계산할 수 없게 된
 * 지표를 빼지만, 매핑을 고친 뒤 단계 표시줄로 지표 화면을 건너뛰어 검증에 오면 그 지표가 남는다.
 * 남은 채 평가하면 그 지표는 "측정 불가"가 되고, 핵심 지표면 판정 불가가 된다.
 */
import { getCard, getCardFields } from "../../data/reportComposer";
import { getStepDefinition } from "../../data/workflowSteps";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerSelection,
  ComposerValueMap,
  MaterialPicks,
  OptionalCardId,
} from "../../types/reportComposer.types";
import type { MappingRow } from "../../types/mapping.types";
import type { BasicInfoFormData, MetricDetailStateMap, StepId } from "../../types/workflow.types";
import { METRICS } from "../../data/evaluationData";
import { isClientInfoValid, isModelInfoValid } from "./basicInfoValidity";
import { getCardIssues, type FieldIssue } from "./composerFieldGate";
import { evaluationClassNames } from "./evaluationClasses";
import { passCriteriaState } from "./passCriteria";
import { unavailableMetricReasons } from "./metricAvailability";
import { isBetaValid } from "./validation";

export interface LayerOneGap {
  /** 고칠 단계. */
  stepId: StepId;
  /** 화면에 보이는 단계 이름. */
  label: string;
  /** 무엇이 문제인지 한 줄(예: "AUROC: 확률 컬럼 없음"). 단계 이름만으로 알 수 있으면 없다. */
  details?: string[];
  /** 빈칸이 아니라 틀린 값이다(⑥~⑨ 화면 규칙, `screenRuleGaps`) — 안내가 "채우기" 대신 "고치기"다. */
  invalid?: true;
}

export interface LayerOneSource {
  taskType: TaskType | "";
  basicInfo: BasicInfoFormData;
  selectedMetricIds: string[];
  metricDetails: MetricDetailStateMap;
  composerMetrics: ComposerValueMap;
  composerPerspective: ComposerValueMap;
  materialPicks?: MaterialPicks;
  /** 지금 매핑. 없거나 비었으면(시연) 지표 가용성을 보지 않는다. */
  columnMapping?: MappingRow[];
  /** 매핑 확정 응답의 가용 지표(정본). 없으면 매핑으로 판정한다(`unavailableMetricReasons`). */
  availableMetricIds?: string[] | null;
}

/**
 * 고른 지표 중 지금 매핑으로 계산할 수 없는 것과 이유(지표 이름: 이유). 고른 순서대로. 판정은 지표
 * 화면과 같은 `unavailableMetricReasons` 하나다 — 매핑이 비었으면 아무것도 막지 않는다.
 */
export function unavailableSelectedMetrics(state: LayerOneSource): string[] {
  const reasons = unavailableMetricReasons(state.taskType, state.columnMapping ?? [], state.availableMetricIds);
  return state.selectedMetricIds
    .filter((id) => id in reasons)
    .map((id) => `${METRICS.find((metric) => metric.id === id)?.name ?? id}: ${reasons[id]}`);
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
  const unavailable = unavailableSelectedMetrics(state);
  if (
    state.selectedMetricIds.length === 0 ||
    !criteria.targetsValid ||
    !criteria.coreValid ||
    betaInvalid ||
    unavailable.length > 0
  ) {
    gaps.push({
      stepId: "metrics",
      label: "지표와 합격 기준",
      ...(unavailable.length > 0 ? { details: unavailable } : {}),
    });
  }
  return gaps;
}

/** ⑥~⑨ 화면 규칙 재확인이 읽는 값(`screenRuleGaps`). 검증 화면은 스토어 상태를 통째로 넘긴다. */
export interface ScreenRuleSource {
  taskType: TaskType | "";
  composerCards: ComposerSelection;
  composerTrainingData: ComposerValueMap;
  composerTestData: ComposerValueMap;
  composerGroundTruth: ComposerValueMap;
  composerModelEnv: ComposerValueMap;
  materialPicks?: MaterialPicks;
  /** ⑥ 클래스별 데이터 양의 칸을 만드는 클래스 목록(`evaluationClassNames`) — 화면과 같은 목록으로 본다. */
  columnMapping?: MappingRow[];
  metadata?: Parameters<typeof evaluationClassNames>[2];
}

const SCREEN_RULE_CARDS: ReadonlyArray<[OptionalCardId, keyof ScreenRuleSource]> = [
  ["trainingData", "composerTrainingData"],
  ["testData", "composerTestData"],
  ["groundTruth", "composerGroundTruth"],
  ["modelEnv", "composerModelEnv"],
];

/** 화면의 문제 안내와 같은 뜻의 한 줄. 메시지가 있으면 그것을, 없으면 이유별 문구. */
function issueText(issue: FieldIssue): string {
  if (issue.message) return issue.message;
  switch (issue.reason) {
    case "outOfRange":
      return "허용 범위를 벗어난 값입니다.";
    case "invalidPeriod":
      return "시작 월과 끝 월을 모두 넣고, 시작 월이 끝 월보다 늦지 않게 하세요.";
    case "exclusive":
      return "다른 선택지와 함께 고를 수 없는 답을 함께 골랐습니다.";
    default:
      return "클래스마다 모두 적어 주세요(일부만 적었습니다).";
  }
}

/**
 * ⑥ 클래스별 데이터 양을 **일부만** 적었는가 — 빈칸이 아니라 틀린 값으로 본다. 성적서 3절은 적은 클래스만 한 줄로
 * 이어 찍어("정상 8,400") 나머지 클래스가 없는 분포처럼 읽힌다. 하나도 적지 않았으면 빈칸(2층 — 막지 않음)이다.
 */
function isPartialClassEntries(issue: FieldIssue, values: ComposerValueMap, taskType: TaskType | "", classNames: readonly string[]): boolean {
  if (issue.reason !== "missing") return false;
  const field = getCardFields(issue.cardId, taskType).find((candidate) => candidate.id === issue.fieldId);
  if (field?.entryKeysFrom !== "classes") return false;
  const value = values[issue.fieldId];
  return (value?.entries ?? []).some((entry) => classNames.includes(entry.key) && entry.value.trim() !== "");
}

/**
 * ⑥~⑨ 화면 규칙 중 **빈칸이 아닌 것**(서술 라운드 B, 점검 나-16) — 범위·정수, 기간 역전·한쪽만, 배타 선택지, 맞지 않는
 * 일치도 종류, 이름·값 한쪽만 적은 줄, 같은 이름 줄, 일부만 적은 클래스 분포. 각 화면의 "다음"이 막는 규칙인데, 끝난
 * 단계로 돌아가 값을 바꾼 뒤 단계 표시줄로 건너뛰면 검증까지 온다 — 그 값은 성적서와 AI 에 어긋나게 실린다(같은 이름
 * 하이퍼파라미터: 4절 표는 두 줄, AI 는 뒤 값 하나). 판정은 화면과 같은 `getCardIssues` 다.
 *
 * 빈칸(`missing`)은 막지 않는다 — 넣은 카드의 권장 항목은 2층이라 비어도 성적서에 "제공되지 않음"으로 찍고 진행한다
 * (재료 선택 점검 6절). 넣지 않은 카드는 보지 않는다. 단계 순서(⑥⑦⑧⑨)대로, 단계마다 한 덩이.
 */
export function screenRuleGaps(state: ScreenRuleSource): LayerOneGap[] {
  const classNames = evaluationClassNames(state.taskType, state.columnMapping ?? [], state.metadata);
  const gaps: LayerOneGap[] = [];
  for (const [cardId, key] of SCREEN_RULE_CARDS) {
    if (!state.composerCards[cardId]) continue;
    const values = (state[key] as ComposerValueMap | undefined) ?? {};
    const issues = getCardIssues(getCard(cardId), state.taskType, values, true, state.materialPicks?.[cardId], classNames)
      .filter((issue) => issue.reason !== "missing" || isPartialClassEntries(issue, values, state.taskType, classNames));
    if (issues.length === 0) continue;
    const stepId = getCard(cardId).steps[0];
    gaps.push({
      stepId,
      label: getStepDefinition(stepId).label,
      details: issues.map((issue) => `${issue.label}: ${issueText(issue)}`),
      invalid: true,
    });
  }
  return gaps;
}
