import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BackendNoticePanel } from "./BackendNoticePanel";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

/** ISSUES.md B-03 · B-04 · D-16 · A-12 (★작은 판단 ①). */
describe("BackendNoticePanel", () => {
  it("안내가 없으면 아무것도 그리지 않는다(빈 배너 금지)", () => {
    const { container } = render(<BackendNoticePanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("[B-03] 컬럼 분석 안내를 출처와 함께 보여준다", () => {
    render(<BackendNoticePanel columnNotes={[
      { llm_column: "memo", matched_column: null, status: "unmapped_header", message: "memo 를 제외했습니다" },
    ]} />);

    expect(screen.getByText(/memo 를 제외했습니다/)).toBeInTheDocument();
    expect(screen.getByText("[컬럼 분석]")).toBeInTheDocument();
  });

  it("[B-04] 매핑 확정 경고를 보여준다", () => {
    render(<BackendNoticePanel mappingWarnings={[{ code: "X", message: "예측을 파생합니다" }]} />);
    expect(screen.getByText(/예측을 파생합니다/)).toBeInTheDocument();
  });

  it("[D-16] 평가 전처리 경고를 보여준다", () => {
    render(<BackendNoticePanel evaluationWarnings={["2개 행이 제외되었습니다"]} />);
    expect(screen.getByText(/2개 행이 제외되었습니다/)).toBeInTheDocument();
  });

  it("[A-12] 계산 가능한 지표 N/M 을 보여준다", () => {
    render(<BackendNoticePanel selectedMetricIds={["M1", "M9"]} availableMetricIds={["M1"]} />);
    expect(screen.getByText(/계산 가능한 지표 1\/2/)).toBeInTheDocument();
  });

  it("[A-12] 전부 계산 가능하면 경고 문구를 덧붙이지 않는다", () => {
    render(<BackendNoticePanel selectedMetricIds={["M1"]} availableMetricIds={["M1", "M9"]} />);
    expect(screen.getByText(/계산 가능한 지표 1\/1/)).toBeInTheDocument();
    expect(screen.queryByText(/계산할 수 없습니다/)).not.toBeInTheDocument();
  });
});

describe("배선 — 만들어 두고 붙이지 않는 실수 차단", () => {
  it("6단계 화면에 마운트돼 있다", () => {
    const source = read("pages/DataValidation.tsx");
    expect(source).toContain("<BackendNoticePanel");
    expect(source).toContain("store.columnNotes");
    expect(source).toContain("store.mappingWarnings");
    expect(source).toContain("store.availableMetricIds");
  });

  it("성적서 화면에도 마운트돼 있다(D-16 은 여기서 도착한다)", () => {
    const source = read("pages/report/Report.tsx");
    expect(source).toContain("<BackendNoticePanel");
    expect(source).toContain("evaluationWarnings");
  });

  it("컬럼 분석 응답의 column_notes 를 store 로 나른다", () => {
    expect(read("hooks/useColumnAnalysis.ts")).toContain("result.column_notes");
    expect(read("pages/DataUpload.tsx")).toContain("setColumnNotes");
  });

  it("매핑 확정 응답의 warnings·available_metric_ids 를 store 로 나른다", () => {
    const source = read("pages/ColumnMapping.tsx");
    expect(source).toContain("setMappingFeedback");
    expect(source).toContain("result.available_metric_ids");
  });

  it("평가 응답의 warnings 를 성적서 데이터로 나른다", () => {
    expect(read("hooks/useReportData.ts")).toContain("evaluationWarnings");
  });
});
