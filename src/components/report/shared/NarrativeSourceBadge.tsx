import { Sparkles } from "lucide-react";
import type { NarrativeSource } from "../../../types/finalReport.types";

/**
 * 서술 출처 추적성 배지 (설계 §8 요구사항).
 * - fallback: LLM 키 없음/호출 실패/grounding 위반으로 규칙 기반 생성됨을 명시한다.
 * - llm/error/undefined: 배지를 표시하지 않는다(error 는 서술이 비어 placeholder 가 노출됨).
 */
export function NarrativeSourceBadge({ source }: { source?: NarrativeSource }) {
  if (source !== "fallback") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <Sparkles className="size-3" />
      규칙 기반 자동 생성
    </span>
  );
}
