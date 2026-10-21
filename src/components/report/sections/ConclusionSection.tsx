import { CheckCircle2, AlertTriangle, XCircle, CircleHelp } from "lucide-react";
import type {
  BenchmarkRef,
  ConclusionData,
  KpiResult,
  NarrativeSectionSource,
  NarrativeSource,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";
import { draftPlaceholder, narrativePlaceholder } from "../shared/narrativePlaceholder";
import { cn } from "../../../utils/styling/styles";
import { formatMetricValue, LEGACY_TARGET_DIGITS } from "../../../lib/report/metricValueFormat";
import { formatJudgedValue } from "../../../lib/report/judgedNumber";
import { SubsectionTitle } from "../shared/SubsectionTitle";
import { SectionSourceBadge, sectionBadgeKind } from "../shared/SectionSourceBadge";

const VERDICT_CONFIG = {
  PASS: {
    label: "최종 합격",
    icon: CheckCircle2,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    iconColor: "text-emerald-500",
  },
  CONDITIONAL_PASS: {
    label: "조건부 합격",
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    iconColor: "text-amber-500",
  },
  FAIL: {
    label: "최종 불합격",
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    iconColor: "text-red-500",
  },
  // 핵심 지표가 산출되지 않았거나 판정 대상 지표가 없을 때(서술 설계 D19). 종전에는 조건부
  // 합격으로 적어 확인하지 못한 것을 합격처럼 보이게 했다.
  INCONCLUSIVE: {
    label: "판정 불가",
    icon: CircleHelp,
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-700",
    iconColor: "text-slate-500",
  },
} as const;

interface ConclusionSectionProps {
  conclusion: ConclusionData;
  source?: NarrativeSource;
  /**
   * 아슬아슬 지표 한 줄(생성 때 저장, 설계 D12). 있으면 8.3 에 찍는다 — 6.1 판정 규칙의 "8.3에 별도
   * 표시하였다"가 가리키는 자리다. 아슬아슬 지표가 없거나 이 키가 생기기 전 성적서에는 없다.
   */
  nearTargetNote?: string;
  /**
   * 8.2 일반화 고정 문구 11a·11b(평가 데이터가 학습과 같은/다른 출처). 생성 때 저장한 문장을 서술
   * 아래 찍는다. 의뢰자가 출처 관계를 답하지 않았거나 이 키가 생기기 전 성적서에는 없다.
   */
  sourceRelationSentence?: string;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
  /** 칸(소절)별 출처(`FinalReportData.narrativeSections`). 판 3 에서 규칙 기반 칸 옆에 화면 전용 배지를 단다. */
  narrativeSections?: Record<string, NarrativeSectionSource>;
  /**
   * 8.1 고정 문구 16(`FinalReportData.noBenchmarkSentence`, 조립 때 저장). 판 3 이고 키가 있을 때만 8.1 표 아래
   * (표가 없어도 8.1 소절 안에) 찍는다.
   */
  noBenchmarkSentence?: string;
  /** 지표 결과 — 판 3 의 8.1 모델 값을 6.1 과 같은 판정 자릿수로 찍으려고 같은 이름의 결과를 찾는다. */
  kpiResults?: KpiResult[];
  /** 목표값 자릿수(`FinalReportData.targetDigits`) — 판 3 의 8.1 목표값 열. */
  targetDigits?: number;
  /** 판정 자릿수를 쓰는 성적서인가(`FinalReportData.judgedValueDigits`) — 6.1 과 같은 조건. */
  judgedValueDigits?: boolean;
}

const PLACEHOLDER = "자동 서술 생성(LLM) 연동 예정 — 현재는 규칙 기반 판정·점수만 표시됩니다.";

/** 서술 블록: 채운 텍스트가 있으면 인용, 없으면 자리표시자. 판 3 은 소절 제목 옆 칸별 배지, 줄바꿈 보존, 제목 아래 표(children). */
function NarrativeBlock({
  number,
  title,
  text,
  source,
  schema3,
  badge = null,
  children,
}: {
  number: string;
  title: string;
  text: string;
  source?: NarrativeSource;
  schema3?: boolean;
  badge?: "fallback" | null;
  children?: React.ReactNode;
}) {
  const hasText = (text ?? "").trim().length > 0;
  const heading = (
    <SubsectionTitle number={number} schema3={schema3} className="text-sm font-semibold text-slate-700">{title}</SubsectionTitle>
  );
  return (
    <div className="space-y-2">
      {schema3 ? (
        <div className="flex items-center gap-2">
          {heading}
          <SectionSourceBadge kind={badge} />
        </div>
      ) : (
        heading
      )}
      {children}
      {hasText ? (
        <blockquote className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
          <p className={schema3 ? "whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700" : "text-sm font-medium leading-relaxed text-slate-700"}>"{text}"</p>
        </blockquote>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          {narrativePlaceholder(source, draftPlaceholder(PLACEHOLDER, schema3))}
        </p>
      )}
    </div>
  );
}

export function ConclusionSection({
  conclusion,
  source,
  nearTargetNote,
  sourceRelationSentence,
  schema3,
  narrativeSections,
  noBenchmarkSentence,
  kpiResults,
  targetDigits,
  judgedValueDigits,
}: ConclusionSectionProps) {
  const config = VERDICT_CONFIG[conclusion.verdict];
  const Icon = config.icon;
  const badge = (section: string) => sectionBadgeKind(schema3, source, narrativeSections, section);
  const refs = conclusion.benchmarkRefs ?? [];
  const table =
    refs.length > 0 ? (
      <BenchmarkTable
        refs={refs}
        valueFormat={schema3 ? { kpiResults, targetDigits, judgedValueDigits } : undefined}
      />
    ) : null;

  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle number={8} title="종합 진단 소견" />
        {/* 판 3 은 장 단위 배지 대신 소절마다 화면 전용 배지(사용자 결정 3). */}
        {!schema3 && <NarrativeSourceBadge source={source} />}
      </div>

      {/* 판정 배너 */}
      <div className={cn("rounded-xl border p-5 flex items-center gap-4", config.bg)}>
        <Icon className={cn("size-8 shrink-0", config.iconColor)} />
        <div className="flex-1">
          <p className={cn("text-lg font-bold", config.text)}>{config.label}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-2xl font-bold text-slate-700">
            {/* 판정 대상이 없으면 통과율을 셀 수 없다 — 0% 로 적으면 전부 미달로 읽힌다. */}
            {conclusion.judgedCount === 0 ? "—" : `${conclusion.score.toFixed(1)}%`}
          </span>
          <p className="text-xs font-medium text-slate-500">통과율 (참고)</p>
        </div>
      </div>

      {/*
        종합 점수의 정의를 성적서에 명시한다(ISSUES.md C-09·C-06, 2026-09-07 결정 5).
        종전에는 큰 숫자만 인쇄되고 **라벨조차 없어서**, 독자가 그것을 모델의 정확도나
        신뢰도로 읽을 수 있었다. 실제 정의는 "사용자가 설정한 합격 기준의 달성률"이고
        데이터셋 특성 지표(M23 등)도 목표값을 설정했다면 분모에 들어간다.
      */}
      <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-slate-700">통과율의 정의</strong> — 사용자가 합격 목표값을
        설정한 시험항목 가운데 그 기준을 충족한 항목의 비율입니다. 목표값을 설정하지 않은
        항목과 측정 불가 항목은 분모에서 제외됩니다. 데이터셋 특성 지표(예: 불균형 비율)에
        목표값을 설정했다면 그 항목도 함께 집계되므로, 이 수치는 모델 성능만의 지표가
        아닙니다. 통과율은 참고 수치이며 판정의 근거가 아닙니다. 판정 규칙은 6.1에 적었고,
        항목별 값과 기준은 6절 표에서 확인할 수 있습니다.
      </p>

      {/* 8.1 도메인 성능 벤치마크 — 참조 범위를 숫자로 찍고(재료 목록 9절) 서술을 붙인다. */}
      {/* 판 3 은 표·고정 문구 16 을 소절 제목 아래에 둔다(옛 판은 발급 당시처럼 표가 제목 위). */}
      <div className="space-y-3">
        {!schema3 && table}
        <NarrativeBlock number="8.1" schema3={schema3} title="도메인 성능 벤치마크" text={conclusion.benchmark} source={source} badge={badge("8.1")}>
          {schema3 && table}
          {/* 8.1 고정 문구 16 — 기준표에 없는 서술 지표(사용자 결정 5). */}
          {schema3 && noBenchmarkSentence && <p className="text-sm text-slate-700">{noBenchmarkSentence}</p>}
        </NarrativeBlock>
      </div>

      {/* 8.2 전반적 성능 및 일반화 능력 총평 — 일반화 고정 문구(11a·11b)는 의뢰자 답으로 정해 서술 아래 찍는다. */}
      <div className="space-y-3">
        <NarrativeBlock number="8.2" schema3={schema3} title="전반적 성능 및 일반화 능력 총평" text={conclusion.narrative} source={source} badge={badge("8.2")} />
        {sourceRelationSentence && (
          <p className="text-sm leading-relaxed text-slate-700">{sourceRelationSentence}</p>
        )}
      </div>

      {/* 8.3 기술적 취약점 및 잠재적 리스크 요약 — 아슬아슬 지표 표시는 규칙으로 정해 서술 아래 찍는다. */}
      <div className="space-y-3">
        <NarrativeBlock number="8.3" schema3={schema3} title="기술적 취약점 및 잠재적 리스크 요약" text={conclusion.risks} source={source} badge={badge("8.3")} />
        {nearTargetNote && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            {nearTargetNote}
          </p>
        )}
      </div>
    </section>
  );
}

