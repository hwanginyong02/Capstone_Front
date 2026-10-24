/**
 * 판 2·3 보관본 정답 글(판 4 라운드 S0, 계획 2.5-1) — "판 4 코드가 판 2·3 보관본 글을 한 글자도 바꾸지 않는다"의 이빨.
 *
 * - 픽스처(이 폴더, 모두 정적 파일):
 *   - `RPT-2026-000{1..6}.content.json`: 실제 발급된 판 3 성적서 6건의 서버 보관본(content_json) **바이트 그대로**.
 *     sha256 이 서버가 발급 때 적은 content_hash 와 같다(아래 첫 묶음이 단정한다 — 손대면 진짜가 아니게 된다).
 *   - `RPT-2026-000{1..6}.issuance.json`: 같은 발급의 발급 기록(issuance 행 + 발급 시점 기관 스냅샷)을 앱이
 *     `GET /api/reports/{번호}` 로 받는 모양(IssuanceResult)으로 옮긴 것.
 *   - `syn_*.json`: 실제 6건이 지나가지 않는 판 3 갈래(M21 혼동 행렬 차트·M22 클래스 표, 응답시간, 판정 불가, 분포 차이
 *     문제, 멀티레이블 레이블별 임계값, 서술 대기·실패)를 운영 main 코드의 `/report/:id` 흐름으로 만든 저장 데이터.
 *     `syn_*.narrative.json` 은 같은 run 의 서술 상태. 만든 법은 README.md.
 *   - 판 2·3 손 픽스처 4개는 위 폴더(`../schema*.json`)의 것을 그대로 쓴다.
 * - 정답 글(`golden/*.txt`)은 **운영 main(58d99ea) 코드**가 그린 글이다(README.md). 새 코드로 다시 뜨지 않는다.
 *   경로마다 하나: `sections`(화면 본문), `print`(인쇄, print:hidden 뺌, 발급본은 발급 기록을 덧입힘),
 *   `byNumber`(번호로 연 페이지 **전체** — 머리 상자·작성 기록 포함), `page`(`/report/:id` 페이지 — 발급본은 발급 뒤
 *   완료 상태, 서술 대기·실패 픽스처는 그 상태).
 * - 정답 파일이 없으면 실패한다(만들지 않는다). **정답이 바뀌면 코드를 고친다 — 정답을 다시 뜨는 것은 위험 신호다.**
 * - 시각은 `Date` 만 고정한다(2026-10-22 18:45 KST). 정답 글은 시간대(TZ)와 무관하다(생성 때 UTC·KST 둘 다 같음을 봤다).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const getReportContent = vi.fn();
const getIssuance = vi.fn();

vi.mock("../../../lib/report/issuanceApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/report/issuanceApi")>();
  return {
    ...actual,
    getReportContent: (...args: unknown[]) => getReportContent(...args),
    getIssuance: (...args: unknown[]) => getIssuance(...args),
  };
});

import { ReportSections } from "../../../components/report/ReportSections";
import { resetReportDataForTests } from "../../../hooks/useReportData";
import { applyIssuance, type IssuanceResult } from "../../../lib/report/issuanceApi";
import { normalizeReportContent } from "../../../lib/report/normalizeReportContent";
import { Report } from "../../../pages/report/Report";
import { ReportByNumber } from "../../../pages/report/ReportByNumber";
import { ReportPrint } from "../../../pages/report/ReportPrint";
import type { FinalReportData } from "../../../types/finalReport.types";
import type { RunNarrativeState, WorkspaceEvaluationRun } from "../../../types/workspace.types";
import { useWorkflowStore } from "../../../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../../../utils/stores/useWorkspaceStore";

const HERE = __dirname;
const NOW = new Date("2026-10-22T09:45:00Z");
const RUN_ID = "run-s0-synthetic";

/** 서버가 발급 때 적은 content_hash(report_snapshot.content_hash) — 픽스처가 진짜 보관본이라는 묶음. */
const ISSUED_HASH: Record<string, string> = {
  "RPT-2026-0001": "7379f30c150b37d9af515dbcf8aee0fa915eae95e5f881bbf59148fbba64f1cd",
  "RPT-2026-0002": "5d3cad2a7504b018555cbd581e7f3763410b7ed354c11e5230750d25317104d7",
  "RPT-2026-0003": "46ddacc3868168520283078540a47cfca2d106f9f1ad15763a49917ea2e7e99a",
  "RPT-2026-0004": "ed828599593e7dfc19d72bbf720d7322d7a36029f083db3354f18fd5710035f4",
  "RPT-2026-0005": "ad6fd76c71b7d5352802fc05079bbfafb0353e98bd62e5ffc97510e59427fff7",
  "RPT-2026-0006": "94a736f1995133f3be7225a0221161e24773cc49293a5a8b5e48a169f8192aa1",
};
const ISSUED = Object.keys(ISSUED_HASH);

