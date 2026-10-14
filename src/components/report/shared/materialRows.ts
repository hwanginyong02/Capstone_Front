/**
 * 고객 재료 줄 → 표의 줄. 값이 `null` 이면 "제공되지 않음"으로 적는다(재료 선택 점검 4.2).
 */
import type { MaterialRow, MaterialValue } from "../../../types/finalReport.types";
import { NOT_PROVIDED } from "../../../lib/report/reportMaterials";
import type { TableRow } from "./TwoColTable";

export function materialText(value: MaterialValue): string {
  return value ?? NOT_PROVIDED;
}

export function toTableRows(rows: MaterialRow[]): TableRow[] {
  return rows.map((row) => ({ label: row.label, value: materialText(row.value) }));
}
