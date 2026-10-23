/**
 * 평가 데이터 업로드 페이지의 배선 — 본문과 분석 훅은 대역으로 두고 페이지가 하는 일만 본다.
 *
 * - M2: 평가 흐름의 ① 항목을 본문에 넘긴다 — 컬럼 안내가 매핑 선택지와 같은 함수(`allowedMappingRoles`)로
 *   놓지 않은 샘플 ID·지연시간을 뺀다. 넘기지 않으면 모두 안내한다.
 * - M5(프론트 몫): 다시 올려 분석이 metadata 를 덮어도, 전에 고른 양성 클래스가 새 클래스에 있으면 지킨다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingRow } from "../types/mapping.types";

const captured: { props: Record<string, any> | null } = { props: null };
const analyzeColumns = vi.fn();

vi.mock("../components/data-upload/DataUpload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/data-upload/DataUpload")>();
  return {
    ...actual,
    DataUpload: (props: Record<string, any>) => {
      captured.props = props;
      return <div data-testid="upload-content" />;
    },
  };
});

vi.mock("../hooks/useColumnAnalysis", () => ({
  useColumnAnalysis: () => ({ analyzeColumns, isAnalyzing: false, cancel: vi.fn() }),
}));

import { DataUpload } from "./DataUpload";
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

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/upload"]}>
      <DataUpload />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  captured.props = null;
  analyzeColumns.mockReset();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({
    taskType: "binary",
    uploadedFile: { name: "eval.csv", size: 10, type: "text/csv" } as any,
    rawFile: new File(["a"], "eval.csv", { type: "text/csv" }),
  });
});

describe("M2 컬럼 안내에 ① 항목을 넘긴다", () => {
  it("store 의 materialPicks.evalData 를 그대로 넘긴다", () => {
    useWorkflowStore.setState({ materialPicks: { evalData: ["yTrueColumn"] } });
    renderPage();
    expect(captured.props?.evalDataPicks).toEqual(["yTrueColumn"]);
  });
});

describe("M5 다시 올려도 양성 클래스를 지킨다", () => {
  function analysisResult(positive: string, classes: string[]) {
    return {
      rows: [row("label", "y_true"), row("pred", "y_pred")],
      metadata: { positive_class: positive, column_unique_values: { label: classes } },
      columnNotes: [],
    };
  }

  it("전에 고른 값이 새 파일의 클래스에도 있으면 그대로", async () => {
    useWorkflowStore.setState({ metadata: { positive_class: "yes" } });
    analyzeColumns.mockResolvedValue(analysisResult("no", ["no", "yes"]));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^다음$/ }));
    await waitFor(() => expect(analyzeColumns).toHaveBeenCalled());
    await waitFor(() => expect(useWorkflowStore.getState().metadata?.column_unique_values).toBeDefined());
    expect(useWorkflowStore.getState().metadata?.positive_class).toBe("yes");
  });

  it("새 파일에 없으면 새 분석의 값", async () => {
    useWorkflowStore.setState({ metadata: { positive_class: "yes" } });
    analyzeColumns.mockResolvedValue(analysisResult("1", ["0", "1"]));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^다음$/ }));
    await waitFor(() => expect(useWorkflowStore.getState().metadata?.column_unique_values).toBeDefined());
    expect(useWorkflowStore.getState().metadata?.positive_class).toBe("1");
  });

  it("처음 올리면(전에 고른 값 없음) 새 분석의 값", async () => {
    analyzeColumns.mockResolvedValue(analysisResult("no", ["no", "yes"]));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^다음$/ }));
    await waitFor(() => expect(useWorkflowStore.getState().metadata?.column_unique_values).toBeDefined());
    expect(useWorkflowStore.getState().metadata?.positive_class).toBe("no");
  });
});
