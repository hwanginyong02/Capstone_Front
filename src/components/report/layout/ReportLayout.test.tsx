/**
 * 발급·정정 발급 대화상자(B16) — 종전 window.confirm·prompt 대신 화면 안 대화상자.
 * 정정 사유가 비면 칸 아래 안내와 버튼 잠금, 발급에는 비고 칸(선택). 두 칸 모두 상한은 백엔드와 같은 값.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
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

describe("대화상자를 닫으면 연 버튼으로 포커스가 돌아온다(키보드 사용자가 자리를 잃지 않게)", () => {
  it("발급 대화상자를 Esc 로 닫으면 '발급' 버튼에 포커스가 있다", async () => {
    renderLayout({ canIssue: true, onIssue: vi.fn() });
    const opener = screen.getByRole("button", { name: "발급" });

    await userEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "성적서 발급" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("정정 발급 대화상자를 취소로 닫으면 '정정 발급' 버튼에 포커스가 있다", async () => {
    renderLayout({ issued: true, reportId: "RPT-2026-0001", onReissue: vi.fn() });
    const opener = screen.getByRole("button", { name: "정정 발급" });

    await userEvent.click(opener);
    await userEvent.click(within(screen.getByRole("dialog", { name: "정정 발급" })).getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

/** 서술 라운드 S3b — 서술이 끝나지 않은 성적서는 PDF·발급·정정 발급을 잠그고 이유를 보여 준다. */
describe("잠금(lockReason)", () => {
  const reason = "서술이 끝나지 않아 인쇄·발급할 수 없습니다.";

  it("PDF·발급 버튼을 잠그고 이유를 보여 준다 — 발급 버튼은 숨기지 않는다", async () => {
    const onDownload = vi.fn();
    render(
      <MemoryRouter>
        <ReportLayout onDownload={onDownload} canIssue={false} onIssue={vi.fn()} lockReason={reason}>
          <p>본문</p>
        </ReportLayout>
      </MemoryRouter>,
    );
    const pdf = screen.getByRole("button", { name: /PDF 다운로드/ });
    expect(pdf).toBeDisabled();
    expect(pdf).toHaveAccessibleDescription(reason);
    expect(screen.getByRole("button", { name: /^발급$/ })).toBeDisabled();
    await userEvent.click(pdf);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it("발급된 성적서의 정정 발급도 잠근다", () => {
    renderLayout({ issued: true, reportId: "RPT-1", onReissue: vi.fn(), lockReason: reason });
    expect(screen.getByRole("button", { name: /정정 발급/ })).toBeDisabled();
  });

  it("잠금이 없으면 PDF 는 열리고, 발급할 수 없는 성적서의 발급 버튼은 종전처럼 숨긴다", () => {
    renderLayout({ canIssue: false, onIssue: vi.fn() });
    expect(screen.getByRole("button", { name: /PDF 다운로드/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^발급$/ })).toBeNull();
  });
});
