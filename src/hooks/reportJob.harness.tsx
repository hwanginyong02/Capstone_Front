/**
 * 성적서 화면 + 서술 작업(job) 하네스(서술 라운드 S3b). 테스트가 아닌 이름(*.harness.tsx)이라 수집되지 않는다.
 *
 * 옛 H-03 하네스(커밋 54a1d68, 이 브랜치의 조상이 아님)의 원칙을 이어받는다.
 * 1. **fetch 는 실물 배선을 지나가게 둔다.** 작업 API 클라이언트를 모킹하지 않고 주소·메서드로 갈라지는 fetch 가짜를
 *    쓴다 — 응답 매핑과 호출 횟수를 함께 본다.
 * 2. **응답 픽스처는 백엔드 골든에서 옮긴다**(`Capstone_Back/tests/golden/evaluate_binary_csv.json` 의 값).
 * 3. **화면까지 본다.** 실제 `<Report />` 를 `/report/:id` 에 렌더한다.
 * 4. **시간 예산 대신 순서로.** 평가 응답은 `deferred` 로 손으로 풀어 "평가가 아직 진행 중"인 상태를 만든다.
 *    조회 간격은 `narrativePolling` 을 줄여 쓴다(수치를 테스트에 박지 않는다).
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";

import { Report } from "../pages/report/Report";
import { ReportPrint } from "../pages/report/ReportPrint";
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "../lib/report/mapWorkflowToFinalReport";
import { buildEvaluationRequestSnapshot, fingerprintOf } from "../lib/report/evaluationRequest";
import type { MappingRow } from "../types/mapping.types";
import type { WorkspaceEvaluationRun } from "../types/workspace.types";
import { DEFAULT_BASIC_INFO } from "../types/workflow.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { narrativePolling, resetReportDataForTests } from "./useReportData";

export const RUN_ID = "run-s3b";

/* ------------------------------------------------------------------ *
 * deferred — 손으로 푸는 promise
 * ------------------------------------------------------------------ */

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const pending: Array<() => void> = [];

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  let settled = false;
  // 단정이 먼저 실패해 풀지 못한 deferred 는 정리 때 푼다 — 거절하면 아무도 받지 않은 거절이 다음 테스트로 샌다.
  pending.push(() => {
    if (!settled) resolve(undefined as T);
  });
  return {
    promise,
    resolve: (value: T) => {
      settled = true;
      resolve(value);
    },
  };
}

/* ------------------------------------------------------------------ *
 * 응답 픽스처
 * ------------------------------------------------------------------ */

/** `POST /api/evaluate` 응답(binary) — 백엔드 골든 evaluate_binary_csv 의 값(곡선 좌표만 줄임). */
export function evaluateResponse() {
  return {
    n_samples: 200,
    dropped_rows: 0,
    class_distribution: { "0": 105, "1": 95 },
    warnings: [] as string[],
    environment: {
      evaluated_at: "2026-10-19T03:00:00+00:00",
      libraries: { "scikit-learn": "1.9.0", pandas: "2.2.3", numpy: "2.5.1" },
    },
    results: {
      failed_metrics: {} as Record<string, string>,
      success_metrics: {
        M1: 0.505,
        M2: 0.48148148148148145,
        M3: 0.5473684210526316,
        M4: 0.5123152709359606,
        M9: 0.5111779448621554,
        M21: { labels: ["0", "1"], matrix: [[49, 56], [43, 52]], type: "multiclass_or_binary" },
        roc_curve: { fpr: [0.0, 0.5, 1.0], tpr: [0.0, 0.6, 1.0] },
        pr_curve: { precision: [1.0, 0.6, 0.475], recall: [0.0, 0.5, 1.0] },
      } as Record<string, unknown>,
    },
  };
}

export const BENCHMARK_REF = {
  metric: "Accuracy",
  model_value: 0.505,
  ref_low: 0.85,
  ref_high: 0.92,
  position: "below",
  direction: "higher",
  quality: "worse",
  target_value: 0.9,
  target_position: "within",
  source_note: "내부 참조 기준치 v1",
};

export function createdResponse(jobId = "job-1") {
  return { job_id: jobId, status: "running", stage: "queued", benchmark_refs: [BENCHMARK_REF], result: null };
}

