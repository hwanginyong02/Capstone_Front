/**
 * 발급·정정 발급 대화상자(B16) — 종전 window.confirm·prompt 대신 화면 안 대화상자.
 * 정정 사유가 비면 칸 아래 안내와 버튼 잠금, 발급에는 비고 칸(선택). 두 칸 모두 상한은 백엔드와 같은 값.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ReportLayout } from "./ReportLayout";
import { ISSUANCE_TEXT_MAX_CHARS } from "../../../lib/report/issuanceApi";

function renderLayout(props: Partial<Parameters<typeof ReportLayout>[0]> = {}) {
  render(
    <MemoryRouter>
      <ReportLayout onDownload={() => {}} {...props}>
        <p>본문</p>
      </ReportLayout>
    </MemoryRouter>,
  );
}

describe("정정 발급 대화상자", () => {
  it("사유가 비면 칸 아래 안내가 뜨고 버튼이 잠겨 onReissue 를 부르지 않는다", async () => {
    const onReissue = vi.fn();
    renderLayout({ issued: true, reportId: "RPT-2026-0001", onReissue });

    await userEvent.click(screen.getByRole("button", { name: "정정 발급" }));
    const dialog = screen.getByRole("dialog", { name: "정정 발급" });

    expect(within(dialog).getByText("정정 사유를 적어 주세요.")).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "정정 발급" });
    expect(confirm).toBeDisabled();

    // 공백뿐이어도 빈 칸이다.
    await userEvent.type(within(dialog).getByLabelText("정정 사유"), "   ");
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(onReissue).not.toHaveBeenCalled();
  });

  it("사유를 적으면 안내가 사라지고 앞뒤 공백을 뗀 사유로 정정 발급한다", async () => {
    const onReissue = vi.fn();
    renderLayout({ issued: true, onReissue });

    await userEvent.click(screen.getByRole("button", { name: "정정 발급" }));
    const dialog = screen.getByRole("dialog", { name: "정정 발급" });
    await userEvent.type(within(dialog).getByLabelText("정정 사유"), "  모델 버전 오기 수정 ");

    expect(within(dialog).queryByText("정정 사유를 적어 주세요.")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "정정 발급" }));

    expect(onReissue).toHaveBeenCalledWith("모델 버전 오기 수정");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("사유 칸 상한은 백엔드와 같은 200자다", async () => {
    renderLayout({ issued: true, onReissue: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: "정정 발급" }));

    expect(ISSUANCE_TEXT_MAX_CHARS).toBe(200);
    expect(screen.getByLabelText("정정 사유")).toHaveAttribute("maxLength", "200");
  });
});

describe("발급 대화상자", () => {
  it("비고 칸(선택)에 적은 값을 넘긴다", async () => {
    const onIssue = vi.fn();
    renderLayout({ canIssue: true, onIssue });

    await userEvent.click(screen.getByRole("button", { name: "발급" }));
    const dialog = screen.getByRole("dialog", { name: "성적서 발급" });
    expect(within(dialog).getByLabelText("발급 비고 (선택)")).toHaveAttribute("maxLength", "200");
    await userEvent.type(within(dialog).getByLabelText("발급 비고 (선택)"), " 고객 제출용 ");
    await userEvent.click(within(dialog).getByRole("button", { name: "발급" }));

    expect(onIssue).toHaveBeenCalledWith("고객 제출용");
  });

  it("비고를 비워도 발급할 수 있다(서버가 '최초 발급'으로 적음)", async () => {
    const onIssue = vi.fn();
    renderLayout({ canIssue: true, onIssue });

    await userEvent.click(screen.getByRole("button", { name: "발급" }));
    const dialog = screen.getByRole("dialog", { name: "성적서 발급" });
    expect(within(dialog).getByText(/비우면 '최초 발급'으로 적힙니다/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "발급" }));

    expect(onIssue).toHaveBeenCalledWith("");
  });

  it("취소하면 발급하지 않는다", async () => {
    const onIssue = vi.fn();
    renderLayout({ canIssue: true, onIssue });

    await userEvent.click(screen.getByRole("button", { name: "발급" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onIssue).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
