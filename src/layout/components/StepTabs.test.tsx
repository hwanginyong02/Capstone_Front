/**
 * ISSUES.md E-16 — 스텝탭 7번(최종 성적서)이 실제 run 이 아니라 preview 를 가리켰다.
 *
 * `stepToPath(7)` 은 항상 "/report/preview" 를 돌려준다. 그래서 성적서를 벗어난 사용자가
 * UI 가 제공하는 유일한 복귀 경로로는 **자기 성적서로 돌아갈 수 없었다** — 빈 미리보기가 떴다.
 * 게다가 방금 만든 run 의 id 는 어디에도 보관되지 않아, '탭을 활성화한다'가 아니라
 * **run id 를 상태에 남기는 것**이 선행이었다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { StepTabs } from "./StepTabs";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

function renderTabs() {
  render(
    <MemoryRouter initialEntries={["/app/data-validation"]}>
      <StepTabs />
      <Routes>
        <Route path="/report/:id" element={<div data-testid="run-report" />} />
        <Route path="/report/preview" element={<div data-testid="preview-report" />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
});

describe("최종 성적서 탭", () => {
  it("[E-16] 방금 만든 run 이 있으면 그 성적서로 간다", async () => {
    const s = useWorkflowStore.getState();
    [1, 2, 3, 4, 5, 6, 7].forEach((n) => s.markStepCompleted(n));
    s.setLastRunId("run-abc");
    s.setCurrentStep(7);

    renderTabs();
    await userEvent.click(screen.getByRole("button", { name: /Final report/ }));

    expect(screen.getByTestId("run-report")).toBeInTheDocument();
  });

  it("[E-16] run 이 없으면 종전대로 미리보기로 간다(폴백 보존)", async () => {
    const s = useWorkflowStore.getState();
    [1, 2, 3, 4, 5, 6, 7].forEach((n) => s.markStepCompleted(n));
    s.setCurrentStep(7);

    renderTabs();
    await userEvent.click(screen.getByRole("button", { name: /Final report/ }));

    expect(screen.getByTestId("preview-report")).toBeInTheDocument();
  });

  it("[E-16] 평가를 마치기 전에는 7번 탭이 비활성이다", () => {
    useWorkflowStore.getState().setCurrentStep(1);

    renderTabs();

    expect(screen.getByRole("button", { name: /Final report/ })).toBeDisabled();
  });
});
