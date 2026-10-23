/**
 * 옛 보관본 모양 고정(서술 라운드 세션 B·C) — "판 1·2 보관본은 발급 당시 모양 그대로"의 이빨.
 *
 * - 픽스처(`schema*.json`)는 파일로 박았다. 매퍼·조립이 바뀌어도 보관본은 그대로여야 하므로 테스트가 매번 만들지 않는다.
 *   - 판 1(`schema1_*.json`, 이진·이진 서술 실패·다중·멀티 네 개): **운영 main(d38890d) 코드가 실제로 만든 발급 원본**이다.
 *     main 의 `useReportData` 훅에 백엔드 골든 응답(evaluate_*_csv·validate_*·narrative_legacy_main_fallback·
 *     narrative_job_fallback_*)을 fetch 가짜로 넣어 발급 직전 데이터(= `useIssuance` 가 서버에 보내는 content)를 떴다.
 *     그래서 main 매퍼 모양이다 — 영문 `taskTypeLabel`('Binary' …), 영문 지표 설명, `passCriteria` 두 자리, 빈 FAX·홈페이지
 *     "—", 학습 샘플 수 0, 목표값 없음 = `threshold: 0`(MCC 0 도 '목표값 없음'). 판 표시·자릿수 키·문제 목록·칸별 출처·재료 점검 없음.
 *     세션 C 이전의 `schema1_binary.json` 은 판 3 작업 전 dev 코드로 떠서 main 모양이 아니었다('이진 분류' 등) — 그래서
 *     main 과의 차이(8절 '통과율 (참고)'·'판정 규칙은 6.1에 적었고', '외부 제출', 2절 모델 표 …)가 스냅샷 안에 굳어 있었다.
 *   - 판 2(`schema2_*.json`): 판 표시 2, 칸별 출처 전부 규칙 기반(7.3 fixed), 8.1 표(목표값 열), 문제 목록·재료 점검,
 *     파생 예측(7.1 앞 고정 문구 9). 다중은 문제 0개(9절 고정 문구 6)·9칸 fixed.
 * - **판 1 의 정답은 main 이 그린 글이다**(`main_d38890d/`). 같은 생성 테스트가 main 코드의 `ReportSections`·`ReportPrint`·
 *   `ReportByNumber` 로 그린 글을 블록마다 한 줄로 떠 두었다 — `*.draft.txt`(발급 전 데이터, main 은 세 경로 글이 같았다)와
 *   `*.issued.txt`(발급 기록 `schema1_issuance.json` 을 main 의 applyIssuance 로 덧입힌 데이터 — 발급 뒤 화면·인쇄).
 *   새 코드로 그린 글이 이 파일과 **한 글자도 다르지 않아야** 한다. 이 파일은 새 코드로 다시 뜨지 않는다.
 *   만드는 법: `main_d38890d/generate.tsx.txt` 를 운영 main 사본(`git archive d38890d`)의 `src/` 에 `.test.tsx` 로 두고
 *   `ISSUANCE=<이 폴더>/schema1_issuance.json OUT=<출력 폴더> GOLDEN=<Capstone_Back/tests/golden> npx vitest run` .
 *   - 하나만 main 과 다르게 둔다: main 의 번호로 연 화면은 보관본(번호 받기 전 데이터)을 그대로 그려 표지·서명란에
 *     "(미발급)"을 찍었다. 14f4754 에서 고친 오류라 되돌리지 않는다 — 번호로 연 화면은 main 의 발급본 글(`issued`)과 같다.
 * - 세 경로로 그린다 — 화면 본문(`ReportSections`), 인쇄(`ReportPrint`, 저장된 완성본), 번호로 연 보관본
 *   (`ReportByNumber`, issuanceApi 만 가짜). 본문 글을 블록마다 한 줄로 떠 `__snapshots__/` 에도 고정한다
 *   (판 1 스냅샷은 main 글과 같다 — 위 단정이 함께 지킨다).
 * - **판 1·2 스냅샷이 바뀌면 그 판 분기를 고친다** — 스냅샷을 다시 뜨지 않는다(판 3 변경이 옛 판에 샜다는 뜻).
 * - 인쇄 경로는 `print:hidden` 요소를 뺀 글이다(jsdom 은 @media print 를 적용하지 않는다).
 * - 판 3(`schema3_binary.json`, 손으로 만든 픽스처 — 판 2 이진에서 칸 출처를 섞고(7.1 llm·8.1 fallback·9 fallback)
 *   칸별 모델·7.3 글·고정 문구 16·문제 목록(불합격이라 core_fail 포함)을 더함, 합격 변형 `schema3_binary_pass.json`)은 스냅샷을 뜨지 않는다 — 판 3 모양은 다음 갈래들이 채운다.
 *   여기서는 세 경로가 그려지고 소절 번호가 보이는지, 판 1 의 옛 모양(`legacyLayout`)이 새지 않는지만.
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
import { applyIssuance, type IssuanceResult } from "../../lib/report/issuanceApi";
import { ReportByNumber } from "../../pages/report/ReportByNumber";
import type { FinalReportData } from "../../types/finalReport.types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import schema1Binary from "./schema1_binary.json";
import schema1BinaryNoNarrative from "./schema1_binary_nonarrative.json";
import schema1Multiclass from "./schema1_multiclass.json";
import schema1Multilabel from "./schema1_multilabel.json";
import schema1Issuance from "./schema1_issuance.json";
import schema2Binary from "./schema2_binary.json";
import schema2MulticlassNoProblems from "./schema2_multiclass_noproblems.json";
import schema3Binary from "./schema3_binary.json";

const SCHEMA1: Array<[name: string, fixture: unknown]> = [
  ["schema1_binary", schema1Binary],
  ["schema1_binary_nonarrative", schema1BinaryNoNarrative],
  ["schema1_multiclass", schema1Multiclass],
  ["schema1_multilabel", schema1Multilabel],
];

const LEGACY: Array<[name: string, fixture: unknown]> = [
  ...SCHEMA1,
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
async function renderByNumber(fixture: unknown, issuance: unknown = null) {
  getReportContent.mockResolvedValue({
    reportNo: "RPT-2026-0001",
    version: "v1.0",
    issuedAt: "2026-10-01T03:00:00+00:00",
    contentHash: "a".repeat(64),
    content: asReport(fixture),
  });
  getIssuance.mockResolvedValue(issuance);
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
    for (const [, fixture] of SCHEMA1) {
      const one = fixture as Record<string, any>;
      expect("contentSchema" in one).toBe(false);
      // 운영 main 매퍼 모양 — 영문 유형 이름.
      expect(one.meta.taskTypeLabel).toMatch(/^(Binary|Multi-class|Multi-label)$/);
    }
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

/**
 * 운영 main(d38890d) 코드가 같은 픽스처를 그린 글 — 정답(`main_d38890d/`, 맨 위 머리말). 새 코드로 다시 뜨지 않는다.
 * - `draft`: 발급 전 데이터(보관본 원본 그대로) — main 의 화면 본문과 인쇄 본문이 같았다.
 * - `issued`: 발급 기록을 덧입힌 데이터 — main 에서 발급한 뒤 Report 화면·인쇄가 그리던 글.
 */