/** 합성 판 3 픽스처와 그 run 의 서술 끝 상태. */
const SYNTHETIC: Array<[name: string, end: "done" | "pending" | "failed"]> = [
  ["syn_multiclass_cm_latency", "done"],
  ["syn_binary_shift_cm", "done"],
  ["syn_binary_inconclusive", "done"],
  ["syn_multilabel_perlabel", "done"],
  ["syn_narrative_pending", "pending"],
  ["syn_narrative_failed", "failed"],
  ["syn_binary_judged_digits", "done"],
];

/**
 * 서술 완료·미발급 상태로 /report/:id 페이지를 그리는 픽스처 — 머리 줄의 "초안 · 미발급 / 발급 / PDF 다운로드"가 켜진
 * 모양(발급본 6건은 발급 뒤, 대기·실패는 잠긴 모양이라 이 갈래를 지나지 않는다). 손 픽스처는 서술 상태가 없어
 * `{ status: "done", jobId: "job-<이름>" }` 으로 연다.
 */
const DRAFT_DONE_PAGES = ["syn_binary_shift_cm", "syn_binary_judged_digits", "schema2_binary"];

const HAND = ["schema3_binary", "schema3_binary_pass", "schema2_binary", "schema2_multiclass_noproblems"];

const readText = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(readText(path));

interface Target {
  name: string;
  content: FinalReportData;
  issuance: IssuanceResult | null;
  /** 번호로 연 화면의 서버 응답(내용 제외). */
  stored: { reportNo: string; version: string; issuedAt: string; contentHash: string };
  /** /report/:id 페이지 상태. 없으면 그 경로는 정답이 없다. */
  page: null | { reportData: FinalReportData; narrative: RunNarrativeState };
}

const FAKE_STORED = { reportNo: "RPT-2026-0001", version: "v1.0", issuedAt: "2026-10-01T03:00:00+00:00", contentHash: "a".repeat(64) };

function targets(): Target[] {
  const list: Target[] = [];
  for (const no of ISSUED) {
    const raw = readText(resolve(HERE, `${no}.content.json`));
    const issuance = readJson(resolve(HERE, `${no}.issuance.json`)) as IssuanceResult;
    const content = JSON.parse(raw) as FinalReportData;
    list.push({
      name: no,
      content,
      issuance,
      stored: { reportNo: no, version: issuance.version, issuedAt: issuance.issuedAt, contentHash: createHash("sha256").update(raw, "utf8").digest("hex") },
      page: { reportData: applyIssuance(content, issuance), narrative: { status: "done", jobId: `job-${no}` } },
    });
  }
  for (const name of HAND) {
    const content = readJson(resolve(HERE, `../${name}.json`)) as FinalReportData;
    const page = DRAFT_DONE_PAGES.includes(name) ? { reportData: content, narrative: { status: "done" as const, jobId: `job-${name}` } } : null;
    list.push({ name, content, issuance: null, stored: FAKE_STORED, page });
  }
  for (const [name, end] of SYNTHETIC) {
    const content = readJson(resolve(HERE, `${name}.json`)) as FinalReportData;
    const narrative = readJson(resolve(HERE, `${name}.narrative.json`)) as RunNarrativeState;
    const page = end !== "done" || DRAFT_DONE_PAGES.includes(name) ? { reportData: content, narrative } : null;
    list.push({ name, content, issuance: null, stored: FAKE_STORED, page });
  }
  return list;
}

const TARGETS = targets();

/** 정답 — 없으면 readFileSync 가 던져 실패한다(만들지 않는다). */
function golden(name: string, kind: "sections" | "print" | "byNumber" | "page"): string {
  return readText(resolve(HERE, `golden/${name}.${kind}.txt`));
}

/* ------------------------------------------------------------------ *
 * 블록 글 — archiveLayout.test.tsx 와 같은 규칙(블록마다 한 줄, 표 칸은 " | ")
 * ------------------------------------------------------------------ */
const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "P", "LI", "TR", "BLOCKQUOTE", "DT", "DD", "SECTION", "DIV", "TH", "TD"]);

