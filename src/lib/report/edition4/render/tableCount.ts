/**
 * 판 4 **표 칸**의 정수 건수 표기 — 천 단위 쉼표(S6 질문 8, 2026-10-24 사용자 답 "표의 수에 쉼표, 서술 문장은 판 3 규칙 그대로").
 *
 * - 실행 환경 로캘과 무관하게 en-US 묶음("3,290"). 예시본 2.3 "3,727바이트"·4.1 요약 "1,234건"과 같은 꼴.
 * - 정수 건수(표본 수·TP/TN/FP/FN·예측 수·오분류 건수·클래스 수·검증 상세 건수)만. 소수 값(지표·비율·지연시간)은 판 4 숫자
 *   규칙(`edition4Number`) 그대로 — 지연시간은 4.8 표·규칙 문장·백엔드가 같은 글자여야 해서(D4) 묶지 않는다.
 * - S6 뒤 사용자 결정 4(2026-10-24)로 판 4 고객 문장의 건수도 같은 꼴이 됐다 — 묶음은 공통 함수 `ed4Count` 한 곳이다(백엔드
 *   `ed4_count` 와 같은 대조 표). 사실 시트 글자와 공통 `ed4SignedCount`(두 저장소 대조 표)는 그대로.
 */
import { ed4Count, ed4SignedCount } from "../edition4Number";

/** 정수 건수 → "3,290"(`ed4Count`). */
export function ed4TableCount(n: number): string {
  return ed4Count(n);
}

/** 부호 있는 정수 차이(예측 편향) → "+1"·"−1,234"·"0" — `ed4SignedCount` 의 부호 규칙에 쉼표만 더한다. */
export function ed4TableSignedCount(n: number): string {
  return ed4SignedCount(n).replace(/\d+/, (digits) => ed4TableCount(Number(digits)));
}

/** 글 속 정수 글자("1234")를 묶는다 — 이미 쉼표가 있으면 걷고 다시 묶는다. */
export function ed4TableCountText(digits: string): string {
  return ed4TableCount(Number(digits.replace(/,/g, "")));
}
