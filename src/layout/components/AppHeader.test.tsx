/**
 * 머리의 분류 유형 배지 — 보이는 "분류 유형" 글자, "분류 유형: {유형}" 버튼 이름, 설명 툴팁
 * (docs/MATERIAL_PICKER.md §12.3, 요청서 6장). 누르면 진입 화면으로 가는 동작은 그대로다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppHeader } from "./AppHeader";
import { TASK_TYPE_DESCRIPTIONS_KO } from "../../data/evaluationData";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

function renderHeader() {
  render(
    <MemoryRouter initialEntries={["/app/composer"]}>
      <Routes>
        <Route path="/app/composer" element={<AppHeader showTaskType />} />
        <Route path="/app" element={<div data-testid="task-type" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const badge = () => screen.getByRole("button", { name: "분류 유형: 다중 레이블 분류" });

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "multilabel" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("분류 유형 배지", () => {
  it("버튼 이름은 '분류 유형: 다중 레이블 분류'이고, 옆에 '분류 유형' 글자가 보인다. title 은 없다", () => {
    renderHeader();

    expect(badge()).toBeInTheDocument();
    expect(badge()).not.toHaveAttribute("title");
    // 보이는 접두어는 읽지 않는다 — 버튼 이름에 이미 있다.
    const prefix = screen.getByText("분류 유형", { selector: "span[aria-hidden='true']" });
    expect(prefix).toBeInTheDocument();
  });

  it("포커스가 가면 툴팁에 유형 설명과 지워지는 것을 알린다", async () => {
    renderHeader();
    // 로고 링크 다음이 배지다 — 키보드로 닿아도 툴팁이 뜬다(title 은 마우스에서만 떴다).
    await userEvent.tab();
    await userEvent.tab();
    expect(badge()).toHaveFocus();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("분류 유형: 다중 레이블 분류");
    expect(tooltip).toHaveTextContent(TASK_TYPE_DESCRIPTIONS_KO.multilabel);
    expect(tooltip).toHaveTextContent("바꾸면 고른 지표·올린 데이터·컬럼 매핑이 지워져요");
  });

  it("유형 설명은 진입 화면과 같은 한 벌이다 — 세 유형 모두 있다", () => {
    const entries = Object.entries(TASK_TYPE_DESCRIPTIONS_KO);
    expect(entries.length).toBe(3);
    for (const [, text] of entries) expect(text).toMatch(/^샘플 하나/);
  });

  it("마친 화면이 없으면 확인 없이 진입 화면으로 간다", async () => {
    const confirm = vi.spyOn(window, "confirm");
    renderHeader();

    await userEvent.click(badge());

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByTestId("task-type")).toBeInTheDocument();
  });

  it("마친 화면이 있으면 확인을 묻고, 취소하면 그대로다", async () => {
    useWorkflowStore.getState().markStepIdCompleted("clientInfo");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHeader();

    await userEvent.click(badge());

    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("task-type")).not.toBeInTheDocument();
  });

  it("유형을 고르기 전에는 배지가 없다", () => {
    useWorkflowStore.setState({ taskType: "" });
    renderHeader();

    expect(screen.queryByRole("button", { name: /분류 유형/ })).not.toBeInTheDocument();
  });
});