const QUALITY_LABEL: Record<string, string> = { better: "우수", within: "범위 내", worse: "미흡" };

/** 목표값이 참조 범위의 어디에 있는지(설계 D31). 단순 수치 위치라 방향을 반영하지 않는다. */
const TARGET_POSITION_LABEL: Record<string, string> = {
  below: "범위보다 낮음",
  within: "범위 안",
  above: "범위보다 높음",
};

/** 판 3 의 8.1 값 표기 재료 — 6.1 과 같은 지표 결과·자릿수 키. */
interface BenchmarkValueFormat {
  kpiResults?: KpiResult[];
  targetDigits?: number;
  judgedValueDigits?: boolean;
}

/**
 * 8.1 모델 값 한 칸. 판 3 은 6.1 과 같은 표기(같은 이름의 지표 결과를 `MetricRow` 규칙으로 — 판정 대상이면 판정
 * 자릿수, 아니면 셋째 자리). 서버의 `model_value` 는 넷째 자리로 반올림돼 와 다시 셈하면 정밀도를 잃으므로 지표
 * 결과의 값을 쓴다. 같은 이름의 결과가 없거나 옛 판(`format` 없음)이면 종전 `toFixed(3)`.
 */
export function benchmarkModelValueText(ref: BenchmarkRef, format: BenchmarkValueFormat | undefined): string {
  const kpi = format?.kpiResults?.find((k) => k.name === ref.metric && k.status !== "unavailable");
  if (!format || !kpi) return ref.modelValue.toFixed(3);
  const judged = kpi.threshold !== null && (kpi.status === "pass" || kpi.status === "fail");
  if (format.judgedValueDigits && judged && kpi.threshold !== null) {
    return formatJudgedValue(kpi.value, kpi.threshold, kpi.higherIsBetter !== false, kpi.status === "pass");
  }
  return kpi.value.toFixed(3);
}

