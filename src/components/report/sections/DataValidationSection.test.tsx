/**
 * DataValidationSection — 성적서 6절 '시험 수행 요약' 수치 검증.
 *
 * ISSUES.md E-17 / D-01 — 화면(Report.tsx)은 validationSummary 를 넘기는데
 * 인쇄본(ReportPrint.tsx)은 넘기지 않아, **고객에게 실제로 나가는 산출물인 PDF** 가
 * 폴백값을 인쇄한다. 폴백은 `datasetInfo.sampleCount`, 즉 사용자가 2단계에서 손으로
 * 타이핑한 숫자다. 라벨은 "누락값·오류 제외 후 실제 metric 산출에 사용된 건수" 인데.
 */
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DataValidationSection } from "./DataValidationSection";
import type { KpiResult, ValidationResult } from "../../../types/finalReport.types";

const KPIS: KpiResult[] = [
  { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass" },
];

const VALIDATION: ValidationResult[] = [
  { checkName: "Missing values", detail: "2 rows", status: "warning", group: "common" },
];

/** 6.0 요약 표에서 라벨에 해당하는 값 셀의 텍스트를 읽는다. */
function summaryValue(label: string): string {
  const cell = screen.getByText(label).closest("tr")?.querySelectorAll("td")[1];
  return cell?.textContent ?? "";
}

describe("검증 요약 수치", () => {
  it("[D-01] validationSummary 가 있으면 실측 행 수를 인쇄한다", () => {
    render(
      <DataValidationSection
        dataValidation={VALIDATION}
        kpiResults={KPIS}
        totalSamples={5000}
        validationSummary={{ totalRows: 200, validRows: 198, excludedRows: 2 }}
      />
    );

    expect(summaryValue("총 검증 수행 건수")).toContain("200");
    expect(summaryValue("유효 예측 건수")).toContain("198");
    expect(summaryValue("제외된 샘플 수")).toContain("2");
  });

  it("[E-17] validationSummary 가 없으면 사용자 입력값으로 폴백한다 — 이것이 인쇄본의 실제 증상", () => {
    render(
      <DataValidationSection
        dataValidation={VALIDATION}
        kpiResults={KPIS}
        totalSamples={5000}
      />
    );

    // 5000 은 사용자가 2단계에서 타이핑한 값이지 실제 평가 행 수가 아니다.
    expect(summaryValue("유효 예측 건수")).toContain("5,000");
    expect(summaryValue("제외된 샘플 수")).toContain("0");
  });
});

/**
 * 배선 계약 — 화면과 인쇄본이 같은 근거로 같은 수를 찍어야 한다.
 *
 * 이 결함의 본체는 컴포넌트가 아니라 **두 호출부의 어긋남**이므로, 두 소스에서
 * DataValidationSection 에 넘기는 prop 이름 집합을 직접 대조한다.
 */
function propsPassedTo(component: string, file: string): string[] {
  const src = readFileSync(resolve(__dirname, "../../../pages/report", file), "utf-8");
  const open = src.indexOf(`<${component}`);
  if (open === -1) throw new Error(`${file} 에 <${component}> 사용처가 없다`);
  const close = src.indexOf("/>", open);
  const block = src.slice(open + component.length + 1, close);
  return [...block.matchAll(/(\w+)=\{/g)].map((m) => m[1]).sort();
}

describe("화면 ↔ 인쇄본 배선", () => {
  it("[E-17] ReportPrint 와 Report 가 DataValidationSection 에 같은 prop 을 넘긴다", () => {
    const onScreen = propsPassedTo("DataValidationSection", "Report.tsx");
    const onPrint = propsPassedTo("DataValidationSection", "ReportPrint.tsx");

    expect(onScreen).toContain("validationSummary"); // 화면 쪽 전제 확인
    expect(onPrint).toEqual(onScreen);
  });
});
