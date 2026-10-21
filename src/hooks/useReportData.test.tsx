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
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
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
  evaluateResponse,
  stubFetch,
  workflowSnapshot,
} from "./reportJob.harness";
import { mapWorkflowToFinalReport } from "../lib/report/mapWorkflowToFinalReport";
import { NARRATIVE_INPUT_MAX_CHARS, narrativePolling, storableInput, useReportData } from "./useReportData";
import { renderHook } from "@testing-library/react";
import { Report } from "../pages/report/Report";
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
    // 빈 서술 칸 여덟(7.1·7.2·7.3·8.1·8.2·8.3·9.1·9.2 — 판 3 run 이라 7.3 칸이 있다) 모두가 '만드는 중'이다 — 한 칸이라도
    // 옛 '연동 예정'이나 7.3 의 '해당 없음'이면 개수가 준다.
    expect(screen.getAllByText(NARRATIVE_PENDING_TEXT)).toHaveLength(8);
    expect(screen.queryByText(/연동 예정|생성 예정/)).toBeNull();
    expect(screen.getAllByText("권고를 만드는 중").length).toBeGreaterThan(0);
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

  describe("서술 요청의 사실 시트(S4a) — facts·핵심 지표 출처·본문 예산", () => {
    /** 의뢰자 입력이 있는 run — 선언(FN 위험·실시간)과 출처 관계. */
    function seedWithComposer(coreChoices?: string[]) {
      seedStores();
      const snapshot = {
        ...workflowSnapshot(),
        composer: {
          cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
          metrics: {},
          perspective: { criticalErrorType: { text: "Missed (FN)" }, usageMode: { text: "Real-time" } },
          trainingData: {},
          testData: { testSourceRelation: { text: "Same source" } },
          groundTruth: {},
          modelEnv: {},
        },
      } as any;
      const run = storedRun()!;
      const assemble = {
        ...run.evaluationRequest!.assemble,
        ...(coreChoices ? { composerMetrics: { coreMetrics: { choices: coreChoices } } } : {}),
      };
      useWorkspaceStore.setState({
        evaluationRuns: [
          {
            ...run,
            workflowSnapshot: snapshot,
            reportData: mapWorkflowToFinalReport(snapshot),
            evaluationRequest: { ...run.evaluationRequest!, assemble },
          },
        ],
      });
    }

    async function sentPayload() {
      // 엔진이 늘 내리는 건수(confusion_counts)까지 든 응답 — 백엔드 골든 이진과 같은 값.
      const response = evaluateResponse();
      response.results.success_metrics.confusion_counts = { type: "binary", positive_class: "1", tp: 52, tn: 49, fp: 56, fn: 43 };
      const fetchStub = stubFetch({ evaluate: [{ body: response }], views: [{ body: runningView("generating") }] });
      renderReportPage();
      await waitFor(() => expect(fetchStub.count("POST", JOBS)).toBe(1));
      return fetchStub.calls.find((c) => c.method === "POST" && JOBS.test(c.url))!.body as any;
    }

    it("facts(계약 facts-1)를 싣고, 성적서 데이터에 같은 값을 저장한다", async () => {
      seedWithComposer();
      const sent = await sentPayload();
      expect(sent.fact_sheet.facts).toMatchObject({
        contract: "facts-1",
        positive_class: "1",
        declarations: { risk_direction: "fn", usage_mode: "realtime" },
        declared_risk_errors: { side: "fn", count: 43, total_errors: 99 },
      });
      expect(sent.fact_sheet.metrics.map((m: any) => m.metric_id)).not.toContain("M21");
      await waitFor(() => expect(storedRun()!.reportData.narrativeFacts).toEqual(sent.fact_sheet.facts));
    });

    it("핵심 지표가 기본값이면 client_inputs.core_metrics 를 보내지 않는다(재-7)", async () => {
      seedWithComposer();
      const sent = await sentPayload();
      expect(sent.client_inputs).toBeDefined();
      expect(sent.client_inputs).not.toHaveProperty("core_metrics");
      expect(sent.fact_sheet.facts.core_metrics_source).toBe("default");
    });

    it("본문이 2MB 상한에 가까우면 클래스 단위 칸을 비워 보낸다(413 대신 서술 — 유-11)", async () => {
      seedWithComposer();
      // 클래스 400개 × 이름 1000자(한글 3바이트) — 칸별 상한(256)으로 잘라도 본문이 1.8MB 를 넘는다.
      const labels = Array.from({ length: 400 }, (_, i) => `${"클".repeat(1000)}${i}`);
      const response = evaluateResponse();
      const sm = response.results.success_metrics;
      sm.class_report = Object.fromEntries(
        labels.map((l) => [l, { precision: 0.5, recall: 0.5, "f1-score": 0.5, support: 5 }]),
      );
      sm.confusion_counts = { type: "per_class", rows: labels.map((label) => ({ label, tp: 1, fp: 1, fn: 1, tn: 1 })) };
      (response as { class_distribution: Record<string, number> }).class_distribution = Object.fromEntries(
        labels.map((l) => [l, 5]),
      );
      const fetchStub = stubFetch({ evaluate: [{ body: response }], views: [{ body: runningView("generating") }] });
      renderReportPage();
      await waitFor(() => expect(fetchStub.count("POST", JOBS)).toBe(1));
      const call = vi.mocked(fetch).mock.calls.find(([u, o]) => JOBS.test(String(u)) && (o as RequestInit)?.method === "POST")!;
      const raw = String((call[1] as RequestInit).body);
      expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(1_800_000);
      const sent = JSON.parse(raw);
      expect([sent.fact_sheet.per_class, sent.fact_sheet.confusion_counts, sent.fact_sheet.distribution]).toEqual([[], [], null]);
      // 칸별 상한으로 먼저 뺀 144 + 예산으로 비운 256 = 400 — omitted 는 언제나 "뺀 수"의 합이다.
      expect(sent.fact_sheet.facts.omitted).toMatchObject({ per_class: 400, confusion_counts: 400, class_distribution: 400 });
      // 저장한 facts 도 보낸 것과 같다(비운 목록·늘어난 omitted 까지).
      await waitFor(() => expect(storedRun()!.reportData.narrativeFacts).toEqual(sent.fact_sheet.facts));
    });

    it("의뢰자가 고른 핵심 지표는 지표 번호 없이 이름만 보낸다(재-4)", async () => {
      seedWithComposer(["M4"]);
      const sent = await sentPayload();
      expect(sent.client_inputs.core_metrics).toEqual(["F1 Score"]);
      expect(sent.fact_sheet.facts.core_metrics_source).toBe("client");
    });
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

  it("React StrictMode(개발)에서 효과가 두 번 돌아도 평가·작업 생성은 각 1회", async () => {
    const fetchStub = stubFetch({ views: [{ body: runningView("queued") }] });
    seedStores();
    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/report/${RUN_ID}`]}>
          <Routes>
            <Route path="/report/:id" element={<Report />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    await screen.findByRole("status");
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
    expect(fetchStub.count("POST", JOBS)).toBe(1);
  });

  it("평가가 실패한 뒤 run 의 다른 칸이 바뀌어도 평가를 다시 부르지 않는다(의존성에 run 객체가 없다)", async () => {
    const fetchStub = stubFetch({ evaluate: [{ status: 500, body: { detail: "평가 서버 오류" } }] });
    seedStores();
    renderReportPage();
    await screen.findByText(/평가 서버 오류/);
    act(() => {
      useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({ ...r, modelName: "이름을 바꿈" }));
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchStub.count("POST", EVALUATE)).toBe(1);
  });

  it("다시 만들기용 요청은 상한 안일 때만 저장한다", () => {
    const small = { task_type: "binary", report_purpose: "internal", fact_sheet: {} } as any;
    expect(storableInput(small)).toBe(small);
    const big = { ...small, client_inputs: { memo: "가".repeat(NARRATIVE_INPUT_MAX_CHARS) } };
    expect(storableInput(big)).toBeNull();
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
    // 판 3 run — 7.3 칸까지 여덟 칸.
    expect(screen.getAllByText(NARRATIVE_FAILED_TEXT)).toHaveLength(8);
    expect(screen.getAllByText("권고를 만들지 못함").length).toBeGreaterThan(0);
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
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "unreachable", jobId: "job-1" });
    expect(fetchStub.count("GET", JOB)).toBeGreaterThan(1);
  });

  it("닿지 않은 뒤 '서술 진행 다시 확인'은 새 작업을 만들지 않고 원래 작업을 다시 조회한다", async () => {
    const fetchStub = stubFetch({ views: [new Error("network")] });
    seedStores();
    renderReportPage();
    const button = await screen.findByRole("button", { name: "서술 진행 다시 확인" });
    fetchStub.views.splice(0, fetchStub.views.length, { body: doneView("job-1") });
    fireEvent.click(button);
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", JOBS)).toBe(1); // 원래 작업이 끝나 있었다 — 유료 작업을 하나 더 만들지 않는다
    expect(storedRun()!.narrative).toEqual({ status: "done", jobId: "job-1" });
  });

  it("한 번이라도 닿으면 끊김 시간을 다시 센다(잠깐씩 끊기는 연결로 실패하지 않는다)", async () => {
    const gate = deferred<void>();
    setTimeout(() => gate.resolve(), 120);
    const fetchStub = stubFetch({
      views: [new Error("network"), gate.promise.then(() => ({ body: runningView("generating") })), new Error("network"), { body: doneView() }],
    });
    seedStores();
    narrativePolling.unreachableGiveUpMs = 60;
    renderReportPage();
    await screen.findByText("AI 총평", { exact: false });
    expect(storedRun()!.narrative).toEqual({ status: "done", jobId: "job-1" });
    expect(fetchStub.count("GET", JOB)).toBe(4);
  });

  it("다시 만들기를 연달아 눌러도 작업은 하나만 만든다", async () => {
    const created = deferred<void>();
    const fetchStub = stubFetch({
      create: [{ body: createdResponse("job-1") }, created.promise.then(() => ({ body: createdResponse("job-2") }))],
      views: [{ body: failedView("error", "job-1") }],
    });
    seedStores();
    renderReportPage();
    const button = await screen.findByRole("button", { name: "서술 다시 만들기" });
    fireEvent.click(button);
    fireEvent.click(button);
    fetchStub.views.splice(0, fetchStub.views.length, { body: doneView("job-2") });
    await act(async () => created.resolve());
    await screen.findByText("AI 총평", { exact: false });
    expect(fetchStub.count("POST", JOBS)).toBe(2);
  });

  it("늦게 온 옛 작업의 결과가 새 작업 상태를 덮지 않는다", async () => {
    const late = deferred<void>();
    // 첫 조회(job-1)는 붙잡아 두고, 그 뒤 조회(job-2)는 진행 중을 받는다.
    stubFetch({ views: [late.promise.then(() => ({ body: doneView("job-1") })), { body: runningView("generating", "job-2") }] });
    seedStores();
    renderReportPage();
    await waitFor(() => expect(storedRun()!.narrative?.jobId).toBe("job-1"));
    act(() => {
      useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
        ...r,
        narrative: { status: "pending", jobId: "job-2", input: null, startedAt: new Date().toISOString() },
      }));
    });
    await act(async () => late.resolve());
    await new Promise((r) => setTimeout(r, 30));
    expect(storedRun()!.narrative).toMatchObject({ status: "pending", jobId: "job-2" });
    expect(storedRun()!.reportData.isEvaluated).toBe(false);
  });

  it("서버가 요청을 받지 않으면(413·422) 다시 만들기를 주지 않는다 — 같은 요청은 같은 실패다", async () => {
    stubFetch({ create: [{ status: 413, body: {} }] });
    seedStores();
    renderReportPage();
    await screen.findByText(/서버가 서술 요청을 받지 않았습니다/);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "rejected" });
    expect(screen.queryByRole("button", { name: "서술 다시 만들기" })).toBeNull();
  });

  it("작업을 만들지 못하면(네트워크·5xx) 실패 띠와 다시 만들기 — 1단계 성적서는 남는다", async () => {
    stubFetch({ create: [{ status: 500, body: {} }] });
    seedStores();
    renderReportPage();
    await screen.findByText(/서술 작업을 시작하지 못했습니다/);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "create_failed", jobId: null });
    expect(storedRun()!.reportData.kpiResults.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "서술 다시 만들기" })).toBeInTheDocument();
  });

  it("새로고침 뒤에도 기다린 시간은 작업을 만든 시각부터 센다", async () => {
    stubFetch({ views: [{ body: runningView("generating", "job-9") }] });
    seedStores({ rawFile: null });
    const report = (await import("../lib/report/mapWorkflowToFinalReport")).mapWorkflowToFinalReport(
      (await import("./reportJob.harness")).workflowSnapshot(),
    );
    const longAgo = new Date(Date.now() - narrativePolling.giveUpMs - 60_000).toISOString();
    useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
      ...r,
      reportData: { ...report, isEvaluated: false },
      narrative: { status: "pending", jobId: "job-9", input: null, startedAt: longAgo },
    }));
    renderReportPage();
    await screen.findByText(/너무 오래 끝나지 않아/);
    expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "gave_up" });
    expect(screen.getByRole("button", { name: "서술 진행 다시 확인" })).toBeInTheDocument();
  });

  it("평가 응답 조립에서 예외가 나도 '평가 중'에 멈추지 않고 오류 화면", async () => {
    stubFetch({ evaluate: [{ body: { n_samples: 1 } }] });
    seedStores();
    renderReportPage();
    expect(await screen.findByText(/success_metrics|Cannot read/)).toBeInTheDocument();
    expect(storedRun()!.narrative).toBeUndefined();
  });

  it("작업 생성 뒤 시간이 너무 지나면 시간 초과로 끝낸다(서버가 끝을 알리지 않아도)", async () => {
    stubFetch({ views: [{ body: runningView("generating") }] });
    seedStores();
    const original = narrativePolling.giveUpMs;
    narrativePolling.giveUpMs = 30;
    try {
      renderReportPage();
      await screen.findByText(/너무 오래 끝나지 않아/);
      expect(storedRun()!.narrative).toMatchObject({ status: "failed", failure: "gave_up" });
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
      // 작업 번호를 저장하지 못했으니 새로고침하면 서술을 다시 만든다고 알린다.
      expect(screen.getByText(/새로고침하면 서술을 다시 만들어 비용이 다시 듭니다/)).toBeInTheDocument();
    } finally {
      setItem.mockRestore();
    }
  });
});


describe("잠금 불변식", () => {
  it("완성본 표시가 있어도 서술이 실패 상태면 PDF·발급을 잠근다", async () => {
    stubFetch();
    seedStores({ rawFile: null });
    const report = (await import("../lib/report/mapWorkflowToFinalReport")).mapWorkflowToFinalReport(
      (await import("./reportJob.harness")).workflowSnapshot(),
    );
    useWorkspaceStore.getState().updateRun(RUN_ID, (r) => ({
      ...r,
      reportData: { ...report, isEvaluated: true },
      narrative: { status: "failed", jobId: "job-1", failure: "error", input: null },
    }));
    renderReportPage();
    await screen.findByRole("button", { name: "서술 다시 만들기" });
    expect(pdfButton()).toBeDisabled();
    expect(issueButton()).toBeDisabled();
  });

  it("완성본 저장에 실패하면 PDF 를 잠그고 저장 실패를 이유로 말한다(인쇄 탭은 저장본만 읽는다)", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores();
    const original = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (value.includes('"status":"done"')) throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    });
    try {
      renderReportPage();
      await screen.findByText("AI 총평", { exact: false });
      await waitFor(() => expect(pdfButton()).toBeDisabled());
      expect(screen.getByText(/결과를 저장하지 못해 인쇄 화면이 완성본을 읽을 수 없습니다/)).toBeInTheDocument();
      expect(issueButton()).toBeEnabled(); // 발급은 서버 보관이라 막지 않는다
    } finally {
      setItem.mockRestore();
    }
  });
});


describe("다시 만들기 — 훅을 직접 부를 때", () => {
  it("응답을 기다리는 동안 두 번 불러도 작업은 하나만 만든다(버튼 밖에서 부르는 경로)", async () => {
    const created = deferred<void>();
    const fetchStub = stubFetch({
      create: [{ body: createdResponse("job-1") }, created.promise.then(() => ({ body: createdResponse("job-2") }))],
      views: [{ body: failedView("error", "job-1") }, { body: runningView("queued", "job-2") }],
    });
    seedStores();
    const { result } = renderHook(() => useReportData(RUN_ID));
    await waitFor(() => expect(result.current.narrative.phase).toBe("failed"));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.retryNarrative();
      second = result.current.retryNarrative();
    });
    await act(async () => {
      created.resolve();
      await Promise.all([first, second]);
    });
    expect(fetchStub.count("POST", JOBS)).toBe(2); // 처음 1 + 다시 만들기 1
  });
});

describe("끝난 서술 저장 — 7.3·칸별 출처·칸별 모델(서술 라운드 세션 B)", () => {
  it("칸마다 다른 출처, 7.3 글, 칸별 모델을 성적서 데이터에 저장한다", async () => {
    const sections = { "7.1": "llm", "7.2": "llm", "7.3": "llm", "8.1": "fallback", "8.2": "llm", "8.3": "llm", "9": "fixed" } as const;
    const models = { "7.1": "claude-x", "7.2": "claude-x", "7.3": "claude-y", "8.1": null, "8.2": "claude-x", "8.3": "claude-x", "9": null };
    stubFetch({ views: [{ body: doneView("job-1", { sections, additionalObservations: "AI 가 쓴 추가 관찰", models }) }] });
    seedStores();
    renderReportPage();
    await waitFor(() => expect(storedRun()!.reportData.isEvaluated).toBe(true));
    const saved = storedRun()!.reportData;
    expect(saved.interpretation.additionalObservations).toBe("AI 가 쓴 추가 관찰");
    expect(saved.narrativeSections).toEqual(sections);
    expect(saved.narrativeModels).toEqual(models);
    // 8.1 이 규칙 기반이라 전체(옛 장 배지용) 출처는 fallback.
    expect(saved.narrativeSource).toBe("fallback");
  });

  it("7.3·모델 키가 없는 옛 응답 — 7.3 은 빈 글, 모델 기록은 남기지 않는다", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores();
    renderReportPage();
    await waitFor(() => expect(storedRun()!.reportData.isEvaluated).toBe(true));
    const saved = storedRun()!.reportData;
    expect(doneView().result).not.toHaveProperty("section_models");
    expect(doneView().result.interpretation).not.toHaveProperty("additional_observations");
    expect(saved.interpretation.additionalObservations).toBe("");
    expect(saved).not.toHaveProperty("narrativeModels");
  });

  it("이전 서술의 모델 기록이 남은 run 을 새로 서술할 때 새 응답에 모델이 없으면 옛 기록을 남기지 않는다", async () => {
    stubFetch({ views: [{ body: doneView() }] });
    seedStores();
    const previous = { "7.1": "claude-old", "7.2": "claude-old", "7.3": null, "8.1": null, "8.2": "claude-old", "8.3": "claude-old", "9": null };
    const run = storedRun()!;
    useWorkspaceStore.setState({
      evaluationRuns: [{ ...run, reportData: { ...run.reportData, narrativeModels: previous } }],
    });
    expect(storedRun()!.reportData.narrativeModels).toEqual(previous); // 전제 — 옛 기록이 실제로 있다
    renderReportPage();
    await waitFor(() => expect(storedRun()!.reportData.isEvaluated).toBe(true));
    expect("narrativeModels" in storedRun()!.reportData).toBe(false);
  });
});
