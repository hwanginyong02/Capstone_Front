/**
 * 판 4 렌더 시험 도구(판 4 라운드 S4·S5) — 2단계 에이전트들이 자기 절을 이것으로 시험한다. 시험 파일이 아니다(수집되지 않음).
 *
 * 그리는 세 경로(글 뽑기는 보관본 정답 `archive/issued/issuedArchives.test.tsx` 와 같은 규칙 — 블록마다 한 줄, 표 칸은 " | "):
 * - `screenText(data)` — 화면 본문(`ReportSections`, 번호 열기도 이것을 쓴다).
 * - `printText(data)` — 인쇄(`/report/:id/print` 의 `ReportPrint`, 인쇄 준비 신호까지 기다림, print:hidden 뺌). 서술이 끝난 run 으로 연다.
 * - `byNumberText(content, issuance)` — 번호로 연 페이지 전체(`/report/no/:번호` — 머리 상자·작성 기록 포함). 서버 응답은 fetch 가짜.
 *
 * 예시본 대조:
 * - `exampleBlock("### 4.3 지표별 결과")` — 예시본 사본(`rpt0001/example.md`)에서 그 제목 줄부터 같은 깊이 이상의 다음 제목 앞까지.
 * - `exampleLines(block)` — 블록을 그린 글과 같은 단위의 줄로(제목의 `#` 뗌, 표는 칸 배열, 구분 줄 `|---|` 뺌, 목록 번호는 그대로).
 * - `expectExampleBlock(rendered, block)` — 블록의 줄이 그린 글에 **순서대로** 있다(사이에 다른 줄은 있어도 됨). 표 줄은 `|` 칸을
 *   셀 글자로 나눠 칸 수·글자까지 같아야 한다.
 *
 * 사용 예(2단계):
 * ```ts
 * import { loadEd4 } from "./ed4Fixtures";
 * import { exampleBlock, expectExampleBlock, printText, screenText } from "./renderEd4";
 * const data = loadEd4("bc_strong", "issued");
 * expectExampleBlock(screenText(data), exampleBlock("### 4.3 지표별 결과"));
 * expectExampleBlock(await printText(data), exampleBlock("### 4.3 지표별 결과"));
 * ```
 */
import { render, screen, waitFor } from "@testing-library/react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, vi } from "vitest";

import { ReportSections } from "../../../components/report/ReportSections";
import { resetReportDataForTests } from "../../../hooks/useReportData";
import type { IssuanceResult } from "../../../lib/report/issuanceApi";
import { normalizeReportContent } from "../../../lib/report/normalizeReportContent";
import { ReportByNumber } from "../../../pages/report/ReportByNumber";
import { ReportPrint } from "../../../pages/report/ReportPrint";
import type { FinalReportData } from "../../../types/finalReport.types";
import type { RunNarrativeState, WorkspaceEvaluationRun } from "../../../types/workspace.types";
import { useWorkflowStore } from "../../../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../../../utils/stores/useWorkspaceStore";

/* ------------------------------------------------------------------ *
 * 블록 글 — issuedArchives.test.tsx 의 blockText 를 옮김(판 3 정답과 같은 규칙)
 * ------------------------------------------------------------------ */
const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "P", "LI", "TR", "BLOCKQUOTE", "DT", "DD", "SECTION", "DIV", "TH", "TD"]);

export function blockText(nodes: Node[], options: { dropPrintHidden?: boolean } = {}): string {
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    const line = current.replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
    current = "";
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent ?? "";
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "STYLE" || node.tagName === "SCRIPT") return;
    if (options.dropPrintHidden && node.classList.contains("print:hidden")) return;
    const block = BLOCK.has(node.tagName);
    if (block) flush();
    if (node.tagName === "TD" || node.tagName === "TH") {
      current += " | ";
      node.childNodes.forEach(walk);
      return;
    }
    node.childNodes.forEach(walk);
    if (block) flush();
  };
  nodes.forEach(walk);
  flush();
  return `${lines.join("\n")}\n`;
}

// 차트(recharts)가 읽는다.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/* ------------------------------------------------------------------ *
 * 세 경로
 * ------------------------------------------------------------------ */

