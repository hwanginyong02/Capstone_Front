/**
 * 화면 본문(ReportSections)이 성적서 데이터의 B10·W8 선택 키를 6.1 까지 실제로 넘기는가.
 *
 * KpiResultSection·MetricRow 는 각자 테스트가 있지만, 그 둘만으로는 이 파일(와 인쇄본)의 배선을
 * 지워도 아무것도 실패하지 않았다(S7 검토). 인쇄본은 `DataValidationSection.test.tsx` 의 배선
 * 대조가 이 파일과 같은 prop 을 넘기는지 본다 — 그래서 여기 한 곳을 고정하면 두 경로가 함께 지켜진다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportSections } from "./ReportSections";
import { mapWorkflowToFinalReport } from "../../lib/report/mapWorkflowToFinalReport";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import type { FinalReportData, KpiResult } from "../../types/finalReport.types";

function report(overrides: Partial<FinalReportData>): FinalReportData {
  const base = mapWorkflowToFinalReport({
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "binary",
    selectedMetricIds: ["M1"],
    metricDetails: { M1: { targetValue: "0.856" } } as never,
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
  });
  const kpi: KpiResult = {
    metricId: "M1",
    name: "Accuracy",
    value: 0.9,
    threshold: 0.856,
    status: "pass",
    higherIsBetter: true,
    isCore: true,
  };
  return {
    ...base,
    kpiResults: [kpi],
    conclusion: { ...base.conclusion, judgedCount: 1 },
    ...overrides,
  };
}

/** 6.1·6.2 표의 합격 기준 칸들(MetricRow 가 찍는 "≥ 값" 한 칸). 5절은 "합격 기준: …" 꼴이라 걸리지 않는다. */
const criteriaCells = () =>
  [...document.querySelectorAll("td")].map((td) => td.textContent ?? "").filter((text) => /^[≥≤] -?\d/.test(text));

describe("ReportSections — 6.1 에 targetDigits·coreMetricsSource 를 넘긴다 (B10·W8)", () => {
  it("새 성적서(targetDigits 3)는 6.1 합격 기준을 셋째 자리로 찍는다", () => {
    render(<ReportSections data={report({})} />);
    expect(report({}).targetDigits).toBe(3);
    expect(criteriaCells()).toEqual(["≥ 0.856"]);
  });

  it("coreMetricsSource 가 default 면 6.1 판정 규칙이 기본값 문장이다", () => {
    render(<ReportSections data={report({ coreMetricsSource: "default" })} />);
    expect(screen.getByText(/핵심 지표는 분류 유형의 기본값을 의뢰자가 바꾸지 않고 사용하였다/)).toBeInTheDocument();
    expect(screen.queryByText(/핵심 지표는 의뢰자가 지정하였다/)).not.toBeInTheDocument();
  });

  it("두 키가 없는 옛 성적서는 둘째 자리와 종전 문장", () => {
    render(<ReportSections data={report({ targetDigits: undefined, coreMetricsSource: undefined })} />);
    expect(criteriaCells()).toEqual(["≥ 0.86"]);
    expect(screen.getByText(/핵심 지표는 의뢰자가 지정하였다/)).toBeInTheDocument();
  });
});

describe("ReportSections — 6.1 에 judgedValueDigits 를 넘긴다 (S2 판정 자릿수)", () => {
  // 실제 미달 0.7996 · 목표 0.8 — 셋째 자리로는 "0.800 / ≥ 0.800 / 불합격"이라 판정과 어긋나 보인다.
  const failing: KpiResult = {
    metricId: "M1", name: "Accuracy", value: 0.7996, threshold: 0.8, status: "fail", higherIsBetter: true, isCore: true,
  };
  const valueCells = () =>
    [...document.querySelectorAll("td")].map((td) => td.textContent ?? "").filter((text) => /^0\.\d+$/.test(text));

  it("새 성적서는 판정과 어긋나 보이는 값을 넷째 자리로 찍는다", () => {
    const data = report({ kpiResults: [failing] });
    expect(data.judgedValueDigits).toBe(true);
    render(<ReportSections data={data} />);
    expect(valueCells()).toEqual(["0.7996"]);
    // 6.0 일러두기의 "셋째 자리로 반올림" 문장도 늘려 찍은 값이 있을 수 있다고 밝힌다.
    expect(screen.getByText(/자릿수를 늘려 표기하였습니다/)).toBeInTheDocument();
  });

  it("6.2 상세 표(비핵심 지표)도 같은 규칙", () => {
    render(<ReportSections data={report({ kpiResults: [{ ...failing, metricId: "M2", name: "Precision", isCore: false }] })} />);
    expect(valueCells()).toEqual(["0.7996"]);
  });

  it("키가 없는 옛 발급본은 발급 당시처럼 셋째 자리", () => {
    render(<ReportSections data={report({ kpiResults: [failing], judgedValueDigits: undefined })} />);
    expect(valueCells()).toEqual(["0.800"]);
    expect(screen.queryByText(/자릿수를 늘려 표기하였습니다/)).not.toBeInTheDocument();
  });
});
