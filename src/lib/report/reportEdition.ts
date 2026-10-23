/**
 * 새 성적서(run)의 판을 정하는 곳 — 판 4 라운드 계획 2.2 "켜고 끄기(결정점 하나)".
 *
 * - 판은 run 을 만들 때 **여기서 한 번** 정해 `FinalReportData.contentSchema` 에 찍는다. 그 뒤(조립·서술 요청·그림·발급)는
 *   찍힌 판만 읽는다(`usesSchema4`). 환경변수를 읽는 곳은 이 파일 하나다 — 정적 시험(`reportEdition.test.ts`)이 지킨다.
 * - 이 함수를 import 하는 곳은 `mapWorkflowToFinalReport`(새 옵션 `contentSchema` 의 기본값) 하나다. 예외로 허용하는 곳은
 *   검증 화면 생성 전 안내 문구(B28, 표시 예측용) 하나뿐이다.
 * - 판 4를 켜려면 앱을 `VITE_REPORT_EDITION=4` 로 빌드한다. 값이 꼭 "4" 일 때만 4이고, 그 밖(없음·빈 값·"3"·"true" …)은 3이다.
 *   테스트 기본값은 `vitest.config.ts` 의 `test.env` 가 "3" 으로 고정한다(저장소 밖 `.env*` 가 바꾸지 못하게).
 */

/**
 * 지금 만드는 새 성적서의 판. **호출될 때** 환경변수를 읽는다(모듈을 불러올 때 한 번 읽어 두지 않는다 — 테스트가
 * `vi.stubEnv` 로 바꾼 값이 바로 보이게).
 */
export function newRunContentSchema(): 3 | 4 {
  const value: unknown = import.meta.env.VITE_REPORT_EDITION;
  return value === "4" ? 4 : 3;
}
