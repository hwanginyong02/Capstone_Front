/**
 * 판 3 보관본 모양 — 갈래 R2(1~6절·서명·화면 전용 작성 기록 상자, 서술 라운드 세션 B 사용자 결정 2·4).
 *
 * 판 3 픽스처(`schema3_binary.json`)를 세 경로(화면 본문 `ReportSections`, 인쇄 `ReportPrint`, 번호로 연 보관본
 * `ReportByNumber`)로 그려
 * - 1.4 에 "LLM 생성 소견에 대한 면책" 이 없고("자동화 진단 소견에 대한 면책" 은 있다),
 * - 서명란 "자동화 평가 시스템"·표지 "{기관명} 평가 플랫폼"·4절 "분류 성능 평가 시스템" 이며,
 * - "작성 기록" 상자는 화면 두 곳(`/report/:id`·`/report/no/:번호`)에만 있고 본문·인쇄 DOM 에는 없음을 단정한다.
 * 같은 단정의 반대쪽(판 2)도 함께 본다. 판 1·2 의 글 전체는 `archiveLayout.test.tsx` 의 스냅샷이 고정한다.
 *
 * 픽스처의 표지 번호·서명은 비어 있어(발급 전 데이터를 보관한다) 화면 본문·인쇄에서는 서명란이 "초안 — 미발급" 이다.
 * 서명 문구를 세 경로 모두에서 보려고 여기서만 발급 정보를 얹는다(픽스처 파일은 그대로).
 */
import { render, screen, within } from "@testing-library/react";
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
import { NARRATIVE_RECORD_SECTIONS } from "../../components/report/NarrativeRecordPanel";
import { renderPrintPage, renderReportPage, resetAll, seedStores } from "../../hooks/reportJob.harness";
import { normalizeReportContent } from "../../lib/report/normalizeReportContent";
import { ReportByNumber } from "../../pages/report/ReportByNumber";
import type { FinalReportData } from "../../types/finalReport.types";
import schema2Binary from "./schema2_binary.json";
import schema3Binary from "./schema3_binary.json";
import schema3BinaryPass from "./schema3_binary_pass.json";

/** 픽스처에 발급 정보만 얹는다 — 서명란을 그리려고. */
function issued(fixture: unknown): FinalReportData {
  const data = structuredClone(fixture) as FinalReportData;
  return {
    ...data,
    isEvaluated: true,
    meta: { ...data.meta, reportId: "RPT-2026-0001", issuedAt: "2026-10-22 12:00" },
    signature: { issuer: "리트머스 평가부", signedAt: "2026-10-22", history: [] },
  };
}

const LLM_ITEM = "LLM 생성 소견에 대한 면책:";
const KEPT_ITEM = "자동화 진단 소견에 대한 면책:";
const SIGN_NEW = "본 시험결과서는 자동화 평가 시스템에 의해 생성되었으며, 의뢰자의 최종 확인을 거쳐 정식 발급된 문서입니다.";
const SIGN_OLD = "본 시험결과서는 AI 자동화 평가 시스템에 의해 생성되었으며, 의뢰자의 최종 확인을 거쳐 정식 발급된 문서입니다.";
const RECORD = "작성 기록";

/** 글 전체(인쇄는 print:hidden 을 뺀 글 — jsdom 은 @media print 를 적용하지 않는다). */
function textOf(root: Element, dropPrintHidden = false): string {
  const clone = root.cloneNode(true) as Element;
  if (dropPrintHidden) clone.querySelectorAll(".print\\:hidden").forEach((el) => el.remove());
  return clone.textContent ?? "";
}

function expectSchema3Body(text: string, orgName: string) {
  expect(text).toContain(KEPT_ITEM);
  expect(text).not.toContain(LLM_ITEM);
  expect(text).toContain(SIGN_NEW);
  expect(text).not.toContain("AI 자동화 평가 시스템");
  expect(text).toContain(`발급 기관: ${orgName} 평가 플랫폼`);
  expect(text).not.toContain(`${orgName} AI 평가 플랫폼`);
  expect(text).toContain("분류 성능 평가 시스템");
  expect(text).not.toContain("AI 분류 성능 평가 시스템");
}

