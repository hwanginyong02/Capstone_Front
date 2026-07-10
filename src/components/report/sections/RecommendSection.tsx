import type { ReportRecommendation } from "../../../types/report.types";
import type {
  RecommendationNarrative,
  NarrativeSource,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";
import { cn } from "../../../utils/styling/styles";

const PRIORITY_CONFIG = {
  HIGH:   { label: "HIGH",   className: "border-red-200 bg-red-50 text-red-700" },
  MEDIUM: { label: "MEDIUM", className: "border-amber-200 bg-amber-50 text-amber-700" },
  LOW:    { label: "LOW",    className: "border-slate-200 bg-slate-50 text-slate-600" },
} as const;

interface RecommendSectionProps {
  recommendations: ReportRecommendation[];
  narrative: RecommendationNarrative;
  source?: NarrativeSource;
}

const PLACEHOLDER = "자동 서술 생성(LLM) 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.";

/** 서술 블록: 텍스트가 있으면 인용, 없으면 "생성 예정" 플레이스홀더 */
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

export function RecommendSection({ recommendations, narrative, source }: RecommendSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle number={9} title="기술 개선 권고안" />
        <NarrativeSourceBadge source={source} />
      </div>

      {/* 9.1 데이터셋 보완 및 품질 개선 전략 */}
      <NarrativeBlock title="데이터셋 보완 및 품질 개선 전략" text={narrative.dataQuality} />

      {/* 9.2 모델 고도화 및 운영 관리 가이드 */}
      <NarrativeBlock title="모델 고도화 및 운영 관리 가이드" text={narrative.modelOps} />

      {/* 권고 표 요약 */}
      {recommendations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          권고 항목은 자동 서술 생성(LLM) 연동 시 표시됩니다.
        </p>
      ) : (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-2 pr-3 text-left font-medium text-slate-500 w-24">우선순위</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-500 w-28">분류</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-500">권고 내용</th>
            <th className="py-2 text-left font-medium text-slate-500">기대 효과</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec, i) => {
            const { label, className } = PRIORITY_CONFIG[rec.priority];
            return (
              <tr key={i} className="border-b border-slate-100 last:border-b-0 align-top">
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                      className,
                    )}
                  >
                    {label}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-slate-500">{rec.category}</td>
                <td className="py-2.5 pr-4 text-sm text-slate-800">{rec.action}</td>
                <td className="py-2.5 text-xs text-slate-500">{rec.expectedImpact}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </section>
  );
}
