import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyRoleChange } from "./applyRoleChange";
import type { MappingRole, MappingRow } from "../../types/mapping.types";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

function row(originalName: string, confirmedRole: MappingRole | null): MappingRow {
  return {
    originalName,
    confirmedRole,
    inferredRole: confirmedRole,
    sampleValues: [],
    modified: false,
    warnings: [],
  } as unknown as MappingRow;
}

/**
 * 필터가 걸린 상태에서 역할을 바꾸면 **엉뚱한 컬럼**이 바뀌던 결함(대장에 없음).
 * 표는 필터된 목록의 index 를 넘기는데 페이지는 그것을 전체 배열에 적용했다.
 */
describe("applyRoleChange — 컬럼명으로 적용한다", () => {
  const rows = [row("clean_a", "y_true"), row("clean_b", "y_pred"), row("problem", null)];

  it("지정한 컬럼만 바뀐다", () => {
    const next = applyRoleChange(rows, "problem", "latency");

    expect(next[2].confirmedRole).toBe("latency");
    expect(next[0].confirmedRole).toBe("y_true");
    expect(next[1].confirmedRole).toBe("y_pred");
  });

  it("배열 위치와 무관하다 — 첫 행을 지정해도 첫 행만 바뀐다", () => {
    const next = applyRoleChange(rows, "clean_a", "ignore");

    expect(next[0].confirmedRole).toBe("ignore");
    expect(next[1].confirmedRole).toBe("y_pred");
    expect(next[2].confirmedRole).toBeNull();
  });

  it("'unassigned' 는 null 로 되돌린다", () => {
    expect(applyRoleChange(rows, "clean_a", "unassigned")[0].confirmedRole).toBeNull();
  });

  it("추론값과 달라지면 modified 로 표시한다", () => {
    expect(applyRoleChange(rows, "clean_a", "latency")[0].modified).toBe(true);
  });

  it("추론값으로 되돌리면 modified 가 풀린다", () => {
    const edited = applyRoleChange(rows, "clean_a", "latency");
    expect(applyRoleChange(edited, "clean_a", "y_true")[0].modified).toBe(false);
  });

  it("없는 컬럼명은 아무것도 바꾸지 않는다", () => {
    expect(applyRoleChange(rows, "nope", "latency")).toEqual(rows);
  });

  it("원본 배열을 변형하지 않는다", () => {
    applyRoleChange(rows, "clean_a", "latency");
    expect(rows[0].confirmedRole).toBe("y_true");
  });
});

describe("배선 — 표가 index 가 아니라 컬럼명을 넘긴다", () => {
  it("DetectedMappingTable 이 row.originalName 을 넘긴다", () => {
    const source = read("components/column-mapping/DetectedMappingTable.tsx");

    expect(source).toContain("handleRoleChange(row.originalName");
    expect(source).not.toContain("handleRoleChange(index");
  });

  it("ColumnMapping 이 공용 함수를 쓴다", () => {
    expect(read("components/column-mapping/ColumnMapping.tsx")).toContain("applyRoleChange");
  });
});
