/**
 * Details — 합격 기준 표의 핵심 지표.
 *
 * 핵심 지표는 미달하면 최종 불합격(FAIL)이 되는 지표다. 종전에는 코드 상수였고 고를 화면이
 * 없었다(`lib/report/computeVerdict.ts`). 목표값과 함께 판정을 정하므로 목표값을 적는 이 표에서
 * 고른다. 고르지 않으면 문서의 기본값과 같은 유형별 기본값이 체크돼 보인다.
 *
 * Report notes 칸이 없는지도 본다 — 그 메모가 성적서에 "학습 데이터 설명"으로 찍혔다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { ReportInfo } from "./ReportInfo";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/report/run-1/issue-info"]}>
      <ReportInfo />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({
    taskType: "multilabel",
    selectedMetricIds: ["M2", "M4", "M17"],
  });
});

describe("핵심 지표", () => {
  it("고르지 않았으면 유형별 기본값이 체크돼 있다 — 멀티레이블은 F1·Jaccard", () => {
    renderPage();

    expect(screen.getByRole("checkbox", { name: "M4 core metric" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "M17 core metric" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "M2 core metric" })).not.toBeChecked();
  });

  it("하나를 켜면 보이는 목록 전체를 사용자의 선택으로 저장한다", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("checkbox", { name: "M2 core metric" }));

    expect(useWorkflowStore.getState().composerMetrics.coreMetrics?.choices).toEqual([
      "M4",
      "M17",
      "M2",
    ]);
  });

  it("모두 끄면 넘어갈 수 없다 — 핵심 지표는 최소 1개다 (재료 목록 7절)", async () => {
    // 나머지 필수 칸을 다 채워, 막히는 이유가 핵심 지표뿐이게 한다.
    useWorkflowStore.setState({
      basicInfo: {
        ...useWorkflowStore.getState().basicInfo,
        companyName: "Test Corp",
        representative: "Hong",
        businessNumber: "123-45-67890",
        phone: "02-1234-5678",
        address: "Seoul",
        reportPurpose: "internal",
        modelName: "Model",
        modelPurpose: "Churn",
        modelCategory: "Tabular",
        taskType: "multilabel",
      },
      metricDetails: Object.fromEntries(
        ["M2", "M4", "M17"].map((id) => [
          id,
          { id, name: id, description: "", targetValue: "0.5", beta: "", positiveClass: "", completed: false },
        ]),
      ),
    });
    renderPage();
    const next = screen.getByRole("button", { name: /View report|Next step/ });
    expect(next).toBeEnabled();

    await userEvent.click(screen.getByRole("checkbox", { name: "M4 core metric" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "M17 core metric" }));

    expect(useWorkflowStore.getState().composerMetrics.coreMetrics?.choices).toEqual([]);
    expect(screen.getByText("Choose at least one core metric.")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });
});

describe("성적서 용도에 덧붙이는 글 (서술 설계 D26)", () => {
  it("선택지 아래에 글칸이 있고, 적은 글을 저장한다", async () => {
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(/why this report is issued/), "For the Q3 audit");

    expect(useWorkflowStore.getState().basicInfo.reportPurposeNote).toBe("For the Q3 audit");
  });
});

describe("Report notes", () => {
  it("칸이 없다 — 학습 데이터 설명·비고는 ⑥ 카드가 받는다", () => {
    renderPage();

    expect(screen.queryByText("Report notes")).not.toBeInTheDocument();
  });
});
