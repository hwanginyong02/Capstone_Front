/**
 * 판 3 보관본의 7·8·9절 모양(서술 라운드 세션 B 갈래 R1) — 세 경로(화면 본문 `ReportSections`, 인쇄 `ReportPrint`,
 * 번호로 연 보관본 `ReportByNumber`)에서 같은 단정을 한다. 판 1·2 는 `archiveLayout.test.tsx` 의 스냅샷이 지킨다.
 *
 * 픽스처 `schema3_binary.json`: 불합격(핵심 Accuracy 미달) — 문제 2개(core_fail·core_near_target), 9.1·9.2 글, 고정 문구
 * 6 없음. 서술 전체 출처 fallback(장 배지가 그려질 조건)인데 칸은 섞임(7.1 llm·8.1 fallback·9 fallback), 7.3 글, 고정
 * 문구 16(일부). `schema3_binary_pass.json`: 같은 데이터의 합격 변형(목표값 0.45 — 미달·근소 차이 없음) — 문제 0개,
 * 9 fixed·고정 문구 6. 변형(7.3 빈 글·8.1 자릿수·16 전부)은 테스트 안에서 복사본으로 만든다.
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
import { SECTION_SOURCE_BADGE_TEXT } from "../../components/report/shared/SectionSourceBadge";
import { renderPrintPage, resetAll, seedStores } from "../../hooks/reportJob.harness";
import { NO_PROBLEM_SENTENCE } from "../../lib/report/reportConstants";
import { SECTION7_OPINION_NOTE } from "../../lib/report/narrativeSectionText";
import { normalizeReportContent } from "../../lib/report/normalizeReportContent";
import { ReportByNumber } from "../../pages/report/ReportByNumber";
import type { FinalReportData } from "../../types/finalReport.types";
import schema2Binary from "./schema2_binary.json";
import schema3Binary from "./schema3_binary.json";
import schema3BinaryPass from "./schema3_binary_pass.json";

const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "P", "LI", "TR", "BLOCKQUOTE", "DT", "DD", "SECTION", "DIV", "TH", "TD"]);

/** 블록마다 한 줄(`archiveLayout.test.tsx` 와 같은 규칙). */
function blockText(nodes: Node[], options: { dropPrintHidden?: boolean } = {}): string[] {
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
  return lines;
}

const asReport = (fixture: unknown): FinalReportData => structuredClone(fixture) as FinalReportData;

/** 7절 제목부터 서명란(첫 줄 "[ 초안 — 미발급 ]"·"[ 발급 완료 ]") 앞까지 — 이 갈래가 맡은 절. */
function narrativeChapters(lines: string[]): string[] {
  const start = lines.indexOf("7. 정밀 분석 및 오분류 특성 진단");
  expect(start).toBeGreaterThan(0);
  const end = lines.findIndex((l, i) => i > start && /^\[ .+ \]$/.test(l));
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

/** 8.1 표의 한 줄(칸마다 한 줄로 떠진다) — 지표 이름 칸 다음 칸들. */
function benchmarkRow(lines: string[], metric: string, cells: number): string[] {
  const from = lines.findIndex((l) => /도메인 성능 벤치마크$/.test(l));
  const i = lines.findIndex((l, k) => k > from && l === `| ${metric}`);
  expect(i).toBeGreaterThan(from);
  return lines.slice(i, i + 1 + cells);
}

type Path = "sections" | "print" | "byNumber";
const PATHS: Path[] = ["sections", "print", "byNumber"];

let print: ReturnType<typeof vi.fn>;

async function linesOf(path: Path, report: FinalReportData): Promise<{ lines: string[]; root: Element }> {
  if (path === "sections") {
    const { container } = render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(report)} />
      </MemoryRouter>,
    );
    return { lines: blockText([container]), root: container };
  }
  if (path === "print") {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        throw new Error(`보관본 테스트: 요청하면 안 된다 ${String(input)}`);
      }),
    );
    seedStores({ rawFile: null, run: { reportData: { ...report, isEvaluated: true }, narrative: { status: "done", jobId: "job-1" } } });
    const view = renderPrintPage();
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const root = view.container.querySelector("[data-pdf-ready]")!;
    return { lines: blockText([root], { dropPrintHidden: true }), root };
  }
  getReportContent.mockResolvedValue({
    reportNo: "RPT-2026-0001",
    version: "v1.0",
    issuedAt: "2026-10-01T03:00:00+00:00",
    contentHash: "a".repeat(64),
    content: report,
  });
  getIssuance.mockResolvedValue(null);
  const { container } = render(
    <MemoryRouter initialEntries={["/report/no/RPT-2026-0001"]}>
      <Routes>
        <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1 });
  return { lines: blockText([container]), root: container };
}

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

const after = (lines: string[], line: string) => lines[lines.indexOf(line) + 1];