const SIX = ["7.1", "7.2", "8.1", "8.2", "8.3", "9"];

export function jobResult(source: "llm" | "fallback" = "llm") {
  return {
    interpretation: { confusion_analysis: "AI 가 쓴 혼동행렬 해석", distribution_analysis: "AI 가 쓴 분포 해석" },
    conclusion: { verdict: "FAIL", benchmark: "AI 벤치마크 서술", narrative: "AI 총평", risks: "AI 리스크" },
    recommendation_narrative: { data_quality: "AI 데이터 권고", model_ops: "AI 운영 권고" },
    recommendations: [],
    section_sources: Object.fromEntries(SIX.map((k) => [k, source])),
  };
}

export function runningView(stage: string, jobId = "job-1") {
  return { job_id: jobId, status: "running", stage, failure: null, benchmark_refs: [BENCHMARK_REF], result: null };
}

export function doneView(jobId = "job-1", source: "llm" | "fallback" = "llm") {
  return {
    job_id: jobId, status: "done", stage: "done", failure: null, benchmark_refs: [BENCHMARK_REF], result: jobResult(source),
  };
}

export function failedView(failure: string, jobId = "job-1") {
  return { job_id: jobId, status: "failed", stage: "failed", failure, benchmark_refs: [BENCHMARK_REF], result: null };
}

/* ------------------------------------------------------------------ *
 * fetch 가짜 — 주소·메서드로 가른다
 * ------------------------------------------------------------------ */

type Reply = { status?: number; body: unknown } | Error | Promise<{ status?: number; body: unknown }>;

export interface FetchStub {
  calls: Array<{ method: string; url: string; body?: unknown }>;
  /** 평가 응답(차례로). 하나 남으면 그것을 되풀이한다. */
  evaluate: Reply[];
  /** 작업 생성 응답(차례로). */
  create: Reply[];
  /** 작업 조회 응답(차례로, 마지막 것을 되풀이). */
  views: Reply[];
  count: (method: string, pattern: RegExp) => number;
}

function asResponse(reply: { status?: number; body: unknown }) {
  const status = reply.status ?? 200;
  return { ok: status >= 200 && status < 300, status, json: async () => reply.body } as unknown as Response;
}

async function take(queue: Reply[]): Promise<Response> {
  const next = queue.length > 1 ? queue.shift()! : queue[0];
  if (next === undefined) throw new Error("하네스: 준비되지 않은 응답");
  if (next instanceof Error) throw next;
  return asResponse(await next);
}

export function stubFetch(init: Partial<Pick<FetchStub, "evaluate" | "create" | "views">> = {}): FetchStub {
  const stub: FetchStub = {
    calls: [],
    evaluate: init.evaluate ?? [{ body: evaluateResponse() }],
    create: init.create ?? [{ body: createdResponse() }],
    views: init.views ?? [{ body: doneView() }],
    count: (method, pattern) => stub.calls.filter((c) => c.method === method && pattern.test(c.url)).length,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      const method = (options?.method ?? "GET").toUpperCase();
      const body = typeof options?.body === "string" ? JSON.parse(options.body) : undefined;
      stub.calls.push({ method, url, body });
      if (method === "POST" && /\/api\/evaluate$/.test(url)) return take(stub.evaluate);
      if (method === "POST" && /\/api\/narrative\/jobs$/.test(url)) return take(stub.create);
      if (method === "GET" && /\/api\/narrative\/jobs\/[^/]+$/.test(url)) return take(stub.views);
      throw new Error(`하네스: 모르는 요청 ${method} ${url}`);
    }),
  );
  return stub;
}

export const EVALUATE = /\/api\/evaluate$/;
export const JOBS = /\/api\/narrative\/jobs$/;
export const JOB = /\/api\/narrative\/jobs\/[^/]+$/;

/* ------------------------------------------------------------------ *
 * store 채우기
 * ------------------------------------------------------------------ */

