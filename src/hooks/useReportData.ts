/**
 * 최종 성적서 데이터 훅 — 평가와 서술 작업(job)을 나눠 돈다(서술 라운드 S3b, 계획 설계 요지 8).
 *
 * 워크스페이스에 저장된 run(`/report/:id`)의 성적서를 만든다. 효과는 둘이다.
 *
 * 1. **평가 효과** — 의존성은 run id·서술 상태(·평가할 파일)뿐이다. run 객체를 의존성에 넣지 않는다: 종전에는 run 전체에
 *    걸려 있어 저장할 때마다 다시 돌았고, 서술 상태를 run 에 쓰면 평가와 유료 서술 작업이 되풀이된다. 서술을 아직 시작하지
 *    않은 run 만 평가한다. 평가 요청은 run 을 만들 때 얼린 스냅샷(`evaluationRequest`)으로 만들고, 파일 지문이 다르거나 파일이
 *    없으면 다시 올려 달라고 한다(점검 유-8). 평가가 끝나면 서술 작업을 만들고 **한 번에** 저장한다 — 1단계 성적서(지표·차트·
 *    8.1 표, 서술 없음)와 서술 상태 pending(작업 번호).
 * 2. **서술 효과** — 서술 상태가 pending 이고 작업 번호가 있으면 조회만 한다. 진행 단계(대기·생성 중·검사 중)는 컴포넌트
 *    상태에만 두고, 스토어에는 끝 상태(done·failed)만 쓴다. done 일 때만 서술을 병합해 완성본(isEvaluated)으로 저장한다.
 *
 * 새로고침하면 저장된 작업 번호로 이어 조회한다(평가를 다시 하지 않는다). 실패·시간 초과·유실이면 "서술 다시 만들기"가
 * 저장해 둔 서술 요청으로 새 작업을 만든다. 없는 id 는 평가를 시작하지 않고 "찾을 수 없음"이다(점검 유-9).
 *
 * 같은 run 의 평가는 모듈 단위로 한 번만 돈다(`evaluationsInFlight`). React StrictMode 는 개발 중에 효과를 두 번 실행하고,
 * 인쇄 탭·두 화면이 같은 run 을 열 수도 있다 — 그때마다 평가와 서술 작업이 둘씩 나가면 안 된다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiUrl } from "@/lib/apiBase";
import type { BenchmarkRef, FinalReportData, NarrativeSource } from "../types/finalReport.types";
import type { WorkspaceEvaluationRun } from "../types/workspace.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { saveRun, useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { buildClientInputs } from "../lib/report/reportMaterials";
import { assembleEvaluatedReport } from "../lib/report/assembleEvaluatedReport";
import { normalizeReportContent } from "../lib/report/normalizeReportContent";
import type { NarrativeRequestPayload } from "../lib/report/buildFactSheet";
import { fitNarrativePayload } from "../lib/report/factSheetFit";
import { sameFile, type FileFingerprint } from "../lib/report/evaluationRequest";
import {
  createNarrativeJob,
  fetchNarrativeJob,
  type CreateJobResult,
  type JobView,
  type NarrativeFields,
  type NarrativeFailure,
  type NarrativeJobStage,
} from "../lib/report/narrativeJobApi";
import { resolveTaskType } from "../data/evaluationData";

/** 조회 설정. 테스트가 간격을 줄이려고 고칠 수 있게 객체로 둔다(수치를 테스트에 박지 않는다). */
export const narrativePolling = {
  /** 조회 간격. */
  intervalMs: 2000,
  /**
   * 조회가 이 시간 동안 내내 닿지 않으면(마지막 성공 뒤) 실패(unreachable)로 끝낸다. 횟수가 아니라 시간으로 센다 —
   * 와이파이가 몇 초 끊기거나 Render 가 잠깐 5xx 를 줄 때 작업을 실패로 굳히면, 서버에서는 원래 작업이 계속 도는데
   * 사용자는 다시 만들기로 유료 작업을 하나 더 만든다(S3b 검토). 실패로 끝낸 뒤에도 다시 만들기는 원래 작업부터 다시 본다.
   */
  unreachableGiveUpMs: 60_000,
  /** 작업을 만든 뒤 이만큼 지나도 끝나지 않으면 시간 초과로 끝낸다(서버 전체 제한 10분 + 여유 — 서버가 유실을 먼저 알린다). */
  giveUpMs: 12 * 60_000,
};

