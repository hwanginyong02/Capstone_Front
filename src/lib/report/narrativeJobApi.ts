/**
 * narrativeJobApi — 서술 작업 번호(job) 경로 클라이언트 + 응답(snake_case) → 리포트 필드(camelCase) 매핑.
 *
 * 서술은 요청 하나로 받지 않는다(서술 라운드 S3b). `POST /api/narrative/jobs` 가 작업 번호와 8.1 벤치마크 표를
 * 즉시 주고, `GET /api/narrative/jobs/{id}` 로 단계와 결과를 본다. 종전 `fetchNarrative`(옛 경로 한 번 호출)는
 * 실패를 빈 서술로 흡수해 그것이 완성본으로 저장·발급됐다(점검 유-1) — 여기서는 실패를 실패로 돌려준다.
 *
 * verdict/score 는 다루지 않는다 — 프론트 규칙(computeVerdict)이 권위를 가지며 호출부가 규칙 결론과 병합한다.
 */
import type {
  BenchmarkRef,
  BenchmarkTargetPosition,
  InterpretationData,
  NarrativeSectionSource,
  RecommendationNarrative,
} from "../../types/finalReport.types";
import type { ReportRecommendation } from "../../types/report.types";
import type { NarrativeRequestPayload } from "./buildFactSheet";
import { apiUrl } from "@/lib/apiBase";

/** 작업 단계 — 백엔드 `JobStage`. 화면 진행 표시에만 쓰고 저장하지 않는다. */
export type NarrativeJobStage = "queued" | "generating" | "checking" | "regenerating" | "done" | "failed";

/**
 * 실패 종류. 앞의 넷은 백엔드가 알려 준다(timeout: 전체 10분 제한, lost: 서버 재시작 등으로 멈춤, error: 작업 중 오류,
 * expired: 결과 글 보관 시간 지남). 뒤의 둘은 프론트가 정한다 — unreachable: 조회가 거듭 실패(서버에 닿지 않음),
 * gave_up: 작업을 만든 뒤 너무 오래 기다림(서버가 끝을 알리지 않음), create_failed: 작업을 만들지 못함(네트워크·5xx), rejected: 서버가 요청을 받지 않음(413 본문 2MB 초과·422 형식 오류 —
 * 같은 요청을 다시 보내도 같으므로 다시 만들기로 풀리지 않는다). rejected 를 뺀 나머지는 "서술 다시 만들기"로 푼다.
 */
export type NarrativeFailure =
  | "timeout"
  | "lost"
  | "error"
  | "expired"
  | "unreachable"
  | "gave_up"
  | "create_failed"
  | "rejected";

/** 다시 만들기로 풀리는 실패인가 — 같은 요청을 다시 보내도 같은 실패(rejected)는 아니다. */
export function isRetryable(failure: NarrativeFailure | undefined): boolean {
  return failure !== "rejected";
}

export interface NarrativeFields {
  interpretation: InterpretationData;
  conclusionText: { benchmark: string; narrative: string; risks: string };
  recommendationNarrative: RecommendationNarrative;
  recommendations: ReportRecommendation[];
  /** 칸(소절 번호)마다 출처. */
  sectionSources: Record<string, NarrativeSectionSource>;
  /**
   * 칸마다 쓴 모델 이름(llm 칸만, 나머지 null — 사용자 결정 4). 응답에 section_models 가 없으면(이 칸이 생기기 전
   * 서버) undefined — "기록 없음"이지 "모든 칸이 규칙"이 아니다.
   */
  sectionModels?: Record<string, string | null>;
  /** 성적서 전체 출처(옛 배지용) — 칸이 모두 llm 이면 llm, 하나라도 아니면 fallback. */
  source: "llm" | "fallback";
}

const TARGET_POSITIONS: readonly BenchmarkTargetPosition[] = ["below", "within", "above"];
const SECTION_SOURCES: readonly NarrativeSectionSource[] = ["llm", "fallback", "fixed"];

