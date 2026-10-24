/**
 * 판 4 1절 시험 개요(1.1 의뢰자와 시험기관, 1.2 시험 목적과 성적서 용도, 1.3 제약사항)에 찍을 글을 저장값에서 고른다.
 * - 1.2 용도 표 개요 칸은 `materialRowText`(대응표 2 — 덧붙인 글은 "(의뢰자 제공: 글)").
 * - 1.3 은 번호를 글자로 찍는다("1. 이름: 글" — 예시본 대조가 번호를 글로 본다). 순서: 기본 3항목 → 고정 문구 13 → 고정 문구 3
 *   (신뢰구간을 찍은 성적서만 — 판 3 1.4 와 같은 조건 `confidenceIntervalNote`) → 제공되지 않은 정보(재료 점검 판 4 저장 글
 *   `printed.notProvided`, 그 아래 줄 = `printed.impacts`) → 목적별 점검 미충족(`printed.purposeShortfalls` 가 있을 때).
 */
import type { FinalReportData } from "../../../../types/finalReport.types";
import { josa } from "../../koreanJosa";
import { CONFIDENCE_INTERVAL_PREMISE, REPORT_PURPOSE_LABEL, REPORT_PURPOSE_OVERVIEW } from "../../reportConstants";
import { materialRowText } from "../../reportMaterials";
import { FIXED_13_ED4, FIXED_2_2_NOT_PROVIDED_LABEL } from "../edition4Text";
import type { CoverRow } from "./cover";
import { ISSUE_METHOD_AUTO } from "./coverText";
import {
  BASE_CONSTRAINTS_ED4,
  CONSTRAINT_CLIENT_PREMISE_TITLE,
  CONSTRAINT_PURPOSE_BODY,
  CONSTRAINT_PURPOSE_TITLE,
  CONSTRAINT_SIGNIFICANCE_TITLE,
  OVERVIEW_CLIENT_LABEL,
  OVERVIEW_INSTITUTION_LABEL,
  PURPOSE_LABEL,
  PURPOSE_PARAGRAPH,
} from "./overviewText";

/** 1.1 의뢰자 표. FAX·홈페이지는 값이 있을 때만, 평가 의뢰일은 저장돼 있을 때만(판 3 1.2 표와 같은 규칙). */
export function clientRows(data: FinalReportData): CoverRow[] {
  const { applicant, meta } = data;
  const L = OVERVIEW_CLIENT_LABEL;
  return [
    { label: L.companyName, value: applicant.companyName },
    { label: L.representative, value: applicant.representative },
    { label: L.businessNumber, value: applicant.businessNumber },
    { label: L.contact, value: applicant.contact },
    ...(applicant.fax ? [{ label: L.fax, value: applicant.fax }] : []),
    ...(applicant.homepage ? [{ label: L.homepage, value: applicant.homepage }] : []),
    { label: L.address, value: applicant.address },
    ...(meta.contractDate ? [{ label: L.contractDate, value: meta.contractDate }] : []),
  ];
}

/** 1.1 시험기관 표 — 기관명과 발급 방식(대응표 19·31 — 평가자·연락처 없음). */
export function institutionRows(data: FinalReportData): CoverRow[] {
  return [
    { label: OVERVIEW_INSTITUTION_LABEL.orgName, value: data.performer.orgName },
    { label: OVERVIEW_INSTITUTION_LABEL.issueMethod, value: ISSUE_METHOD_AUTO },
  ];
}

/** 1.2 목적 문단 — 모델명 뒤 을/를 은 따옴표로 감싼 이름의 읽는 소리로(`josa`). */
export function purposeParagraph(data: FinalReportData): string {
  const model = data.evalScope.targetModel;
  return PURPOSE_PARAGRAPH.replace("{모델}", model).replace("{조사}", josa(`"${model}"`, "을/를"));
}

/** 1.2 용도 표 — 첫 줄(머리 행) "용도 | {용도 이름}", 그다음 개요와 과제 칸(값이 있을 때). */
export function purposeTable(data: FinalReportData): { header: [string, string]; rows: CoverRow[] } {
  const { evalScope } = data;
  const projectNumber = evalScope.projectNumber ?? evalScope.projectInfo?.projectNumber;
  return {
    header: [PURPOSE_LABEL.purpose, REPORT_PURPOSE_LABEL[evalScope.reportPurposeKey]],
    rows: [
      {
        label: PURPOSE_LABEL.overview,
        value: materialRowText({
          value: evalScope.purpose || REPORT_PURPOSE_OVERVIEW[evalScope.reportPurposeKey],
          note: evalScope.purposeNote || undefined,
        }),
      },
      ...(evalScope.projectInfo
        ? [
            { label: PURPOSE_LABEL.projectName, value: evalScope.projectInfo.name },
            { label: PURPOSE_LABEL.projectAgency, value: evalScope.projectInfo.agency },
          ]
        : []),
      ...(projectNumber ? [{ label: PURPOSE_LABEL.projectNumber, value: projectNumber }] : []),
    ],
  };
}

/** 1.3 항목 하나 — `text` 는 번호까지 붙은 글("6. 제공되지 않은 정보: …"), `details` 는 그 아래 줄. */
export interface ConstraintLine {
  text: string;
  details: string[];
}

/** 1.3 제약사항 항목들(번호를 글로 붙임). */
export function constraintLines(data: FinalReportData): ConstraintLine[] {
  const printed = data.materialCheck?.printed;
  const items: Array<{ title: string; body: string; details?: string[] }> = [
    ...BASE_CONSTRAINTS_ED4,
    { title: CONSTRAINT_CLIENT_PREMISE_TITLE, body: FIXED_13_ED4 },
    ...(data.confidenceIntervalNote ? [{ title: CONSTRAINT_SIGNIFICANCE_TITLE, body: CONFIDENCE_INTERVAL_PREMISE }] : []),
    ...(printed?.notProvided
      ? [{ title: FIXED_2_2_NOT_PROVIDED_LABEL, body: printed.notProvided, details: printed.impacts ?? [] }]
      : []),
    ...(printed && printed.purposeShortfalls.length > 0
      ? [{ title: CONSTRAINT_PURPOSE_TITLE, body: CONSTRAINT_PURPOSE_BODY, details: printed.purposeShortfalls }]
      : []),
  ];
  return items.map((item, i) => ({ text: `${i + 1}. ${item.title}: ${item.body}`, details: item.details ?? [] }));
}
