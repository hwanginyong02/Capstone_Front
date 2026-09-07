/**
 * `useReportData` 테스트 하네스 — ISSUES.md H-03.
 *
 * H-03 이 지목한 성적서 변환 계층 중 **마지막 무테스트 지점**이 `useReportData.ts` 다.
 * 이 훅 하나에 (1) 두 개의 fetch, (2) 두 개의 zustand store, (3) 2단계 비동기
 * (stage1 KPI·차트 → stage2 LLM 서술 병합)가 얽혀 있어 **하네스 설계가 본체**다.
 * 그래서 하네스를 테스트 파일에서 분리해 여기 둔다 — 시나리오를 읽는 사람이
 * 배선 코드에 묻히지 않게.
 *
 * ## 설계 원칙
 *
 * 1. **타이밍 예산으로 성질을 검사하지 않는다.** stage1/stage2 경계는 `deferred()` 로
 *    수동 해소한다 — "몇 ms 안에 렌더된다"가 아니라 "evaluate 는 해소됐고
 *    narrative 는 아직 대기 중인 상태에서 KPI 가 보인다"는 **결정론적 성질**로 판정한다.
 * 2. **fetch 는 실물 배선을 지나가게 둔다.** `fetchNarrative` 를 모킹하지 않고 URL 로
 *    분기하는 fetch 스텁을 쓴다. 그래야 snake_case→camelCase 매핑과 verdict 탈락
 *    (LLM 이 보낸 verdict 를 프론트 규칙이 이긴다)까지 함께 검증된다.
 * 3. **응답 픽스처는 백엔드 골든에서 가져온다**(`Capstone_Back/tests/golden/evaluate_*.json`).
 *    손으로 지어낸 모양이 아니라 실제 와이어 포맷이라, 백엔드가 모양을 바꾸면
 *    이 픽스처와 어긋나는 것이 계약 드리프트의 신호가 된다.
 * 4. **화면까지 본다.** 훅 반환값만 보는 테스트는 "순수 함수는 맞지만 화면이 그것을
 *    쓰지 않는" 회귀를 놓친다(5차 라운드에서 살아남은 변이 5건의 공통 형태 ①②).
 *    그래서 `renderReportPage()` 로 실제 `<Report />` 를 렌더하는 경로도 제공한다.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";

import { Report } from "../pages/report/Report";
import { mapWorkflowToFinalReport } from "../lib/report/mapWorkflowToFinalReport";
import type { MapWorkflowToReportInput } from "../lib/report/mapWorkflowToFinalReport";
import type { FinalReportData } from "../types/finalReport.types";
import type { MappingRow } from "../types/mapping.types";
import type { WorkspaceEvaluationRun } from "../types/workspace.types";
import { DEFAULT_BASIC_INFO, DEFAULT_DATASET_INFO } from "../types/workflow.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";

export const RUN_ID = "run-h03";

/* ------------------------------------------------------------------ *
 * 1. 결정론적 비동기 — deferred
 * ------------------------------------------------------------------ */

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

/**
 * 아직 해소되지 않은 `deferred` 목록. `settlePendingDeferreds()` 가 정리한다.
 *
 * **왜 필요한가.** 단정이 먼저 실패해 `narrative.resolve(...)` 줄에 도달하지 못하면
 * 그 promise 는 영원히 대기하고, `fetchNarrative` 는 그것을 await 하며 160초 타이머를
 * 안고 매달린다 — 테스트 파일 전체가 멈춘다. 변이 검사에서 실제로 그 상태를 만났다
 * (한 변이가 러너를 20분 이상 붙잡았다). **하네스는 단정 실패를 hang 으로 바꾸지 않아야 한다.**
 */
const pendingDeferreds: Array<{ settled: boolean; reject: (reason?: unknown) => void }> = [];

/** 수동으로 해소하는 promise. stage1/stage2 경계를 시간 없이 가른다. */
export function deferred<T>(): Deferred<T> {
  let resolveRaw!: (value: T) => void;
  let rejectRaw!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolveRaw = res;
    rejectRaw = rej;
  });

  const entry = { settled: false, reject: rejectRaw };
  pendingDeferreds.push(entry);

  return {
    promise,
    resolve: (value: T) => {
      entry.settled = true;
      resolveRaw(value);
    },
    reject: (reason?: unknown) => {
      entry.settled = true;
      rejectRaw(reason);
    },
  };
}

