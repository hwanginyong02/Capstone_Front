/**
 * 판 4 렌더 시험 도구(판 4 라운드 S4·S5) — 2단계 에이전트들이 자기 절을 이것으로 시험한다. 시험 파일이 아니다(수집되지 않음).
 *
 * 그리는 세 경로(글 뽑기는 보관본 정답 `archive/issued/issuedArchives.test.tsx` 와 같은 규칙 — 블록마다 한 줄 — 이되 표는 한 행을
 * 한 줄 "| 칸1 | 칸2" 로):
 * - `screenText(data)` — 화면 본문(`ReportSections`, 번호 열기도 이것을 쓴다).
 * - `printText(data)` — 인쇄(`/report/:id/print` 의 `ReportPrint`, 인쇄 준비 신호까지 기다림, print:hidden 뺌). 서술이 끝난 run 으로 연다.
 *   셋째 인자 `{ inspect }` 로 글로 읽기 전 인쇄 DOM(`[data-pdf-ready]`)을 받아 볼 수 있다.
 * - `byNumberText(content, issuance, { dropRecord })` — 번호로 연 페이지 전체(`/report/no/:번호` — 머리 상자·작성 기록 포함, dropRecord 면
 *   작성 기록 상자를 뺌). 서버 응답은 fetch 가짜. 이 도구들은 끝날 때 `vi.unstubAllGlobals()` 를 부른다(시험의 다른 전역 stub 도 풀림).
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
 * 블록 글 — issuedArchives.test.tsx 의 blockText 를 옮기되 **표 한 행 = 한 줄**("| 칸1 | 칸2")로 바꿈.
 * 판 3 정답 규칙은 칸마다 줄을 나눠(TH·TD 도 블록) 행 경계를 알 수 없다 — 예시본 표 행과 칸 배열로 대조하려고 행으로 묶는다.
 * 칸 안에 블록 요소(p·div)를 넣으면 행이 쪼개지니 판 4 표 칸에는 글만 넣는다.
 * ------------------------------------------------------------------ */
const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "P", "LI", "TR", "BLOCKQUOTE", "DT", "DD", "SECTION", "DIV"]);

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
  options: { inspect?: (pdfRoot: Element) => void } = {},
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
    // inspect — 글로 읽기 전(print:hidden 을 빼기 전) 인쇄 DOM 을 그대로 본다(페이지 나눔·숨긴 요소 단정용).
    options.inspect?.(view.container.querySelector("[data-pdf-ready]")!);
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
export async function byNumberText(
  content: FinalReportData,
  issuance: IssuanceResult | null = null,
  options: { dropRecord?: boolean } = {},
): Promise<string> {
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
    // dropRecord: 작성 기록 상자(화면 전용 서비스 정보)를 뺀 글 — 금지어 시험처럼 본문만 볼 때.
    if (options.dropRecord) view.container.querySelectorAll('[aria-label="작성 기록"]').forEach((el) => el.remove());
    const text = blockText([view.container]);
    view.unmount();
    return text;
  } finally {
    vi.unstubAllGlobals();
  }
}

/* ------------------------------------------------------------------ *
 * 예시본 대조
 * ------------------------------------------------------------------ */
export const EXAMPLE_PATH = resolve(__dirname, "../rpt0001/example.md");
const EXAMPLE_TEXT = readFileSync(EXAMPLE_PATH, "utf8");

/**
 * 예시본에서 제목 줄(예: "### 4.3 지표별 결과", "## 5. 분석 소견", "# 기계학습 분류 성능 시험성적서")부터, 같은 깊이 이하(#
 * 개수가 같거나 적은) 다음 제목 앞까지의 블록(원문 줄 그대로). 제목이 없거나 둘이면 던진다.
 */
export function exampleBlock(heading: string): string {
  const lines = EXAMPLE_TEXT.split("\n");
  const hits = lines.flatMap((l, i) => (l === heading ? [i] : []));
  if (hits.length !== 1) throw new Error(`예시본에 제목 "${heading}" 이 ${hits.length}개다`);
  const depth = /^(#+) /.exec(heading)?.[1].length;
  if (!depth) throw new Error(`제목 줄이 아니다: ${heading}`);
  let end = hits[0] + 1;
  while (end < lines.length) {
    const d = /^(#+) /.exec(lines[end])?.[1].length;
    if (d !== undefined && d <= depth) break;
    end += 1;
  }
  return lines.slice(hits[0], end).join("\n");
}

/** 예시본 블록의 한 줄 — 글 줄이거나 표 줄(칸 배열). */
export type ExampleLine = { kind: "text"; text: string } | { kind: "row"; cells: string[] };

const cellsOfRendered = (line: string) => line.split("|").slice(1).map((c) => c.trim());

/**
 * 블록을 그린 글과 같은 단위의 줄로. 제목은 `#` 를 떼고, 표 구분 줄(`|---|`)은 빼고, 표 줄은 칸 배열, 글머리 `- `·인용 `> `는 떼고,
 * 앞뒤 빈칸은 걷는다. 번호 목록("1. …")의 번호는 그대로 둔다(번호를 글로 찍는다고 본다).
 */
export function exampleLines(block: string): ExampleLine[] {
  const out: ExampleLine[] = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (line === "" || /^\|(\s*-+\s*\|)+$/.test(line)) continue;
    if (line.startsWith("|")) {
      out.push({ kind: "row", cells: line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()) });
      continue;
    }
    out.push({ kind: "text", text: line.replace(/^#+ /, "").replace(/^- /, "").replace(/^> /, "") });
  }
  return out;
}

const showLine = (l: ExampleLine) => (l.kind === "row" ? `| ${l.cells.join(" | ")} |` : l.text);

/**
 * 예시본 블록의 줄이 그린 글(`screenText`·`printText`·`byNumberText` 결과)에 **순서대로** 있다. 사이에 다른 줄은 있어도 된다.
 * 글 줄은 줄 전체가 같아야 하고, 표 줄은 그린 줄을 `|` 로 나눈 칸 배열이 칸 수·글자까지 같아야 한다.
 */
export function expectExampleBlock(rendered: string, block: string): void {
  const have = rendered.split("\n").map((l) => l.trim());
  let at = -1;
  for (const want of exampleLines(block)) {
    let found = -1;
    for (let i = at + 1; i < have.length; i += 1) {
      const ok =
        want.kind === "text"
          ? have[i] === want.text
          : have[i].startsWith("|") && JSON.stringify(cellsOfRendered(have[i])) === JSON.stringify(want.cells);
      if (ok) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      const after = have.slice(at + 1, at + 6).join("\n  ");
      throw new Error(`예시본 줄이 그린 글에 (순서대로) 없다:\n  ${showLine(want)}\n앞 줄 뒤에 이어진 글:\n  ${after}`);
    }
    at = found;
  }
}
