/**
 * /report/no/:reportNo — 번호로 서버 보관본을 복원하는 화면.
 *
 * ISSUES.md F-04 — 종전에는 성적서 실체가 localStorage 에만 있어, 저장소를 지우거나
 * 다른 기기에서 접속하면 발급된 문서가 영구히 사라졌다. 번호를 알아도 되살릴 수 없었다.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getReportContent = vi.fn();

vi.mock("../../lib/report/issuanceApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/report/issuanceApi")>();
  return { ...actual, getReportContent: (...args: unknown[]) => getReportContent(...args) };
});

vi.mock("../../components/report/ReportSections", () => ({
  ReportSections: ({ data }: { data: { meta: { reportId: string } } }) => (
    <div data-testid="sections">{data.meta.reportId}</div>
  ),
}));

import { ReportByNumber } from "./ReportByNumber";
import { routes } from "../../routes";

const SNAPSHOT = {
  reportNo: "RPT-2026-0001",
  version: "v1.1",
  issuedAt: "2026-07-04T08:10:52+00:00",
  contentHash: "a".repeat(64),
  content: { meta: { reportId: "RPT-2026-0001" } },
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => getReportContent.mockReset());
afterEach(() => vi.clearAllMocks());

describe("번호로 성적서 복원", () => {
  it("[F-04] 서버 보관본이 있으면 성적서를 렌더한다", async () => {
    getReportContent.mockResolvedValue(SNAPSHOT);
    renderAt("/report/no/RPT-2026-0001");

    await waitFor(() => expect(screen.getByTestId("sections")).toBeInTheDocument());
    expect(getReportContent).toHaveBeenCalledWith("RPT-2026-0001");
  });

  it("[F-01] 발급 차수와 문서 검증 코드를 함께 표시한다", async () => {
    getReportContent.mockResolvedValue(SNAPSHOT);
    renderAt("/report/no/RPT-2026-0001");

    await waitFor(() => expect(screen.getByText(/서버 보관본/)).toBeInTheDocument());
    expect(screen.getByText(/v1\.1/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp("a".repeat(64)))).toBeInTheDocument();
  });

  it("[F-04] 서버에 사본이 없으면 그 사실을 정직하게 알린다", async () => {
    getReportContent.mockResolvedValue(null);
    renderAt("/report/no/RPT-2020-0001");

    await waitFor(() =>
      expect(screen.getByText(/성적서를 찾을 수 없습니다/)).toBeInTheDocument()
    );
    // 없는 문서를 그럴듯하게 지어내지 않는다 — 왜 없는지까지 설명한다.
    expect(screen.getByText(/이전에 발급된 문서는/)).toBeInTheDocument();
  });

  it("[F-04] content 가 비어 있는 응답도 '없음'으로 처리한다", async () => {
    getReportContent.mockResolvedValue({ ...SNAPSHOT, content: null });
    renderAt("/report/no/RPT-2026-0001");

    await waitFor(() =>
      expect(screen.getByText(/성적서를 찾을 수 없습니다/)).toBeInTheDocument()
    );
  });
});

describe("라우팅", () => {
  it("[F-04] 번호 경로가 run id 경로(/report/:id)에 가려지지 않는다", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/report/no/:reportNo");

    // react-router 는 정적 세그먼트("no")를 동적 세그먼트보다 높게 랭크하므로
    // 배열 순서와 무관하게 번호 경로가 이긴다. 그 전제를 실제 매칭으로 확인한다.
    render(
      <MemoryRouter initialEntries={["/report/no/RPT-2026-0001"]}>
        <Routes>
          <Route path="/report/:id" element={<div data-testid="run-route" />} />
          <Route path="/report/no/:reportNo" element={<div data-testid="number-route" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("number-route")).toBeInTheDocument();
  });
});
