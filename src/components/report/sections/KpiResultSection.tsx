import type { FinalReportMeta, KpiResult } from "../../../types/finalReport.types";
import { MetricRow } from "../ui/MetricRow";
import { PassBadge } from "../ui/PassBadge";

import type { TaskType } from "../../../data/evaluationData";

interface KpiResultSectionProps {
  kpiResults: KpiResult[];
  taskType: TaskType;
  meta?: FinalReportMeta;
}

const KPI_CORE_IDS_BY_TASK: Record<TaskType, Set<string>> = {
  binary: new Set(["M1", "M4", "M20", "M23"]),
  multiclass: new Set(["M1", "M4", "M11", "M23"]),
  multilabel: new Set(["M4", "M15", "M17", "M23"]),
};

export function KpiResultSection({ kpiResults, taskType, meta }: KpiResultSectionProps) {
  const coreIds = KPI_CORE_IDS_BY_TASK[taskType] || KPI_CORE_IDS_BY_TASK.binary;
  const kpiCore   = kpiResults.filter((r) => coreIds.has(r.metricId));
  const kpiDetail = kpiResults.filter((r) => !coreIds.has(r.metricId));

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
              />
            ))}
          </tbody>
        </table>
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
              />
            ))}
          </tbody>
        </table>

        {/* Per-class 세부 결과 */}
        {kpiResults.some((r) => r.perClass?.length) && (
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