/** 다시 만들기용 서술 요청을 run 에 저장하는 상한(직렬화 글자 수). 넘으면 남기지 않고 다시 만들기는 평가부터 한다. */
export const NARRATIVE_INPUT_MAX_CHARS = 400_000;

export type NarrativePhase = "none" | "pending" | "done" | "failed";

/** run 의 서술 상태. 서술 칸이 없는 옛 run 은 완성본이면 done, 아니면 아직 시작 전(none). */
export function narrativePhaseOf(run: WorkspaceEvaluationRun | undefined): NarrativePhase {
  if (!run) return "none";
  if (run.narrative) return run.narrative.status;
  return run.reportData?.isEvaluated ? "done" : "none";
}

/**
 * 성적서 화면 상태.
 * - ready: 그릴 데이터가 있다(서술 상태는 narrative.phase 로 따로 본다).
 * - loading: 평가 중(서술 작업을 만들 때까지).
 * - not_found: 이 id 의 run 이 없다.
 * - needs_file: 평가할 파일이 없거나 지문이 다르다 — 다시 올려야 한다.
 * - needs_reevaluation: 평가 요청 스냅샷이 없는 옛 run, 또는 저장소 이행이 다시 평가하라고 표시한 run.
 * - error: 평가 요청이 실패했다.
 */
export type ReportStatus = "ready" | "loading" | "not_found" | "needs_file" | "needs_reevaluation" | "error";

export interface UseReportDataResult {
  data: FinalReportData | null;
  status: ReportStatus;
  isLoading: boolean;
  error?: string | null;
  narrative: {
    phase: NarrativePhase;
    /** 진행 단계 — pending 일 때만, 컴포넌트 상태(저장하지 않음). */
    stage: NarrativeJobStage | null;
    failure?: NarrativeFailure;
    /** 다시 만들기 요청을 보내는 중. */
    retrying: boolean;
  };
  /** 서술이 아직 끝나지 않았다(pending) — 종전 이름. */
  narrativePending: boolean;
  /** 저장 실패 안내(저장 공간 초과 등). 없으면 null. */
  saveError: string | null;
  /** 실패한 서술을 다시 만든다. */
  retryNarrative: () => Promise<void>;
  /** 다시 올린 파일을 넘긴다(지문이 맞으면 그 파일로 평가한다). */
  provideFile: (file: File) => void;
  /** 평가 파일 지문(파일 다시 올리기 안내용). */
  expectedFile: FileFingerprint | null;
  /** 다시 올린 파일이 지문과 달랐다. */
  fileMismatch: boolean;
}

function getRun(id: string): WorkspaceEvaluationRun | undefined {
  return useWorkspaceStore.getState().evaluationRuns.find((r) => r.id === id);
}

/** 서술 요청을 저장할 수 있는 크기인가. */
export function storableInput(payload: NarrativeRequestPayload): NarrativeRequestPayload | null {
  try {
    return JSON.stringify(payload).length <= NARRATIVE_INPUT_MAX_CHARS ? payload : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 평가 + 서술 작업 만들기 (run 하나에 한 번)
 * ------------------------------------------------------------------ */

interface EvaluationOutcome {
  error: string | null;
  saveError: string | null;
}

const evaluationsInFlight = new Map<string, Promise<EvaluationOutcome>>();

/** 테스트 정리용 — 남은 진행 표시를 지운다. */
export function resetReportDataForTests() {
  evaluationsInFlight.clear();
}

async function postEvaluate(file: File, run: WorkspaceEvaluationRun): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data", JSON.stringify(run.evaluationRequest!.payload));
  const response = await fetch(apiUrl("/api/evaluate"), { method: "POST", body: formData });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `서버 오류: ${response.status}`);
  }
  return response.json();
}

