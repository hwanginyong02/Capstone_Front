/**
 * 판 4 표지(예시본 첫 블록 — 제목 아래 상태 줄부터 "시험 결과 요약" 표까지)에 찍을 글을 저장값에서 고른다. 다시 계산하지 않는다:
 * 요약 표는 생성 때 저장한 `edition4Values.coverResultRows`(종합 판정·핵심 지표 — B2·B3·B32 갈래 포함)와 재료 점검 판 4 의
 * `materialCheck.printed.coverRows`(보고 항목·주요 제약 — B4 포함)를 그대로 잇는다.
 *
 * 발급 여부는 문서 번호(`meta.reportId`)로 본다 — 판 3 표지·서명 절과 같은 기준(번호가 없으면 "(미발급)").
 */
import type { FinalReportData } from "../../../../types/finalReport.types";
import {
  B1_DRAFT_NOTICE,
  B1_DRAFT_STATUS,
  B1_UNISSUED,
  EX_ISSUED_STATUS,
  FIXED_22_ISSUE,
} from "../edition4Text";
import { COVER_INFO_LABEL, COVER_ISSUER_LINE, ISSUE_METHOD_AUTO } from "./coverText";
import { isIssuedEd4 } from "./issuance";

export interface CoverRow {
  label: string;
  value: string;
}

/** 발급본인가 — 판정은 `issuance.ts` 한 곳(표지·3.5·발급 이력 공용). */
export { isIssuedEd4 };

/** 상태 줄 — 발급본 "[ 발급 완료 ]"(예시본), 미발급은 부록 B1 의 두 줄(상태 줄과 그 아래 안내). */
export function coverStatusLines(data: FinalReportData): string[] {
  return isIssuedEd4(data) ? [EX_ISSUED_STATUS] : [B1_DRAFT_STATUS, B1_DRAFT_NOTICE];
}

/** 표준 문구 — 재료 점검 판 4 의 저장 글(`printed.cover`). 점검 결과가 없으면 null(줄 없음). */
export function coverStandardLine(data: FinalReportData): string | null {
  return data.materialCheck?.printed.cover ?? null;
}

/** "발급 기관: {기관명}" — 대응표 31(기관명만). */
export function coverIssuerLine(data: FinalReportData): string {
  return COVER_ISSUER_LINE.replace("{기관}", data.performer.orgName);
}

/** 고정 문구 22 — 발급본에만(부록 B1). 미발급이면 null. */
export function coverIssueSentence(data: FinalReportData): string | null {
  return isIssuedEd4(data) ? FIXED_22_ISSUE : null;
}

/** 표지 정보 표 — 4칸(이름 | 값 | 이름 | 값) 네 줄. 첫 줄은 머리 행으로 그린다(예시본 마크다운 표의 첫 줄). */
export function coverInfoGrid(data: FinalReportData): string[][] {
  const { meta, evalScope, applicant } = data;
  const issued = isIssuedEd4(data);
  return [
    [COVER_INFO_LABEL.reportId, issued ? meta.reportId : B1_UNISSUED, COVER_INFO_LABEL.issuedAt, issued && meta.issuedAt ? meta.issuedAt : B1_UNISSUED],
    [COVER_INFO_LABEL.target, `${evalScope.targetModel} ${evalScope.version}`, COVER_INFO_LABEL.client, applicant.companyName],
    [COVER_INFO_LABEL.taskType, meta.taskTypeLabel, COVER_INFO_LABEL.period, `${meta.evaluationPeriod.from} ~ ${meta.evaluationPeriod.to}`],
    [COVER_INFO_LABEL.issueMethod, ISSUE_METHOD_AUTO, COVER_INFO_LABEL.schema, String(data.contentSchema ?? "")],
  ];
}

/** "시험 결과 요약" 표의 줄 — `[...coverResultRows, ...coverRows]`(저장된 순서·글자 그대로). 둘 다 없으면 빈 배열. */
export function coverSummaryRows(data: FinalReportData): CoverRow[] {
  return [...(data.edition4Values?.coverResultRows ?? []), ...(data.materialCheck?.printed.coverRows ?? [])];
}
