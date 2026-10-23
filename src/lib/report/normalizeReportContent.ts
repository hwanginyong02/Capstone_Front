/**
 * 보관된 성적서 데이터를 지금 형식으로 옮겨 읽는다.
 *
 * 발급된 성적서는 `FinalReportData` 를 통째로 서버에 보관하고, 성적서 번호로 열 때 그대로 다시
 * 그린다(`pages/report/ReportByNumber.tsx`). 칸의 뜻이 바뀌면 옛 판을 새 뜻으로 읽어 모양이
 * 달라지므로, 판(`contentSchema`)을 보고 옛 뜻을 새 뜻으로 옮긴다. **보관된 데이터 자체는 바꾸지
 * 않는다** — 화면에 그리기 직전에만 옮긴다. 판 표시는 그대로 둔다 — 자리가 바뀐 문장(파생 예측
 * 사실 6.0 → 7.1 앞)은 그 판의 자리에 그린다(`isLegacyLayout`).
 *
 * 판 1 → 2: 목표값 없음을 `threshold: 0` 으로 적던 것을 `null` 로 적는다. 판 1 시절에는 0 이
 * 목표값으로 쓰인 적이 없다(판정이 `> 0` 만 봤다).
 *
 * 판 2 → 3: 옮겨 읽을 칸은 없다 — 판 3 의 새 모양(소절 번호·칸별 출처 배지·7.3·본문의 AI 표현 제거 …)은
 * 판 3 성적서에만 그린다(`usesSchema3`). 판 2 보관본에도 `narrativeSections` 가 있으므로 키 유무가 아니라
 * 판 번호로 가른다(서술 라운드 세션 B, 사용자 결정 1).
 *
 * 판 비교는 지금 판 상수가 아니라 **그 뜻이 생긴 판 번호**에 박는다 — 상수를 올릴 때 옛 판 분기가 따라
 * 움직이면 판 2 보관본이 판 1 배치로 그려지거나 목표값 0 을 잃는다.
 */
import type { FinalReportData } from "../../types/finalReport.types";

/** 지금 성적서 데이터 형식의 판. */
export const REPORT_CONTENT_SCHEMA = 3;

const schemaOf = (content: Pick<FinalReportData, "contentSchema">): number => content.contentSchema ?? 1;

/** 판 2 이전의 배치로 그릴 보관본인지 — 파생 예측 사실을 6.0 일러두기에 찍던 판(판 1). */
export function isLegacyLayout(content: Pick<FinalReportData, "contentSchema">): boolean {
  return schemaOf(content) < 2;
}

/** 판 3 의 모양으로 그리는 성적서인지 — 소절 번호·칸별 출처 배지·7.3·본문 AI 표현 제거(서술 라운드 세션 B). */
export function usesSchema3(content: Pick<FinalReportData, "contentSchema">): boolean {
  return schemaOf(content) >= 3;
}

export function normalizeReportContent(content: FinalReportData): FinalReportData {
  if (schemaOf(content) >= 2) return content;

  const noTarget = <T extends { threshold: number | null }>(item: T): T =>
    item.threshold === 0 ? { ...item, threshold: null } : item;

  return {
    ...content,
    metricList: (content.metricList ?? []).map(noTarget),
    kpiResults: (content.kpiResults ?? []).map(noTarget),
  };
}
