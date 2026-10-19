/**
 * 성적서 화면의 평가 + 서술 작업(job) 흐름(서술 라운드 S3b, 계획 설계 요지 8).
 *
 * 실제 `<Report />` 를 렌더하고 fetch 만 가짜로 둔다(reportJob.harness). 핵심 성질:
 * - 단계가 세 번 바뀌는 동안 `/api/evaluate`·`POST /api/narrative/jobs` 는 각 1회.
 * - 단계는 화면에만, 저장소에는 끝 상태만. 완료일 때만 완성본(isEvaluated).
 * - 실패·유실·시간 초과·닿지 않음 → "서술 다시 만들기". 새로고침하면 작업 번호로 이어 조회.
 * - 없는 id 는 평가하지 않고 "찾을 수 없음", 다른 파일이면 "다시 올려 주세요".
 * - 대기 중에는 PDF·발급이 잠긴다.
 */
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BENCHMARK_REF,
  EVALUATE,
  JOB,
  JOBS,
  RUN_ID,
  createdResponse,
  dataFile,
  deferred,
  doneView,
  failedView,
  fastPolling,
  renderReportPage,
  resetAll,
  runningView,
  seedStores,
  storedRun,
  stubFetch,
} from "./reportJob.harness";
import { narrativePolling } from "./useReportData";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { NARRATIVE_FAILED_TEXT, NARRATIVE_PENDING_TEXT } from "../components/report/shared/narrativePlaceholder";

let restorePolling: () => void;

beforeEach(() => {
  resetAll();
  restorePolling = fastPolling();
});

afterEach(() => {
  restorePolling();
  vi.unstubAllGlobals();
  resetAll();
});

const pdfButton = () => screen.getByRole("button", { name: /PDF 다운로드/ });
const issueButton = () => screen.getByRole("button", { name: /^발급$/ });

