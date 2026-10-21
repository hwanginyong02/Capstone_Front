/**
 * 옛 보관본 모양 고정(서술 라운드 세션 B) — "판 1·2 보관본은 발급 당시 모양 그대로"의 이빨.
 *
 * - 픽스처(`schema*.json`)는 판 3 작업 **전** 코드로 한 번 뽑아 파일로 박았다. 매퍼·조립이 바뀌어도 보관본은
 *   그대로여야 하므로 테스트가 매번 만들지 않는다.
 *   - 판 1(`schema1_binary.json`): 운영 main 시절 키 모양 — 판 표시·자릿수 키·문제 목록·칸별 출처·재료 점검 없음,
 *     목표값 없음을 `threshold: 0` 으로 적음(MCC 0 도 '목표값 없음').
 *   - 판 2(`schema2_*.json`): 판 표시 2, 칸별 출처 전부 규칙 기반(7.3 fixed), 8.1 표(목표값 열), 문제 목록·재료 점검,
 *     파생 예측(7.1 앞 고정 문구 9). 다중은 문제 0개(9절 고정 문구 6)·9칸 fixed.
 * - 세 경로로 그린다 — 화면 본문(`ReportSections`), 인쇄(`ReportPrint`, 저장된 완성본), 번호로 연 보관본
 *   (`ReportByNumber`, issuanceApi 만 가짜). 본문 글을 블록마다 한 줄로 떠 `__snapshots__/` 에 고정한다.
 * - **판 1·2 스냅샷이 바뀌면 그 판 분기를 고친다** — 스냅샷을 다시 뜨지 않는다(판 3 변경이 옛 판에 샜다는 뜻).
 * - 인쇄 경로는 `print:hidden` 요소를 뺀 글이다(jsdom 은 @media print 를 적용하지 않는다).
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getReportContent = vi.fn();
const getIssuance = vi.fn();

vi.mock("../../lib/report/issuanceApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/report/issuanceApi")>();
  return {
    ...actual,
    getReportContent: (...args: unknown[]) => getReportContent(...args),
    getIssuance: (...args: unknown[]) => getIssuance(...args),
  };
});

import { ReportSections } from "../../components/report/ReportSections";
import { renderPrintPage, resetAll, seedStores } from "../../hooks/reportJob.harness";
import { normalizeReportContent } from "../../lib/report/normalizeReportContent";
import { ReportByNumber } from "../../pages/report/ReportByNumber";
import type { FinalReportData } from "../../types/finalReport.types";
import schema1Binary from "./schema1_binary.json";
import schema2Binary from "./schema2_binary.json";
import schema2MulticlassNoProblems from "./schema2_multiclass_noproblems.json";

const LEGACY: Array<[name: string, fixture: unknown]> = [
  ["schema1_binary", schema1Binary],
  ["schema2_binary", schema2Binary],
  ["schema2_multiclass_noproblems", schema2MulticlassNoProblems],
];

const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "P", "LI", "TR", "BLOCKQUOTE", "DT", "DD", "SECTION", "DIV", "TH", "TD"]);

/** 블록마다 한 줄 — 칸 안의 공백은 하나로 줄이고 빈 줄은 버린다. */
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
    // 표 칸은 같은 줄에 " | " 로 잇는다.
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

function asReport(fixture: unknown): FinalReportData {
  return structuredClone(fixture) as FinalReportData;
}

/** 화면 본문 — `/report/:id`·`/report/no/:번호` 와 같이 옮겨 읽은 뒤 그린다. */
function renderSections(fixture: unknown) {
  return render(
    <MemoryRouter>
      <ReportSections data={normalizeReportContent(asReport(fixture))} />
    </MemoryRouter>,
  );
}

/** 인쇄 — 저장된 완성본(서술 done)을 run 에 넣고 인쇄 화면을 연다. 판 1 시절 저장본에는 완성본 표시가 없어 얹는다. */
async function renderPrint(fixture: unknown, print: ReturnType<typeof vi.fn>) {
  seedStores({
    rawFile: null,
    run: { reportData: { ...asReport(fixture), isEvaluated: true }, narrative: { status: "done", jobId: "job-1" } },
  });
  const view = renderPrintPage();
  await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  return view.container.querySelector("[data-pdf-ready]")!;
}