async function evaluateAndStartNarrative(id: string, file: File): Promise<EvaluationOutcome> {
  // 평가 요청뿐 아니라 응답 조립(assembleEvaluatedReport·buildClientInputs)에서 나는 예외도 오류 화면으로 보낸다 —
  // 밖으로 새면 화면이 '평가 중'에서 멈춘다(S3b 검토). 평가가 성공해도 조립이 실패하면 서술 작업은 만들지 않는다.
  try {
    return await evaluateAndStartNarrativeUnsafe(id, file);
  } catch (err: any) {
    console.error("Evaluation assembly failed:", err);
    return { error: err?.message || String(err), saveError: null };
  }
}

async function evaluateAndStartNarrativeUnsafe(id: string, file: File): Promise<EvaluationOutcome> {
  const run = getRun(id);
  if (!run?.evaluationRequest) return { error: "평가 요청을 찾을 수 없습니다.", saveError: null };
  const snapshot = run.evaluationRequest;

  let result: any;
  try {
    result = await postEvaluate(file, run);
  } catch (err: any) {
    console.error("Evaluation run failed:", err);
    return { error: err?.message || String(err), saveError: null };
  }

  // 성적서 입력 스냅샷 — 매퍼·문제 목록·AI 고객 입력이 같은 값을 본다(run 을 만들 때 얼린 값).
  const reportInput = run.workflowSnapshot;
  // run 을 만들 때 그 스냅샷으로 만든 초안이 1단계의 바탕이다(그때의 검증 결과가 들어 있다).
  const baseReport = normalizeReportContent(run.reportData);

  // 평가 응답 → 1단계 성적서·AI 사실 시트(서술과 무관한 결정론적 조립, `assembleEvaluatedReport`).
  const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport, result, {
    ...snapshot.assemble,
    composer: reportInput.composer,
  });

  // 고객이 제공한 입력도 함께 넘긴다(서술 설계 D25). 회사·과제 정보는 넣지 않는다(D34).
  const clientInputs =
    reportInput.composer && baseReport.materials
      ? buildClientInputs({
          composer: reportInput.composer,
          materials: baseReport.materials,
          model: {
            name: snapshot.model.name,
            // 성적서에 찍는 버전과 같은 값(기본값 판정은 매퍼 한 곳).
            version: baseReport.evalScope.version,
            purpose: snapshot.model.purpose,
            category: snapshot.model.category,
          },
          reportPurposeNote: snapshot.model.reportPurposeNote,
          // 의뢰자가 고른 핵심 지표만 — 기본값이면 보내지 않는다(재-7). 지표 번호(Mn)는 빼고 이름만(재-4).
          coreMetrics:
            stage1Report.coreMetricsSource === "client"
              ? stage1Report.kpiResults.filter((r) => r.isCore).map((r) => r.name)
              : null,
          // 성적서 3절과 같은 출처 — 놓지 않은 설명은 `buildReportInput` 이 이미 비웠다.
          classLabelDescriptions: reportInput.classLabelDescriptions,
          // 성적서 4절과 같은 출처 — ⑨ 실행 환경을 넣었으면 그 값이다(`buildReportInput`).
          runtime: {
            운영체제: reportInput.basicInfo.envOS ?? "",
            CPU: reportInput.basicInfo.envCPU ?? "",
            GPU: reportInput.basicInfo.envGPU ?? "",
            메모리: reportInput.basicInfo.envMemory ?? "",
            소프트웨어: reportInput.basicInfo.envSoftware ?? "",
          },
        })
      : undefined;

  // 본문이 백엔드 상한(2MB)에 가까우면 클래스 단위 칸을 비운다 — 413 으로 서술을 잃지 않게(유-11).
  const payload: NarrativeRequestPayload = fitNarrativePayload({
    task_type: resolveTaskType(snapshot.assemble.taskType),
    report_purpose: baseReport.evalScope.reportPurposeKey,
    fact_sheet: factSheet,
    ...(clientInputs ? { client_inputs: clientInputs } : {}),
  });

  const created = await createNarrativeJob(payload);
  // 1단계 성적서는 완성본이 아니다(isEvaluated=false) — 서술이 끝나야(done) 완성본이 된다.
  const input = storableInput(payload);
  const saveError = saveRun(id, (r) => applyCreated(r, stage1Report, created, input));
  // 작업 번호를 저장하지 못했으면 새로고침 뒤 이어 조회할 수 없다 — 평가와 서술 작업을 다시 만들게 되니 알린다.
  const notice =
    saveError && created.kind === "started"
      ? `${saveError} 서술이 끝날 때까지 이 화면을 닫거나 새로고침하지 마세요 — 새로고침하면 서술을 다시 만들어 비용이 다시 듭니다.`
      : saveError;
  return { error: null, saveError: notice };
}

