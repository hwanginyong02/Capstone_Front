/**
 * 판 4 의 "발급본인가" 판정 — 한 곳. 표지(상태 줄·고정 문구 22·문서 번호·발급 일시), 3.5 단계별 수행 일시 3행(부록 B8),
 * 끝부분 발급 이력이 모두 이것만 본다(판정 지점을 둘로 두면 같은 문서 안에서 "발급"과 "(미발급)"이 함께 찍힐 수 있다).
 * 기준은 문서 번호(`meta.reportId`) — 판 3 `ReportCoverSection`·`SignatureSection` 과 같다.
 */
import type { FinalReportData } from "../../../../types/finalReport.types";

export function isIssuedEd4(data: FinalReportData): boolean {
  return Boolean(data.meta.reportId);
}
