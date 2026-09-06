/**
 * ColumnMapping — Step 5 진행 판정(isValid).
 *
 * ISSUES.md E-13 — 새로고침으로 워크플로우 상태가 전부 날아간 뒤 이 화면에 들어오면
 * **매핑 행이 0개인데 '유효'로 판정되어** 다음 단계가 열린다. 실제 차단은 전적으로
 * 백엔드(`/api/confirm-mapping`)가 하고, 사용자는 네트워크 왕복 후 raw alert 창을 받는다.
 *
 * 진짜 기전은 대장 서술("매핑 행 검사가 없다")보다 한 단계 깊다 —
 *   ① `getRequiredColumnsForSelection` 이 selectedIds 를 순회하므로 **지표가 비면 요구 역할이 0개**가 된다
 *      → missingRoles 가 [] → 그 조건으로는 막을 수 없다.
 *   ② `taskType` 이 "" 면 `resolvedTaskType` 이 "multiclass" 로 둔갑해 **binary 전용 검사(positiveClass)까지
 *      건너뛴다**.
 * 둘이 겹쳐야 isValid=true 가 되고, 그 상태는 정확히 E-01(비영속)이 만들어낸다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMapping } from "./ColumnMapping";
import type { MappingRow } from "../../types/mapping.types";

function row(originalName: string, confirmedRole: MappingRow["confirmedRole"]): MappingRow {
  return { originalName, sampleValues: ["1", "0"], inferredRole: confirmedRole, confirmedRole, modified: false, warnings: [] };
}

/** 컴포넌트를 렌더하고 onValidationChange 로 보고된 마지막 판정을 돌려준다. */
function validityOf(props: Partial<React.ComponentProps<typeof ColumnMapping>>): boolean {
  const onValidationChange = vi.fn();
  render(
    <ColumnMapping
      rows={[]}
      onRowsChange={vi.fn()}
      onValidationChange={onValidationChange}
      {...props}
    />
  );
  const calls = onValidationChange.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

describe("Step 5 진행 판정", () => {
  it("[E-13] 상태가 전부 비었으면 유효하지 않다 — 새로고침 직후의 실제 상태", () => {
    expect(validityOf({ taskType: "", selectedMetricIds: [], rows: [] })).toBe(false);
  });

  it("[E-13] 매핑 행이 0개면 유효하지 않다(지표가 선택돼 있어도)", () => {
    expect(validityOf({ taskType: "multiclass", selectedMetricIds: ["M23"], rows: [] })).toBe(false);
  });

  it("[E-13] 어떤 행에도 역할이 배정되지 않았으면 유효하지 않다", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        selectedMetricIds: ["M23"],
        rows: [row("col_a", "ignore"), row("col_b", null)],
      })
    ).toBe(false);
  });

  it("[E-13] 지표가 하나도 선택되지 않았으면 유효하지 않다 — 평가할 대상이 없다", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        selectedMetricIds: [],
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(false);
  });

  it("[E-13] taskType 이 비면 유효하지 않다 — 'multiclass' 로 둔갑시키지 않는다", () => {
    expect(
      validityOf({
        taskType: "",
        selectedMetricIds: ["M23"],
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(false);
  });

  it("[E-13] 정상 매핑은 유효하다(수정이 정상 경로를 막지 않는다)", () => {
    expect(
      validityOf({
        taskType: "multiclass",
        selectedMetricIds: ["M23"],
        rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      })
    ).toBe(true);
  });

  it("[E-13] binary 는 positiveClass 가 있어야 유효하다(기존 동작 보존)", () => {
    const base = {
      taskType: "binary" as const,
      selectedMetricIds: ["M1"],
      rows: [row("id", "id"), row("t", "y_true"), row("p", "y_pred")],
      detectedClasses: ["0", "1"],
    };
    expect(validityOf({ ...base, positiveClass: "" })).toBe(false);
    expect(validityOf({ ...base, positiveClass: "1" })).toBe(true);
  });
});
