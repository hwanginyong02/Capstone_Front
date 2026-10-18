/**
 * 매핑 화면의 역할 선택지 — 컴포넌트가 평가 흐름의 ① 항목(`evalDataPicks`)으로 선택지를 만드는지 본다
 * (docs/MATERIAL_PICKER.md §12.4). jsdom 에서 Radix Select 는 목록을 열지 않으므로 표(`DetectedMappingTable`)를
 * 대역으로 두고 넘겨받은 `roleOptions` 를 읽는다. 선택지 규칙 자체는 `buildRoleOptions` 의 순수 함수 테스트가 지킨다.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingRow } from "../../types/mapping.types";

const captured: { roleOptions: Array<{ value: string }> | null } = { roleOptions: null };

vi.mock("./DetectedMappingTable", () => ({
  DetectedMappingTable: (props: { roleOptions: Array<{ value: string }> }) => {
    captured.roleOptions = props.roleOptions;
    return null;
  },
}));

import { ColumnMapping } from "./ColumnMapping";

function row(originalName: string, confirmedRole: MappingRow["confirmedRole"]): MappingRow {
  return { originalName, sampleValues: ["1", "0"], inferredRole: confirmedRole, confirmedRole, modified: false, warnings: [] };
}

const rows = [row("label", "y_true"), row("pred", "y_pred"), row("t", "ignore")];

function optionValues(evalDataPicks: readonly string[] | undefined): string[] {
  render(<ColumnMapping taskType="binary" rows={rows} onRowsChange={vi.fn()} evalDataPicks={evalDataPicks} />);
  if (!captured.roleOptions) throw new Error("표가 그려지지 않았다");
  return captured.roleOptions.map((option) => option.value);
}

beforeEach(() => {
  captured.roleOptions = null;
});

describe("역할 선택지는 평가 흐름에 놓은 항목만", () => {
  it("샘플 ID·지연시간을 놓지 않았으면 id·latency 가 선택지에 없다", () => {
    const values = optionValues(["yTrueColumn", "predictionColumns"]);
    expect(values).toContain("y_true");
    expect(values).toContain("ignore");
    expect(values).not.toContain("latency");
    expect(values).not.toContain("id");
  });

  it("놓았으면 선택지에 있다", () => {
    const values = optionValues(["latencyColumn", "sampleIdColumn"]);
    expect(values).toContain("latency");
    expect(values).toContain("id");
  });

  it("평가 흐름 이전(picks 없음)이면 모두 있다", () => {
    const values = optionValues(undefined);
    expect(values).toContain("latency");
    expect(values).toContain("id");
  });
});
