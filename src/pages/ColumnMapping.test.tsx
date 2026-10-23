/**
 * 컬럼 매핑 페이지의 배선 — 본문 컴포넌트는 대역으로 두고 페이지가 넘기는 값만 본다(docs/MATERIAL_PICKER.md §12.4).
 *
 * - 평가 흐름의 ① 항목(`materialPicks.evalData`)을 본문에 넘긴다 — 놓지 않은 샘플 ID·지연시간 역할을 선택지에서
 *   빼고, 클래스 레이블 설명 카드를 숨기는 판정이 이 값에 기댄다. 넘기지 않으면 둘 다 "모두 받음"으로 풀린다.
 * - B5④: 정답 컬럼을 바꿔 고른 양성 클래스가 새 클래스 목록에 없으면 비운다. 있으면 지킨다.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingRow } from "../types/mapping.types";

const captured: { props: Record<string, any> | null } = { props: null };

vi.mock("../components/column-mapping/ColumnMapping", () => ({
  ColumnMapping: (props: Record<string, any>) => {
    captured.props = props;
    return <div data-testid="mapping-content" />;
  },
}));

import { ColumnMapping } from "./ColumnMapping";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function row(originalName: string, role: MappingRow["confirmedRole"]): MappingRow {
  return {
    originalName,
    inferredRole: role,
    confirmedRole: role,
    sampleValues: [],
    modified: false,
    warnings: [],
  } as MappingRow;
}

const landed: { state: unknown } = { state: undefined };

function ComposerProbe() {
  landed.state = useLocation().state;
  return <div data-testid="composer" />;
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/column-mapping"]}>
      <Routes>
        <Route path="/app/column-mapping" element={<ColumnMapping />} />
        <Route path="/app/composer" element={<ComposerProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  if (!captured.props) throw new Error("본문이 그려지지 않았다");
  return captured.props;
}

beforeEach(() => {
  localStorage.clear();
  captured.props = null;
  landed.state = undefined;
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({
    taskType: "binary",
    columnMapping: [row("label", "y_true"), row("other", "ignore"), row("pred", "y_pred")],
    metadata: {
      positive_class: "yes",
      column_unique_values: { label: ["no", "yes"], other: ["a", "b"], pred: ["no", "yes"] },
    },
  });
});

describe("평가 흐름의 ① 항목을 본문에 넘긴다", () => {
  it("store 의 materialPicks.evalData 를 그대로 넘긴다", () => {
    useWorkflowStore.setState({ materialPicks: { evalData: ["yTrueColumn", "predictionColumns"] } });
    expect(renderPage().evalDataPicks).toEqual(["yTrueColumn", "predictionColumns"]);
  });

  it("평가 흐름 이전(picks 없음)이면 undefined — 모두 받는다", () => {
    expect(renderPage().evalDataPicks).toBeUndefined();
  });
});

describe("B5④ 정답 컬럼을 바꾸면 없는 양성 클래스는 비운다", () => {
  it("새 정답 컬럼의 값에 고른 양성 클래스가 없으면 비운다", () => {
    const props = renderPage();
    act(() => {
      props.onRowsChange([row("label", "ignore"), row("other", "y_true"), row("pred", "y_pred")]);
    });
    const state = useWorkflowStore.getState();
    expect(state.columnMapping.find((r) => r.confirmedRole === "y_true")?.originalName).toBe("other");
    expect(state.metadata?.positive_class).toBe("");
  });

  it("새 목록에도 있으면 지킨다", () => {
    const props = renderPage();
    act(() => {
      props.onRowsChange([row("label", "ignore"), row("other", "ignore"), row("pred", "y_true")]);
    });
    expect(useWorkflowStore.getState().metadata?.positive_class).toBe("yes");
  });

  it("이진이 아니면 양성 클래스를 건드리지 않는다", () => {
    useWorkflowStore.setState({ taskType: "multiclass" });
    const props = renderPage();
    act(() => {
      props.onRowsChange([row("label", "ignore"), row("other", "y_true"), row("pred", "y_pred")]);
    });
    expect(useWorkflowStore.getState().metadata?.positive_class).toBe("yes");
  });
});

describe("N3 맡아 둔 행의 '평가 흐름 만들기에서 넣기'", () => {
  it("그 항목을 펼치고 \"다음\"이 컬럼 매핑으로 돌아오게 넘긴다(returnStep: mapping)", () => {
    const props = renderPage();
    act(() => {
      props.onPlaceLeaf("latencyColumn");
    });
    expect(landed.state).toEqual({ cardId: "evalData", leafIds: ["latencyColumn"], returnStep: "mapping" });
  });
});