function mainRender(name: string, kind: "draft" | "issued"): string {
  return readFileSync(resolve(__dirname, `main_d38890d/${name}.${kind}.txt`), "utf8");
}

describe("판 1 보관본은 운영 main 이 그리던 글과 한 글자도 다르지 않다", () => {
  it.each(SCHEMA1)("%s — 화면 본문", (name, fixture) => {
    const { container } = renderSections(fixture);
    expect(blockText([container])).toBe(mainRender(name, "draft"));
  });

  it.each(SCHEMA1)("%s — 인쇄(발급 전 저장본)", async (name, fixture) => {
    stubFetchForbidden();
    const root = await renderPrint(fixture, print);
    expect(blockText([root], { dropPrintHidden: true })).toBe(mainRender(name, "draft"));
  });

  it.each(SCHEMA1)("%s — 인쇄(발급 뒤 저장본)", async (name, fixture) => {
    stubFetchForbidden();
    const root = await renderPrint(applyIssuance(asReport(fixture), schema1Issuance as IssuanceResult), print);
    expect(blockText([root], { dropPrintHidden: true })).toBe(mainRender(name, "issued"));
  });

  // 번호로 연 보관본은 발급 기록을 덧입혀 main 의 발급본 화면과 같아진다. main 의 번호 화면은 보관본(번호 받기 전
  // 데이터)을 그대로 그려 "(미발급)"을 찍었다 — 14f4754 에서 고친 오류라 되돌리지 않는다.
  it.each(SCHEMA1)("%s — 번호로 연 보관본", async (name, fixture) => {
    expect(blockText(await renderByNumber(fixture, schema1Issuance))).toBe(mainRender(name, "issued"));
  });
});

