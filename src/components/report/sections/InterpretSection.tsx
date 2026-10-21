import type {
  ClassLabelInfo,
  ConfusionCounts,
  DerivedPredictionFact,
  InterpretationData,
  NarrativeSectionSource,
  NarrativeSource,
} from "../../../types/finalReport.types";
import type { TaskType } from "../../../data/evaluationData";
import type { NarrativeFacts } from "../../../lib/report/narrativeFacts";
import { derivationStatement, perLabelThresholds } from "../../../lib/report/derivationText";
import {
  MULTILABEL_IMBALANCE_DEFINITION,
  NO_ADDITIONAL_OBSERVATION_TEXT,
  SECTION7_OPINION_NOTE,
} from "../../../lib/report/narrativeSectionText";
import { SectionTitle } from "../shared/SectionTitle";
import { NarrativeSourceBadge } from "../shared/NarrativeSourceBadge";
import { draftPlaceholder, narrativePlaceholder } from "../shared/narrativePlaceholder";
import { SubsectionTitle } from "../shared/SubsectionTitle";
import { SectionSourceBadge, sectionBadgeKind } from "../shared/SectionSourceBadge";
import { NarrativeFactTables } from "../shared/NarrativeFactTables";

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
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
  /** 칸(소절)별 출처(`FinalReportData.narrativeSections`). 판 3 에서 규칙 기반 칸 옆에 화면 전용 배지를 단다. */
  narrativeSections?: Record<string, NarrativeSectionSource>;
  /** 작업 유형 — 멀티레이블이면 7.2 앞 고정 문구 7, 다중 클래스면 최다 오분류 쌍 표(판 3). */
  taskType?: TaskType;
  /** 서술용 파생값(`FinalReportData.narrativeFacts`) — 7.1 아래 D6 표(판 3). 없는 옛 run 은 표 없음. */
  narrativeFacts?: NarrativeFacts;
  /** 3절 클래스 레이블 설명 — D6 표의 클래스 이름을 "이름(설명)"으로. */
  classLabelDescriptions?: ClassLabelInfo[];
}

const PLACEHOLDER =
  "자동 서술 생성(LLM) 연동 예정 — 계산된 지표·혼동행렬을 바탕으로 한 정밀 분석이 표시됩니다.";

/**
 * 서술 블록: 채운 텍스트가 있으면 인용, 없으면 자리표시자. 판 3 은 소절 제목 옆에 칸별 배지(`badge`)를 달고,
 * 인용 아래에 표(`after`)를 둘 수 있고, 줄바꿈을 살린다. `emptyText` 는 끝난 성적서의 빈 칸 문구(7.3 의 "해당 없음").
 */
function NarrativeBlock({
  number,
  title,
  text,
  source,
  schema3,
  badge = null,
  emptyText,
  after,
  children,
}: {
  number: string;
  title: string;
  text: string;
  source?: NarrativeSource;
  schema3?: boolean;
  badge?: "fallback" | null;
  emptyText?: string;
  after?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasText = (text ?? "").trim().length > 0;
  const waiting = source === "pending" || source === "failed";
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
      ) : emptyText !== undefined && !waiting ? (
        <p className="text-sm text-slate-700">{emptyText}</p>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          {narrativePlaceholder(source, draftPlaceholder(PLACEHOLDER, schema3))}
        </p>
      )}
      {after}
    </div>
  );
}

/** 고정 문구 9 — 예측값이 확률에 결정 임계값을 적용해 만든 것임을 7.1 앞에 밝힌다. */
function DerivationNote({ fact, schema3 }: { fact: DerivedPredictionFact; schema3?: boolean }) {
  const perLabel = perLabelThresholds(fact);
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p>
        {derivationStatement(fact, { legacyParticle: !schema3 })}
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
  schema3,
  narrativeSections,
  taskType,
  narrativeFacts,
  classLabelDescriptions,
}: InterpretSectionProps) {
  // 구버전 persist 데이터 등으로 interpretation 이 객체가 아닐 수 있어 방어적으로 정규화한다.
  const interp: InterpretationData =
    interpretation && typeof interpretation === "object"
      ? interpretation
      : { confusionAnalysis: "", distributionAnalysis: "" };

  const badge = (section: string) => sectionBadgeKind(schema3, source, narrativeSections, section);
  // 7.3 은 판 3 에만. 서술이 끝난 성적서(빈 글 포함)는 글 또는 고정 문구 15, 끝나기 전 초안(키 없음)은 다른 칸과 같은 자리표시자.
  const observations = interp.additionalObservations;

  return (
    <section className="space-y-6 border-t border-slate-200 py-10">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle number={7} title="정밀 분석 및 오분류 특성 진단" />
        {/* 판 3 은 장 단위 배지 대신 소절마다 화면 전용 배지(사용자 결정 3). */}
        {!schema3 && <NarrativeSourceBadge source={source} />}
      </div>
      {schema3 && <p className="text-xs leading-5 text-slate-500">{SECTION7_OPINION_NOTE}</p>}

      {/* 7.1 앞 고정 문구 9 — 파생 예측 사실 */}
      {derivedPrediction && <DerivationNote fact={derivedPrediction} schema3={schema3} />}

      <NarrativeBlock
        number="7.1"
        schema3={schema3}
        title="혼동 행렬 기반 클래스 간 간섭 분석"
        text={interp.confusionAnalysis}
        source={source}
        badge={badge("7.1")}
        // D6 표 — 서술의 검산 근거(판 3). 서술보다 뒤에 둔다: 위의 건수 표·고정 문구 17 은 서술이 인용하는 원값이다.
        after={
          schema3 ? (
            <NarrativeFactTables
              facts={narrativeFacts}
              multiclass={taskType === "multiclass"}
              descriptions={classLabelDescriptions}
            />
          ) : undefined
        }
      >
        {confusionCounts && <ConfusionCountsTable counts={confusionCounts} />}
        {errorRatioSentence && <p className="text-sm text-slate-700">{errorRatioSentence}</p>}
      </NarrativeBlock>
      <NarrativeBlock
        number="7.2"
        schema3={schema3}
        title="데이터 분포 유의성 및 클래스 편향성 평가"
        text={interp.distributionAnalysis}
        source={source}
        badge={badge("7.2")}
      >
        {/* 7.2 고정 문구 7 — 다중 레이블 불균형 비율의 정의(서술의 불균형 문장 앞, 판 3) */}
        {schema3 && taskType === "multilabel" && (
          <p className="text-sm text-slate-700">{MULTILABEL_IMBALANCE_DEFINITION}</p>
        )}
        {/* 7.2 고정 문구 12 — 정답 라벨 주의 */}
        {labelCautionSentence && <p className="text-sm text-slate-700">{labelCautionSentence}</p>}
      </NarrativeBlock>
      {/* 7.3 추가 관찰(서술 설계 D38) — 판정·문제 목록에 들어가지 않아 9절 권고로 이어지지 않는다. */}
      {schema3 && (
        <NarrativeBlock
          number="7.3"
          schema3={schema3}
          title="추가 관찰"
          text={observations ?? ""}
          source={source}
          badge={badge("7.3")}
          emptyText={observations !== undefined ? NO_ADDITIONAL_OBSERVATION_TEXT : undefined}
        />
      )}
    </section>
  );
}
