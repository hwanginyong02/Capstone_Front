/**
 * 칸(소절)별 출처 배지(서술 라운드 세션 B, 사용자 결정 3). 판 3 성적서에서 그 칸이 규칙 기반(fallback)으로
 * 쓰였을 때만 소절 옆에 "규칙 기반 문장"을 단다 — **화면에만**(`print:hidden`, 인쇄 본문에는 없다).
 * 고정 문구(fixed)·AI(llm) 칸은 배지가 없다. 서술을 기다리는 중·만들지 못함(pending·failed)이면 낡은 칸별 출처로
 * 그리지 않는다. 판 1·2 는 장 단위 옛 배지(`NarrativeSourceBadge`)를 그대로 쓴다.
 */
import type { NarrativeSectionSource, NarrativeSource } from "../../../types/finalReport.types";

export const SECTION_SOURCE_BADGE_TEXT = "규칙 기반 문장";

/** 칸 배지를 달아야 하면 'fallback', 아니면 null. */
export function sectionBadgeKind(
  schema3: boolean | undefined,
  narrativeSource: NarrativeSource | undefined,
  narrativeSections: Record<string, NarrativeSectionSource> | undefined,
  section: string,
): "fallback" | null {
  if (!schema3) return null;
  if (narrativeSource === "pending" || narrativeSource === "failed") return null;
  return narrativeSections?.[section] === "fallback" ? "fallback" : null;
}

export function SectionSourceBadge({ kind }: { kind: "fallback" | null }) {
  if (kind !== "fallback") return null;
  return (
    <span className="print:hidden inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      {SECTION_SOURCE_BADGE_TEXT}
    </span>
  );
}