describe("성공 — 평가 1회·작업 1회, 단계는 화면에만", () => {
  it("단계가 대기 → 생성 중 → 검사 중으로 세 번 바뀌는 동안 평가·작업 생성은 각 1회, 끝나면 완성본", async () => {
    const gates = [deferred<any>(), deferred<any>(), deferred<any>(), deferred<any>()];
    const fetchStub = stubFetch({
      views: [
        gates[0].promise.then(() => ({ body: runningView("queued") })),
        gates[1].promise.then(() => ({ body: runningView("generating") })),
        gates[2].promise.then(() => ({ body: runningView("checking") })),
        gates[3].promise.then(() => ({ body: doneView() })),
      ],
    });
    seedStores();
    renderReportPage();

    // 작업이 생기면 8.1 표가 서술보다 먼저 보인다(작업 생성 응답의 benchmark_refs).
    await screen.findByText(/AI 정성 서술\(7·8·9절\)을 만드는 중입니다/);
    expect(screen.getAllByText(NARRATIVE_PENDING_TEXT).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /도메인 성능 벤치마크/ }).parentElement!.parentElement).toHaveTextContent(
      `${BENCHMARK_REF.ref_low.toFixed(2)}`,
    );

    for (const [i, label] of ["대기 중", "생성 중", "검사 중"].entries()) {
      await act(async () => gates[i].resolve(undefined));
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(label));
      // 진행 단계는 저장소에 쓰지 않는다 — 끝 상태(pending)만.
      expect(storedRun()!.narrative).toMatchObject({ status: "pending", jobId: "job-1" });
      expect(JSON.stringify(storedRun())).not.toMatch(/"stage"/);
      expect(storedRun()!.reportData.isEvaluated).toBe(false);
    }

    await act(async () => gates[3].resolve(undefined));
    await screen.findByText("AI 총평", { exact: false });
    expect(storedRun()!.reportData.isEvaluated).toBe(true);
    expect(storedRun()!.narrative).toEqual({ status: "done", jobId: "job-1" });
    expect(storedRun()!.reportData.narrativeSections).toEqual(doneView().result.section_sources);
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
    expect(fetchStub.count("POST", JOBS)).toBe(1);
    expect(fetchStub.count("GET", JOB)).toBe(4);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("작업 생성 본문은 사실 시트·고객 입력을 담은 서술 요청이고, run 에는 다시 만들기용으로 저장된다", async () => {
    const fetchStub = stubFetch({ views: [{ body: runningView("generating") }] });
    seedStores();
    renderReportPage();
    await waitFor(() => expect(fetchStub.count("POST", JOBS)).toBe(1));
    const sent = fetchStub.calls.find((c) => c.method === "POST" && JOBS.test(c.url))!.body as any;
    expect(sent.task_type).toBe("binary");
    expect(sent.fact_sheet.metrics.length).toBeGreaterThan(0);
    await waitFor(() => expect(storedRun()!.narrative?.input).toEqual(sent));
  });

  it("평가 요청은 run 스냅샷으로 만든다 — 지금 워크플로우 입력이 바뀌어도 이 평가의 입력을 보낸다", async () => {
    const fetchStub = stubFetch({ views: [{ body: runningView("queued") }] });
    seedStores();
    useWorkflowStore.setState({ selectedMetricIds: ["M1"] }); // 다른 평가를 준비하던 중
    renderReportPage();
    await waitFor(() => expect(fetchStub.count("POST", EVALUATE)).toBe(1));
    const form = (vi.mocked(fetch).mock.calls.find(([u]) => EVALUATE.test(String(u)))![1] as RequestInit).body as FormData;
    const payload = JSON.parse(String(form.get("data")));
    expect(payload.selected_metric_ids).toEqual(storedRun()!.evaluationRequest!.payload.selected_metric_ids);
    expect(payload.selected_metric_ids).not.toEqual(["M1"]);
  });

  it("평가가 진행 중일 때 run 의 다른 칸이 바뀌어도 평가를 다시 부르지 않는다(의존성에 run 객체가 없다)", async () => {
    const evaluate = deferred<any>();
    const fetchStub = stubFetch({
      evaluate: [evaluate.promise.then((body) => ({ body }))],
      views: [{ body: runningView("queued") }],
    });
    seedStores();
    renderReportPage();
    await waitFor(() => expect(fetchStub.count("POST", EVALUATE)).toBe(1));
    act(() => {
      useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({ ...r, modelName: "이름을 바꿈" }));
    });
    await act(async () => evaluate.resolve((await import("./reportJob.harness")).evaluateResponse()));
    await waitFor(() => expect(storedRun()!.narrative?.status).toBe("pending"));
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
    expect(fetchStub.count("POST", JOBS)).toBe(1);
  });

  it("서버가 행 없이 결과를 바로 주면(작업 행 상한) 조회 없이 완성본이다", async () => {
    const fetchStub = stubFetch({
      create: [{ body: { job_id: null, status: "done", stage: "done", benchmark_refs: [BENCHMARK_REF], result: doneView("x", "fallback").result } }],
    });
    seedStores();
    renderReportPage();
    await screen.findByText("AI 총평", { exact: false });
    expect(storedRun()!.narrative).toEqual({ status: "done", jobId: null });
    expect(storedRun()!.reportData.isEvaluated).toBe(true);
    expect(fetchStub.count("GET", JOB)).toBe(0);
  });
});

describe("잠금 — 끝나지 않은 서술은 완성본이 아니다", () => {
  it("대기 중에는 PDF·발급이 잠기고, 끝나면 열린다", async () => {
    const gate = deferred<any>();
    const open = vi.fn();
    vi.stubGlobal("open", open);
    stubFetch({ views: [{ body: runningView("generating") }, gate.promise.then(() => ({ body: doneView() }))] });
    seedStores();
    renderReportPage();
    await screen.findByRole("status");
    expect(pdfButton()).toBeDisabled();
    expect(issueButton()).toBeDisabled();
    expect(screen.getByText("서술이 끝나지 않아 인쇄·발급할 수 없습니다.")).toBeInTheDocument();
    fireEvent.click(pdfButton());
    expect(open).not.toHaveBeenCalled();

    await act(async () => gate.resolve(undefined));
    await waitFor(() => expect(pdfButton()).toBeEnabled());
    expect(issueButton()).toBeEnabled();
    fireEvent.click(pdfButton());
    expect(open).toHaveBeenCalledWith(`/report/${RUN_ID}/print`, "_blank", "noopener");
  });
});

