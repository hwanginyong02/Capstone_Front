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

    expect(screen.getByText("지표 선택 이유")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "겹치는 정도" })).toBeInTheDocument();
  });

  it.each(["binary", "multiclass"] as TaskType[])("%s 에서는 묻지 않는다", (taskType) => {
    renderScreen(taskType);

    expect(screen.queryByText("지표 선택 이유")).not.toBeInTheDocument();
  });

  it("고른 답을 ② 카드 값으로 보고한다", async () => {
    const { onMetricCardChange } = renderScreen("multilabel");

    // 화면 이름은 한국어지만 저장값은 영어 그대로다(docs/MATERIAL_PICKER.md §8).
    await userEvent.click(screen.getByRole("radio", { name: "모든 레이블 일치" }));

    expect(onMetricCardChange).toHaveBeenCalledWith("metricRationale", {
      text: "Every label must match",
      unknown: false,
    });
  });

  it("Other 를 고르면 직접 적을 칸이 나타난다", () => {
    renderScreen("multilabel", { metricRationale: { text: "Other (own words)" } });

    expect(screen.getByRole("textbox", { name: "지표 선택 이유 기타 내용" })).toBeInTheDocument();
  });
});

describe("계산할 수 없는 지표 (docs/MATERIAL_PICKER.md §3)", () => {
  const reasons = { M9: "양성 클래스 점수(score) 컬럼이 매핑되지 않아 계산할 수 없습니다." };

  it("고를 수 없고, 이름 아래에 이유를 한 줄 적는다", () => {
    render(<TestItems taskType="binary" unavailableReasons={reasons} />);

    const auroc = screen.getByRole("checkbox", { name: "AUROC" });
    expect(auroc).toBeDisabled();
    expect(auroc).toHaveAccessibleDescription(reasons.M9);
    expect(screen.getByRole("checkbox", { name: "Accuracy" })).toBeEnabled();
  });

  it("추천 지표와 전체 선택은 계산할 수 없는 지표를 건너뛴다", async () => {
    const onSelectedMetricsChange = vi.fn();
    render(
      <TestItems
        taskType="binary"
        unavailableReasons={reasons}
        onSelectedMetricsChange={onSelectedMetricsChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "추천 지표" }));
    expect(onSelectedMetricsChange).toHaveBeenLastCalledWith(
      expect.not.arrayContaining(["M9"]),
    );
    expect(onSelectedMetricsChange.mock.lastCall?.[0]).toContain("M1");

    await userEvent.click(screen.getByRole("button", { name: "전체 선택" }));
    expect(onSelectedMetricsChange.mock.lastCall?.[0]).not.toContain("M9");
  });

  it("이미 골라져 있으면 빼는 것은 된다", async () => {
    const onSelectedMetricsChange = vi.fn();
    render(
      <TestItems
        taskType="binary"
        selectedMetricIds={["M1", "M9"]}
        unavailableReasons={reasons}
        onSelectedMetricsChange={onSelectedMetricsChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "AUROC" }));
    expect(onSelectedMetricsChange).toHaveBeenLastCalledWith(["M1"]);
  });
});
