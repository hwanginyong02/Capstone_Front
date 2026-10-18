/**
 * TP·TN·FP·FN 건수 — 백엔드 `success_metrics.confusion_counts` 를 성적서 모양으로 바꾼다.
 *
 * 백엔드는 혼동행렬(M21) 선택과 무관하게 늘 이 건수를 내린다(재료 목록 9절 "TP, TN, FP, FN 건수 —
 * 항상, 7.1, AI 예"). 이진은 양성 클래스 한 줄, 다중·멀티는 클래스(레이블)마다 일대다 건수다.
 */
import type { ConfusionCounts, ConfusionCountRow } from "../../types/finalReport.types";

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

function toRow(label: string, raw: Record<string, unknown>): ConfusionCountRow | null {
  const tp = count(raw.tp);
  const fp = count(raw.fp);
  const fn = count(raw.fn);
  const tn = count(raw.tn);
  if (tp === null || fp === null || fn === null || tn === null) return null;
  return { label, tp, fp, fn, tn };
}

export function parseConfusionCounts(raw: unknown): ConfusionCounts | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (value.type === "binary") {
    const row = toRow(String(value.positive_class ?? ""), value);
    return row ? { kind: "binary", rows: [row] } : null;
  }

  if (value.type === "per_class" && Array.isArray(value.rows)) {
    const rows = value.rows
      .map((item) =>
        item && typeof item === "object"
          ? toRow(String((item as Record<string, unknown>).label ?? ""), item as Record<string, unknown>)
          : null,
      )
      .filter((row): row is ConfusionCountRow => row !== null);
    return rows.length > 0 ? { kind: "perClass", rows } : null;
  }

  return null;
}
