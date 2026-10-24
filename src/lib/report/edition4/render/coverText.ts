/**
 * 판 4 표지와 1.1 시험기관 표의 글자(판 4 라운드 S4 ② — 렌더러 갈래 b1 전용). 모두 예시본 글자 그대로다(계획 부록 A "표지 정보 표의
 * 새 칸"). 고정 문구(22)와 부록 B1 은 공용 `edition4Text.ts` 의 상수를 쓴다 — 여기에는 다시 두지 않는다.
 */

/** 표지 "발급 기관: 리트머스" 줄의 틀(대응표 31 — 기관명만, 연락처·평가자·서명란 없음). */
export const COVER_ISSUER_LINE = "발급 기관: {기관}";

/** 표지 정보 표·1.1 시험기관 표의 "발급 방식" 칸 값(예시본). */
export const ISSUE_METHOD_AUTO = "자동 발급 (사람 승인 없음)";

/** 표지 정보 표(4칸) 칸 이름 — 예시본 순서. */
export const COVER_INFO_LABEL = {
  reportId: "문서 번호",
  issuedAt: "발급 일시",
  target: "시험 대상",
  client: "의뢰자",
  taskType: "평가 유형",
  period: "시험 기간",
  issueMethod: "발급 방식",
  schema: "양식 판",
} as const;

/** 표지 "시험 결과 요약" 표의 소제목과 머리 행(예시본). */
export const COVER_SUMMARY_TITLE = "시험 결과 요약";
export const COVER_SUMMARY_HEADERS = ["항목", "결과"] as const;