describe("판 3 보관본 7·8·9절 — 세 경로", () => {
  it("픽스처 전제 — 불합격·문제 있음(core_fail)·9 fallback·고정 문구 6 없음, 칸 섞임·16·7.3 글", () => {
    const s3 = schema3Binary as Record<string, any>;
    expect(s3.conclusion.verdict).toBe("FAIL");
    expect(s3.narrativeFacts.verdict_detail.failed_core.map((m: any) => m.display_name)).toEqual(["Accuracy"]);
    // 핵심 미달이면 조립이 반드시 core_fail 을 넣는다(buildProblemList)
    expect(s3.problems.map((p: any) => p.kind)).toEqual(["core_fail", "core_near_target"]);
    expect(s3.narrativeSource).toBe("fallback");
    expect(s3.narrativeSections).toMatchObject({ "7.1": "llm", "8.1": "fallback", "9": "fallback" });
    expect(Object.entries(s3.narrativeSections).filter(([, v]) => v === "fallback").map(([k]) => k).sort()).toEqual(["8.1", "9"]);
    expect(s3.narrativeFacts.fixed_sentences.map((f: any) => f.id)).not.toContain("6");
    expect(s3.recommendationNarrative.dataQuality).not.toBe("");
    expect(s3.recommendationNarrative.modelOps).not.toBe("");
    expect(s3.interpretation.additionalObservations).not.toBe("");
    expect(s3.conclusion.benchmarkRefs.length).toBeGreaterThan(0);
  });

  it("합격 변형 전제 — 합격·미달 없음·근소 차이 없음·문제 0개·9 fixed·고정 문구 6", () => {
    const p = schema3BinaryPass as Record<string, any>;
    expect(p.contentSchema).toBe(3);
    expect(p.conclusion.verdict).toBe("PASS");
    expect(p.narrativeFacts.verdict_detail).toMatchObject({ verdict: "PASS", failed_core: [], failed_noncore: [] });
    expect(p.kpiResults.filter((k: any) => k.status === "fail")).toEqual([]);
    expect(p.kpiResults.filter((k: any) => k.nearTarget)).toEqual([]);
    expect("nearTargetNote" in p).toBe(false);
    expect(p.problems).toEqual([]);
    expect(p.narrativeSections["9"]).toBe("fixed");
    expect(p.narrativeFacts.fixed_sentences.map((f: any) => f.id)).toContain("6");
  });

  it.each(PATHS)("%s — ※ 줄이 7절 제목 바로 다음, 장 단위 옛 배지 없음, 본문 7~9절에 AI·LLM 없음", async (path) => {
    const { lines } = await linesOf(path, asReport(schema3Binary));
    const chapters = narrativeChapters(lines);
    expect(chapters[1]).toBe(SECTION7_OPINION_NOTE);
    expect(lines.filter((l) => l === SECTION7_OPINION_NOTE)).toHaveLength(1);
    expect(lines.some((l) => l.includes("규칙 기반 자동 생성"))).toBe(false);
    expect(chapters.join("\n")).not.toMatch(/AI|LLM/);
  });

  it.each(["sections", "byNumber"] as const)("%s(화면) — 칸별 배지는 8.1·9(fallback) 옆에 하나씩", async (path) => {
    const { lines } = await linesOf(path, asReport(schema3Binary));
    expect(lines.filter((l) => l === SECTION_SOURCE_BADGE_TEXT)).toHaveLength(2);
    expect(after(lines, "8.1 도메인 성능 벤치마크")).toBe(SECTION_SOURCE_BADGE_TEXT);
    expect(after(lines, "9. 기술 개선 권고안")).toBe(SECTION_SOURCE_BADGE_TEXT);
  });

  it("인쇄 — 배지 요소는 DOM 에 있으나 print:hidden 이라 인쇄 글에는 없다(8.1·9 둘 다)", async () => {
    const { lines, root } = await linesOf("print", asReport(schema3Binary));
    expect(lines).not.toContain(SECTION_SOURCE_BADGE_TEXT);
    expect(after(lines, "9. 기술 개선 권고안")).toBe("9.1 데이터셋 보완 및 품질 개선 전략");
    const badges = [...root.querySelectorAll("span")].filter((el) => el.textContent === SECTION_SOURCE_BADGE_TEXT);
    expect(badges).toHaveLength(2);
    badges.forEach((b) => expect(b).toHaveClass("print:hidden"));
  });

  it.each(["sections", "byNumber"] as const)("%s(화면) — 합격 변형(문제 0개)은 9 배지 없이 8.1 배지 하나", async (path) => {
    const { lines } = await linesOf(path, asReport(schema3BinaryPass));
    expect(lines.filter((l) => l === SECTION_SOURCE_BADGE_TEXT)).toHaveLength(1);
    expect(after(lines, "8.1 도메인 성능 벤치마크")).toBe(SECTION_SOURCE_BADGE_TEXT);
  });

  it.each(PATHS)("%s — 7.3 추가 관찰은 인용 글, 빈 글이면 '해당 없음'", async (path) => {
    const report = asReport(schema3Binary);
    const { lines } = await linesOf(path, report);
    expect(after(lines, "7.3 추가 관찰")).toBe(`"${report.interpretation.additionalObservations}"`);
  });

  it.each(PATHS)("%s — 7.3 빈 글 → 고정 문구 15", async (path) => {
    const report = asReport(schema3Binary);
    report.interpretation.additionalObservations = "";
    const { lines } = await linesOf(path, report);
    expect(after(lines, "7.3 추가 관찰")).toBe("해당 없음");
  });

  it.each(PATHS)("%s — 고정 문구 16 은 8.1 표 바로 아래(서술 인용 앞)", async (path) => {
    const report = asReport(schema3Binary);
    const { lines } = await linesOf(path, report);
    const i = lines.indexOf(report.noBenchmarkSentence!);
    expect(i).toBeGreaterThan(lines.indexOf("8.1 도메인 성능 벤치마크"));
    // 바로 앞 줄은 표의 출처 각주(※ 내부 참조 기준치 …), 바로 다음은 8.1 서술 인용
    expect(lines[i - 1]).toMatch(/^※ 내부 참조 기준치/);
    expect(lines[i + 1]).toBe(`"${report.conclusion.benchmark}"`);
  });

  it.each(PATHS)("%s — 불합격·문제 있음: 9.1·9.2 서술과 권고 표, 고정 문구 6 없음", async (path) => {
    const report = asReport(schema3Binary);
    const { lines } = await linesOf(path, report);
    const chapters = narrativeChapters(lines);
    const nine = chapters.slice(chapters.indexOf("9. 기술 개선 권고안")).filter((l) => l !== SECTION_SOURCE_BADGE_TEXT);
    expect(nine.slice(0, 5)).toEqual([
      "9. 기술 개선 권고안",
      "9.1 데이터셋 보완 및 품질 개선 전략",
      `"${report.recommendationNarrative.dataQuality}"`,
      "9.2 모델 고도화 및 운영 관리 가이드",
      `"${report.recommendationNarrative.modelOps}"`,
    ]);
    expect(nine).toContain("| P1 · 핵심 지표 미달 (Accuracy)");
    expect(lines).not.toContain(NO_PROBLEM_SENTENCE);
  });

  it.each(PATHS)("%s — 16 전부(8.1 fixed·빈 글·표 없음): 8.1 은 16 한 줄, 바로 다음이 8.2 — '연동 예정' 없음", async (path) => {
    const report = asReport(schema3Binary);
    const all = "선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다.";
    report.conclusion.benchmark = "";
    report.conclusion.benchmarkRefs = [];
    report.noBenchmarkSentence = all;
    report.narrativeSections = { ...report.narrativeSections!, "8.1": "fixed" };
    const { lines } = await linesOf(path, report);
    const i = lines.indexOf("8.1 도메인 성능 벤치마크");
    expect(i).toBeGreaterThan(0);
    expect(lines.slice(i + 1, i + 3)).toEqual([all, "8.2 전반적 성능 및 일반화 능력 총평"]);
    expect(lines.join("\n")).not.toMatch(/연동 예정/);
  });

  it.each(PATHS)("%s — 합격 변형·문제 0개: 9절은 고정 문구 6 만(9.1·9.2 없음)", async (path) => {
    const { lines } = await linesOf(path, asReport(schema3BinaryPass));
    const chapters = narrativeChapters(lines);
    const nine = chapters.slice(chapters.indexOf("9. 기술 개선 권고안"));
    expect(nine).toEqual(["9. 기술 개선 권고안", NO_PROBLEM_SENTENCE]);
  });

  it.each(PATHS)("%s — 8.1 모델 값은 6.1 과 같은 판정 자릿수(실제 미달 0.50996 · 목표 0.51)", async (path) => {
    const report = asReport(schema3Binary);
    const accuracy = report.kpiResults.find((k) => k.metricId === "M1")!;
    accuracy.value = 0.50996; // 셋째 자리 0.510 은 목표 0.51 '충족'으로 읽힌다
    expect(accuracy.status).toBe("fail");
    report.conclusion.benchmarkRefs![0].modelValue = 0.51; // 서버는 넷째 자리로 반올림해 보낸다
    const { lines } = await linesOf(path, report);
    expect(benchmarkRow(lines, "Accuracy", 5)).toEqual([
      "| Accuracy",
      "| 0.50996",
      "| 0.85 ~ 0.92",
      "| 미흡",
      "| 0.510",
      "| 범위보다 낮음",
    ]);
    // 6.1 줄도 같은 표기(같은 숫자가 두 곳에서 다르게 보이지 않는다)
    expect(after(lines, "| Accuracy핵심")).toBe("| 0.50996");
  });

  it("판 2 보관본은 같은 변형에서도 8.1 이 종전 셋째 자리(반대쪽)", async () => {
    const report = asReport(schema2Binary);
    report.conclusion.benchmarkRefs![0].modelValue = 0.51;
    const accuracy = report.kpiResults.find((k) => k.metricId === "M1")!;
    accuracy.value = 0.50996;
    const { lines } = await linesOf("sections", report);
    const from = lines.indexOf("Section 08");
    const i = lines.findIndex((l, k) => k > from && l === "| Accuracy");
    expect(i).toBeGreaterThan(from);
    expect(lines[i + 1]).toBe("| 0.510");
    expect(lines).not.toContain(SECTION7_OPINION_NOTE);
  });
});
