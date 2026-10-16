import type {
  ClassReportRow,
  ClassReportTable,
  DerivedPredictionFact,
  FinalReportMeta,
  KpiResult,
} from "../../../types/finalReport.types";
import { MetricRow } from "../shared/MetricRow";
import { PassBadge } from "../shared/PassBadge";
import { verdictRuleText } from "../../../lib/report/reportConstants";

import type { TaskType } from "../../../data/evaluationData";

interface KpiResultSectionProps {
  kpiResults: KpiResult[];
  /**
   * 클래스별 표(M22) — 클래스 줄과 평균 줄. 없으면(이 키가 생기기 전 발급된 성적서) 지표별 클래스
   * 판정(`perClass`)을 종전처럼 찍는다.
   */
  classReport?: ClassReportTable | null;
  taskType: TaskType;
  meta?: FinalReportMeta;
  /**
   * 판정 규칙 문구(고정 문구 10)를 찍을지. 이 규칙(D19)으로 판정한 성적서에만 찍는다 — 그 전
   * 규칙으로 판정해 저장된 성적서에 새 규칙을 적으면 판정과 설명이 어긋난다.
   */
  showVerdictRule?: boolean;
}

/**
 * 종전 6.1 의 유형별 고정 묶음. 핵심 지표 표시(`KpiResult.isCore`)가 생기기 전 발급된 보관본만 이
 * 묶음으로 6.1 을 그린다. 지금은 고객이 정한 핵심 지표가 6.1 이다(재료 목록 7절 "핵심 지표").
 */
const LEGACY_KPI_CORE_IDS_BY_TASK: Record<TaskType, Set<string>> = {
  binary: new Set(["M1", "M4", "M20", "M23"]),
  multiclass: new Set(["M1", "M4", "M11", "M23"]),
  multilabel: new Set(["M4", "M15", "M17", "M23"]),
};

/**
 * 파생 예측의 방법·임계값·출처를 한 문장으로. SPEC §0 이 요구하는 기재 항목이다
 * (ISSUES.md A-01) — 어떤 컬럼에서 어떤 규칙으로 만들었는지가 성적서에 남아야
 * 독자가 그 수치를 재현할 수 있다.
 */
function describeDerivation(fact: DerivedPredictionFact): string {
  const source = fact.source_columns.join(", ");
  if (fact.method === "argmax") {
    return `확률 컬럼 [${source}] 중 가장 큰 값의 클래스를 예측으로 삼았습니다(argmax, 임계값 없음).`;
  }
  if (fact.method === "threshold_per_label") {
    const t =
      typeof fact.threshold === "object" && fact.threshold !== null
        ? Object.entries(fact.threshold).map(([col, v]) => `${col} ≥ ${v}`).join(", ")
        : `모든 레이블 ≥ ${fact.threshold}`;
    return `점수 컬럼 [${source}] 에 레이블별 결정 임계값을 적용했습니다(${t}).`;
  }
  const positive = fact.positive_class ? ` 양성 클래스는 [${fact.positive_class}] 입니다.` : "";
  return `점수 컬럼 [${source}] 이 결정 임계값 ${fact.threshold} 이상이면 양성으로 판정했습니다.${positive}`;
}

