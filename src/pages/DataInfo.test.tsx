/**
 * ⑥ 학습 데이터 화면의 예시 파일 두 칸 — 평가 흐름에 넣은 칸만 보인다(docs/MATERIAL_PICKER.md §12.4).
 *
 * 두 칸 모두 선택 항목이다. 넣지 않은 칸의 파일은 성적서·AI 에도 실리지 않는다(`buildReportInput`).
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { TrainingDataStep } from "./DataInfo";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/training-data"]}>
      <TrainingDataStep />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary", composerCards: { trainingData: true, testData: false, groundTruth: false, modelEnv: false } });
});

describe("예시 파일 칸", () => {
  it("평가 흐름 이전(picks 없음)이면 두 칸 모두 보인다", () => {
    renderPage();
    expect(screen.getByText("학습 데이터 예시")).toBeInTheDocument();
    expect(screen.getByText("적합 예시")).toBeInTheDocument();
    expect(screen.getByText("부적합 예시")).toBeInTheDocument();
  });

  it("넣은 칸만 보인다 — 부적합 예시만 넣었으면 적합 예시 칸은 없다", () => {
    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingDescription", "trainingUnsuitableExamples"] } });
    renderPage();
    expect(screen.queryByText("적합 예시")).not.toBeInTheDocument();
    expect(screen.getByText("부적합 예시")).toBeInTheDocument();
  });

  it("적합 예시만 넣으면 그 칸만", () => {
    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingExamples"] } });
    renderPage();
    expect(screen.getByText("적합 예시")).toBeInTheDocument();
    expect(screen.queryByText("부적합 예시")).not.toBeInTheDocument();
  });

  it("둘 다 넣지 않았으면 예시 절이 통째로 없다", () => {
    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingDescription"] } });
    renderPage();
    expect(screen.queryByText("학습 데이터 예시")).not.toBeInTheDocument();
    expect(screen.queryByText("적합 예시")).not.toBeInTheDocument();
  });
});