/** 화면 본문(ReportSections). 앱처럼 `normalizeReportContent` 를 거친다. */
export function screenText(data: FinalReportData): string {
  const view = render(
    <MemoryRouter>
      <ReportSections data={normalizeReportContent(structuredClone(data))} />
    </MemoryRouter>,
  );
  const text = blockText([view.container]);
  view.unmount();
  return text;
}

const RUN_ID = "run-ed4-render";

function resetStores() {
  resetReportDataForTests();
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
}

/**
 * 인쇄(ReportPrint) — 보관본 정답과 같은 방식: run 을 심고 `/report/:id/print` 를 연 뒤 인쇄 준비 신호(`data-pdf-ready`)와 자동
 * 인쇄 호출을 기다린다. 요청은 막는다(인쇄 탭은 평가·서술을 시작하지 않는다). 서술 상태는 기본 "끝남".
 */
export async function printText(
  data: FinalReportData,
  narrative: RunNarrativeState = { status: "done", jobId: "job-ed4-render" },
): Promise<string> {
  const print = vi.fn();
  vi.stubGlobal("print", print);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`인쇄: 요청 금지 ${String(input)}`);
    }),
  );
  resetStores();
  useWorkspaceStore.setState({
    workspaces: [],
    activeWorkspaceId: "ws-1",
    evaluationRuns: [
      {
        id: RUN_ID,
        workspaceId: "ws-1",
        modelName: "m",
        versionName: "v",
        reportId: data.meta.reportId,
        workflowSnapshot: undefined as unknown as WorkspaceEvaluationRun["workflowSnapshot"],
        reportData: { ...structuredClone(data), isEvaluated: true },
        createdAt: "2026-10-22T09:45:00.000Z",
        narrative,
      },
    ],
  });
  try {
    const view = render(
      <MemoryRouter initialEntries={[`/report/${RUN_ID}/print`]}>
        <Routes>
          <Route path="/report/:id/print" element={<ReportPrint />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(view.container.querySelector("[data-pdf-ready]")).not.toBeNull());
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const text = blockText([view.container.querySelector("[data-pdf-ready]")!], { dropPrintHidden: true });
    view.unmount();
    return text;
  } finally {
    resetStores();
    vi.unstubAllGlobals();
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** 앱 모양 발급 기록 → 서버 응답(snake_case). `getIssuance` 가 다시 앱 모양으로 읽는다. */
function issuanceBody(r: IssuanceResult) {
  return {
    report_no: r.reportNo,
    version: r.version,
    issuer: r.issuer,
    issued_at: r.issuedAt,
    organization: {
      org_name: r.organization.orgName,
      department: r.organization.department,
      evaluator: r.organization.evaluator,
      contact: r.organization.contact,
      address: r.organization.address,
    },
    history: r.history.map((h) => ({ version: h.version, issued_at: h.issuedAt, note: h.note })),
  };
}

/**
 * 번호로 연 페이지 전체(ReportByNumber — 머리 상자·작성 기록·본문). `content` 는 서버 보관본(발급 전 데이터 — `final` 픽스처),
 * `issuance` 는 발급 기록(없으면 서버가 기록을 못 준 경우). 서버 응답은 fetch 가짜로 준다.
 */
export async function byNumberText(content: FinalReportData, issuance: IssuanceResult | null = null): Promise<string> {
  const raw = JSON.stringify(content);
  const reportNo = issuance?.reportNo ?? (content.meta.reportId || "RPT-2026-9999");
  const issuedAt = issuance?.issuedAt ?? "2026-10-22T09:46:21.988622+00:00";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(`/api/reports/${reportNo}/content`)) {
        return json({
          report_no: reportNo,
          version: issuance?.version ?? "v1.0",
          issued_at: issuedAt,
          content_hash: createHash("sha256").update(raw, "utf8").digest("hex"),
          content: JSON.parse(raw),
        });
      }
      if (url.endsWith(`/api/reports/${reportNo}`)) return issuance ? json(issuanceBody(issuance)) : json({ detail: "없음" }, 404);
      throw new Error(`번호 열기: 모르는 요청 ${url}`);
    }),
  );
  try {
    const view = render(
      <MemoryRouter initialEntries={[`/report/no/${reportNo}`]}>
        <Routes>
          <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText(/서버 보관본/);
    const text = blockText([view.container]);
    view.unmount();
    return text;
  } finally {
    vi.unstubAllGlobals();
  }
}
