import { PassBadge } from "./PassBadge";
import { cn } from "../../../utils/styling/styles";

interface MetricRowProps {
  metricId: string;
  name: string;
  formula?: string;
  value: number;
  threshold: number;
  status: "pass" | "fail" | "warning" | "unavailable";
  /** 낮을수록 좋은 지표(false)면 합격 기준을 "≤"로 표기. 미지정=높을수록 좋음("≥"). */
  higherIsBetter?: boolean;
  className?: string;
}

export function MetricRow({ metricId, name, formula, value, threshold, status, higherIsBetter, className }: MetricRowProps) {
  // 표시 모드
  // 1) threshold > 0            → 일반 KPI (값 + 기준 + 판정)
  // 2) threshold == 0 & value>0 → 정보 제공 (MCC 등 — 값은 표시, 기준 "—", "ℹ 정보 제공")
  // 3) threshold == 0 & value==0 → 시각화 참조 (CM/Class별 — 값 "—", 기준 "정보 제공", "ℹ 시각화 참조")
  // 4) status == unavailable    → 측정 불가 (값 "—", 기준 "—", "측정 불가" 배지)
  const isUnavailable   = status === "unavailable";
  const isVisualOnly    = metricId === "M21" || metricId === "M22";
  const isInfoWithValue = !isVisualOnly && !isUnavailable && threshold === 0;
  const isThresholded   = !isVisualOnly && !isUnavailable && threshold > 0;
  const criteriaOp      = higherIsBetter === false ? "≤" : "≥";

  return (
    <tr className={cn("border-b border-slate-100 last:border-b-0", className)}>
      <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{metricId}</td>
      <td className="py-2.5 pr-4 font-medium text-slate-800">{name}</td>
      {formula !== undefined && (
        <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{formula}</td>
      )}
      <td className="py-2.5 pr-4 font-semibold tabular-nums text-slate-900">
        {isVisualOnly || isUnavailable ? "—" : value.toFixed(3)}
      </td>
      <td className="py-2.5 pr-4 text-slate-500">
        {isThresholded ? `${criteriaOp} ${threshold.toFixed(2)}` : isInfoWithValue ? "—" : isUnavailable ? "—" : "정보 제공"}
      </td>
      <td className="py-2.5">
        {isThresholded ? (
          <PassBadge verdict={status} />
        ) : isUnavailable ? (
          <PassBadge verdict="unavailable" />
        ) : (
          <span className="text-xs text-slate-500">
            ℹ {isVisualOnly ? "시각화 참조" : "정보 제공"}
          </span>
        )}
      </td>
    </tr>
  );
}