function blockText(nodes: Node[], options: { dropPrintHidden?: boolean } = {}): string {
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

/* ------------------------------------------------------------------ *
 * 그리기 — 생성기(README 의 generate.tsx.txt)와 같은 순서·같은 상태
 * ------------------------------------------------------------------ */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function forbidFetch(label: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`${label}: 요청 금지 ${String(input)}`);
    }),
  );
}

function seedRun(reportData: FinalReportData, narrative: RunNarrativeState) {
  useWorkspaceStore.setState({
    workspaces: [],
    activeWorkspaceId: "ws-1",
    evaluationRuns: [
      {
        id: RUN_ID,
        workspaceId: "ws-1",
        modelName: "m",
        versionName: "v",
        reportId: reportData.meta.reportId,
        workflowSnapshot: undefined as unknown as WorkspaceEvaluationRun["workflowSnapshot"],
        reportData,
        createdAt: NOW.toISOString(),
        narrative,
      },
    ],
  });
}

function resetStores() {
  resetReportDataForTests();
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
}

function drawSections(t: Target): string {
  const view = render(
    <MemoryRouter>
      <ReportSections data={normalizeReportContent(structuredClone(t.content))} />
    </MemoryRouter>,
  );
  const text = blockText([view.container]);
  view.unmount();
  return text;
}

async function drawPrint(t: Target): Promise<string> {
  const printed = t.issuance ? applyIssuance(structuredClone(t.content), t.issuance) : structuredClone(t.content);
  forbidFetch("인쇄");
  seedRun({ ...printed, isEvaluated: true }, { status: "done", jobId: "job-1" });
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
}

async function drawByNumber(t: Target): Promise<string> {
  getReportContent.mockResolvedValue({ ...t.stored, content: structuredClone(t.content) });
  getIssuance.mockResolvedValue(t.issuance ? structuredClone(t.issuance) : null);
  const view = render(
    <MemoryRouter initialEntries={[`/report/no/${t.stored.reportNo}`]}>
      <Routes>
        <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1 });
  const text = blockText([view.container]);
  view.unmount();
  return text;
}

async function drawPage(t: Target): Promise<string> {
  const { reportData, narrative } = t.page!;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (narrative.status === "pending" && method === "GET" && /\/api\/narrative\/jobs\/[^/]+$/.test(url)) {
        return json({ job_id: narrative.jobId, status: "running", stage: "generating", failure: null, benchmark_refs: [], result: null });
      }
      throw new Error(`페이지: 요청 금지 ${method} ${url}`);
    }),
  );
  seedRun(structuredClone(reportData), structuredClone(narrative));
  const view = render(
    <MemoryRouter initialEntries={[`/report/${RUN_ID}`]}>
      <Routes>
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1 });
  if (narrative.status === "pending") await waitFor(() => expect(view.container.textContent).toContain("생성 중"));
  const text = blockText([view.container]);
  view.unmount();
  return text;
}

// 차트(recharts)가 읽는다.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

let print: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  resetStores();
  print = vi.fn();
  vi.stubGlobal("print", print);
  getReportContent.mockReset();
  getIssuance.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetStores();
});

