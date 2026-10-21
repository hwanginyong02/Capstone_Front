import type { ReportRecommendation } from "../../../types/report.types";
import type {
  RecommendationNarrative,
  NarrativeSource,
  Problem,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";
import { narrativePlaceholder, recommendationPlaceholder } from "../shared/narrativePlaceholder";
import { cn } from "../../../utils/styling/styles";
import { problemLabel } from "../../../lib/report/problemList";

const PRIORITY_CONFIG = {
  HIGH:   { label: "HIGH",   className: "border-red-200 bg-red-50 text-red-700" },
  MEDIUM: { label: "MEDIUM", className: "border-amber-200 bg-amber-50 text-amber-700" },
  LOW:    { label: "LOW",    className: "border-slate-200 bg-slate-50 text-slate-600" },
} as const;

interface RecommendSectionProps {
  recommendations: ReportRecommendation[];
  narrative: RecommendationNarrative;
  source?: NarrativeSource;
  /**
   * 문제 목록(서술 설계 D22). **키가 있는 성적서만** 문제 번호 표로 그린다 — 0개면 고정 문구 6.
   * 없으면(이 키가 생기기 전 성적서) 종전 표 그대로다.
   */
  problems?: Problem[];
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

// 성적서 고정 문구 6 — 사실 시트의 고정 문장 목록과 같은 상수 하나(reportConstants).
export { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import { SubsectionTitle } from "../shared/SubsectionTitle";

/** 문제는 있는데 그 문제에 묶인 권고가 아직 없을 때(서술 생성 전·실패) 권고 칸에 찍는다. */
const RECOMMENDATION_PENDING = "권고 생성 예정";

const PLACEHOLDER = "자동 서술 생성(LLM) 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.";

/** 서술 블록: 텍스트가 있으면 인용, 없으면 "생성 예정" 플레이스홀더 */
function NarrativeBlock({
  number,
  title,
  text,
  source,
  schema3,
}: {
  number: string;
  title: string;
  text: string;
  source?: NarrativeSource;
  schema3?: boolean;
}) {
  const hasText = (text ?? "").trim().length > 0;
  return (
    <div className="space-y-2">
      <SubsectionTitle number={number} schema3={schema3} className="text-sm font-semibold text-slate-700">{title}</SubsectionTitle>
      {hasText ? (
        <blockquote className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm font-medium leading-relaxed text-slate-700">"{text}"</p>
        </blockquote>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          {narrativePlaceholder(source, PLACEHOLDER)}
        </p>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: ReportRecommendation["priority"] }) {
  const { label, className } = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * 문제 번호 표(설계 4열: 우선순위 · 대응 문제 번호 · 권고 · 기대 효과). 문제 번호 순서대로, 한 문제에
 * 권고가 여럿이면 줄도 여럿이다. 권고가 없는 문제도 줄을 남긴다 — 문제는 서술과 무관하게 정해졌다.
 * 어느 문제에도 묶이지 않은 권고(문제 번호를 모르는 서버 응답)는 끝에 "—"로 붙인다.
 */
function ProblemTable({
  problems,
  recommendations,
  source,
}: {
  problems: Problem[];
  recommendations: ReportRecommendation[];
  source?: NarrativeSource;
}) {
  const ids = new Set(problems.map((p) => p.id));
  const rows: Array<{ priority: ReportRecommendation["priority"]; label: string; rec?: ReportRecommendation }> = [];
  for (const problem of problems) {
    const recs = recommendations.filter((rec) => rec.problemId === problem.id);
    if (recs.length === 0) rows.push({ priority: problem.priority, label: problemLabel(problem) });
    for (const rec of recs) rows.push({ priority: problem.priority, label: problemLabel(problem), rec });
  }
  for (const rec of recommendations.filter((r) => !r.problemId || !ids.has(r.problemId))) {
    rows.push({ priority: rec.priority, label: "—", rec });
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-slate-200">
          <th className="py-2 pr-3 text-left font-medium text-slate-500 w-24">우선순위</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500 w-48">대응 문제 번호</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500">권고</th>
          <th className="py-2 text-left font-medium text-slate-500">기대 효과</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-b-0 align-top">
            <td className="py-2.5 pr-3">
              <PriorityBadge priority={row.priority} />
            </td>
            <td className="py-2.5 pr-4 text-xs text-slate-600">{row.label}</td>
            {row.rec ? (
              <>
                <td className="py-2.5 pr-4 text-sm text-slate-800">{row.rec.action}</td>
                <td className="py-2.5 text-xs text-slate-500">{row.rec.expectedImpact}</td>
              </>
            ) : (
              <>
                <td className="py-2.5 pr-4 text-xs text-slate-400">{recommendationPlaceholder(source, RECOMMENDATION_PENDING)}</td>
                <td className="py-2.5 text-xs text-slate-400">—</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RecommendSection({ recommendations, narrative, source, problems, schema3 }: RecommendSectionProps) {
  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle number={9} title="기술 개선 권고안" />
        <NarrativeSourceBadge source={source} />
      </div>

      {/* 9.1 데이터셋 보완 및 품질 개선 전략 */}
      <NarrativeBlock number="9.1" schema3={schema3} title="데이터셋 보완 및 품질 개선 전략" text={narrative.dataQuality} source={source} />

      {/* 9.2 모델 고도화 및 운영 관리 가이드 */}
      <NarrativeBlock number="9.2" schema3={schema3} title="모델 고도화 및 운영 관리 가이드" text={narrative.modelOps} source={source} />

      {/* 권고 표 — 문제 목록이 있는 성적서는 문제 번호 표(0개면 고정 문구 6), 없으면 종전 표 */}
      {problems !== undefined ? (
        problems.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            {NO_PROBLEM_SENTENCE}
          </p>
        ) : (
          <ProblemTable problems={problems} recommendations={recommendations} source={source} />
        )
      ) : recommendations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          {narrativePlaceholder(source, "권고 항목은 자동 서술 생성(LLM) 연동 시 표시됩니다.")}
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
            return (
              <tr key={i} className="border-b border-slate-100 last:border-b-0 align-top">
                <td className="py-2.5 pr-3">
                  <PriorityBadge priority={rec.priority} />
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