describe("판 3 보관본 — 세 경로로 그려지고 소절 번호가 보인다(모양 단정은 다음 갈래가 늘린다)", () => {
  it("픽스처는 판 3 모양이다 — 칸 섞임·칸별 모델·7.3·고정 문구 16", () => {
    const s3 = schema3Binary as Record<string, any>;
    expect(s3.contentSchema).toBe(3);
    expect(s3.narrativeSections).toMatchObject({ "7.1": "llm", "8.1": "fallback", "9": "fallback" });
    expect(s3.narrativeModels["7.1"]).toEqual(expect.any(String));
    expect(s3.narrativeModels["8.1"]).toBeNull();
    expect(s3.interpretation.additionalObservations).not.toBe("");
    expect(s3.noBenchmarkSentence).toMatch(/^다음 지표는 내부 참조 기준치가 없어/);
  });

  const has71 = (text: string) => expect(text).toMatch(/^7\.1 혼동 행렬 기반 클래스 간 간섭 분석$/m);

  it("화면 본문", () => {
    const { container } = renderSections(schema3Binary);
    has71(blockText([container]));
  });

  it("인쇄", async () => {
    stubFetchForbidden();
    const root = await renderPrint(schema3Binary, print);
    has71(blockText([root], { dropPrintHidden: true }));
  });

  it("번호로 연 보관본", async () => {
    has71(blockText(await renderByNumber(schema3Binary)));
  });

  it("판 2 보관본에는 소절 번호가 없다(같은 단정의 반대쪽)", () => {
    const { container } = renderSections(schema2Binary);
    expect(blockText([container])).not.toMatch(/^7\.1 /m);
    expect(blockText([container])).toMatch(/^혼동 행렬 기반 클래스 간 간섭 분석$/m);
  });
});

/** 판 1 갈래(`legacyLayout`)의 반대쪽 — 판 3 은 세 경로 모두 새 모양(같은 픽스처 키라도 판 1 모양이 새지 않는다). */
describe("판 3 은 판 1 의 옛 모양을 찍지 않는다 — 세 경로", () => {
  function expectNewShape(text: string) {
    expect(text).toMatch(/^통과율 \(참고\)$/m);
    expect(text).not.toMatch(/^종합 점수$/m);
    expect(text).toMatch(/^\| 외부 제출$/m);
    expect(text).not.toMatch(/외부 제출용/);
    expect(text).toMatch(/^\| 시험 대상 모델$/m);
    // 픽스처의 학습 샘플 수 0·빈 FAX·홈페이지 — 판 3 은 0개로 찍지 않고(재료 표는 '제공되지 않음') 빈 줄은 뺀다.
    expect(text).not.toMatch(/^\| 학습 샘플 수\n\| 0개$/m);
    expect(text).not.toMatch(/FAX번호|홈페이지/);
  }

  it("화면 본문", () => {
    const { container } = renderSections(schema3Binary);
    expectNewShape(blockText([container]));
  });

  it("인쇄", async () => {
    stubFetchForbidden();
    const root = await renderPrint(schema3Binary, print);
    expectNewShape(blockText([root], { dropPrintHidden: true }));
  });

  it("번호로 연 보관본", async () => {
    expectNewShape(blockText(await renderByNumber(schema3Binary, schema1Issuance)));
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