/** 8.1 목표값 한 칸 — 판 3 은 6.1 과 같은 목표값 자릿수(`targetDigits`, 없으면 종전 2), 옛 판은 종전 셋째 자리. */
export function benchmarkTargetText(ref: BenchmarkRef, format: BenchmarkValueFormat | undefined): string {
  if (!format) return formatMetricValue(ref.targetValue);
  if (typeof ref.targetValue !== "number" || !Number.isFinite(ref.targetValue)) return "—";
  return ref.targetValue.toFixed(format.targetDigits ?? LEGACY_TARGET_DIGITS);
}

/** 8.1 벤치마크 비교 표 — 모델 값과 참조 범위(내부 참조 기준치). 서술보다 앞에 숫자로 둔다. */
function BenchmarkTable({ refs, valueFormat }: { refs: BenchmarkRef[]; valueFormat?: BenchmarkValueFormat }) {
  const notes = [...new Set(refs.map((r) => r.sourceNote).filter(Boolean))];
  // 목표값 열은 서버가 목표값 키를 실어 보낸 성적서에만 그린다. 그 전에 만든 성적서는 발급 당시 모양 그대로.
  const showTarget = refs.some((r) => "targetValue" in r);
  return (
    <div className="space-y-1">
      <table className="w-full text-sm border-collapse" aria-label="벤치마크 참조 범위">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">지표</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">모델 값</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">참조 범위</th>
            <th className={cn("py-1.5 text-left text-xs font-medium text-slate-500", showTarget && "pr-4")}>위치</th>
            {showTarget && (
              <>
                <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">목표값</th>
                <th className="py-1.5 text-left text-xs font-medium text-slate-500">목표값 수준</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {refs.map((r) => (
            <tr key={r.metric} className="border-b border-slate-50 last:border-b-0">
              <td className="py-1.5 pr-4 text-slate-700">
                {r.metric}
                {r.direction === "lower" && <span className="ml-1 text-xs text-slate-400">(낮을수록 좋음)</span>}
              </td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">{benchmarkModelValueText(r, valueFormat)}</td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">
                {r.refLow.toFixed(2)} ~ {r.refHigh.toFixed(2)}
              </td>
              <td className={cn("py-1.5 text-slate-700", showTarget && "pr-4")}>
                {QUALITY_LABEL[r.quality] ?? r.quality}
              </td>
              {showTarget && (
                <>
                  <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">
                    {benchmarkTargetText(r, valueFormat)}
                  </td>
                  <td className="py-1.5 text-slate-700">
                    {r.targetValue == null || !r.targetPosition
                      ? "—"
                      : TARGET_POSITION_LABEL[r.targetPosition]}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.map((note) => (
        <p key={note} className="text-xs text-slate-500">
          ※ {note}
        </p>
      ))}
    </div>
  );
}
