/**
 * 판 3 새 성적서 생성 경로(플래그 끔) 하네스 — 판 4 라운드 S0(계획 2.5-2). 테스트가 아닌 이름(*.harness.tsx)이라 수집되지 않는다.
 *
 * 앱이 실제로 걷는 길을 그대로 걷는다.
 * 1. 워크플로우 스토어를 입력(`inputs/<tag>.state.json`)과 검증 응답(`inputs/<tag>.validate.json`)으로 채운다.
 * 2. 검증 화면 "다음"(`pages/DataValidation.tsx handleNext`)이 하는 일을 같은 운영 함수로 한다 — 생성 전 안내 확인 기록,
 *    `buildReportInput` → `mapWorkflowToFinalReport(…, 검증 응답)`, `ensureActiveWorkspace`, `addEvaluationRun`
 *    (`buildEvaluationRequestSnapshot` 포함).
 * 3. 실제 `<Report />` 를 `/report/:id` 에 그린다. 앱이 스스로 `POST /api/evaluate` 와 `POST /api/narrative/jobs` 를 부르고,
 *    작업 조회(GET)로 서술 완료까지 간다. fetch 만 가짜다(주소·메서드로 가름, 본문은 **원문 문자열**로 남긴다).
 *
 * 돌려주는 것: 1단계 저장 데이터(서술 대기 중 `storedRun().reportData`), 서술 작업 요청 본문 원문, 서술 완료 뒤 저장 데이터.
 * 저장 데이터는 키를 정렬해 직렬화한다(`stableJson`) — 객체 키 순서가 아니라 값을 고정한다. 요청 본문은 앱이 보낸 글자 그대로다.
 *
 * 1층 빈칸 검사(`layerOneGaps`)는 결과로 "다음"을 막지 않고 건너뛴다. 대신 건너뛰는 범위를 `KNOWN_LAYER_ONE_SKIP` 으로 못 박는다 —
 * 아래 `assertKnownLayerOneSkip` 주석과 README "1층 빈칸 검사를 건너뛰는 범위".
 *
 * 시각: 테스트 파일이 `vi.useFakeTimers({ toFake: ["Date"] })` 와 `setSystemTime(FROZEN_NOW())` 로 Date 만 멈춘다(조회 setTimeout 은
 * 진짜라 조회는 돈다). 시간대는 `TZ_PINNED` 로 고정한다 — 생성 전 안내 확인 기록(`acknowledgement.at`)이 ISO(UTC) 글이라 기계의
 * 시간대에 따라 달라진다(CI 는 UTC, 개발 기계는 KST).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";

import { fastPolling, renderReportPage, resetAll, storedRun } from "../../../hooks/reportJob.harness";
import { buildReportInput, mapWorkflowToFinalReport } from "../../../lib/report/mapWorkflowToFinalReport";
import { buildEvaluationRequestSnapshot } from "../../../lib/report/evaluationRequest";
import { toUploadedFileInfo } from "../../../components/data-upload/shared";
import { layerOneGaps, screenRuleGaps } from "../../../utils/domain/layerOne";
import { passCriteriaState } from "../../../utils/domain/passCriteria";
import { ensureActiveWorkspace } from "../../../utils/domain/ensureActiveWorkspace";
import { useWorkflowStore } from "../../../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../../../utils/stores/useWorkspaceStore";

export const NEW_RUN_DIR = __dirname;
export const INPUT_DIR = resolve(NEW_RUN_DIR, "inputs");
export const GOLDEN_DIR = resolve(NEW_RUN_DIR, "golden");

/** 세 유형 하나씩 — 이진·다중·멀티레이블. */
export const TAGS = ["bc_strong", "digits_strong", "yeast_strong"] as const;
export type Tag = (typeof TAGS)[number];

/** 정답 파일 이름. 1단계 저장 데이터·서술 요청 원문·서술 완료 뒤 저장 데이터. */
export const goldenNames = (tag: Tag) => ({
  stage1: `${tag}.stage1.json`,
  request: `${tag}.narrativeRequest.json`,
  final: `${tag}.final.json`,
});

/** 2026-10-22 18:45(로컬 시각 생성자). RPT-2026-0001 발급 직전 시각. */
export const FROZEN_NOW = () => new Date(2026, 9, 22, 18, 45);
export const TZ_PINNED = "Asia/Seoul";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

export function readInputs(tag: Tag) {
  return {
    state: readJson(resolve(INPUT_DIR, `${tag}.state.json`)),
    evaluate: readJson(resolve(INPUT_DIR, `${tag}.evaluate.json`)),
    validate: readJson(resolve(INPUT_DIR, `${tag}.validate.json`)),
    jobs: readJson(resolve(INPUT_DIR, `${tag}.jobs.json`)),
    payload: readJson(resolve(INPUT_DIR, `${tag}.payload.json`)),
  };
}

