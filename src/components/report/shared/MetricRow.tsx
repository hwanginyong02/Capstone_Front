import { PassBadge } from "./PassBadge";
import type { KpiConfidenceInterval } from "../../../types/finalReport.types";
import { cn } from "../../../utils/styling/styles";
import { formatTargetCriteria } from "../../../lib/report/metricValueFormat";
import { formatJudgedValue } from "../../../lib/report/judgedNumber";

interface MetricRowProps {
  metricId: string;
  name: string;
  formula?: string;
  value: number;
  /** 합격 목표값. 없으면 null — 0 은 목표값 0 이다. */
  threshold: number | null;
  status: "pass" | "fail" | "warning" | "unavailable";
  /** 낮을수록 좋은 지표(false)면 합격 기준을 "≤"로 표기. 미지정=높을수록 좋음("≥"). */
  higherIsBetter?: boolean;
  /** 핵심 지표 — 미달하면 최종 불합격이다. 판정 근거가 보이도록 이름 옆에 표시한다. */
  isCore?: boolean;
  /**
   * "95% 신뢰구간" 칸을 그릴지. 신뢰구간을 찍은 성적서만 켠다 — 이 키가 생기기 전 성적서는 종전 5칸이다.
   * 칸을 켰는데 `ci` 가 없으면(판정 대상이 아니거나 계산 생략) "—".
   */
  showCi?: boolean;
  ci?: KpiConfidenceInterval;
  /** 목표값 자릿수(`FinalReportData.targetDigits`). 없으면 종전 둘째 자리. */
  targetDigits?: number;
  /**
   * 값이 판정과 어긋나 보이면 자릿수를 늘려 찍는다(`FinalReportData.judgedValueDigits`, S2) — 실제 미달 0.7996 을
   * "0.800 / ≥ 0.800 / 불합격" 대신 "0.7996". 없으면(옛 발급본) 종전 셋째 자리.
   */
  judgedValueDigits?: boolean;
  className?: string;
}

export function MetricRow({ metricId, name, formula, value, threshold, status, higherIsBetter, isCore, showCi = false, ci, targetDigits, judgedValueDigits, className }: MetricRowProps) {
  // 표시 모드
  // 1) 목표값 있음(threshold !== null) → 일반 KPI (값 + 기준 + 판정). 0·음수 목표도 여기다.
  // 2) 목표값 없음                      → 정보 제공 (값은 표시, 기준 "—", "ℹ 정보 제공")
  // 3) M21·M22                          → 시각화 참조 (값 "—", 기준 "정보 제공", "ℹ 시각화 참조")
  // 4) status == unavailable    → 측정 불가 (값 "—", 기준 "—", "측정 불가" 배지)
  const isUnavailable   = status === "unavailable";
  const isVisualOnly    = metricId === "M21" || metricId === "M22";
  const isInfoWithValue = !isVisualOnly && !isUnavailable && threshold === null;
  const isThresholded   = !isVisualOnly && !isUnavailable && threshold !== null;

  return (
    <tr className={cn("border-b border-slate-100 last:border-b-0", className)}>
      <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{metricId}</td>
      <td className="py-2.5 pr-4 font-medium text-slate-800">
        {name}
        {isCore && (
          <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            핵심
          </span>
        )}
      </td>
      {formula !== undefined && (
        <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{formula}</td>
      )}
      <td className="py-2.5 pr-4 font-semibold tabular-nums text-slate-900">
        {isVisualOnly || isUnavailable
          ? "—"
          : judgedValueDigits && isThresholded && threshold !== null && (status === "pass" || status === "fail")
            ? formatJudgedValue(value, threshold, higherIsBetter !== false, status === "pass")
            : value.toFixed(3)}
      </td>
      {showCi && (
        <td className="py-2.5 pr-4 tabular-nums text-slate-600">
          {ci ? `[${ci.low.toFixed(3)}, ${ci.high.toFixed(3)}]` : "—"}
        </td>
      )}
      <td className="py-2.5 pr-4 text-slate-500">
        {isThresholded && threshold !== null ? formatTargetCriteria(threshold, higherIsBetter, targetDigits) : isInfoWithValue ? "—" : isUnavailable ? "—" : "정보 제공"}
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
