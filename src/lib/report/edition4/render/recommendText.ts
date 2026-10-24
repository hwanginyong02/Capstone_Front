/**
 * 판 4 6절 개선 권고·끝부분(발급 이력) 렌더러 문구(판 4 라운드 S5 ⑤, 갈래 b5). 새 고객 문장은 없다.
 * - 표 머리는 예시본 글자 그대로(6.1·6.2 권고 표, 발급 이력 표).
 * - 문제 0개의 6절 글은 판 3 고정 문구 6(`reportConstants.NO_PROBLEM_SENTENCE`) — 여기서 다시 정의하지 않는다.
 * - 우선순위 글자는 `problemList.priorityLabelEd4`(높음/중간/낮음), 대응 문제 칸은 `problemList.problemLabel`("P2 · {판 4 이름}").
 * - 자리표시 글은 판 3 `RecommendSection` 의 비공개 상수를 글자 그대로 옮긴 것이다(판 3 파일은 고치지 않음). 대기·실패면 공용
 *   `narrativePlaceholder`·`recommendationPlaceholder` 가 대기·실패 글로 바꾼다.
 */

/** 예시본 6.1·6.2 권고 표 머리. */
export const EX_RECOMMEND_COLUMNS = ["우선순위", "대응 문제 번호", "권고", "기대 효과"] as const;

/** 예시본 발급 이력 표 머리. */
export const EX_HISTORY_COLUMNS = ["버전", "발급일", "비고"] as const;

/** 판 3 9절 칸(9.1·9.2 → 판 4 6.1·6.2)의 빈 칸 자리표시(판 3 `RecommendSection` PLACEHOLDER 그대로). */
export const ED3_RECOMMEND_PLACEHOLDER = "자동 서술 생성(LLM) 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.";

/** 판 3 `RecommendSection` RECOMMENDATION_PENDING 그대로 — 문제는 있는데 묶인 권고가 아직 없을 때 권고 칸. */
export const ED3_RECOMMENDATION_PENDING = "권고 생성 예정";
