/**
 * 사실 시트 상한 — 백엔드 `app/narrative/schemas.py` 의 MAX_* 와 같은 값(계약 `사실시트_계약.json` constants).
 *
 * 프론트가 같은 상수로 미리 자른다(상위 N개 + `omitted` 에 "외 k개"). 백엔드 작업 경로는 상한을 넘으면 칸을
 * 비우고 규칙 문장으로 끝내고(S3a), 본문이 2MB 를 넘으면 미들웨어가 413 을 낸다 — 미리 자르지 않으면 큰 다중
 * 클래스 성적서에서 서술을 잃는다(점검 유-11). 계약 사본과 값이 같은지는 `factSheetFit.test.ts` 가 본다.
 */
export const MAX_METRIC_FACTS = 64;
export const MAX_CLASS_ENTRIES = 256;
export const MAX_CI_METHOD_NOTE_CHARS = 500;
export const MAX_PROBLEMS = 16;
export const MAX_PROBLEM_TEXT_CHARS = 1_000;
export const MAX_PROBLEM_EVIDENCE_CHARS = 20_000;
export const MAX_FIXED_SENTENCES = 16;
export const MAX_FIXED_SENTENCE_CHARS = 1_000;
export const MAX_CI_SKIP_REASON_CHARS = 300;
/** facts 를 공백 없는 JSON 으로 만든 코드포인트 수(백엔드 `client_inputs_length` 와 같은 잣대). */
export const MAX_FACTS_CHARS = 30_000;
/**
 * 요청 본문 예산(UTF-8 바이트) — 백엔드 본문 상한 2MB(2,097,152)보다 작게. 넘으면 클래스 단위 칸을 비운다.
 * 프론트만 쓰는 값이다.
 */
export const NARRATIVE_BODY_BUDGET_BYTES = 1_800_000;
/** facts 전체가 상한을 넘을 때 클래스 목록을 줄이는 1단계 크기. */
export const FACTS_LIST_TRIM = 20;