function expectSchema2Body(text: string, orgName: string) {
  expect(text).toContain(KEPT_ITEM);
  expect(text).toContain(LLM_ITEM);
  expect(text).toContain(SIGN_OLD);
  expect(text).toContain(`발급 기관: ${orgName} AI 평가 플랫폼`);
  expect(text).toContain("AI 분류 성능 평가 시스템");
}

async function renderPrint(data: FinalReportData) {
  seedStores({ rawFile: null, run: { reportData: data, narrative: { status: "done", jobId: "job-1" } } });
  const view = renderPrintPage();
  await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  return view.container.querySelector("[data-pdf-ready]")!;
}

async function renderByNumber(data: FinalReportData) {
  getReportContent.mockResolvedValue({
    reportNo: "RPT-2026-0001",
    version: "v1.0",
    issuedAt: "2026-10-01T03:00:00+00:00",
    contentHash: "a".repeat(64),
    content: data,
  });
  getIssuance.mockResolvedValue(null);
  const view = render(
    <MemoryRouter initialEntries={["/report/no/RPT-2026-0001"]}>
      <Routes>
        <Route path="/report/no/:reportNo" element={<ReportByNumber />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1 });
  return view.container;
}

function stubFetchForbidden() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`보관본 테스트: 요청하면 안 된다 ${String(input)}`);
    }),
  );
}

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

const ORG3 = (schema3Binary as any).performer.orgName as string;
const ORG2 = (schema2Binary as any).performer.orgName as string;

describe("판 3 — 1.4·서명란·표지·4절에 AI/LLM 표현이 없다(세 경로)", () => {
  it("픽스처는 판 3·서술 끝남·칸별 출처 있음", () => {
    const s3 = schema3Binary as Record<string, any>;
    expect(s3.contentSchema).toBe(3);
    expect(Object.keys(s3.narrativeSections).length).toBeGreaterThan(0);
    expect(["pending", "failed"]).not.toContain(s3.narrativeSource);
  });

  it("화면 본문(ReportSections)", () => {
    const { container } = render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(issued(schema3Binary))} />
      </MemoryRouter>,
    );
    expectSchema3Body(textOf(container), ORG3);
  });

  it("인쇄(ReportPrint)", async () => {
    stubFetchForbidden();
    expectSchema3Body(textOf(await renderPrint(issued(schema3Binary)), true), ORG3);
  });

  it("번호로 연 보관본(ReportByNumber)", async () => {
    expectSchema3Body(textOf(await renderByNumber(issued(schema3Binary))), ORG3);
  });

  it("반대쪽 — 판 2 는 세 경로 모두 발급 당시 문구", async () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(issued(schema2Binary))} />
      </MemoryRouter>,
    );
    expectSchema2Body(textOf(container), ORG2);
    unmount();
    stubFetchForbidden();
    expectSchema2Body(textOf(await renderPrint(issued(schema2Binary)), true), ORG2);
    vi.unstubAllGlobals();
    vi.stubGlobal("print", print);
    expectSchema2Body(textOf(await renderByNumber(issued(schema2Binary))), ORG2);
  });
});