export function binaryMapping(): MappingRow[] {
  return [
    { originalName: "row_id", sampleValues: ["1", "2", "3"], inferredRole: "id", confirmedRole: "id", modified: false, warnings: [] },
    { originalName: "label", sampleValues: ["0", "1", "0"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
    { originalName: "pred", sampleValues: ["0", "1", "1"], inferredRole: "y_pred", confirmedRole: "y_pred", modified: false, warnings: [] },
    { originalName: "prob", sampleValues: ["0.1", "0.9", "0.6"], inferredRole: "score", confirmedRole: "score", modified: false, warnings: [] },
  ] as MappingRow[];
}

export function workflowSnapshot(): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel", versionName: "v1.0.0" },
    taskType: "binary",
    uploadedFile: { name: "data.csv", size: "1 KB", type: "text/csv" },
    selectedMetricIds: ["M1", "M2", "M3", "M4", "M9", "M21"],
    metricDetails: {
      M1: { targetValue: "0.9" },
      M2: { targetValue: "0.4" },
      M3: { targetValue: "0.4" },
      M4: { targetValue: "0.4" },
      M9: { targetValue: "0.5" },
    } as any,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: binaryMapping(),
    classLabelDescriptions: {},
    metadata: {
      positive_class: "1",
      detected_classes: ["0", "1"],
      detected_labels: [],
      class_distribution: { "0": 1, "1": 1 },
    },
  };
}

/** 평가할 파일 — 지문(이름·바이트·수정 시각)이 같으면 같은 파일이다. */
export function dataFile(name = "data.csv", lastModified = 1_760_000_000_000) {
  return new File(["row_id,label,pred,prob\n1,0,0,0.1\n"], name, { type: "text/csv", lastModified });
}

export interface SeedOptions {
  /** run 에 덮어쓸 값. */
  run?: Partial<WorkspaceEvaluationRun>;
  /** run 을 만들지 않는다(없는 id). */
  withoutRun?: boolean;
  /** 워크플로우 메모리의 파일(새로고침 뒤에는 null). */
  rawFile?: File | null;
}

/** "검증 화면 '다음'으로 run 을 막 만들고 성적서로 넘어온" 상태. */
export function seedStores(options: SeedOptions = {}) {
  const snapshot = workflowSnapshot();
  const file = dataFile();
  const rawFile = options.rawFile === undefined ? file : options.rawFile;
  useWorkflowStore.setState({ ...snapshot, rawFile, decisionThreshold: null, validationResult: null, lastRunId: RUN_ID });
  if (options.withoutRun) {
    useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
    return;
  }
  const evaluationRequest = buildEvaluationRequestSnapshot({ ...useWorkflowStore.getState(), rawFile: file });
  const draft = mapWorkflowToFinalReport(snapshot);
  const run: WorkspaceEvaluationRun = {
    id: RUN_ID,
    workspaceId: "ws-1",
    modelName: "MyModel",
    versionName: "v1.0.0",
    reportId: draft.meta.reportId,
    workflowSnapshot: snapshot,
    reportData: draft,
    createdAt: "2026-10-19T00:00:00.000Z",
    evaluationRequest: { ...evaluationRequest, file: fingerprintOf(file) },
    ...options.run,
  };
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [run], activeWorkspaceId: "ws-1" });
}

export function storedRun(id = RUN_ID): WorkspaceEvaluationRun | undefined {
  return useWorkspaceStore.getState().evaluationRuns.find((r) => r.id === id);
}

export function resetAll() {
  for (const settle of pending.splice(0)) settle();
  resetReportDataForTests();
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
}

/** 조회 간격을 줄인다(되돌릴 원래 값을 돌려준다). */
export function fastPolling(): () => void {
  const original = { ...narrativePolling };
  narrativePolling.intervalMs = 5;
  return () => Object.assign(narrativePolling, original);
}

/* ------------------------------------------------------------------ *
 * 화면
 * ------------------------------------------------------------------ */

function installResizeObserver() {
  if ("ResizeObserver" in globalThis) return;
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

export function renderReportPage(id: string = RUN_ID) {
  installResizeObserver();
  return render(
    <MemoryRouter initialEntries={[`/report/${id}`]}>
      <Routes>
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </MemoryRouter>,
  );
}

export function renderPrintPage(id: string = RUN_ID) {
  installResizeObserver();
  return render(
    <MemoryRouter initialEntries={[`/report/${id}/print`]}>
      <Routes>
        <Route path="/report/:id/print" element={<ReportPrint />} />
      </Routes>
    </MemoryRouter>,
  );
}