describe("픽스처는 진짜다", () => {
  it.each(ISSUED)("%s — content.json 의 sha256 이 서버가 적은 content_hash 와 같다(바이트 그대로)", (no) => {
    const bytes = readFileSync(resolve(HERE, `${no}.content.json`));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(ISSUED_HASH[no]);
  });

  it.each(ISSUED)("%s — 판 3 이고 발급 전 데이터이며, 발급 기록이 같은 번호다", (no) => {
    const content = readJson(resolve(HERE, `${no}.content.json`));
    expect(content.contentSchema).toBe(3);
    expect(content.meta.reportId).toBe("");
    const issuance = readJson(resolve(HERE, `${no}.issuance.json`));
    expect(issuance.reportNo).toBe(no);
    expect(issuance.history.at(-1).version).toBe(issuance.version);
  });

  it("합성 픽스처가 겨눈 판 3 갈래를 실제로 담고 있다", () => {
    const syn = (name: string) => readJson(resolve(HERE, `${name}.json`));
    for (const [name] of SYNTHETIC) expect(syn(name).contentSchema).toBe(3);
    const mc = syn("syn_multiclass_cm_latency");
    expect(mc.charts.confusionMatrix).not.toBeNull();
    expect(mc.classReport).toBeTruthy();
    expect(mc.latency).toBeTruthy();
    expect(syn("syn_binary_shift_cm").problems.map((p: any) => p.kind)).toContain("distribution_shift");
    expect(syn("syn_binary_shift_cm").charts.confusionMatrix).not.toBeNull();
    expect(syn("syn_binary_inconclusive").conclusion.verdict).toBe("INCONCLUSIVE");
    const ml = syn("syn_multilabel_perlabel").meta.derivedPrediction;
    expect(ml.method).toBe("threshold_per_label");
    expect(typeof ml.threshold).toBe("object");
    expect(readJson(resolve(HERE, "syn_narrative_pending.narrative.json")).status).toBe("pending");
    expect(readJson(resolve(HERE, "syn_narrative_failed.narrative.json")).status).toBe("failed");
    expect(syn("syn_narrative_pending").isEvaluated).toBe(false);
  });

  it("판정 자릿수 픽스처가 judgedNumber 의 세 갈래를 지나는 값을 담고 있다", () => {
    const d = readJson(resolve(HERE, "syn_binary_judged_digits.json"));
    expect(d.judgedValueDigits).toBe(true);
    const kpi = (id: string) => d.kpiResults.find((k: { metricId: string }) => k.metricId === id);
    // (a) 셋째 자리 "0.970" 이 충족으로 읽히는 미달 → 넷째 자리
    expect(kpi("M3")).toMatchObject({ value: 0.9696, threshold: 0.97, status: "fail", isCore: true });
    // (b) "0.950"·"0.9500"·"0.95000" 이 모두 충족으로 읽히는 미달 → 여섯째 자리(MAX_VALUE_DIGITS)
    expect(kpi("M4")).toMatchObject({ value: 0.949999, threshold: 0.95, status: "fail" });
    // (c) 8.1 참조 범위 0.85~0.92 보다 낮은 0.8497 — 셋째 자리 "0.850" 은 범위 안으로 읽힌다
    expect(kpi("M1")).toMatchObject({ value: 0.8497, threshold: 0.95, status: "fail" });
    const acc = d.conclusion.benchmarkRefs.find((r: { metric: string }) => r.metric === "Accuracy");
    expect(acc).toMatchObject({ refLow: 0.85, refHigh: 0.92, quality: "worse" });
    // 그 결과가 정답 글에 실제로 찍혀 있다(6.1 표·8.1 표).
    const text = golden("syn_binary_judged_digits", "sections");
    for (const printed of ["| 0.9696", "| 0.949999", "| 0.8497"]) expect(text).toContain(printed);
  });
});

describe("판 2·3 보관본은 운영 main 이 그리던 글과 한 글자도 다르지 않다", () => {
  it.each(TARGETS.map((t) => [t.name, t] as const))("%s — 화면 본문(ReportSections)", (name, t) => {
    expect(drawSections(t)).toBe(golden(name, "sections"));
  });

  it.each(TARGETS.map((t) => [t.name, t] as const))("%s — 인쇄(ReportPrint)", async (name, t) => {
    expect(await drawPrint(t)).toBe(golden(name, "print"));
  });

  it.each(TARGETS.map((t) => [t.name, t] as const))("%s — 번호로 연 페이지 전체(ReportByNumber)", async (name, t) => {
    expect(await drawByNumber(t)).toBe(golden(name, "byNumber"));
  });

  const PAGES = TARGETS.filter((t) => t.page).map((t) => [t.name, t] as const);
  it("페이지 정답은 발급본 6건 + 서술 완료·미발급 3건 + 서술 대기·실패 2건이다", () => {
    expect(PAGES.map(([name]) => name)).toEqual([
      ...ISSUED,
      "schema2_binary",
      "syn_binary_shift_cm",
      "syn_narrative_pending",
      "syn_narrative_failed",
      "syn_binary_judged_digits",
    ]);
    // 서술 완료·미발급 페이지는 머리 줄에 발급 버튼과 PDF 다운로드가 있다(잠금 문구 없이).
    for (const name of DRAFT_DONE_PAGES) {
      const head = golden(name, "page").split("\n").slice(0, 4).join("\n");
      expect(head).toContain("초안 · 미발급발급PDF 다운로드\n");
    }
  });

  it.each(PAGES)("%s — /report/:id 페이지(Report)", async (name, t) => {
    expect(await drawPage(t)).toBe(golden(name, "page"));
  });
});

describe("판 3 글에는 판 4 표지가 없다", () => {
  const EDITION3 = TARGETS.filter((t) => (t.content as { contentSchema?: number }).contentSchema === 3);
  it.each(EDITION3.map((t) => [t.name] as const))("%s", (name) => {
    for (const kind of ["sections", "print", "byNumber"] as const) {
      const text = golden(name, kind);
      expect(text).not.toContain("양식 판");
      expect(text).not.toContain("판정 여유");
      expect(text).not.toMatch(/^5\. 분석 소견/m);
    }
  });
});