describe("작성 기록 상자 — 화면 두 곳에만(판 3)", () => {
  const S3 = schema3Binary as Record<string, any>;

  /** 상자의 줄을 "번호 이름 — 작성 방식" 으로. */
  const rows = (panel: HTMLElement) =>
    [...panel.querySelectorAll("li")].map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim());

  it("/report/no/:번호 — 칸별 출처·모델을 칸 순서대로 보여 준다", async () => {
    await renderByNumber(issued(schema3Binary));
    const panel = screen.getByRole("group", { name: RECORD });
    expect(panel.className).toContain("print:hidden");
    const model = S3.narrativeModels["7.1"];
    expect(rows(panel)).toEqual([
      `7.1 혼동 행렬 기반 클래스 간 간섭 분석 — AI 작성(${model})`,
      `7.2 데이터 분포 유의성 및 클래스 편향성 평가 — AI 작성(${S3.narrativeModels["7.2"]})`,
      `7.3 추가 관찰 — AI 작성(${S3.narrativeModels["7.3"]})`,
      "8.1 도메인 성능 벤치마크 — 규칙 기반 문장",
      `8.2 전반적 성능 및 일반화 능력 총평 — AI 작성(${S3.narrativeModels["8.2"]})`,
      `8.3 기술적 취약점 및 잠재적 리스크 요약 — AI 작성(${S3.narrativeModels["8.3"]})`,
      "9 기술 개선 권고안 — 규칙 기반 문장",
    ]);
  });

  it("/report/no/:번호 — 합격 변형(문제 0개)은 9 칸이 고정 문구", async () => {
    await renderByNumber(issued(schema3BinaryPass));
    const panel = screen.getByRole("group", { name: RECORD });
    expect(rows(panel).at(-1)).toBe("9 기술 개선 권고안 — 고정 문구");
  });

  it("/report/no/:번호 — 상자는 본문(표지가 든 칸부터) 밖, 머리 상자 다음에 있다", async () => {
    const container = await renderByNumber(issued(schema3Binary));
    const panel = screen.getByRole("group", { name: RECORD });
    const cover = screen.getByRole("heading", { level: 1 });
    // 상자는 표지보다 앞에 있다 — 보관본 스냅샷(표지가 든 칸부터 뜬다)에 들어가지 않는다.
    expect(panel.compareDocumentPosition(cover) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain("서버 보관본");
  });

  it("/report/:id — 서술이 끝난 판 3 run 이면 상자가 있다", async () => {
    stubFetchForbidden();
    seedStores({ rawFile: null, run: { reportData: issued(schema3Binary), narrative: { status: "done", jobId: "job-1" } } });
    renderReportPage();
    const panel = await screen.findByRole("group", { name: RECORD });
    expect(within(panel).getByText("8.1 도메인 성능 벤치마크")).toBeInTheDocument();
    expect(panel.className).toContain("print:hidden");
  });

  it("/report/:id — 서술을 기다리는 중이면(화면 출처 pending) 낡은 칸별 출처로 그리지 않는다", async () => {
    stubFetchForbidden();
    seedStores({
      rawFile: null,
      run: {
        reportData: { ...issued(schema3Binary), isEvaluated: false },
        narrative: { status: "pending", jobId: "job-1", input: {} as any, startedAt: new Date().toISOString() },
      },
    });
    renderReportPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("group", { name: RECORD })).not.toBeInTheDocument();
  });

  it("인쇄(ReportPrint) DOM 에는 상자가 없다(print:hidden 이전에 아예 없음)", async () => {
    stubFetchForbidden();
    const root = await renderPrint(issued(schema3Binary));
    expect(root.textContent).not.toContain(RECORD);
    expect(screen.queryByRole("group", { name: RECORD })).not.toBeInTheDocument();
  });

  it("본문(ReportSections)에는 상자가 없다", () => {
    const { container } = render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(issued(schema3Binary))} />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toContain(RECORD);
  });

  it("판 2 보관본(칸별 출처가 있어도)은 /report/no 와 /report/:id 모두 상자가 없다", async () => {
    expect(Object.keys((schema2Binary as any).narrativeSections).length).toBeGreaterThan(0);
    await renderByNumber(issued(schema2Binary));
    expect(screen.queryByRole("group", { name: RECORD })).not.toBeInTheDocument();
    resetAll();
    stubFetchForbidden();
    seedStores({ rawFile: null, run: { reportData: issued(schema2Binary), narrative: { status: "done", jobId: "job-1" } } });
    const view = renderReportPage();
    await vi.waitFor(() => expect(view.container.querySelectorAll("h1").length).toBeGreaterThan(0));
    expect(view.container.querySelector('[aria-label="작성 기록"]')).toBeNull();
  });

  it("상자의 소절 이름은 판 3 본문의 소절 제목과 같다(7.3 은 본문에 있을 때만 대조)", () => {
    render(
      <MemoryRouter>
        <ReportSections data={normalizeReportContent(issued(schema3Binary))} />
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole("heading").map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim());
    expect(NARRATIVE_RECORD_SECTIONS.length).toBe(7);
    for (const [section, title] of NARRATIVE_RECORD_SECTIONS) {
      if (section === "9") {
        expect(headings.some((h) => h.includes(`9. ${title}`))).toBe(true);
        continue;
      }
      if (section === "7.3" && !headings.some((h) => h.startsWith("7.3"))) continue;
      expect(headings).toContain(`${section} ${title}`);
    }
  });
});
