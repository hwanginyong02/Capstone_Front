/** 평가 대상 모델 화면 — 비활성 "다음" 옆에 무엇이 비었는지 말한다(점검 다-8, 작성 화면의 RemainingNotice 꼴). */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { ModelInfo } from "./ModelInfo";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { DEFAULT_BASIC_INFO } from "../types/workflow.types";

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/model"]}>
      <ModelInfo />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary" });
});

describe("무엇이 비었는지 말하는 '다음'", () => {
  it("이름만 적으면 '비어 있는 칸: 버전 외 2개.'", () => {
    useWorkflowStore.setState({ basicInfo: { ...DEFAULT_BASIC_INFO, modelName: "MyModel", versionName: "", modelPurpose: "", modelCategory: "" } });
    renderPage();
    expect(screen.getByRole("button", { name: /^다음$/ })).toBeDisabled();
    expect(screen.getByText(/^비어 있는 칸:/)).toHaveTextContent("비어 있는 칸: 버전 외 2개.");
    // ④ 에는 "모름"이 없다 — 그 길을 알려주지 않는다.
    expect(screen.queryByText(/모르면 모름을/)).toBeNull();
  });

  it("다 채우면 안내가 없고 '다음'이 열린다", () => {
    useWorkflowStore.setState({
      basicInfo: { ...DEFAULT_BASIC_INFO, modelName: "M", versionName: "v1", modelPurpose: "p", modelCategory: "c" },
    });
    renderPage();
    expect(screen.getByRole("button", { name: /^다음$/ })).toBeEnabled();
    expect(screen.queryByText(/비어 있는 칸/)).toBeNull();
  });
});