/**
 * 목표값·목표값 수준(설계 D31). 응답에 키가 없으면(이 필드가 생기기 전 서버) 필드를 아예 두지 않는다 —
 * 8.1 표는 키가 있는 성적서에만 열을 그리므로, null 로 채우면 옛 응답에도 빈 열이 생긴다.
 */
function toTargetFields(r: any): Pick<BenchmarkRef, "targetValue" | "targetPosition"> {
  const out: Pick<BenchmarkRef, "targetValue" | "targetPosition"> = {};
  if ("target_value" in r) {
    const v = r.target_value === null ? NaN : Number(r.target_value);
    out.targetValue = Number.isFinite(v) ? v : null;
  }
  if ("target_position" in r) {
    out.targetPosition = TARGET_POSITIONS.includes(r.target_position) ? r.target_position : null;
  }
  return out;
}

/** 8.1 벤치마크 비교(서버 계산). 작업 생성 응답과 조회 응답이 같은 모양으로 싣는다. */
export function toBenchmarkRefs(raw: unknown): BenchmarkRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object" && typeof r.metric === "string")
    .map((r: any) => ({
      metric: r.metric,
      modelValue: Number(r.model_value),
      refLow: Number(r.ref_low),
      refHigh: Number(r.ref_high),
      quality: String(r.quality ?? ""),
      direction: String(r.direction ?? "higher"),
      sourceNote: String(r.source_note ?? ""),
      ...toTargetFields(r),
    }))
    .filter((r) => [r.modelValue, r.refLow, r.refHigh].every(Number.isFinite));
}

function normalizePriority(v: unknown): ReportRecommendation["priority"] {
  const s = String(v ?? "").toUpperCase();
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "MEDIUM";
}

/** 칸별 모델 이름. 객체가 아니면 없음, 빈 글·문자열이 아닌 값은 null. */
function toSectionModels(raw: unknown): Record<string, string | null> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, typeof v === "string" && v.trim() !== "" ? v.trim() : null]),
  );
}

function toSectionSources(raw: unknown): Record<string, NarrativeSectionSource> {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
      k,
      SECTION_SOURCES.includes(v as NarrativeSectionSource) ? (v as NarrativeSectionSource) : "fallback",
    ]),
  );
}

/** 끝난 작업의 result(snake_case) → 리포트 필드. 빠진 칸은 빈 값, 모르는 출처는 fallback 으로 둔다. */
export function mapNarrativeResult(n: any): NarrativeFields {
  const sectionSources = toSectionSources(n?.section_sources);
  // 고정 문구(fixed) 칸은 AI·규칙 어느 쪽도 아니라 전체 출처를 정할 때 뺀다 — S5 에서 고정 칸이 생겨도 AI 성적서가
  // 통째로 '규칙 기반' 배지를 달지 않게. 칸별 표시는 S7.
  const values = Object.values(sectionSources).filter((v) => v !== "fixed");
  return {
    interpretation: {
      confusionAnalysis: n?.interpretation?.confusion_analysis ?? "",
      distributionAnalysis: n?.interpretation?.distribution_analysis ?? "",
      // 7.3 — 응답에 없으면(옛 서버) 빈 글.
      additionalObservations: n?.interpretation?.additional_observations ?? "",
    },
    conclusionText: {
      benchmark: n?.conclusion?.benchmark ?? "",
      narrative: n?.conclusion?.narrative ?? "",
      risks: n?.conclusion?.risks ?? "",
    },
    recommendationNarrative: {
      dataQuality: n?.recommendation_narrative?.data_quality ?? "",
      modelOps: n?.recommendation_narrative?.model_ops ?? "",
    },
    recommendations: Array.isArray(n?.recommendations)
      ? n.recommendations.map((r: any) => ({
          priority: normalizePriority(r.priority),
          category: String(r.category ?? ""),
          action: String(r.action ?? ""),
          expectedImpact: String(r.expected_impact ?? ""),
          // 대응 문제 번호(서술 설계 D22). 문제 목록이 생기기 전 서버는 이 키가 없다 — 그때는 필드를 두지 않는다.
          ...(typeof r.problem_id === "string" && r.problem_id.trim() !== ""
            ? { problemId: r.problem_id.trim() }
            : {}),
        }))
      : [],
    sectionSources,
    sectionModels: toSectionModels(n?.section_models),
    source: values.length > 0 && values.every((v) => v === "llm") ? "llm" : "fallback",
  };
}