function startEvaluation(id: string, file: File): Promise<EvaluationOutcome> {
  const existing = evaluationsInFlight.get(id);
  if (existing) return existing;
  const promise = evaluateAndStartNarrative(id, file).finally(() => evaluationsInFlight.delete(id));
  evaluationsInFlight.set(id, promise);
  return promise;
}

/* ------------------------------------------------------------------ *
 * 서술 작업 끝 상태 저장
 * ------------------------------------------------------------------ */

/** 아직 이 작업을 기다리는 run 인가 — 늦게 온 응답이 새 작업(다시 만들기)의 상태를 덮지 않게. */
function stillWaitingFor(run: WorkspaceEvaluationRun, jobId: string): boolean {
  return run.narrative?.status === "pending" && run.narrative.jobId === jobId;
}

/** 1단계 성적서에 끝난 서술을 병합해 완성본으로. verdict/score 는 규칙 산출값, 서술(benchmark/narrative/risks)만 병합한다. */
function mergeNarrative(report: FinalReportData, fields: NarrativeFields, benchmarkRefs: BenchmarkRef[]): FinalReportData {
  return {
    ...report,
    conclusion: {
      ...report.conclusion,
      ...fields.conclusionText,
      benchmarkRefs: benchmarkRefs.length > 0 ? benchmarkRefs : report.conclusion.benchmarkRefs,
    },
    interpretation: fields.interpretation,
    recommendationNarrative: fields.recommendationNarrative,
    recommendations: fields.recommendations,
    narrativeSource: fields.source,
    narrativeSections: fields.sectionSources,
    isEvaluated: true,
  };
}

function saveDone(id: string, jobId: string, view: Extract<JobView, { kind: "done" }>): string | null {
  const run = getRun(id);
  if (!run || !stillWaitingFor(run, jobId)) return null;
  const merged = mergeNarrative(run.reportData, view.fields, view.benchmarkRefs);
  return saveRun(id, (r) =>
    stillWaitingFor(r, jobId) ? { ...r, reportData: merged, narrative: { status: "done", jobId } } : r,
  );
}

/** 작업 생성 결과를 run 에 저장할 모양으로 — 처음 평가 뒤와 다시 만들기가 같이 쓴다. */
function applyCreated(
  run: WorkspaceEvaluationRun,
  report: FinalReportData,
  created: CreateJobResult,
  input: NarrativeRequestPayload | null,
): WorkspaceEvaluationRun {
  if (created.kind === "finished") {
    return { ...run, reportData: mergeNarrative(report, created.fields, created.benchmarkRefs), narrative: { status: "done", jobId: null } };
  }
  if (created.kind === "started") {
    return {
      ...run,
      // 8.1 표는 작업 생성 응답으로 서술보다 먼저 채운다(점검 유-2).
      reportData: { ...report, conclusion: { ...report.conclusion, benchmarkRefs: created.benchmarkRefs }, isEvaluated: false },
      narrative: { status: "pending", jobId: created.jobId, input, startedAt: new Date().toISOString() },
    };
  }
  return {
    ...run,
    reportData: { ...report, isEvaluated: false },
    narrative: { status: "failed", jobId: null, failure: created.failure, input },
  };
}

