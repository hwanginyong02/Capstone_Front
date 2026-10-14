/**
 * 지표 선택 화면 — ② 의 지표 선택 이유.
 *
 * 레지스트리에 정의만 있고 어느 화면에도 나오지 않던 필드다. 멀티레이블에서만 묻는다 —
 * 세 지표군(오차를 고르게 봄 / 모든 레이블 일치 / 겹치는 정도)의 뜻이 서로 달라 고른 이유를
 * 성적서에 적는다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TestItems } from "./TestItems";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerValueMap } from "../../types/reportComposer.types";

function renderScreen(taskType: TaskType, values: ComposerValueMap = {}) {
  const onMetricCardChange = vi.fn();
  render(
    <TestItems
      taskType={taskType}
      metricCardValues={values}
      onMetricCardChange={onMetricCardChange}
    />,
  );
  return { onMetricCardChange };
}

describe("지표 선택 이유", () => {
  it("멀티레이블에서 묻는다", () => {
    renderScreen("multilabel");

    expect(screen.getByText("Reason for this choice")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Degree of overlap" })).toBeInTheDocument();
  });

  it.each(["binary", "multiclass"] as TaskType[])("%s 에서는 묻지 않는다", (taskType) => {
    renderScreen(taskType);

    expect(screen.queryByText("Reason for this choice")).not.toBeInTheDocument();
  });

  it("고른 답을 ② 카드 값으로 보고한다", async () => {
    const { onMetricCardChange } = renderScreen("multilabel");

    await userEvent.click(screen.getByRole("radio", { name: "Every label must match" }));

    expect(onMetricCardChange).toHaveBeenCalledWith("metricRationale", {
      text: "Every label must match",
      unknown: false,
    });
  });

  it("Other 를 고르면 직접 적을 칸이 나타난다", () => {
    renderScreen("multilabel", { metricRationale: { text: "Other (own words)" } });

    expect(screen.getByRole("textbox", { name: "Reason for this choice other" })).toBeInTheDocument();
  });
});