describe("실패 → 서술 다시 만들기", () => {
  it.each([
    ["timeout", "제한 시간"],
    ["lost", "멈췄습니다"],
    ["error", "서버에서 오류가 났습니다"],
  ])("서버가 실패(%s)를 알리면 실패 띠와 다시 만들기 — 저장된 요청으로 새 작업을 만든다", async (failure, text) => {
    const fetchStub = stubFetch({
      create: [{ body: createdResponse("job-1") }, { body: createdResponse("job-2") }],
      views: [{ body: failedView(failure, "job-1") }],
    });
    seedStores();
    renderReportPage();
    await screen.findByText(new RegExp(text));
    expect(screen.getAllByText(NARRATIVE_FAILED_TEXT).length).toBeGreaterThan(0);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure });
    expect(storedRun()!.reportData.isEvaluated).toBe(false);
    expect(pdfButton()).toBeDisabled();

    fetchStub.views.splice(0, fetchStub.views.length, { body: doneView("job-2") });
    fireEvent.click(screen.getByRole("button", { name: "서술 다시 만들기" }));
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", EVALUATE)).toBe(1); // 평가는 다시 하지 않는다
    expect(fetchStub.count("POST", JOBS)).toBe(2);
    const bodies = fetchStub.calls.filter((c) => c.method === "POST" && JOBS.test(c.url)).map((c) => c.body);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(storedRun()!.narrative).toEqual({ status: "done", jobId: "job-2" });
  });

  it("없는 작업(404)은 유실로 보고 다시 만들기를 준다", async () => {
    stubFetch({ views: [{ status: 404, body: { detail: "없음" } }] });
    seedStores();
    renderReportPage();
    await screen.findByRole("button", { name: "서술 다시 만들기" });
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "lost" });
  });

  it("서버에 닿지 않는 조회가 이어지면 닿지 않음으로 끝낸다(백엔드를 끊은 경우)", async () => {
    const fetchStub = stubFetch({ views: [new Error("network")] });
    seedStores();
    renderReportPage();
    await screen.findByText(/서버에 연결되지 않아/);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "unreachable" });
    expect(fetchStub.count("GET", JOB)).toBe(narrativePolling.maxConsecutiveUnreachable);
  });

  it("작업을 만들지 못하면(네트워크·422·413) 실패 띠 — 1단계 성적서는 남는다", async () => {
    stubFetch({ create: [{ status: 413, body: {} }] });
    seedStores();
    renderReportPage();
    await screen.findByText(/서술 작업을 시작하지 못했습니다/);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "create_failed", jobId: null });
    expect(storedRun()!.reportData.kpiResults.length).toBeGreaterThan(0);
  });

  it("작업 생성 뒤 시간이 너무 지나면 시간 초과로 끝낸다(서버가 끝을 알리지 않아도)", async () => {
    stubFetch({ views: [{ body: runningView("generating") }] });
    seedStores();
    const original = narrativePolling.giveUpMs;
    narrativePolling.giveUpMs = 30;
    try {
      renderReportPage();
      await screen.findByText(/제한 시간/);
      expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "timeout" });
    } finally {
      narrativePolling.giveUpMs = original;
    }
  });

  it("저장해 둔 요청이 없으면(너무 컸음) 다시 만들기는 평가부터 다시 한다", async () => {
    const fetchStub = stubFetch({ views: [{ body: doneView("job-1") }] });
    seedStores();
    const report = (await import("../lib/report/mapWorkflowToFinalReport")).mapWorkflowToFinalReport(
      (await import("./reportJob.harness")).workflowSnapshot(),
    );
    useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
      ...r,
      reportData: { ...report, isEvaluated: false },
      narrative: { status: "failed", jobId: null, failure: "create_failed", input: null },
    }));
    renderReportPage();
    fireEvent.click(await screen.findByRole("button", { name: "서술 다시 만들기" }));
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
    expect(fetchStub.count("POST", JOBS)).toBe(1);
  });
});

