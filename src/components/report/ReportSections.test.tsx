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

/**
 * 소절 번호(서술 라운드 세션 B) — 판 3 은 모든 소제목에 번호, 판 2 이하는 발급 당시처럼 번호 없음. 판 1·2 의
 * 전문 모양은 `src/test/archive` 스냅샷이 따로 지킨다. 여기서는 판 번호 하나만 바꾼 같은 데이터로 두 갈래를 본다.
 */
describe("ReportSections — 소절 번호는 판 3 에서만", () => {
  // 지도(b_report-sections §1) 표 순서. 4절은 하이퍼파라미터 h3 하나라 번호 없음, 5절 의뢰자 선언은 번호 없음.
  const NUMBERED: Array<[string, string]> = [
    ["1.1", "대상"],
    ["1.2", "회사 개요"],
    ["1.3", "시험결과서 용도"],
    ["1.4", "제약사항"],
    ["2.1", "시험 목적"],
    ["2.2", "시험 절차"],
    ["2.3", "수행내용 및 시험기간"],
    ["3.1", "학습 데이터셋"],
    ["3.2", "평가 데이터셋"],
    ["5.1", "공통 지표"],
    ["5.2", "이진 분류 전용 지표"],
    ["6.0", "시험 수행 요약"],
    ["6.0.1", "데이터 검증 상세 내역"],
    ["6.1", "종합 핵심 성능 (Key Performance Indicators)"],
    ["6.2", "세부 시험항목별 결과"],
    ["6.3", "시각화 자료"],
    ["6.4", "응답시간 지표"],
    ["7.1", "혼동 행렬 기반 클래스 간 간섭 분석"],
    ["7.2", "데이터 분포 유의성 및 클래스 편향성 평가"],
    ["8.1", "도메인 성능 벤치마크"],
    ["8.2", "전반적 성능 및 일반화 능력 총평"],
    ["8.3", "기술적 취약점 및 잠재적 리스크 요약"],
    ["9.1", "데이터셋 보완 및 품질 개선 전략"],
    ["9.2", "모델 고도화 및 운영 관리 가이드"],
  ];

  const withTraining = (contentSchema: number) =>
    report({
      contentSchema,
      metricList: [
        { metricId: "M1", name: "Accuracy", threshold: 0.856, passCriteria: "≥ 0.856" },
        { metricId: "M9", name: "AUROC", threshold: null, passCriteria: "정보 제공" },
      ],
      trainingDatasetInfo: {
        name: "학습셋",
        trainingSampleCount: 10,
        validationSampleCount: 2,
        validExamples: [],
        edgeExamples: [],
      },
      // 4절 하이퍼파라미터·5절 의뢰자 선언 소제목이 그려지게(번호 없는 소제목의 단정이 빈 집합이 되지 않게)
      materials: {
        declarations: [{ label: "중요 오류 유형", value: "놓침(FN)" }],
        training: [],
        test: [],
        groundTruth: [],
        environment: [],
        hyperparameters: { algorithm: "XGBoost", rows: [{ name: "max_depth", value: "6" }] },
      },
    });

  const h3Texts = () => [...document.querySelectorAll("h3")].map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim());

  it("판 3 — 소제목마다 번호 접두", () => {
    render(<ReportSections data={withTraining(3)} />);
    const texts = h3Texts();
    expect(NUMBERED.length).toBeGreaterThan(20);
    for (const [number, title] of NUMBERED) {
      expect(texts.some((t) => t.startsWith(`${number} ${title}`))).toBe(true);
    }
    // 번호 없는 소제목 — 4절 하이퍼파라미터(있을 때)·5절 의뢰자 선언(있을 때)은 번호를 붙이지 않는다. 정규식은
    // 번호 접두까지 잡는다(번호가 붙으면 걸러지지 않고 아래 단정에서 걸린다). 먼저 둘 다 그려졌는지 본다.
    const unnumbered = texts.filter((t) => /^(?:[\d.]+\s+)?(하이퍼파라미터|의뢰자 선언)$/.test(t));
    expect(unnumbered).toHaveLength(2);
    expect([...unnumbered].sort()).toEqual(["의뢰자 선언", "하이퍼파라미터"]);
  });

  it("판 2 — 같은 데이터라도 번호 없이(발급 당시 모양)", () => {
    render(<ReportSections data={withTraining(2)} />);
    const texts = h3Texts();
    for (const [, title] of NUMBERED) {
      expect(texts.some((t) => t.startsWith(title))).toBe(true);
    }
    expect(texts.filter((t) => /^\d+\.\d/.test(t))).toEqual([]);
  });
});
