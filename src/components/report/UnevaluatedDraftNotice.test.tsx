import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UnevaluatedDraftNotice } from "./UnevaluatedDraftNotice";

/**
 * ISSUES.md E-03 — 미평가 draft 가 안내·재실행 수단 없이 성적서로 렌더됐다.
 */
const renderNotice = (isEvaluated: boolean) =>
  render(
    <MemoryRouter>
      <UnevaluatedDraftNotice isEvaluated={isEvaluated} />
    </MemoryRouter>,
  );

describe("미평가 draft 안내 (E-03)", () => {
  it("평가가 끝나지 않았으면 사실을 말한다", () => {
    renderNotice(false);
    expect(screen.getByText(/아직 평가가 끝나지 않은/)).toBeInTheDocument();
  });

  it("되돌아갈 길을 준다 — 6단계 링크", () => {
    renderNotice(false);
    expect(screen.getByRole("link", { name: /6단계/ })).toHaveAttribute(
      "href",
      "/app/data-validation",
    );
  });

  it("발급할 수 없다는 사실도 함께 알린다", () => {
    renderNotice(false);
    expect(screen.getByText(/발급할 수 없습니다/)).toBeInTheDocument();
  });

  it("평가가 끝났으면 아무것도 그리지 않는다", () => {
    const { container } = renderNotice(true);
    expect(container).toBeEmptyDOMElement();
  });

  it("성적서 화면에 실제로 마운트돼 있다", () => {
    const source = readFileSync(resolve(__dirname, "../../pages/report/Report.tsx"), "utf-8");
    expect(source).toContain("<UnevaluatedDraftNotice");
  });
});
