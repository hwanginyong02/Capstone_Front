/**
 * ⑤ 평가 관점 화면 — 중요 오류 유형 아래의 지금 양성 클래스(점검 나-15, 서술 라운드 B 꼭 남길 줄).
 *
 * 놓침(FN)·잘못 잡음(FP)은 양성 클래스를 기준으로 뜻이 정해진다. 한국어 라벨에서 기본 양성이 "정상"이 되면
 * 둘이 뒤집히므로, 답하는 자리에서 지금 양성 클래스를 보여 준다. 양성 클래스를 모르면(메타데이터 없음) 안 보인다.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { Perspective, positiveClassNotice } from "./Perspective";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/perspective"]}>
      <Perspective />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
});

describe("positiveClassNotice", () => {
  it("이진이고 양성 클래스가 있으면 그 이름을 넣은 문장", () => {
    expect(positiveClassNotice("binary", "불량")).toBe(
      '지금 양성 클래스(모델이 찾아내야 하는 쪽)는 "불량"입니다. ' +
        '놓침(FN)은 실제 "불량"인데 놓친 것, 잘못 잡음(FP)은 "불량" 이외의 값을 "불량" 쪽으로 잡은 것입니다. ' +
        "양성 클래스는 컬럼 매핑 화면에서 바꿉니다.",
    );
  });

  it("양성 클래스가 없거나 비었거나, 이진이 아니면 null", () => {
    expect(positiveClassNotice("binary", undefined)).toBeNull();
    expect(positiveClassNotice("binary", null)).toBeNull();
    expect(positiveClassNotice("binary", "  ")).toBeNull();
    expect(positiveClassNotice("multiclass", "불량")).toBeNull();
  });
});

describe("화면", () => {
  it("이진 + metadata.positive_class 가 있으면 중요 오류 유형 질문 아래에 보인다", () => {
    useWorkflowStore.setState({ taskType: "binary", metadata: { positive_class: "불량" } as never });
    renderPage();
    const notice = screen.getByTestId("positive-class-notice");
    expect(notice.textContent).toContain('지금 양성 클래스(모델이 찾아내야 하는 쪽)는 "불량"입니다.');
    // 중요 오류 유형 질문 묶음 뒤, 같은 칸 안에 있다(사용 방식 아래가 아니다).
    const question = screen.getByRole("radiogroup", { name: "중요 오류 유형" });
    expect(question.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const usage = screen.getByRole("radiogroup", { name: "사용 방식" });
    expect(notice.compareDocumentPosition(usage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("metadata 에 양성 클래스가 없으면 안 보인다", () => {
    useWorkflowStore.setState({ taskType: "binary", metadata: null });
    renderPage();
    expect(screen.getByRole("radiogroup", { name: "중요 오류 유형" })).toBeInTheDocument();
    expect(screen.queryByTestId("positive-class-notice")).toBeNull();
  });

  it("다중 클래스(중요 오류 유형 없음)면 안 보인다", () => {
    useWorkflowStore.setState({ taskType: "multiclass", metadata: { positive_class: "불량" } as never });
    renderPage();
    expect(screen.queryByTestId("positive-class-notice")).toBeNull();
  });
});
