import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { EvaluationRunsTable } from "./EvaluationRunsTable";
import type { WorkspaceEvaluationRun } from "../../types/workspace.types";

function makeRun(over: Partial<WorkspaceEvaluationRun> & { id: string }): WorkspaceEvaluationRun {
  return {
    workspaceId: "ws-1",
    modelName: "Face recognizer",
    versionName: "v1.0.0",
    reportId: "",
    createdAt: "2026-09-01T00:00:00.000Z",
    workflowSnapshot: {} as WorkspaceEvaluationRun["workflowSnapshot"],
    reportData: {} as WorkspaceEvaluationRun["reportData"],
    ...over,
  };
}

function renderTable(runs: WorkspaceEvaluationRun[]) {
  return render(
    <MemoryRouter>
      <EvaluationRunsTable runs={runs} onDelete={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("평가 목록", () => {
  it("모델이 달라도 한 테이블에 모델명과 함께 나온다", () => {
    renderTable([
      makeRun({ id: "a", modelName: "Face recognizer" }),
      makeRun({ id: "b", modelName: "Defect detector" }),
    ]);

    expect(screen.getByRole("columnheader", { name: "모델 이름" })).toBeInTheDocument();
    expect(screen.getByText("Face recognizer")).toBeInTheDocument();
    expect(screen.getByText("Defect detector")).toBeInTheDocument();
  });

  it("성적서를 낸 평가와 안 낸 평가가 구분된다", () => {
    renderTable([
      makeRun({ id: "a", reportId: "RPT-1", versionName: "v1.0.0" }),
      makeRun({ id: "b", reportId: "", versionName: "v1.1.0" }),
    ]);

    const rows = screen.getAllByRole("row");
    const issued = rows.find((row) => within(row).queryByText("v1.0.0"));
    const draft = rows.find((row) => within(row).queryByText("v1.1.0"));

    expect(within(issued!).getByText("발급됨")).toBeInTheDocument();
    expect(within(draft!).getByText("초안")).toBeInTheDocument();
  });

  it("초안도 성적서로 간다 — 평가 결과 화면은 폐지됐다", () => {
    renderTable([
      makeRun({ id: "a", reportId: "RPT-1", versionName: "v1.0.0" }),
      makeRun({ id: "b", reportId: "", versionName: "v1.1.0" }),
    ]);

    const links = screen.getAllByRole("link", { name: /성적서/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/report/a", "/report/b"]);
  });
});