/**
 * 큐에 쌓인 마이크로태스크를 **전부** 비운다.
 *
 * "부작용이 일어나지 **않는다**"를 검사할 때 `waitFor` 를 쓰면 안 된다 — 첫 시도에서
 * 단정이 통과하면 즉시 끝나므로, 아직 실행되지 않은 async 연속이 나중에 부작용을
 * 일으켜도 못 잡는다. 변이 검사에서 실제로 그 형태의 변이가 살아남았다
 * (언마운트 가드를 제거해도 테스트가 초록이었다).
 *
 * 이 하네스의 fetch 스텁과 `json()` 은 **타이머를 쓰지 않고 마이크로태스크만** 쓰므로,
 * 유한 횟수 드레인은 타이밍 예산이 아니라 **결정론적 성질**이다.
 */
export async function flushMicrotasks(times = 50) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

/**
 * 남아 있는 `deferred` 를 모두 거절해 매달린 async 체인을 끊는다(`afterEach` 에서 호출).
 * `fetchNarrative` 는 모든 예외를 흡수하므로 이 거절은 조용히 EMPTY 서술로 끝난다.
 */
export function settlePendingDeferreds() {
  for (const entry of pendingDeferreds) {
    if (!entry.settled) {
      entry.settled = true;
      entry.reject(new Error("하네스 정리: 해소되지 않은 deferred"));
    }
  }
  pendingDeferreds.length = 0;
}

/* ------------------------------------------------------------------ *
 * 2. 응답 픽스처 — 백엔드 골든에서 옮겨 온 실제 와이어 포맷
 * ------------------------------------------------------------------ */

/**
 * `POST /api/evaluate` 응답(binary).
 *
 * 출처: `Capstone_Back/tests/golden/evaluate_binary_csv.json`.
 * 값은 그 골든의 실측값이고 곡선 좌표만 짧게 줄였다(좌표 개수는 이 훅의 관심사가 아니다).
 */
export function evaluateResponse(overrides: Record<string, unknown> = {}) {
  return {
    n_samples: 200,
    dropped_rows: 0,
    class_distribution: { "0": 105, "1": 95 },
    warnings: [] as string[],
    environment: {
      evaluated_at: "2026-09-07T03:00:00+00:00",
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
        M23: 1.105263157894737,
        M21: {
          labels: ["0", "1"],
          matrix: [
            [49, 56],
            [43, 52],
          ],
          type: "multiclass_or_binary",
        },
        M22: {
          "0": { precision: 0.532608695652174, recall: 0.4666666666666667, "f1-score": 0.49746192893401014, support: 105.0 },
          "1": { precision: 0.48148148148148145, recall: 0.5473684210526316, "f1-score": 0.5123152709359606, support: 95.0 },
          accuracy: 0.505,
          "macro avg": { precision: 0.5070450885668277, recall: 0.5070175438596491, "f1-score": 0.5048885999349854, support: 200.0 },
          "weighted avg": { precision: 0.508323268921095, recall: 0.505, "f1-score": 0.5045172663849367, support: 200.0 },
        },
        roc_curve: { fpr: [0.0, 0.5, 1.0], tpr: [0.0, 0.6, 1.0] },
        pr_curve: { precision: [1.0, 0.6, 0.475], recall: [0.0, 0.5, 1.0] },
      } as Record<string, unknown>,
    },
    ...overrides,
  };
}

/**
 * `POST /api/evaluate` 응답(multilabel).
 *
 * 출처: `Capstone_Back/tests/golden/evaluate_multilabel_csv.json`.
 * `M21.type === "multilabel"` 이면 레이블별 2x2 가 배열로 온다 — C-08 이 여기서 나왔다.
 */
export function evaluateMultilabelResponse(overrides: Record<string, unknown> = {}) {
  return {
    n_samples: 200,
    dropped_rows: 0,
    class_distribution: { finance: 107, news: 102, sports: 97, tech: 102 },
    warnings: [] as string[],
    environment: {
      evaluated_at: "2026-09-07T03:00:00+00:00",
      libraries: { "scikit-learn": "1.9.0" },
    },
    results: {
      failed_metrics: {} as Record<string, string>,
      success_metrics: {
        M2: 0.4855,
        M3: 0.4783,
        M4: 0.4818,
        M15: 0.4875,
        M16: 0.055,
        M17: 0.3182,
        M23: 1.1030927835051546,
        M21: {
          labels: ["finance", "news", "sports", "tech"],
          type: "multilabel",
          matrix: [
            [
              [43, 50],
              [62, 45],
            ],
            [
              [55, 43],
              [51, 51],
            ],
            [
              [44, 59],
              [54, 43],
            ],
            [
              [50, 48],
              [49, 53],
            ],
          ],
        },
      } as Record<string, unknown>,
    },
    ...overrides,
  };
}