describe("새로고침 — 작업 번호로 이어 조회", () => {
  it("저장된 pending 작업은 평가하지 않고 조회만 해서 끝낸다(파일이 없어도)", async () => {
    const fetchStub = stubFetch({ views: [{ body: runningView("checking", "job-9") }, { body: doneView("job-9") }] });
    seedStores({ rawFile: null });
    const report = (await import("../lib/report/mapWorkflowToFinalReport")).mapWorkflowToFinalReport(
      (await import("./reportJob.harness")).workflowSnapshot(),
    );
    useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
      ...r,
      reportData: { ...report, isEvaluated: false },
      narrative: { status: "pending", jobId: "job-9", input: null, startedAt: new Date().toISOString() },
    }));
    renderReportPage();
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", EVALUATE)).toBe(0);
    expect(fetchStub.count("POST", JOBS)).toBe(0);
    expect(fetchStub.calls.filter((c) => c.method === "GET").every((c) => c.url.endsWith("/job-9"))).toBe(true);
  });

  it("완성본은 아무것도 부르지 않고 그대로 그린다", async () => {
    const fetchStub = stubFetch();
    seedStores({ rawFile: null });
    const report = (await import("../lib/report/mapWorkflowToFinalReport")).mapWorkflowToFinalReport(
      (await import("./reportJob.harness")).workflowSnapshot(),
    );
    useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
      ...r,
      reportData: { ...report, isEvaluated: true, conclusion: { ...report.conclusion, narrative: "저장된 총평" } },
      narrative: { status: "done", jobId: "job-1" },
    }));
    renderReportPage();
    await screen.findByText("저장된 총평", { exact: false });
    expect(fetchStub.calls).toEqual([]);
    expect(pdfButton()).toBeEnabled();
  });
});

describe("찾을 수 없음 · 파일 다시 올리기 · 다시 평가", () => {
  it("없는 id 는 평가를 시작하지 않고 찾을 수 없음 — 메모리에 파일이 있어도", async () => {
    const fetchStub = stubFetch();
    seedStores({ withoutRun: true });
    renderReportPage("run-nope");
    expect(await screen.findByText("성적서를 찾을 수 없습니다")).toBeInTheDocument();
    expect(fetchStub.calls).toEqual([]);
  });

  it("파일이 없으면 다시 올려 달라고 하고, 같은 파일을 올리면 그 파일로 평가한다", async () => {
    const fetchStub = stubFetch({ views: [{ body: doneView() }] });
    seedStores({ rawFile: null });
    const { container } = renderReportPage();
    await screen.findByText("이 평가의 파일을 다시 올려 주세요");
    expect(fetchStub.calls).toEqual([]);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [dataFile("other.csv")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("다릅니다");
    expect(fetchStub.calls).toEqual([]);

    fireEvent.change(input, { target: { files: [dataFile()] } });
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
  });

  it("메모리의 파일이 다른 파일(지문 다름)이면 평가하지 않는다", async () => {
    const fetchStub = stubFetch();
    seedStores({ rawFile: dataFile("data.csv", 42) });
    renderReportPage();
    await screen.findByText("이 평가의 파일을 다시 올려 주세요");
    expect(fetchStub.calls).toEqual([]);
  });

  it("평가 요청 스냅샷이 없는 옛 run 은 다시 평가 안내 — 지금 입력으로 평가하지 않는다", async () => {
    const fetchStub = stubFetch();
    seedStores({ run: { evaluationRequest: undefined } });
    renderReportPage();
    await screen.findByText("이 평가는 다시 평가해야 합니다");
    expect(fetchStub.calls).toEqual([]);
  });

  it("저장소 이행이 다시 평가하라고 표시한 run 도 같다", async () => {
    const fetchStub = stubFetch();
    seedStores({ run: { migrationNote: "needs_reevaluation" } });
    renderReportPage();
    await screen.findByText("이 평가는 다시 평가해야 합니다");
    expect(fetchStub.calls).toEqual([]);
  });

  it("평가 요청이 실패하면 오류 화면", async () => {
    stubFetch({ evaluate: [{ status: 500, body: { detail: "평가 서버 오류" } }] });
    seedStores();
    renderReportPage();
    expect(await screen.findByText(/평가 서버 오류/)).toBeInTheDocument();
    expect(storedRun()!.narrative).toBeUndefined();
  });
});

describe("저장 실패", () => {
  it("저장 공간이 차면 안내한다 — 화면에는 보이지만 새로고침하면 사라진다고", async () => {
    stubFetch({ views: [{ body: runningView("queued") }] });
    seedStores();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      renderReportPage();
      expect(await screen.findByText(/저장 공간이 가득 차/)).toBeInTheDocument();
      expect(screen.getByText(/새로고침하거나 인쇄 화면을 열면 사라집니다/)).toBeInTheDocument();
    } finally {
      setItem.mockRestore();
    }
  });
});
