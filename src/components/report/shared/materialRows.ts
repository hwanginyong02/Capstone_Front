/**
 * 고객 재료 줄 → 표의 줄. 값이 `null` 이면 "제공되지 않음"으로 적고, 따로 실린 의뢰자 글은 괄호로 붙인다
 * (재료 선택 점검 4.2·5절 — 글은 `materialRowText` 한 곳에서 만든다).
 */
import type { MaterialRow, MaterialValue } from "../../../types/finalReport.types";
import { materialRowText } from "../../../lib/report/reportMaterials";
import type { TableRow } from "./TwoColTable";

export function materialText(value: MaterialValue, note?: string): string {
  return materialRowText({ value, note });
}

export function toTableRows(rows: MaterialRow[]): TableRow[] {
  return rows.map((row) => ({ label: row.label, value: materialRowText(row) }));
}
