/**
 * fetchNarrative — /api/generate-narrative 호출 + 응답(snake_case) → 리포트 필드(camelCase) 매핑.
 *
 * graceful degradation: 호출 실패/비정상 응답 시 빈 서술을 반환한다(섹션이 "생성 예정" 안내 표시).
 * verdict/score 는 여기서 다루지 않는다 — 프론트 규칙(computeVerdict)이 권위를 가지며,
 * 호출부에서 ruleConclusion 과 병합한다(백엔드도 verdict 를 fact_sheet 값으로 강제함).
 */
import type {
  BenchmarkRef,
  InterpretationData,
  NarrativeSource,
  RecommendationNarrative,
} from "../../types/finalReport.types";
import type { ReportRecommendation } from "../../types/report.types";
import type { NarrativeRequestPayload } from "./buildFactSheet";
import { apiUrl } from "@/lib/apiBase";

export interface NarrativeFields {
  interpretation: InterpretationData;
  conclusionText: { benchmark: string; narrative: string; risks: string };
  recommendationNarrative: RecommendationNarrative;
  recommendations: ReportRecommendation[];
  /** 8.1 에 숫자로 찍는 벤치마크 비교(서버 계산). 서술 경로와 무관하게 온다. */
  benchmarkRefs: BenchmarkRef[];
  /** 추적용: llm(LLM 생성) | fallback(규칙 폴백) | error(호출 실패) */
  source: NarrativeSource;
}

const EMPTY: NarrativeFields = {
  interpretation: { confusionAnalysis: "", distributionAnalysis: "" },
  conclusionText: { benchmark: "", narrative: "", risks: "" },
  recommendationNarrative: { dataQuality: "", modelOps: "" },
  recommendations: [],
  benchmarkRefs: [],
  source: "error",
};

function toBenchmarkRefs(raw: unknown): BenchmarkRef[] {
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
    }))
    .filter((r) => [r.modelValue, r.refLow, r.refHigh].every(Number.isFinite));
}

function normalizePriority(v: unknown): ReportRecommendation["priority"] {
  const s = String(v ?? "").toUpperCase();
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "MEDIUM";
}

// 백엔드 최악 지연(45s × 최대 3회 시도 + backoff ≈ 150s)을 상회하는 값. 초과 시 abort→EMPTY(graceful).
const NARRATIVE_TIMEOUT_MS = 160_000;

export async function fetchNarrative(
  payload: NarrativeRequestPayload,
): Promise<NarrativeFields> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NARRATIVE_TIMEOUT_MS);
  try {
    const resp = await fetch(apiUrl("/api/generate-narrative"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) return EMPTY;

    const n = await resp.json();
    return {
      interpretation: {
        confusionAnalysis: n.interpretation?.confusion_analysis ?? "",
        distributionAnalysis: n.interpretation?.distribution_analysis ?? "",
      },
      conclusionText: {
        benchmark: n.conclusion?.benchmark ?? "",
        narrative: n.conclusion?.narrative ?? "",
        risks: n.conclusion?.risks ?? "",
      },
      recommendationNarrative: {
        dataQuality: n.recommendation_narrative?.data_quality ?? "",
        modelOps: n.recommendation_narrative?.model_ops ?? "",
      },
      recommendations: Array.isArray(n.recommendations)
        ? n.recommendations.map((r: any) => ({
            priority: normalizePriority(r.priority),
            category: String(r.category ?? ""),
            action: String(r.action ?? ""),
            expectedImpact: String(r.expected_impact ?? ""),
          }))
        : [],
      benchmarkRefs: toBenchmarkRefs(n.benchmark_refs),
      source: n.meta?.source === "llm" ? "llm" : "fallback",
    };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}
