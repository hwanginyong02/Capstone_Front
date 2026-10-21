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

  it("덧붙이는 글 칸이 있다(서술 칸 11개 중 이 화면의 한 칸 — 나머지 10칸은 ComposerCardForm.test) — 2층이라 글만으로도 답", async () => {
    const { onMetricCardChange } = renderScreen("multilabel");
    const note = screen.getByRole("textbox", { name: "지표 선택 이유 덧붙이는 글" });
    // 2층(선택 필수가 아님) — 1층 선언의 '위에서 하나를 고르세요' 안내가 아니다
    expect(note).toHaveAttribute("placeholder", "덧붙이는 글 (선택)");
    await userEvent.type(note, "n");
    expect(onMetricCardChange).toHaveBeenLastCalledWith("metricRationale", expect.objectContaining({ note: "n" }));
  });

  it.each(["binary", "multiclass"] as TaskType[])("%s 에서는 덧붙이는 글 칸도 없다", (taskType) => {
    renderScreen(taskType);
    expect(screen.queryByRole("textbox", { name: "지표 선택 이유 덧붙이는 글" })).not.toBeInTheDocument();
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

describe("목적별 점검 미리보기와 추천 (재료 선택 점검 6절)", () => {
  const unmetCurve = {
    id: "curveImbalance" as const,
    met: false,
    title: "큰 불균형 → AUPRC",
    declared: "불균형 비율 19.00",
    recommended: ["M10"],
    shortfall: "",
  };

  it("맞지 않는 줄의 '추가'는 추천 지표를 선택에 더한다", async () => {
    const onSelectedMetricsChange = vi.fn();
    render(
      <TestItems
        taskType="binary"
        selectedMetricIds={["M9"]}
        onSelectedMetricsChange={onSelectedMetricsChange}
        purposeLines={[unmetCurve]}
      />,
    );
    expect(screen.getByRole("list", { name: "목적별 점검" })).toHaveTextContent("큰 불균형 → AUPRC");
    await userEvent.click(screen.getByRole("button", { name: /^추가:/ }));
    expect(onSelectedMetricsChange).toHaveBeenLastCalledWith(["M9", "M10"]);
  });

  it("추천 지표를 지금 매핑으로 계산할 수 없으면 버튼 대신 이유를 적는다", () => {
    render(
      <TestItems
        taskType="binary"
        selectedMetricIds={["M9"]}
        purposeLines={[unmetCurve]}
        unavailableReasons={{ M10: "확률 컬럼이 필요합니다" }}
      />,
    );
    expect(screen.queryByRole("button", { name: /^추가:/ })).not.toBeInTheDocument();
    expect(screen.getByText(/지금 매핑으로 계산할 수 없습니다/)).toBeInTheDocument();
  });

  it("맞는 줄에는 버튼이 없고, 줄이 없으면 카드를 그리지 않는다", () => {
    const { unmount } = render(
      <TestItems taskType="binary" selectedMetricIds={["M9", "M10"]} purposeLines={[{ ...unmetCurve, met: true }]} />,
    );
    expect(screen.queryByRole("button", { name: /^추가:/ })).not.toBeInTheDocument();
    unmount();
    render(<TestItems taskType="binary" selectedMetricIds={["M1"]} purposeLines={[]} />);
    expect(screen.queryByRole("list", { name: "목적별 점검" })).not.toBeInTheDocument();
  });

  it("'추천 지표'는 넘겨받은 세트(선언·IR 반영)를 고른다", async () => {
    const onSelectedMetricsChange = vi.fn();
    render(
      <TestItems
        taskType="binary"
        selectedMetricIds={[]}
        onSelectedMetricsChange={onSelectedMetricsChange}
        recommendedMetricIds={["M1", "M9", "M10"]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "추천 지표" }));
    expect(onSelectedMetricsChange).toHaveBeenLastCalledWith(["M1", "M9", "M10"]);
  });
});
