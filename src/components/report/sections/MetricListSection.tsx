import type {
  MetricFormula,
  MetricItem,
  ReportMaterials,
} from "../../../types/finalReport.types";
import { SectionTitle } from "../shared/SectionTitle";
import { TwoColTable } from "../shared/TwoColTable";
import { materialText, toTableRows } from "../shared/materialRows";
import { taskTypeLabelsFor } from "../../../data/evaluationData";
import { SubsectionTitle } from "../shared/SubsectionTitle";

interface MetricListSectionProps {
  metricList: MetricItem[];
  metricFormulas: MetricFormula[];
  taskTypeLabel: string;
  /** 의뢰자 선언(⑤)과 멀티레이블 지표 선택 이유(②). 옛 성적서에는 없다. */
  materials?: ReportMaterials;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

export function MetricListSection({
  metricList,
  metricFormulas,
  taskTypeLabel,
  materials,
  schema3,
}: MetricListSectionProps) {
  const formulaMap = new Map(metricFormulas.map((f) => [f.metricId, f]));
  // 5.1 안내의 유형 이름은 그릴 때 정한다 — 옛 발급본(영문 저장값)은 그때 글자 그대로(W9 발급본 결정).
  const typeNames = taskTypeLabelsFor(taskTypeLabel);

  const commonItems = metricList.filter((metric) => formulaMap.get(metric.metricId)?.isCommon);
  const specialItems = metricList.filter((metric) => !formulaMap.get(metric.metricId)?.isCommon);

  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={5} title="시험항목 및 방법" subtitle="사용자가 선택한 시험항목에 대해서만 평가를 수행한다." />

      {/* 의뢰자 선언 — 지표와 평균 방식을 정하는 근거라 시험 방법 절에 싣는다(서술 설계 D35). */}
      {materials && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">의뢰자 선언</h3>
          <TwoColTable rows={toTableRows(materials.declarations)} />
        </div>
      )}

      {/* 다중 클래스 평균 방식 — 클래스 중요도 선언으로 정한다(고정 문구 4, 서술 설계 D28). */}
      {materials?.averagingSentence && (
        <p className="text-sm leading-relaxed text-slate-600">{materials.averagingSentence}</p>
      )}

      {/* 멀티레이블 지표의 선택 기준(TS 4213 6.5.1) — 2층 항목. 다른 유형에는 해당 없음. */}
      {materials && materials.metricRationale !== undefined && (
        <p className="text-sm leading-relaxed text-slate-600">
          지표 선택 기준: {materialText(materials.metricRationale, materials.metricRationaleNote)}
        </p>
      )}

      {/* 5.1 공통 지표 */}
      <div className="space-y-3">
        <SubsectionTitle number="5.1" schema3={schema3} className="text-sm font-semibold text-slate-700">
          공통 지표{" "}
          <span className="font-normal text-slate-400 text-xs">
            ({typeNames.binary} / {typeNames.multiclass} / {typeNames.multilabel} 모두 적용)
          </span>
        </SubsectionTitle>
        <MetricTable items={commonItems} formulaMap={formulaMap} />
      </div>

      {/* 5.2 태스크 전용 지표 (선택된 경우만 표시) */}
      {specialItems.length > 0 && (
        <div className="space-y-3">
          <SubsectionTitle number="5.2" schema3={schema3} className="text-sm font-semibold text-slate-700">{taskTypeLabel} 전용 지표</SubsectionTitle>
          <MetricTable items={specialItems} formulaMap={formulaMap} />
        </div>
      )}
    </section>
  );
}

function MetricTable({
  items,
  formulaMap,
}: {
  items: MetricItem[];
  formulaMap: Map<string, MetricFormula>;
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-slate-200">
          <th className="py-2 pr-3 text-left font-medium text-slate-500 w-16">Metric ID</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500 w-32">시험항목</th>
          <th className="py-2 pr-4 text-left font-medium text-slate-500">시험목표 및 기준</th>
          <th className="py-2 text-left font-medium text-slate-500">시험방법 및 산정식</th>
        </tr>
      </thead>
      <tbody>
        {items.map((metric) => {
          const formula = formulaMap.get(metric.metricId);
          return (
            <tr key={metric.metricId} className="border-b border-slate-100 last:border-b-0 align-top">
              <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{metric.metricId}</td>
              <td className="py-2.5 pr-4 font-medium text-slate-800">{metric.name}</td>
              <td className="py-2.5 pr-4 text-slate-600 text-xs leading-relaxed">
                {formula?.description ?? "—"}
                <br />
                <span className="font-mono text-slate-400">합격 기준: {metric.passCriteria}</span>
              </td>
              <td className="py-2.5 font-mono text-xs text-slate-600">{formula?.formula ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