export function KpiResultSection({
  kpiResults,
  classReport,
  taskType,
  meta,
  showVerdictRule = false,
}: KpiResultSectionProps) {
  // 6.1 은 고객이 정한 핵심 지표다(판정 규칙 D19 의 핵심 지표와 같다). 핵심 지표 표시가 없는 옛
  // 보관본만 종전의 유형별 고정 묶음으로 그린다.
  const hasCoreMarks = kpiResults.some((r) => r.isCore !== undefined);
  const legacyCore = LEGACY_KPI_CORE_IDS_BY_TASK[taskType] || LEGACY_KPI_CORE_IDS_BY_TASK.binary;
  const isCoreRow = (r: KpiResult) => (hasCoreMarks ? Boolean(r.isCore) : legacyCore.has(r.metricId));
  const kpiCore   = kpiResults.filter(isCoreRow);
  const kpiDetail = kpiResults.filter((r) => !isCoreRow(r));

  return (
    <div className="space-y-8 pt-8">
      {/* 6.0 평가 기준 및 일러두기 */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-700 space-y-2">
        <h4 className="font-semibold text-slate-800">성능 평가 산출 기준</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>본 성적서의 모든 성능 산출 결과 및 기준 수치는 원본 데이터에서 소수점 셋째 자리로 반올림 표기되었습니다.</li>
          {taskType === "binary" && (
            <li>본 성적서의 이진 분류 평가 지표는 사용자가 매핑 단계에서 지정한 {meta?.positiveClass ? `[ ${meta.positiveClass} ]` : "Target"} 클래스 기준으로 산출되었습니다.</li>
          )}
          {meta?.derivedPrediction && (
            <li>
              <strong>본 평가의 예측 레이블은 모델이 직접 출력한 값이 아니라 확률·점수에서 파생한 값입니다.</strong>{" "}
              {describeDerivation(meta.derivedPrediction)}
            </li>
          )}
          {kpiResults.some(r => r.metricId === "M6") && (
            <li>KL Divergence(M6) 지표는 예측 확률(Probability) 분포가 아닌, 정답 레이블과 모델이 예측한 클래스 레이블 간의 분포 차이(Target Drift)를 기반으로 산출되었습니다.</li>
          )}
        </ul>
      </div>

      {/* 6.1 종합 핵심 성능 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">종합 핵심 성능 (Key Performance Indicators)</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-2 pr-3 text-left font-medium text-slate-500 w-16">Metric ID</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500">시험항목</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500 w-28">산출 결과</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500 w-24">합격 기준</th>
              <th className="py-2 text-left font-medium text-slate-500 w-24">판정</th>
            </tr>
          </thead>
          <tbody>
            {kpiCore.map((r) => (
              <MetricRow
                key={r.metricId}
                metricId={r.metricId}
                name={r.name}
                value={r.value}
                threshold={r.threshold}
                status={r.status}
                higherIsBetter={r.higherIsBetter}
                isCore={r.isCore}
              />
            ))}
            {kpiCore.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">
                  의뢰자가 지정한 핵심 지표가 없습니다. 지표별 결과는 아래 세부 시험항목에 있습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {showVerdictRule && (
          <p className="text-xs leading-5 text-slate-500">
            {verdictRuleText(
              kpiResults.filter((r) => r.isCore).map((r) => `${r.name}(${r.metricId})`),
            )}
          </p>
        )}
      </div>

      {/* 6.2 세부 시험항목별 결과 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">세부 시험항목별 결과</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-2 pr-3 text-left font-medium text-slate-500 w-16">Metric ID</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500">시험항목</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500 w-28">산출 결과</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500 w-24">합격 기준</th>
              <th className="py-2 text-left font-medium text-slate-500 w-24">판정</th>
            </tr>
          </thead>
          <tbody>
            {kpiDetail.map((r) => (
              <MetricRow
                key={r.metricId}
                metricId={r.metricId}
                name={r.name}
                value={r.value}
                threshold={r.threshold}
                status={r.status}
                higherIsBetter={r.higherIsBetter}
                isCore={r.isCore}
              />
            ))}
          </tbody>
        </table>


        {/* M22 클래스별 표 — 클래스 줄 아래에 평균 줄(매크로·가중·마이크로·샘플). M22 만 골라도 보인다. */}
        {classReport && <ClassReportBlock table={classReport} />}

        {/* 지표별 클래스 판정 — classReport 가 생기기 전 발급된 성적서에만 있다(보관본을 종전대로 그린다). */}
        {!classReport && kpiResults.some((r) => r.perClass?.length) && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700">M22 — Class-wise Metric (클래스별 세부 성능)</p>
            {kpiResults
              .filter((r) => r.perClass?.length)
              .map((r) => (
                <div key={r.metricId} className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    {r.metricId} — {r.name}
                  </p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-400">클래스</th>
                        <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-400">값</th>
                        <th className="py-1.5 text-left text-xs font-medium text-slate-400">판정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.perClass!.map((pc) => (
                        <tr key={pc.label} className="border-b border-slate-50 last:border-b-0">
                          <td className="py-1.5 pr-4 text-slate-700">{pc.label}</td>
                          <td className="py-1.5 pr-4 font-mono text-slate-900">{pc.value.toFixed(3)}</td>
                          <td className="py-1.5">
                            <PassBadge verdict={pc.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
        {/* Sub-metrics 세부 결과 */}
        {kpiResults.some((r) => r.subMetrics) && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-600">Average 지표 세부 결과 (M11 / M12 / M13)</p>
            {kpiResults
              .filter((r) => r.subMetrics)
              .map((r) => (
                <div key={`${r.metricId}-sub`} className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    {r.metricId} — {r.name}
                  </p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-400 w-32">Metric</th>
                        <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-400">값</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-50">
                        <td className="py-1.5 pr-4 text-slate-700">Precision</td>
                        <td className="py-1.5 pr-4 font-mono text-slate-900">{r.subMetrics!.precision.toFixed(3)}</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-1.5 pr-4 text-slate-700">Recall</td>
                        <td className="py-1.5 pr-4 font-mono text-slate-900">{r.subMetrics!.recall.toFixed(3)}</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-1.5 pr-4 text-slate-700">F1 Score</td>
                        <td className="py-1.5 pr-4 font-mono text-slate-900">{r.subMetrics!.f1Score.toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

const fmt = (v: number | null, digits = 3) => (v === null ? "—" : v.toFixed(digits));

function ClassReportCells({ row }: { row: ClassReportRow }) {
  return (
    <>
      <td className="py-1.5 pr-4 font-mono text-slate-900">{fmt(row.precision)}</td>
      <td className="py-1.5 pr-4 font-mono text-slate-900">{fmt(row.recall)}</td>
      <td className="py-1.5 pr-4 font-mono text-slate-900">{fmt(row.f1)}</td>
      <td className="py-1.5 font-mono text-slate-700">{row.support === null ? "—" : row.support}</td>
    </>
  );
}

/** M22 클래스별 표. 평균 줄은 클래스 줄과 굵은 선으로 가른다. */
function ClassReportBlock({ table }: { table: ClassReportTable }) {
  return (
    <div className="space-y-2 pt-4 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-700">M22 — Class-wise Metric (클래스별 세부 성능)</p>
      <table className="w-full text-sm border-collapse" aria-label="클래스별 세부 성능">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">클래스</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">Precision</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">Recall</th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">F1</th>
            <th className="py-1.5 text-left text-xs font-medium text-slate-500">표본 수</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-50">
              <td className="py-1.5 pr-4 text-slate-700">{row.label}</td>
              <ClassReportCells row={row} />
            </tr>
          ))}
          {table.averages.map((row, index) => (
            <tr
              key={row.label}
              className={index === 0 ? "border-t-2 border-slate-200" : "border-t border-slate-50"}
            >
              <td className="py-1.5 pr-4 font-medium text-slate-700">{row.label}</td>
              <ClassReportCells row={row} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
