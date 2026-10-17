import type { LatencyStats, MaterialCheckResult } from "../../../types/finalReport.types";
import { NOT_PROVIDED } from "../../../lib/report/reportMaterials";

interface LatencySectionProps {
  latency: LatencyStats | null;
  /**
   * 재료 선택 점검 결과. 있는 성적서(이 키가 생긴 뒤)만 빈 칸을 "제공되지 않음"으로 찍는다 — 옛
   * 발급본은 발급 당시 문장 그대로 둔다.
   */
  materialCheck?: MaterialCheckResult;
}

const LATENCY_ROWS: { label: string; key: keyof Omit<LatencyStats, "unit"> }[] = [
  { label: "평균 응답시간 (Mean Latency)", key: "mean" },
  { label: "최소 응답시간 (Min Latency)",  key: "min"  },
  { label: "P50 응답시간",                 key: "p50"  },
  { label: "P95 응답시간",                 key: "p95"  },
  { label: "P99 응답시간",                 key: "p99"  },
  { label: "최대 응답시간 (Max Latency)",  key: "max"  },
];

export function LatencySection({ latency, materialCheck }: LatencySectionProps) {
  if (!latency && !materialCheck) {
    return (
      <div className="space-y-3 pt-8">
        <h3 className="text-sm font-semibold text-slate-700">응답시간 지표</h3>
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-400">
          지연시간(latency) 컬럼이 매핑되지 않아 측정되지 않았습니다. 컬럼 매핑 단계에서 응답시간 컬럼을 latency 역할로 지정하면 통계가 표시됩니다.
        </p>
      </div>
    );
  }

  if (!latency) {
    return (
      <div className="space-y-3 pt-8">
        <h3 className="text-sm font-semibold text-slate-700">응답시간 지표</h3>
        {/* 보고 항목 8(추론 효율성)이 빠진 자리 — "그 자리에서 보기"(고정 문구 2.1). */}
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          <strong className="text-slate-700">{NOT_PROVIDED}</strong>
          <span className="ml-2 text-xs text-slate-400">
            응답시간(latency) 자료가 제공되지 않아 측정하지 않았다.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-8">
      <h3 className="text-sm font-semibold text-slate-700">응답시간 지표</h3>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-2 pr-4 text-left font-medium text-slate-500">항목</th>
            <th className="py-2 text-left font-medium text-slate-500">값</th>
          </tr>
        </thead>
        <tbody>
          {LATENCY_ROWS.map(({ label, key }) => (
            <tr key={key} className="border-b border-slate-100 last:border-b-0">
              <td className="py-2.5 pr-4 text-slate-700">{label}</td>
              <td className="py-2.5 font-mono font-semibold text-slate-900">
                {latency[key].toFixed(2)} {latency.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
