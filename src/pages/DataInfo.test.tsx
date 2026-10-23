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

/**
 * B5② — 화면이 칸을 만드는 클래스 목록과 같은 목록으로 점검한다. 페이지가 목록을 넘기지 않으면 지금 클래스를
 * 다 채워도 "비어 있는 칸"으로 막히고, 옛 규칙(한 칸만 채워도 통과)으로 되돌리면 일부만 채워도 넘어간다.
 */
describe("[B5②] 클래스별 데이터 양 — 지금 클래스를 모두", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      materialPicks: { trainingData: ["trainingClassVolume"] },
      columnMapping: [
        { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
      ],
      metadata: { column_unique_values: { label: ["0", "1"] } } as never,
    });
  });

  it("한 클래스만 채우면 비어 있는 칸으로 남는다", () => {
    useWorkflowStore.setState({ composerTrainingData: { trainingClassVolume: { entries: [{ key: "0", value: "80" }] } } });
    renderPage();
    expect(screen.getByText(/비어 있는 칸: 클래스별 데이터 양/)).toBeInTheDocument();
  });

  it("두 클래스를 다 채우면 남은 칸이 없다", () => {
    useWorkflowStore.setState({
      composerTrainingData: {
        trainingClassVolume: { entries: [{ key: "0", value: "80" }, { key: "1", value: "20" }] },
      },
    });
    renderPage();
    expect(screen.queryByText(/비어 있는 칸/)).not.toBeInTheDocument();
  });
});
