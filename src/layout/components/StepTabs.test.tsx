/**
 * ISSUES.md E-16 — 마지막 탭(평가 결과)이 실제 run 이 아니라 임시 성적서를 가리켰다.
 *
 * `stepToPath(마지막 단계)` 는 항상 임시 성적서 경로를 돌려줬다. 그래서 성적서를 벗어난
 * 사용자가 UI 가 제공하는 유일한 복귀 경로로는 **자기 성적서로 돌아갈 수 없었다** — 빈
 * 미리보기가 떴다. 게다가 방금 만든 run 의 id 는 어디에도 보관되지 않아, '탭을 활성화한다'가
 * 아니라 **run id 를 상태에 남기는 것**이 선행이었다.
 *
 * 단계는 번호가 아니라 이름으로 가리킨다. 칸 수도 고정이 아니다 — 고른 카드에 따라 8~10칸이
 * 되므로, 그것까지 여기서 고정한다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { StepTabs } from "./StepTabs";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { buildStepList } from "../../utils/domain/workflowSteps";
import { presetSelection } from "../../data/reportComposer";

/** 평가 결과 탭의 접근성 이름. StepTabs 의 라벨과 같아야 한다. */
const RESULT_TAB = /Result/;

function renderTabs() {
  render(
    <MemoryRouter initialEntries={["/app/data-validation"]}>
      <StepTabs />
      <Routes>
        <Route path="/report/:id" element={<div data-testid="run-report" />} />
        <Route path="/workspaces" element={<div data-testid="workspace-list" />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>
  );
}

/** 걸을 전 단계를 완료로 표시한다(이름을 직접 쓰지 않는다). */
function completeAllSteps() {
  const store = useWorkflowStore.getState();
  buildStepList(store.composerCards).forEach((id) => store.markStepIdCompleted(id));
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
});

describe("평가 결과 탭", () => {
  it("[E-16] 방금 만든 run 이 있으면 그 성적서로 간다", async () => {
    completeAllSteps();
    const s = useWorkflowStore.getState();
    s.setLastRunId("run-abc");
    s.setCurrentStepId("report");

    renderTabs();
    await userEvent.click(screen.getByRole("button", { name: RESULT_TAB }));

    expect(screen.getByTestId("run-report")).toBeInTheDocument();
  });

  it("[E-16·E-06] run 이 없으면 워크스페이스 목록으로 간다(임시 성적서 폐지)", async () => {
    completeAllSteps();
    useWorkflowStore.getState().setCurrentStepId("report");

    renderTabs();
    await userEvent.click(screen.getByRole("button", { name: RESULT_TAB }));

    expect(screen.getByTestId("workspace-list")).toBeInTheDocument();
  });

  it("[E-16] 평가를 마치기 전에는 결과 탭이 비활성이다", () => {
    useWorkflowStore.getState().setCurrentStepId("upload");

    renderTabs();

    expect(screen.getByRole("button", { name: RESULT_TAB })).toBeDisabled();
  });
});

describe("칸 수는 고른 카드에서 나온다", () => {
  it("기본(필수 카드만)이면 8칸이다", () => {
    renderTabs();

    expect(screen.getAllByRole("button")).toHaveLength(8);
  });

  it("전체를 넣으면 10칸이 된다", () => {
    useWorkflowStore.getState().applyComposerPreset("full");

    renderTabs();

    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.getByRole("button", { name: /Data info/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Model . environment/ })).toBeInTheDocument();
  });

  it("⑥ 하나만 넣으면 데이터 정보가 생긴다", () => {
    useWorkflowStore.getState().setComposerCard("trainingData", true);

    renderTabs();

    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.getByRole("button", { name: /Data info/ })).toBeInTheDocument();
  });

  it("발급 단계도 처음부터 보이되 비활성이다", () => {
    useWorkflowStore.getState().applyComposerPreset("full");
    useWorkflowStore.getState().setCurrentStepId("upload");

    renderTabs();

    // 평가만 하려는 사용자에게도 앞으로 무엇이 있는지는 보여준다.
    expect(screen.getByRole("button", { name: /Data info/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Report details/ })).toBeDisabled();
  });
});

describe("현재·완료·미래 구분", () => {
  it("마친 단계는 누를 수 있다", async () => {
    const store = useWorkflowStore.getState();
    store.markStepIdCompleted("upload");
    store.setCurrentStepId("perspective");

    renderTabs();

    expect(screen.getByRole("button", { name: /Data upload/ })).not.toBeDisabled();
  });

  it("아직 안 간 단계는 누를 수 없다", () => {
    const store = useWorkflowStore.getState();
    store.markStepIdCompleted("upload");
    store.setCurrentStepId("perspective");

    renderTabs();

    expect(screen.getByRole("button", { name: /Metrics/ })).toBeDisabled();
  });

  it("카드 선택이 바뀌면 같은 단계의 위치가 당겨진다", () => {
    const store = useWorkflowStore.getState();
    store.applyComposerPreset("minimal");

    renderTabs();

    // 최소 구성에서는 의뢰자 정보가 7번째 칸이다(전체에서는 9번째).
    const labels = screen.getAllByRole("button").map((button) => button.textContent);
    expect(labels.findIndex((label) => label?.includes("Report details"))).toBe(6);
  });
});
