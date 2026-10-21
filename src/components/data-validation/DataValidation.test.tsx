/**
 * 검증 화면 표 — 결과 칸과 실행 요약을 성적서와 같은 함수로 한글화한다(남은 일 "검증 화면 None"). 종전에는 결과
 * 칸이 백엔드의 "None" 을, 실행 요약이 "Total validated rows"·"1,234 rows" 를 날것으로 보였다.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataValidation } from "./DataValidation";
import type { ValidateDataResponseData } from "../../types/validation.types";

const DATA = {
  task_type: "binary",
  selected_metric_ids: ["M1"],
  execution_summary: [
    { label: "Total validated rows", value: "1,234 rows", note: "업로드된 파일의 전체 행 수" },
    { label: "Validation result", value: "Errors 0 / Warnings 0", note: "아래 상세 테이블 참조" },
  ],
  validation_details: [
    { name: "Duplicate ID", group: "common", status: "pass", result: "None", handling: "Reported only" },
    { name: "Label notation", group: "common", status: "pass", result: "None", handling: "같은 클래스로 계산" },
  ],
  error_count: 0,
  warning_count: 0,
} as unknown as ValidateDataResponseData;

describe("검증 화면 표", () => {
  it('결과 칸에 "None" 이 아니라 "없음"', () => {
    render(<DataValidation validationData={DATA} isLoading={false} />);
    // 두 항목이 표에 그려졌는지 먼저(빈 표면 아래 단정이 늘 참이다).
    for (const name of ["중복 ID", "라벨 표기"]) expect(screen.getByText(name, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("None")).toBeNull();
    expect(screen.getAllByText("없음")).toHaveLength(2);
  });

  it("실행 요약은 한글 이름과 값", () => {
    render(<DataValidation validationData={DATA} isLoading={false} />);
    const row = screen.getByText("검증한 전체 행").closest("tr")!;
    expect(within(row).getByText("1,234건")).toBeInTheDocument();
    expect(screen.getByText("오류 0 / 경고 0")).toBeInTheDocument();
    expect(screen.queryByText("Total validated rows")).toBeNull();
  });
});
