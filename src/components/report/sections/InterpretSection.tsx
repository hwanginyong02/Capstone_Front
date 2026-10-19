import type {
  ConfusionCounts,
  DerivedPredictionFact,
  InterpretationData,
  NarrativeSource,
} from "../../../types/finalReport.types";
import { derivationStatement, perLabelThresholds } from "../../../lib/report/derivationText";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";
import { narrativePlaceholder } from "../shared/narrativePlaceholder";

interface InterpretSectionProps {
  interpretation: InterpretationData;
  source?: NarrativeSource;
  /**
   * 예측을 확률에서 파생했다는 사실. 7.1 앞 고정 문구 9 로 찍는다(재료 목록 4절). 판 2 이전에
   * 발급된 보관본은 이 문장을 6.0 일러두기에 찍었으므로 넘기지 않는다.
   */
  derivedPrediction?: DerivedPredictionFact;
  /** TP·TN·FP·FN 건수. 7.1 에 찍는다(재료 목록 9절). 이 키가 생기기 전 성적서에는 없다. */
  confusionCounts?: ConfusionCounts | null;
  /**
   * 경계·확신 오류 비율 한 문장(설계 D30). 생성 때 저장한 문장을 그대로 찍는다 — 이 키가 생기기 전
   * 성적서와 확률이 없는 평가에는 없다.
   */
  errorRatioSentence?: string;
  /**
   * 정답 라벨 주의 고정 문구 12. 생성 때 저장한 문장을 7.2 에 그대로 찍는다 — 걸리지 않았거나 이 키가
   * 생기기 전 성적서에는 없다.
   */
  labelCautionSentence?: string;
}

const PLACEHOLDER =
  "자동 서술 생성(LLM) 연동 예정 — 계산된 지표·혼동행렬을 바탕으로 한 정밀 분석이 표시됩니다.";

/** 서술 블록: LLM이 채운 텍스트가 있으면 인용, 없으면 "생성 예정" 플레이스홀더 */
function NarrativeBlock({
  title,
  text,
  source,
  children,
}: {
  title: string;
  text: string;
  source?: NarrativeSource;
  children?: React.ReactNode;
}) {
  const hasText = (text ?? "").trim().length > 0;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {children}
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

/** 고정 문구 9 — 예측값이 확률에 결정 임계값을 적용해 만든 것임을 7.1 앞에 밝힌다. */
function DerivationNote({ fact }: { fact: DerivedPredictionFact }) {
  const perLabel = perLabelThresholds(fact);
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p>
        {derivationStatement(fact)}
        {fact.source_columns.length > 0 && perLabel.length === 0 && (
          <span className="text-slate-500"> (점수 컬럼: {fact.source_columns.join(", ")})</span>
        )}
      </p>
      {perLabel.length > 0 && (
        <table className="text-xs border-collapse" aria-label="레이블별 결정 임계값">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-1 pr-6 text-left font-medium text-slate-500">점수 컬럼</th>
              <th className="py-1 text-left font-medium text-slate-500">결정 임계값</th>
            </tr>
          </thead>
          <tbody>
            {perLabel.map(([column, threshold]) => (
              <tr key={column} className="border-b border-slate-100 last:border-b-0">
                <td className="py-1 pr-6 font-mono">{column}</td>
                <td className="py-1 font-mono">{threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** TP·TN·FP·FN 건수 표. 이진은 양성 클래스 한 줄, 다중·멀티는 클래스(레이블)마다 일대다. */
function ConfusionCountsTable({ counts }: { counts: ConfusionCounts }) {
  const binary = counts.kind === "binary";
  return (
    <div className="space-y-1">
      <table className="w-full text-sm border-collapse" aria-label="TP·TN·FP·FN 건수">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">
              {binary ? "양성 클래스" : "클래스"}
            </th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">TP</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">TN</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">FP</th>
            <th className="py-1.5 text-left text-xs font-medium text-slate-500">FN</th>
          </tr>
        </thead>
        <tbody>
          {counts.rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-50 last:border-b-0">
              <td className="py-1.5 pr-4 text-slate-700">{row.label}</td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">{row.tp}</td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">{row.tn}</td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-slate-900">{row.fp}</td>
              <td className="py-1.5 font-mono tabular-nums text-slate-900">{row.fn}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!binary && (
        <p className="text-xs text-slate-500">클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다.</p>
      )}
    </div>
  );
}

export function InterpretSection({
  interpretation,
  source,
  derivedPrediction,
  confusionCounts,
  errorRatioSentence,
  labelCautionSentence,
}: InterpretSectionProps) {
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

      {/* 7.1 앞 고정 문구 9 — 파생 예측 사실 */}
      {derivedPrediction && <DerivationNote fact={derivedPrediction} />}

      <NarrativeBlock title="혼동 행렬 기반 클래스 간 간섭 분석" text={interp.confusionAnalysis} source={source}>
        {confusionCounts && <ConfusionCountsTable counts={confusionCounts} />}
        {errorRatioSentence && <p className="text-sm text-slate-700">{errorRatioSentence}</p>}
      </NarrativeBlock>
      <NarrativeBlock
        title="데이터 분포 유의성 및 클래스 편향성 평가"
        text={interp.distributionAnalysis}
        source={source}
      >
        {/* 7.2 고정 문구 12 — 정답 라벨 주의 */}
        {labelCautionSentence && <p className="text-sm text-slate-700">{labelCautionSentence}</p>}
      </NarrativeBlock>
    </section>
  );
}
