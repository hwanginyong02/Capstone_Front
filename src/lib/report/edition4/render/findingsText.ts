/**
 * 판 4 5절 분석 소견 렌더러 문구(판 4 라운드 S5 ④, 갈래 b5). 새 고객 문장은 없다 — 모두 출처가 있는 글이다.
 * - 5절 머리 ※ 줄은 `edition4Text.FIXED_NOTE_ED4`(고정 문구 ※ 판 4), 5.4 빈 칸은 `B18_NOT_APPLICABLE`, 5.6 빈 글은 판 3 고정 문구 15
 *   (`narrativeSectionText.NO_ADDITIONAL_OBSERVATION_TEXT` "해당 없음") — 여기서 다시 정의하지 않는다.
 * - 아래 자리표시 글은 판 3 절(`InterpretSection`·`ConclusionSection`)의 비공개 상수를 글자 그대로 옮긴 것이다(판 3 파일은 고치지
 *   않음). 판 3 처럼 공용 `draftPlaceholder(…, true)` 로 "(LLM)" 을 지워 쓰고, 서술 대기·실패면 공용 `narrativePlaceholder` 가
 *   대기·실패 글로 바꾼다(판 4 라운드 계획 2.4 "대기·실패 자리표시(공용 재사용)").
 */

/** 판 3 7절 칸(7.1·7.2·7.3 → 판 4 5.2·5.3·5.6)의 빈 칸 자리표시(판 3 `InterpretSection` PLACEHOLDER 그대로). */
export const ED3_INTERPRET_PLACEHOLDER =
  "자동 서술 생성(LLM) 연동 예정 — 계산된 지표·혼동행렬을 바탕으로 한 정밀 분석이 표시됩니다.";

/** 판 3 8절 칸(8.1·8.2·8.3 → 판 4 5.4·5.1·5.5)의 빈 칸 자리표시(판 3 `ConclusionSection` PLACEHOLDER 그대로). */
export const ED3_CONCLUSION_PLACEHOLDER = "자동 서술 생성(LLM) 연동 예정 — 현재는 규칙 기반 판정·점수만 표시됩니다.";
