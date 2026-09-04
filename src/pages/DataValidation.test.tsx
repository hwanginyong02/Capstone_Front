/**
 * Step 6 페이지 게이트 — ISSUES.md E-04.
 *
 * 검증이 실패했거나 수행되지 않았을 때 'Run evaluation' 이 눌리면, 검증 절이 통째로
 * 비어 있는 성적서가 만들어진다(6절에 "오류 0건 / 경고 0건"이 인쇄된다).
 * 이 결함은 rawFile 이 멀쩡히 살아 있어도 서버가 500 을 내거나 네트워크가 끊기면
 * 발동하므로 E-01(상태 비영속)의 자식이 아니다 — 독립적으로 막아야 한다.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDataValidation = vi.fn();

vi.mock("../hooks/useDataValidation", () => ({
  useDataValidation: () => mockUseDataValidation(),
}));

vi.mock("../components/data-validation/DataValidation", () => ({
  DataValidation: () => <div data-testid="validation-content" />,
}));

import { DataValidation } from "./DataValidation";

function renderPage(hookResult: Record<string, unknown>) {
  mockUseDataValidation.mockReturnValue({
    validationData: null,
    isLoading: false,
    error: null,
    buildEvaluationResult: vi.fn(),
    ...hookResult,
  });
  render(
    <MemoryRouter initialEntries={["/app/data-validation"]}>
      <DataValidation />
    </MemoryRouter>
  );
  return screen.getByRole("button", { name: /Run evaluation/i });
}

beforeEach(() => {
  mockUseDataValidation.mockReset();
});

describe("Step 6 평가 실행 게이트", () => {
  it("[E-04] 검증이 수행되지 않았으면(validationData=null) 실행 버튼이 비활성이다", () => {
    expect(renderPage({ validationData: null })).toBeDisabled();
  });

  it("[E-04] 검증 요청이 실패했으면 실행 버튼이 비활성이다", () => {
    expect(renderPage({ validationData: null, error: "Failed to fetch" })).toBeDisabled();
  });

  it("[E-04] 응답을 받았더라도 error 상태면 실행 버튼이 비활성이다", () => {
    expect(
      renderPage({ validationData: { error_count: 0 }, error: "예상치 못한 응답 형식" })
    ).toBeDisabled();
  });

  it("[E-04] 차단 오류가 있으면 실행 버튼이 비활성이다(기존 동작 보존)", () => {
    expect(renderPage({ validationData: { error_count: 2 } })).toBeDisabled();
  });

  it("[E-04] 로딩 중에는 실행 버튼이 비활성이다(기존 동작 보존)", () => {
    expect(renderPage({ validationData: null, isLoading: true })).toBeDisabled();
  });

  it("[E-04] 검증이 성공하고 오류가 0건이면 실행할 수 있다", () => {
    expect(renderPage({ validationData: { error_count: 0 } })).toBeEnabled();
  });

  it("[E-04] 차단된 이유가 화면에 표시된다", () => {
    renderPage({ validationData: null, error: "Failed to fetch" });
    expect(screen.getByText(/평가를 실행할 수 없습니다/)).toBeInTheDocument();
  });
});
