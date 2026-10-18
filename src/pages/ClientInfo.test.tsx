/**
 * 의뢰자 정보 화면 — ③ 만 받는다(docs/MATERIAL_PICKER.md §5).
 *
 * 선택 항목(홈페이지·팩스·과제 번호)은 재료 고르기에서 체크한 것만 보인다. 평가 의뢰일은 필수라 늘
 * 보인다. ④ 모델 정보와
 * ② 합격 기준은 각자의 단계가 받는다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { ClientInfo } from "./ClientInfo";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/client-info"]}>
      <ClientInfo />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary" });
});

describe("받는 것", () => {
  it("③ 만 받는다 — 모델 정보와 합격 기준은 없다", () => {
    renderPage();

    expect(screen.getByText("회사명")).toBeInTheDocument();
    expect(screen.queryByText("모델 용도")).not.toBeInTheDocument();
    expect(screen.queryByText("합격 기준")).not.toBeInTheDocument();
    expect(screen.queryByText("시험 환경")).not.toBeInTheDocument();
  });

  it("체크하지 않은 선택 항목은 숨긴다", () => {
    useWorkflowStore.setState({ materialPicks: { clientInfo: ["contactExtra:fax"] } });
    renderPage();

    expect(screen.getByText("팩스")).toBeInTheDocument();
    expect(screen.queryByText("홈페이지")).not.toBeInTheDocument();
  });

  it("평가 의뢰일은 필수 항목이라 체크와 상관없이 늘 보인다", () => {
    // 1층 검사가 이 값을 요구한다. 종전에는 고르지 않으면 숨어, 비어 있을 때 고칠 칸 없이 막혔다.
    useWorkflowStore.setState({ materialPicks: { clientInfo: [] } });
    renderPage();

    expect(screen.getByText("평가 의뢰일")).toBeInTheDocument();
  });

  it("과제 번호는 용도와 무관하다 — 체크했으면 용도가 과제 산출물이 아니어도 보인다", () => {
    useWorkflowStore.setState({
      materialPicks: { clientInfo: ["projectNumber"] },
      basicInfo: { ...useWorkflowStore.getState().basicInfo, reportPurpose: "internal" },
    });
    renderPage();

    expect(screen.getByText("과제 번호")).toBeInTheDocument();
    // 과제명·과제 기관은 여전히 과제 산출물일 때만 받는다.
    expect(screen.queryByText("과제명")).not.toBeInTheDocument();
  });

  it("재료 고르기 이전 상태(저장한 체크 없음)에서는 모두 보인다", () => {
    renderPage();

    expect(screen.getByText("홈페이지")).toBeInTheDocument();
    expect(screen.getByText("팩스")).toBeInTheDocument();
    expect(screen.getByText("평가 의뢰일")).toBeInTheDocument();
  });
});

describe("성적서 용도 선택지는 레지스트리 한 벌이다", () => {
  it("레지스트리의 저장값으로 저장하고, 과제 산출물이면 과제 정보를 받는다", async () => {
    renderPage();

    expect(screen.getByText("지원 과제의 증빙으로 냅니다")).toBeInTheDocument();
    await userEvent.click(screen.getByText("과제 산출물"));

    expect(useWorkflowStore.getState().basicInfo.reportPurpose).toBe("project");
    expect(screen.getByText("과제명")).toBeInTheDocument();
  });
});

describe("성적서 용도에 덧붙이는 글 (서술 설계 D26)", () => {
  it("선택지 아래에 글칸이 있고, 적은 글을 저장한다", async () => {
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(/왜 발급하는지/), "3분기 감사용");

    expect(useWorkflowStore.getState().basicInfo.reportPurposeNote).toBe("3분기 감사용");
  });
});

describe("다음", () => {
  it("회사 정보와 용도를 채우면 넘어갈 수 있다", () => {
    useWorkflowStore.setState({
      basicInfo: {
        ...useWorkflowStore.getState().basicInfo,
        companyName: "테스트기업",
        representative: "홍길동",
        businessNumber: "123-45-67890",
        phone: "02-1234-5678",
        address: "서울",
        reportPurpose: "internal",
      },
    });
    renderPage();

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("비어 있으면 막는다", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });
});
