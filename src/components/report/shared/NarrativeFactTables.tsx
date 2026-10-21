/**
 * 7.1 서술 아래의 파생값 표(서술 설계 D6) — 코드가 계산해 AI 에 보낸 값(`FinalReportData.narrativeFacts`)을 표로
 * 찍는다. 표가 문장의 검산 근거가 되도록, 숫자는 사실 시트가 실은 것과 같은 표기를 쓴다(표시 문자열 `*_text` 가
 * 있으면 그것, 없으면 넷째 자리 — `factText`, 엔진이 싣는 자릿수). 판 3 성적서에만 그린다(옛 판은 발급 당시 모양).
 *
 * - 최약 클래스(F1 최저, D10) — 한 줄. 작은 표본(D12: 30건 미만 또는 5% 미만)은 따로 표시.
 * - 최다 오분류 쌍 상위 3(다중 클래스만) — 실제 → 예측, 건수, 오분류 중 비율.
 * - 예측 편향 — 예측 수 대 실제 수(이진은 양성 클래스, 다중은 클래스별, 멀티는 레이블 총수).
 */
import type { ClassLabelInfo } from "../../../types/finalReport.types";
import type { NarrativeFacts } from "../../../lib/report/narrativeFacts";
import { factText } from "../../../lib/report/judgedNumber";

const TH = "py-1.5 pr-4 text-left text-xs font-medium text-slate-500";
const TD = "py-1.5 pr-4 text-slate-700";
const NUM = "py-1.5 pr-4 font-mono tabular-nums text-slate-900";

/** 클래스 이름 — 3절 클래스 레이블 설명이 있으면 "이름(설명)". */
export function classDisplayName(label: string, descriptions: readonly ClassLabelInfo[] | undefined): string {
  const description = descriptions?.find((d) => d.label === label)?.description?.trim();
  return description ? `${label}(${description})` : label;
}

/** 예측 − 실제 차이 — 부호를 붙인다(+13 · −5 · 0). */
function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

function TableTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-600">{children}</p>;
}

export function WeakestClassTable({
  facts,
  descriptions,
}: {
  facts: Pick<NarrativeFacts, "weakest_class" | "class_share_basis">;
  descriptions?: readonly ClassLabelInfo[];
}) {
  const w = facts.weakest_class;
  if (!w) return null;
  const unit = facts.class_share_basis === "label_occurrences" ? "레이블" : "클래스";
  return (
    <div className="space-y-1">
      <TableTitle>최약 {unit}(F1 최저)</TableTitle>
      <table className="w-full text-sm border-collapse" aria-label={`최약 ${unit}`}>
        <thead>
          <tr className="border-b border-slate-200">
            <th className={TH}>{unit}</th>
            <th className={TH}>F1</th>
            <th className={TH}>표본 수</th>
            <th className={TH}>비율</th>
            <th className={TH}>매크로 F1과의 차이</th>
            <th className="py-1.5 text-left text-xs font-medium text-slate-500">작은 표본</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-50 last:border-b-0">
            <td className={TD}>{classDisplayName(w.label, descriptions)}</td>
            <td className={NUM}>{factText(w.f1)}</td>
            <td className={NUM}>{w.support}</td>
            <td className={NUM}>{w.share_text}</td>
            <td className={NUM}>{w.gap_text ?? "—"}</td>
            <td className="py-1.5 text-slate-700">{w.low_support ? "예" : "아니오"}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-slate-500">
        매크로 F1과의 차이 = 매크로 F1 − 이 {unit}의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다.
      </p>
    </div>
  );
}

export function ConfusionPairsTable({
  facts,
  descriptions,
}: {
  facts: Pick<NarrativeFacts, "top_confusion_pairs">;
  descriptions?: readonly ClassLabelInfo[];
}) {
  const pairs = facts.top_confusion_pairs ?? [];
  if (pairs.length === 0) return null;
  return (
    <div className="space-y-1">
      <TableTitle>최다 오분류 쌍(상위 {pairs.length})</TableTitle>
      <table className="w-full text-sm border-collapse" aria-label="최다 오분류 쌍">
        <thead>
          <tr className="border-b border-slate-200">
            <th className={TH}>실제 → 예측</th>
            <th className={TH}>건수</th>
            <th className="py-1.5 text-left text-xs font-medium text-slate-500">오분류 중 비율</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p) => (
            <tr key={`${p.actual}→${p.predicted}`} className="border-b border-slate-50 last:border-b-0">
              <td className={TD}>
                {classDisplayName(p.actual, descriptions)} → {classDisplayName(p.predicted, descriptions)}
              </td>
              <td className={NUM}>{p.count}</td>
              <td className="py-1.5 font-mono tabular-nums text-slate-900">{factText(p.share_of_errors)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PredictionBiasTable({
  facts,
  descriptions,
}: {
  facts: Pick<NarrativeFacts, "prediction_bias">;
  descriptions?: readonly ClassLabelInfo[];
}) {
  const bias = facts.prediction_bias;
  if (!bias || bias.rows.length === 0) return null;
  const head = bias.unit === "per_class" ? "클래스" : bias.unit === "label_total" ? "대상" : "양성 클래스";
  return (
    <div className="space-y-1">
      <TableTitle>예측 편향(예측 수 대 실제 수)</TableTitle>
      <table className="w-full text-sm border-collapse" aria-label="예측 편향">
        <thead>
          <tr className="border-b border-slate-200">
            <th className={TH}>{head}</th>
            <th className={TH}>예측 수</th>
            <th className={TH}>실제 수</th>
            <th className="py-1.5 text-left text-xs font-medium text-slate-500">차이(예측 − 실제)</th>
          </tr>
        </thead>
        <tbody>
          {bias.rows.map((r, i) => (
            <tr key={r.label ?? `row-${i}`} className="border-b border-slate-50 last:border-b-0">
              <td className={TD}>{r.label === null ? "전체 레이블" : classDisplayName(r.label, descriptions)}</td>
              <td className={NUM}>{r.predicted}</td>
              <td className={NUM}>{r.actual}</td>
              <td className="py-1.5 font-mono tabular-nums text-slate-900">{signed(r.difference)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 7.1 아래 표 묶음. 사실 값이 없으면(이 키가 생기기 전 run) 아무것도 그리지 않는다. 오분류 쌍은 다중 클래스만. */
export function NarrativeFactTables({
  facts,
  multiclass,
  descriptions,
}: {
  facts: NarrativeFacts | undefined;
  multiclass: boolean;
  descriptions?: readonly ClassLabelInfo[];
}) {
  if (!facts) return null;
  return (
    <div className="space-y-4" data-testid="narrative-fact-tables">
      <WeakestClassTable facts={facts} descriptions={descriptions} />
      {multiclass && <ConfusionPairsTable facts={facts} descriptions={descriptions} />}
      <PredictionBiasTable facts={facts} descriptions={descriptions} />
    </div>
  );
}
