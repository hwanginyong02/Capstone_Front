/**
 * ISSUES.md E-12 — 렌더 중 예외 시 백지가 되던 문제 / 미매칭 URL 시 백지가 되던 문제.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";
import { NotFound } from "../pages/NotFound";
import { routes } from "../routes";

function Boom({ message = "d.getFullYear is not a function" }: { message?: string }): never {
  throw new TypeError(message);
}

beforeEach(() => {
  // React 는 경계에서 잡힌 예외도 콘솔에 흘린다 — 테스트 출력만 조용히 한다.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("[E-12] 렌더 중 예외를 안내 화면으로 바꾼다 — 백지가 되지 않는다", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/화면을 표시하지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByText(/워크스페이스로 이동/)).toBeInTheDocument();
  });

  it("[E-12] 원인 메시지를 보여준다 — 무엇이 터졌는지 알 수 있어야 한다", () => {
    render(
      <ErrorBoundary>
        <Boom message="contractDate 붕괴" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/contractDate 붕괴/)).toBeInTheDocument();
  });

  it("[E-12] 예외가 없으면 자식을 그대로 렌더한다", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("[E-12] '다시 시도'로 경계를 리셋할 수 있다", async () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error("일시적 오류");
      return <div data-testid="recovered" />;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByText(/화면을 표시하지 못했습니다/)).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
  });
});

describe("미정의 URL", () => {
  it("[E-12] catch-all 라우트가 등록되어 있다", () => {
    expect(routes.map((r) => r.path)).toContain("*");
  });

  it("[E-12] 미매칭 경로는 안내 화면을 렌더한다 — 백지가 아니다", () => {
    render(
      <MemoryRouter initialEntries={["/이런/경로는/없다"]}>
        <Routes>
          <Route path="/workspaces" element={<div />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/페이지를 찾을 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/이런\/경로는\/없다/)).toBeInTheDocument();
  });

  it("[E-12] catch-all 이 정상 경로를 가리지 않는다", () => {
    render(
      <MemoryRouter initialEntries={["/workspaces"]}>
        <Routes>
          <Route path="/workspaces" element={<div data-testid="real" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("real")).toBeInTheDocument();
  });
});