/** 번호로 연 보관본 — 서버 응답(issuanceApi)만 가짜로 두고 실제 `ReportSections` 를 그린다. */
async function renderByNumber(fixture: unknown) {
  getReportContent.mockResolvedValue({
    reportNo: "RPT-2026-0001",
    version: "v1.0",
    issuedAt: "2026-10-01T03:00:00+00:00",
    contentHash: "a".repeat(64),
    content: asReport(fixture),
  });
  getIssuance.mockResolvedValue(null);
  render(
    <MemoryRouter initialEntries={["/report/no/RPT-2026-0001"]}>
      <Routes>
        <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
      </Routes>
    </MemoryRouter>,
  );
  const cover = await screen.findByRole("heading", { level: 1 });
  // 화면 전용 머리 상자(발급 차수·검증 코드·작성 기록)는 본문이 아니다 — 표지가 든 칸부터 끝까지가 본문이다.
  let start: Element = cover;
  const root = cover.closest(".max-w-\\[900px\\]")!;
  while (start.parentElement && start.parentElement !== root) start = start.parentElement;
  const nodes: Node[] = [];
  for (let el: Element | null = start; el; el = el.nextElementSibling) nodes.push(el);
  return nodes;
}

// 차트(recharts)가 읽는다 — 하네스는 페이지를 그릴 때만 깐다. 경로마다 같은 조건으로 그리게 먼저 깐다.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

let print: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetAll();
  print = vi.fn();
  vi.stubGlobal("print", print);
  getReportContent.mockReset();
  getIssuance.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAll();
});

describe("옛 보관본(판 1·2)은 발급 당시 모양 그대로 — 세 경로", () => {
  it("픽스처는 그 판의 키 모양이다", () => {
    const s1 = schema1Binary as Record<string, any>;
    expect("contentSchema" in s1).toBe(false);
    expect("narrativeSections" in s1).toBe(false);
    expect("judgedValueDigits" in s1).toBe(false);
    expect(s1.kpiResults.find((k: any) => k.metricId === "M20").threshold).toBe(0);
    for (const s2 of [schema2Binary, schema2MulticlassNoProblems] as Array<Record<string, any>>) {
      expect(s2.contentSchema).toBe(2);
      expect(s2.narrativeSource).toBe("fallback");
      expect(Object.values(s2.narrativeSections).every((v) => v === "fallback" || v === "fixed")).toBe(true);
      expect(s2.materialCheck).toBeDefined();
    }
    expect((schema2Binary as any).conclusion.benchmarkRefs[0]).toHaveProperty("targetValue");
    expect((schema2Binary as any).problems.length).toBeGreaterThan(0);
    expect((schema2MulticlassNoProblems as any).problems).toEqual([]);
  });

  it.each(LEGACY)("%s — 화면 본문(ReportSections)", async (name, fixture) => {
    const { container } = renderSections(fixture);
    await expect(blockText([container])).toMatchFileSnapshot(`__snapshots__/${name}.sections.txt`);
  });

  it.each(LEGACY)("%s — 인쇄(ReportPrint, print:hidden 뺌)", async (name, fixture) => {
    stubFetchForbidden();
    const root = await renderPrint(fixture, print);
    await expect(blockText([root], { dropPrintHidden: true })).toMatchFileSnapshot(`__snapshots__/${name}.print.txt`);
  });

  it.each(LEGACY)("%s — 번호로 연 보관본(ReportByNumber)", async (name, fixture) => {
    const nodes = await renderByNumber(fixture);
    await expect(blockText(nodes)).toMatchFileSnapshot(`__snapshots__/${name}.byNumber.txt`);
  });
});

/** 인쇄 화면은 평가·서술 작업을 부르지 않는다 — 부르면 실패하게. */
function stubFetchForbidden() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`보관본 테스트: 요청하면 안 된다 ${String(input)}`);
    }),
  );
}