/**
 * `POST /api/generate-narrative` 응답.
 *
 * 출처: `Capstone_Back/tests/golden/narrative_binary_fallback.json` — snake_case 다.
 * `conclusion.verdict` 를 일부러 담아 둔다: 프론트는 이 값을 **버려야** 하고
 * 규칙 산출 verdict 가 성적서에 남아야 한다(`fetchNarrative` 가 verdict 를 매핑하지 않는다).
 */
export function narrativeResponse(overrides: Record<string, unknown> = {}) {
  return {
    conclusion: {
      benchmark: "내부 참조 기준 대비 우수",
      narrative: "종합 판정 서술입니다.",
      risks: "위험 요인 서술입니다.",
      // 프론트가 이 값을 쓰면 안 된다(규칙 산출값이 권위).
      //
      // **일부러 규칙 산출값과 반대로 둔다.** 하네스 기본 픽스처의 규칙 판정은
      // FAIL(핵심지표 M1 미달)이다. 여기에 같은 FAIL 을 쓰면 "LLM verdict 가 새어
      // 들어와도 결과가 같아" 검사가 아무것도 판별하지 못한다 — 변이 검사에서 실제로
      // 그 변이가 살아남았다. 게다가 PASS 는 **위험한 방향**이다: 규칙이 불합격을
      // 말하는데 서술이 합격을 주장하는 성적서가 만들어진다.
      verdict: "PASS",
    },
    interpretation: {
      confusion_analysis: "혼동 행렬 분석 서술입니다.",
      distribution_analysis: "분포 분석 서술입니다.",
    },
    recommendation_narrative: {
      data_quality: "데이터 품질 권고입니다.",
      model_ops: "운영 권고입니다.",
    },
    recommendations: [
      {
        priority: "HIGH",
        category: "Recall 개선",
        action: "임계값 재조정을 검토한다.",
        expected_impact: "Recall 향상",
      },
    ],
    meta: { source: "fallback", reason: "no_key", model: null, grounding: { checked: 0, passed: true, violations: [] } },
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * 3. fetch 스텁 — URL 로 분기하고 호출을 기록한다
 * ------------------------------------------------------------------ */

export interface FetchCall {
  url: string;
  init?: RequestInit;
}

export interface FetchStub {
  calls: FetchCall[];
  /** 경로별 호출 횟수. */
  countOf: (path: string) => number;
  /** `/api/evaluate` 에 실려 간 `data` 파트(JSON.parse 된 payload). */
  evaluatePayload: () => any;
  /** `/api/evaluate` 에 실려 간 `file` 파트. */
  evaluateFile: () => File | null;
  /** `/api/generate-narrative` 에 실려 간 요청 본문. */
  narrativePayload: () => any;
}

export function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const ok = init.ok ?? true;
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    json: async () => body,
  } as unknown as Response;
}

export interface StubFetchOptions {
  /** `/api/evaluate` 가 돌려줄 것. Response 도, 그것을 담은 promise 도 받는다. */
  evaluate?: Response | Promise<Response> | (() => Response | Promise<Response>);
  /** `/api/generate-narrative` 가 돌려줄 것. */
  narrative?: Response | Promise<Response> | (() => Response | Promise<Response>);
}

/**
 * `fetch` 를 URL 분기 스텁으로 교체한다.
 *
 * `fetchNarrative` 를 모킹하지 않는 것이 핵심이다 — 실제 배선(헤더·본문 직렬화·
 * snake_case 매핑·verdict 탈락)이 테스트를 지나간다.
 */