/** 키를 코드포인트 순으로 정렬해 직렬화한다(JSON 왕복 — undefined 키는 빠진다). 끝에 줄바꿈 하나. */
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sort(JSON.parse(JSON.stringify(value))), null, 1)}\n`;
}

interface Call {
  method: string;
  url: string;
  /** 문자열 본문은 원문 그대로. */
  rawBody?: string;
  /** FormData 본문의 `data` 칸(평가 요청). */
  formData?: string | null;
  formFile?: File | null;
}

function reply(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => structuredClone(body) } as unknown as Response;
}

/** 주소·메서드로 가르는 fetch 가짜. 작업 조회는 `release()` 전에는 '생성 중', 뒤에는 완료다. */
function stubBackend(inputs: ReturnType<typeof readInputs>) {
  const calls: Call[] = [];
  let released = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      const method = (options?.method ?? "GET").toUpperCase();
      const body = options?.body;
      const call: Call = { method, url };
      if (typeof body === "string") call.rawBody = body;
      if (body instanceof FormData) {
        call.formData = body.get("data") as string | null;
        call.formFile = body.get("file") as File | null;
      }
      calls.push(call);
      if (method === "POST" && /\/api\/evaluate$/.test(url)) return reply(inputs.evaluate);
      if (method === "POST" && /\/api\/narrative\/jobs$/.test(url)) return reply(inputs.jobs.created);
      if (method === "GET" && /\/api\/narrative\/jobs\/[^/]+$/.test(url)) {
        return reply(released ? inputs.jobs.done : inputs.jobs.running);
      }
      throw new Error(`S0 하네스: 모르는 요청 ${method} ${url}`);
    }),
  );
  return { calls, release: () => (released = true) };
}

/**
 * 1층 빈칸 검사를 건너뛰는 범위 — 입력마다 알려진 결과.
 *
 * 왜 건너뛰나: 입력은 판 3 발급본 6건을 만든 픽스처(C 세션 FIXTURES) 그대로라 목표값을 비운 지표(정보 제공 지표)가 있다.
 * 판 3 성적서는 그 지표를 "정보 제공"으로 싣는다(발급본 RPT-2026-0001·0003·0005 도 같은 모양). 그런데 지금 `layerOneGaps` 는
 * 고른 지표 모두에 목표값을 요구하므로(`passCriteriaState().targetsValid`) "지표와 합격 기준"(stepId `metrics`) 한 칸을 낸다.
 * 이 한 칸 때문에 검증 화면 "다음"을 그대로 따라 하면 run 이 만들어지지 않는다.
 *
 * 그래서 건너뛰되, 건너뛰는 것이 **이 한 이유뿐**임을 못 박는다.
 * - 1층 결과의 단계 키 목록 = `["metrics"]`(의뢰자 정보·모델·평가 관점 빈칸은 없어야 한다), 그 칸에 계산 불가 지표 설명(details) 없음.
 * - 그 칸이 생긴 이유 = 목표값이 빈 지표뿐: 빈 목표 지표 목록이 아래 `emptyTargets` 와 같고, 핵심 지표는 성립(coreValid),
 *   Fβ 를 고르지 않음.
 * - ⑥~⑨ 화면 규칙(`screenRuleGaps`)은 빈 결과 — 이것은 건너뛰지 않는다.
 * 입력이 바뀌어 다른 빈칸이 생기면(예: 과제 용도인데 과제명이 빔) 정답을 뜨기 전에 여기서 실패한다.
 */
export const KNOWN_LAYER_ONE_SKIP: Record<Tag, { gapSteps: string[]; emptyTargets: string[] }> = {
  bc_strong: { gapSteps: ["metrics"], emptyTargets: ["M2", "M10", "M23"] },
  digits_strong: { gapSteps: ["metrics"], emptyTargets: ["M2", "M3", "M11", "M12", "M23"] },
  yeast_strong: { gapSteps: ["metrics"], emptyTargets: ["M2", "M3", "M16", "M18", "M23"] },
};

/** 지금 스토어 상태의 1층·화면 규칙 결과가 `KNOWN_LAYER_ONE_SKIP[tag]` 와 같음을 단정한다(다르면 run 을 만들지 않는다). */
export function assertKnownLayerOneSkip(tag: Tag) {
  const state = useWorkflowStore.getState();
  const gaps = layerOneGaps(state);
  const criteria = passCriteriaState(state.taskType, state.selectedMetricIds, state.metricDetails, state.composerMetrics);
  const observed = {
    gapSteps: gaps.map((gap) => gap.stepId),
    gapDetails: gaps.map((gap) => gap.details ?? null),
    emptyTargets: criteria.targetMetrics
      .filter((metric) => (state.metricDetails[metric.id]?.targetValue ?? "").trim() === "")
      .map((metric) => metric.id),
    coreValid: criteria.coreValid,
    selectsFBeta: state.selectedMetricIds.includes("M5"),
    screenRuleGaps: screenRuleGaps(state),
  };
  const known = KNOWN_LAYER_ONE_SKIP[tag];
  expect(observed, `${tag}: 1층 빈칸 검사를 건너뛰는 범위가 알려진 것과 다르다`).toEqual({
    gapSteps: known.gapSteps,
    gapDetails: known.gapSteps.map(() => null),
    emptyTargets: known.emptyTargets,
    coreValid: true,
    selectsFBeta: false,
    screenRuleGaps: [],
  });
  return observed;
}

/** 검증 화면 "다음"과 같은 순서로 run 을 만든다(`pages/DataValidation.tsx handleNext`). */
function createRunLikeValidationNext(tag: Tag, validationData: unknown): string {
  const state = useWorkflowStore.getState();
  // 1층 빈칸 검사(layerOneGaps)는 "다음"을 막는 데 쓰지 않고, 건너뛰는 범위만 단정한다(`assertKnownLayerOneSkip` 주석).
  assertKnownLayerOneSkip(tag);
  const build = () => {
    const workflowSnapshot = buildReportInput(useWorkflowStore.getState());
    const reportData = mapWorkflowToFinalReport(workflowSnapshot, validationData as never);
    return { workflowSnapshot, reportData };
  };
  const check = build().reportData.materialCheck;
  state.setMaterialCheckAck(
    check && check.warningIds.length > 0
      ? { at: new Date().toISOString(), version: check.version, warningIds: [...check.warningIds] }
      : null,
  );
  const { workflowSnapshot, reportData } = build();
  const workspaceId = ensureActiveWorkspace(state.basicInfo.modelName ?? "");
  const run = useWorkspaceStore.getState().addEvaluationRun({
    workspaceId,
    modelName: state.basicInfo.modelName || "Untitled model",
    versionName: reportData.evalScope.version,
    reportId: reportData.meta.reportId,
    workflowSnapshot,
    reportData,
    evaluationRequest: buildEvaluationRequestSnapshot(useWorkflowStore.getState()),
  });
  useWorkflowStore.getState().setLastRunId(run.id);
  return run.id;
}

export interface NewRunCapture {
  /** 서술 대기 중 저장된 1단계 성적서(stableJson). */
  stage1: string;
  /** `POST /api/narrative/jobs` 본문 원문. */
  request: string;
  /** 서술 완료 뒤 저장된 성적서(stableJson). */
  final: string;
  /** `POST /api/evaluate` 의 `data` 칸(JSON) — 입력 재구성 확인용. */
  evaluateData: unknown;
  evaluateFileName: string | undefined;
  /** run 에 저장한 서술 요청(다시 만들기용). */
  storedInput: unknown;
  callCounts: { evaluate: number; jobs: number; views: number };
}

/** 한 입력으로 새 성적서를 만든다. 호출 전에 Date 를 멈춰 두어야 한다. */
export async function runNewReport(tag: Tag): Promise<NewRunCapture> {
  const inputs = readInputs(tag);
  const restorePolling = fastPolling();
  try {
    const { file: fp, workflow } = inputs.state;
    const file = new File([new Uint8Array(fp.bytes)], fp.name, { type: fp.type, lastModified: fp.lastModified });
    useWorkflowStore.setState({
      ...workflow,
      uploadedFile: toUploadedFileInfo(file),
      rawFile: file,
      validationResult: inputs.validate,
      materialCheckAck: null,
      lastRunId: null,
    });
    const runId = createRunLikeValidationNext(tag, inputs.validate);

    const backend = stubBackend(inputs);
    const view = renderReportPage(runId);
    await waitFor(() => expect(storedRun(runId)?.narrative?.status).toBe("pending"), { timeout: 10_000 });
    const stage1 = stableJson(storedRun(runId)!.reportData);
    const storedInput = storedRun(runId)!.narrative?.input ?? null;

    backend.release();
    await waitFor(() => expect(storedRun(runId)?.narrative?.status).toBe("done"), { timeout: 10_000 });
    const final = stableJson(storedRun(runId)!.reportData);
    view.unmount();

    const evaluateCalls = backend.calls.filter((c) => c.method === "POST" && /\/api\/evaluate$/.test(c.url));
    const jobCalls = backend.calls.filter((c) => c.method === "POST" && /\/api\/narrative\/jobs$/.test(c.url));
    const viewCalls = backend.calls.filter((c) => c.method === "GET");
    return {
      stage1,
      request: jobCalls[0]?.rawBody ?? "",
      final,
      evaluateData: evaluateCalls[0]?.formData ? JSON.parse(evaluateCalls[0].formData) : null,
      evaluateFileName: evaluateCalls[0]?.formFile?.name,
      storedInput,
      callCounts: { evaluate: evaluateCalls.length, jobs: jobCalls.length, views: viewCalls.length },
    };
  } finally {
    restorePolling();
    resetAll();
    vi.unstubAllGlobals();
  }
}
