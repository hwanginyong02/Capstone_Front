import type { FinalReportData } from "../../../../types/finalReport.types";

/**
 * 판 4 장별 부품의 props — 모두 이것 하나로 통일한다(판 4 라운드 S4·S5). 화면(`ReportSections`, 번호 열기도)은 "screen",
 * 인쇄(`ReportPrint`)는 "print". 화면 전용 표시(칸 배지 등)는 mode 로 가른다.
 */
export interface Ed4PartProps {
  data: FinalReportData;
  mode: "screen" | "print";
}