/* ------------------------------------------------------------------ *
 * 호출
 * ------------------------------------------------------------------ */

/**
 * 작업 생성 결과.
 * - started: 작업이 생겼다 — 조회로 기다린다.
 * - finished: 서버가 작업 행을 만들지 않고 규칙 문장 결과를 바로 줬다(작업 행 시간당 상한을 넘었을 때). 조회 없이 완성본이다.
 * - failed: 작업을 만들지 못했다.
 */
export type CreateJobResult =
  | { kind: "started"; jobId: string; benchmarkRefs: BenchmarkRef[] }
  | { kind: "finished"; fields: NarrativeFields; benchmarkRefs: BenchmarkRef[] }
  | { kind: "failed"; failure: Extract<NarrativeFailure, "create_failed" | "rejected"> };

/** 작업을 만든다. 실패(네트워크·5xx → create_failed, 413·422 → rejected)는 던지지 않고 실패로 돌려준다. */
export async function createNarrativeJob(payload: NarrativeRequestPayload): Promise<CreateJobResult> {
  try {
    const resp = await fetch(apiUrl("/api/narrative/jobs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (resp.status === 413 || resp.status === 422) return { kind: "failed", failure: "rejected" };
    if (!resp.ok) return { kind: "failed", failure: "create_failed" };
    const body = await resp.json();
    const benchmarkRefs = toBenchmarkRefs(body?.benchmark_refs);
    if (body?.status === "done" && body.result) {
      return { kind: "finished", fields: mapNarrativeResult(body.result), benchmarkRefs };
    }
    if (typeof body?.job_id !== "string" || body.job_id === "") return { kind: "failed", failure: "create_failed" };
    return { kind: "started", jobId: body.job_id, benchmarkRefs };
  } catch {
    return { kind: "failed", failure: "create_failed" };
  }
}

export type JobView =
  | { kind: "running"; stage: NarrativeJobStage }
  | { kind: "done"; fields: NarrativeFields; benchmarkRefs: BenchmarkRef[] }
  | { kind: "failed"; failure: NarrativeFailure }
  /** 조회 자체가 안 됨(네트워크·5xx) — 호출부가 몇 번 다시 해 본다. */
  | { kind: "unreachable" };

const SERVER_FAILURES: readonly NarrativeFailure[] = ["timeout", "lost", "error", "expired"];
const STAGES: readonly NarrativeJobStage[] = ["queued", "generating", "checking", "regenerating", "done", "failed"];

/** 작업 하나를 조회한다. 없는 번호(404)는 유실로 본다 — 서버 DB 가 바뀌었거나 행이 지워졌다. */
export async function fetchNarrativeJob(jobId: string): Promise<JobView> {
  let resp: Response;
  try {
    resp = await fetch(apiUrl(`/api/narrative/jobs/${encodeURIComponent(jobId)}`));
  } catch {
    return { kind: "unreachable" };
  }
  if (resp.status === 404) return { kind: "failed", failure: "lost" };
  if (!resp.ok) return { kind: "unreachable" };
  let body: any;
  try {
    body = await resp.json();
  } catch {
    return { kind: "unreachable" };
  }
  if (body?.status === "done" && body.result) {
    return { kind: "done", fields: mapNarrativeResult(body.result), benchmarkRefs: toBenchmarkRefs(body.benchmark_refs) };
  }
  if (body?.status === "failed" || body?.status === "done") {
    const failure = SERVER_FAILURES.includes(body.failure) ? (body.failure as NarrativeFailure) : "error";
    return { kind: "failed", failure };
  }
  return { kind: "running", stage: STAGES.includes(body?.stage) ? body.stage : "queued" };
}