export function stubFetch(options: StubFetchOptions = {}): FetchStub {
  const calls: FetchCall[] = [];

  const settle = (
    source: Response | Promise<Response> | (() => Response | Promise<Response>) | undefined,
    fallback: () => Response,
  ) => {
    if (source === undefined) return Promise.resolve(fallback());
    const value = typeof source === "function" ? source() : source;
    return Promise.resolve(value);
  };

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/api/evaluate")) {
        return settle(options.evaluate, () => jsonResponse(evaluateResponse()));
      }
      if (url.includes("/api/generate-narrative")) {
        return settle(options.narrative, () => jsonResponse(narrativeResponse()));
      }
      return Promise.reject(new Error(`하네스가 모르는 URL: ${url}`));
    }),
  );

  const findEvaluate = () => calls.find((c) => c.url.includes("/api/evaluate"));

  return {
    calls,
    countOf: (path) => calls.filter((c) => c.url.includes(path)).length,
    evaluatePayload: () => {
      const body = findEvaluate()?.init?.body as FormData | undefined;
      const raw = body?.get("data");
      return typeof raw === "string" ? JSON.parse(raw) : null;
    },
    evaluateFile: () => {
      const body = findEvaluate()?.init?.body as FormData | undefined;
      const file = body?.get("file");
      return file instanceof File ? file : null;
    },
    narrativePayload: () => {
      const call = calls.find((c) => c.url.includes("/api/generate-narrative"));
      const raw = call?.init?.body;
      return typeof raw === "string" ? JSON.parse(raw) : null;
    },
  };
}

/* ------------------------------------------------------------------ *
 * 4. store 시드
 * ------------------------------------------------------------------ */

/** 5단계까지 정상적으로 채워진 binary 워크플로우의 컬럼 매핑. */
export function binaryMapping(): MappingRow[] {
  return [
    { originalName: "row_id", sampleValues: ["1", "2", "3"], inferredRole: "id", confirmedRole: "id", modified: false, warnings: [] },
    { originalName: "label", sampleValues: ["0", "1", "0"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
    { originalName: "pred", sampleValues: ["0", "1", "1"], inferredRole: "y_pred", confirmedRole: "y_pred", modified: false, warnings: [] },
    { originalName: "prob", sampleValues: ["0.1", "0.9", "0.6"], inferredRole: "score", confirmedRole: "score", modified: false, warnings: [] },
    { originalName: "note", sampleValues: ["a", "b", "c"], inferredRole: "ignore", confirmedRole: "ignore", modified: false, warnings: [] },
  ];
}

export interface SeedOptions {
  /** 워크플로우 store 에 덮어쓸 값. */
  workflow?: Partial<ReturnType<typeof useWorkflowStore.getState>>;
  /** run 에 덮어쓸 값(예: `reportData`). */
  run?: Partial<WorkspaceEvaluationRun>;
  /** run 을 아예 만들지 않는다(고아 id 경로). */
  withoutRun?: boolean;
}

/** `mapWorkflowToFinalReport` 에 넘길 입력 — 6단계가 만드는 스냅샷과 같은 모양. */
export function workflowSnapshot(overrides: Partial<MapWorkflowToReportInput> = {}): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel", versionName: "v1.0.0" },
    datasetInfo: { ...DEFAULT_DATASET_INFO, validationSampleCount: "999" },
    taskType: "binary",
    // 4단계가 남기는 파일 메타. `rawFile`(File 객체)과 달리 이것은 persist 되고
    // run 스냅샷에도 들어가, "이 run 이 어느 파일로 만들어졌나"의 유일한 근거다.
    uploadedFile: { name: "data.csv", size: "1.2 KB", type: "text/csv" },
    selectedMetricIds: ["M1", "M2", "M3", "M4", "M9", "M21", "M22", "M23"],
    metricDetails: {
      M1: { targetValue: "0.9" },
      M2: { targetValue: "0.4" },
      M3: { targetValue: "0.4" },
      M4: { targetValue: "0.4" },
      M9: { targetValue: "0.5" },
      M5: { beta: "2.0" },
    } as any,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: binaryMapping(),
    classLabelDescriptions: {},
    // `MapWorkflowToReportInput.metadata` 의 선언은 `{ positive_class?: string }` 뿐인데
    // 실제로는 5단계가 만든 전체 메타(감지 클래스·분포 등)가 흘러 들어온다 — 훅도 그
    // 객체를 그대로 `/api/evaluate` 페이로드에 싣는다. 실물과 같은 모양을 쓴다.
    metadata: {
      positive_class: "1",
      negative_class: "0",
      detected_classes: ["0", "1"],
      detected_labels: [],
      class_distribution: { "0": 1, "1": 1 },
    } as MapWorkflowToReportInput["metadata"],
    ...overrides,
  };
}

