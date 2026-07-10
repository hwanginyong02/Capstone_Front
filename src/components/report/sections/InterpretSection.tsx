import type {
  InterpretationData,
  NarrativeSource,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";

interface InterpretSectionProps {
  interpretation: InterpretationData;
  source?: NarrativeSource;
}

const PLACEHOLDER =
  "자동 서술 생성(LLM) 연동 예정 — 계산된 지표·혼동행렬을 바탕으로 한 정밀 분석이 표시됩니다.";

/** 서술 블록: LLM이 채운 텍스트가 있으면 인용, 없으면 "생성 예정" 플레이스홀더 */
function NarrativeBlock({ title, text }: { title: string; text: string }) {
  const hasText = (text ?? "").trim().length > 0;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {hasText ? (
        <blockquote className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm font-medium leading-relaxed text-slate-700">"{text}"</p>
        </blockquote>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          {PLACEHOLDER}
        </p>
      )}
    </div>
  );
}

export function InterpretSection({ interpretation, source }: InterpretSectionProps) {
  // 구버전 persist 데이터 등으로 interpretation 이 객체가 아닐 수 있어 방어적으로 정규화한다.
  const interp: InterpretationData =
    interpretation && typeof interpretation === "object"
      ? interpretation
      : { confusionAnalysis: "", distributionAnalysis: "" };

  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle number={7} title="정밀 분석 및 오분류 특성 진단" />
        <NarrativeSourceBadge source={source} />
      </div>

      <NarrativeBlock
        title="혼동 행렬 기반 클래스 간 간섭 분석"
        text={interp.confusionAnalysis}
      />
      <NarrativeBlock
        title="데이터 분포 유의성 및 클래스 편향성 평가"
        text={interp.distributionAnalysis}
      />
    </section>
  );
}