function saveFailed(id: string, jobId: string, failure: NarrativeFailure): string | null {
  const run = getRun(id);
  if (!run || !stillWaitingFor(run, jobId)) return null;
  return saveRun(id, (r) =>
    stillWaitingFor(r, jobId) ? { ...r, narrative: { ...r.narrative!, status: "failed", failure } } : r,
  );
}

/** 화면 전용 출처 — 서술을 기다리는 중·만들지 못함일 때 섹션이 안내 문구를 고르게 한다(저장하지 않는다). */
function displaySource(report: FinalReportData, phase: NarrativePhase): NarrativeSource | undefined {
  if (phase === "pending") return "pending";
  if (phase === "failed") return "failed";
  return report.narrativeSource;
}

/* ------------------------------------------------------------------ *
 * 훅
 * ------------------------------------------------------------------ */

export function useReportData(id: string): UseReportDataResult {
  const run = useWorkspaceStore((state) => state.evaluationRuns.find((item) => item.id === id));
  const rawFile = useWorkflowStore((state) => state.rawFile);
  const [providedFile, setProvidedFile] = useState<File | null>(null);
  // 아직 서술을 시작하지 않은 run 은 첫 화면부터 '평가 중'으로 둔다 — 'ready' 로 시작하면 효과가 상태를 정하기 전에
  // 미평가 초안과 빨간 안내가 한 번 그려진다(S3b 검토).
  const [evalState, setEvalState] = useState<{ status: ReportStatus; error: string | null }>(() => ({
    status: run && narrativePhaseOf(run) === "none" ? "loading" : "ready",
    error: null,
  }));
  const [stage, setStage] = useState<NarrativeJobStage | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const runExists = run !== undefined;
  const phase = narrativePhaseOf(run);
  const jobId = run?.narrative?.jobId ?? null;
  const file = providedFile ?? rawFile;

  // ── 평가 효과: 의존성 = run id · 서술 상태 · 평가할 파일 (run 객체가 아니다) ──
  useEffect(() => {
    if (!runExists || phase !== "none") {
      setEvalState({ status: "ready", error: null });
      return;
    }
    const current = getRun(id)!;
    if (current.migrationNote === "needs_reevaluation" || !current.evaluationRequest) {
      setEvalState({ status: "needs_reevaluation", error: null });
      return;
    }
    if (!sameFile(current.evaluationRequest.file, file)) {
      setEvalState({ status: "needs_file", error: null });
      return;
    }
    let active = true;
    setEvalState({ status: "loading", error: null });
    startEvaluation(id, file!).then((outcome) => {
      // 저장 실패는 이 효과가 끝난 뒤에도 알린다 — 저장(메모리는 바뀜)이 서술 상태를 pending 으로 바꿔 이 효과는 이미
      // 정리된 뒤라, active 를 따지면 안내가 사라진다.
      if (outcome.saveError) setSaveError(outcome.saveError);
      if (!active) return;
      setEvalState(outcome.error ? { status: "error", error: outcome.error } : { status: "ready", error: null });
    });
    return () => {
      active = false;
    };
  }, [id, runExists, phase, file]);

  // ── 서술 효과: pending 이고 작업 번호가 있으면 조회만 ──
  useEffect(() => {
    if (phase !== "pending" || !jobId) {
      setStage(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unreachableSince: number | null = null;
    const startedAt = Date.parse(getRun(id)?.narrative?.startedAt ?? "") || Date.now();

    const finish = (err: string | null) => {
      if (err) setSaveError(err);
    };
    const tick = async () => {
      const view = await fetchNarrativeJob(jobId);
      if (cancelled) return;
      if (view.kind === "done") return finish(saveDone(id, jobId, view));
      if (view.kind === "failed") return finish(saveFailed(id, jobId, view.failure));
      if (view.kind === "unreachable") {
        unreachableSince ??= Date.now();
        if (Date.now() - unreachableSince >= narrativePolling.unreachableGiveUpMs) {
          return finish(saveFailed(id, jobId, "unreachable"));
        }
      } else {
        unreachableSince = null;
        setStage(view.stage);
      }
      if (Date.now() - startedAt > narrativePolling.giveUpMs) return finish(saveFailed(id, jobId, "gave_up"));
      timer = setTimeout(tick, narrativePolling.intervalMs);
    };
    setStage((prev) => prev ?? "queued");
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, phase, jobId]);

  const retryingRef = useRef(false);
  const retryNarrative = useCallback(async () => {
    const current = getRun(id);
    // 연달아 누르면 상태가 바뀌기 전 두 번째 호출이 들어온다 — ref 로 막는다(작업이 둘 생기지 않게).
    if (!current || current.narrative?.status !== "failed" || retryingRef.current) return;
    const { failure, jobId: oldJobId } = current.narrative;
    // 서버에 닿지 않았거나 프론트가 기다리다 포기한 경우, 원래 작업은 서버에서 아직 돌거나 끝났을 수 있다. 새 유료 작업을
    // 만들기 전에 원래 작업 번호로 다시 조회한다 — 서버가 실패·유실을 알리면 그때 다시 만들기가 새 작업을 만든다.
    if (oldJobId && (failure === "unreachable" || failure === "gave_up")) {
      const err = saveRun(id, (r) => ({
        ...r,
        narrative: { ...r.narrative!, status: "pending", failure: undefined, startedAt: new Date().toISOString() },
      }));
      if (err) setSaveError(err);
      return;
    }
    const input = current.narrative.input;
    if (!input) {
      // 저장해 둔 요청이 없으면(너무 컸음) 평가부터 다시 — 서술 상태를 지우면 평가 효과가 파일을 찾는다.
      const err = saveRun(id, (r) => ({ ...r, narrative: undefined }));
      if (err) setSaveError(err);
      return;
    }
    retryingRef.current = true;
    setRetrying(true);
    try {
      const created = await createNarrativeJob(input);
      const err = saveRun(id, (r) => applyCreated(r, r.reportData, created, input));
      if (err) setSaveError(err);
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  }, [id]);

  const provideFile = useCallback((next: File) => setProvidedFile(next), []);

  const reportData = run?.reportData;
  const data = useMemo(() => {
    if (!reportData) return null;
    const normalized = normalizeReportContent(reportData);
    const source = displaySource(normalized, phase);
    return source === normalized.narrativeSource ? normalized : { ...normalized, narrativeSource: source };
  }, [reportData, phase]);

  const status: ReportStatus = !runExists ? "not_found" : evalState.status;

  return {
    data: runExists ? data : null,
    status,
    isLoading: status === "loading",
    error: evalState.error,
    narrative: { phase, stage: phase === "pending" ? stage ?? "queued" : null, failure: run?.narrative?.failure, retrying },
    narrativePending: phase === "pending",
    saveError,
    retryNarrative,
    provideFile,
    expectedFile: run?.evaluationRequest?.file ?? null,
    fileMismatch: providedFile !== null && status === "needs_file",
  };
}

/**
 * 인쇄 화면용 — 저장된 run 만 읽는다(평가·서술 작업을 시작하지 않는다). 인쇄는 서술까지 끝난 완성본만.
 * 인쇄 탭이 같은 평가 훅을 돌리면 탭마다 평가와 서술 작업이 새로 나갔다.
 */
export function useStoredReport(id: string): {
  data: FinalReportData | null;
  status: "not_found" | "not_printable" | "ready";
} {
  const run = useWorkspaceStore((state) => state.evaluationRuns.find((item) => item.id === id));
  const reportData = run?.reportData;
  const data = useMemo(() => (reportData ? normalizeReportContent(reportData) : null), [reportData]);
  if (!run || !data) return { data: null, status: "not_found" };
  if (narrativePhaseOf(run) !== "done" || !data.isEvaluated) return { data, status: "not_printable" };
  return { data, status: "ready" };
}