/**
 * 두 store 를 "6단계를 막 끝내고 성적서로 넘어온" 상태로 채운다.
 *
 * `rawFile` 은 persist 대상이 아니므로(partialize) **반드시 메모리에 직접 넣어야** 한다 —
 * localStorage 만 시드하면 평가 경로에 영원히 도달하지 않는다.
 */
export function seedStores(options: SeedOptions = {}) {
  // `options.workflow` 에 **실제로 들어 있는 키만** 스냅샷에 넘긴다.
  // 스프레드로 undefined 를 흘리면 `metricDetails` 등이 undefined 로 덮여
  // `mapWorkflowToFinalReport` 가 그 자리에서 TypeError 를 던진다.
  const snapshotKeys = [
    "basicInfo",
    "datasetInfo",
    "taskType",
    "selectedMetricIds",
    "metricDetails",
    "uploadedFile",
    "trainingExampleFiles",
    "trainingUnsuitableExampleFiles",
    "columnMapping",
    "classLabelDescriptions",
    "metadata",
  ] as const;

  const snapshotOverrides: Partial<MapWorkflowToReportInput> = {};
  for (const key of snapshotKeys) {
    if (options.workflow && key in options.workflow) {
      (snapshotOverrides as Record<string, unknown>)[key] = (
        options.workflow as Record<string, unknown>
      )[key];
    }
  }
  const snapshot = workflowSnapshot(snapshotOverrides);

  useWorkflowStore.setState({
    ...snapshot,
    taskType: snapshot.taskType,
    rawFile: new File(["label,pred,prob\n0,0,0.1\n"], "data.csv", { type: "text/csv" }),
    decisionThreshold: null,
    validationResult: null,
    // 6단계가 run 을 만든 직후 기록하는 값. 이것이 없으면 훅은 "이 run 은 지금
    // 워크플로우가 만든 것이 아니다"로 판단해 평가하지 않는다(정상 동작).
    lastRunId: RUN_ID,
    ...options.workflow,
  });

  if (!options.withoutRun) {
    const draft = mapWorkflowToFinalReport(snapshot);
    const run: WorkspaceEvaluationRun = {
      id: RUN_ID,
      workspaceId: "ws-1",
      modelName: "MyModel",
      versionName: "v1.0.0",
      reportId: draft.meta.reportId,
      workflowSnapshot: snapshot,
      reportData: draft,
      createdAt: "2026-09-07T00:00:00.000Z",
      ...options.run,
    };
    useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [run], activeWorkspaceId: "ws-1" });
  } else {
    useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
  }

  return snapshot;
}

/** 이미 평가가 끝난 완성본(캐시 히트 대상). */
export function evaluatedReport(overrides: Partial<FinalReportData> = {}): FinalReportData {
  const draft = mapWorkflowToFinalReport(workflowSnapshot());
  return {
    ...draft,
    isEvaluated: true,
    kpiResults: [
      { metricId: "M1", name: "Accuracy", value: 0.42, threshold: 0.9, status: "fail", higherIsBetter: true },
    ],
    ...overrides,
  };
}

/** store 를 라운드 사이에 완전히 비운다. 둘은 키도 리셋 경로도 따로다. */
export function resetStores() {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
}

/* ------------------------------------------------------------------ *
 * 5. 화면 렌더 — 훅 반환값이 아니라 사용자가 보는 것을 검사하기 위해
 * ------------------------------------------------------------------ */

/**
 * 차트 섹션의 recharts `ResponsiveContainer` 는 `ResizeObserver` 를 요구하는데
 * jsdom 에 그것이 없다. 없으면 렌더 자체가 unhandled error 로 죽어 **성적서의 다른
 * 절까지 검사할 수 없다**. 크기는 0 으로 남지만 이 하네스는 SVG 좌표를 보지 않는다.
 */
function installResizeObserver() {
  if ("ResizeObserver" in globalThis) return;
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * 실제 `<Report />` 를 `/report/:id` 에 렌더한다.
 *
 * 훅만 렌더하는 테스트는 "값은 맞지만 화면이 그것을 쓰지 않는" 회귀를 놓친다.
 * 발급 훅(`useIssuance`)은 마운트 시 네트워크를 타지 않으므로 모킹하지 않는다 —
 * 섹션 컴포넌트 전부가 실물로 렌더된다.
 */
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
