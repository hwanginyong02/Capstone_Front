/**
 * 지표와 합격 기준 화면 — 합격 기준 표와 핵심 지표(docs/MATERIAL_PICKER.md §3·§5).
 *
 * 합격 목표값과 핵심 지표는 종전에 Details(의뢰자 정보) 화면이 받았다. 레지스트리상 ② 소속이라
 * 지표 화면으로 합쳤다. 핵심 지표는 미달하면 최종 불합격(FAIL)이 되는 지표다. 고르지 않으면
 * 유형별 기본값이 체크돼 보인다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { TestItems } from "./TestItems";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/metrics"]}>
      <TestItems />
    </MemoryRouter>,
  );
}

const withTargets = (ids: string[], value = "0.5") =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      { id, name: id, description: "", targetValue: value, beta: "", positiveClass: "", completed: false },
    ]),
  );

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({
    taskType: "multilabel",
    selectedMetricIds: ["M2", "M4", "M17"],
    // 지표 선택 이유(멀티레이블)를 채워, 막히는 이유가 합격 기준뿐이게 한다.
    composerMetrics: { metricRationale: { text: "Degree of overlap" } },
  });
});

describe("고른 지표", () => {
  it("다시 들어와도 고른 지표가 남는다 — 검증에서 돌아오는 동선이 생겼다", () => {
    renderPage();

    expect(useWorkflowStore.getState().selectedMetricIds).toEqual(["M2", "M4", "M17"]);
    expect(screen.getByText("개 선택", { exact: false })).toHaveTextContent("3개 선택");
  });
});

describe("핵심 지표", () => {
  it("고르지 않았으면 유형별 기본값이 체크돼 있다 — 멀티레이블은 F1·Jaccard", () => {
    renderPage();

    expect(screen.getByRole("checkbox", { name: "M4 핵심 지표" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "M17 핵심 지표" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "M2 핵심 지표" })).not.toBeChecked();
  });

  it("하나를 켜면 보이는 목록 전체를 사용자의 선택으로 저장한다", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("checkbox", { name: "M2 핵심 지표" }));

    expect(useWorkflowStore.getState().composerMetrics.coreMetrics?.choices).toEqual([
      "M4",
      "M17",
      "M2",
    ]);
  });

  it("모두 끄면 넘어갈 수 없다 — 핵심 지표는 최소 1개다 (재료 목록 7절)", async () => {
    useWorkflowStore.setState({ metricDetails: withTargets(["M2", "M4", "M17"]) });
    renderPage();
    const next = screen.getByRole("button", { name: "다음" });
    expect(next).toBeEnabled();

    await userEvent.click(screen.getByRole("checkbox", { name: "M4 핵심 지표" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "M17 핵심 지표" }));

    expect(useWorkflowStore.getState().composerMetrics.coreMetrics?.choices).toEqual([]);
    expect(screen.getByText("핵심 지표를 하나 이상 고르세요.")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });
});

describe("합격 목표값 — 평가 전에 받는다", () => {
  it("목표값이 비면 넘어갈 수 없다", () => {
    renderPage();

    expect(screen.getAllByText("목표값을 넣으세요.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  it("목표값을 적으면 그 지표의 목표로 저장한다", async () => {
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "M4 목표값" }), "0.8");

    expect(useWorkflowStore.getState().metricDetails.M4?.targetValue).toBe("0.8");
  });
});

describe("β 기본값 1.0 (B3)", () => {
  it("M5 를 고르고 목표값을 먼저 적어도 β 는 1.0 이고 오류가 없으며 '다음'이 열린다", async () => {
    useWorkflowStore.setState({ selectedMetricIds: ["M4", "M5", "M17"], metricDetails: {} });
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "M4 목표값" }), "0.8");
    await userEvent.type(screen.getByRole("textbox", { name: "M5 목표값" }), "0.7");
    await userEvent.type(screen.getByRole("textbox", { name: "M17 목표값" }), "0.6");

    expect(useWorkflowStore.getState().metricDetails.M5?.beta).toBe("1.0");
    expect(screen.getByRole("textbox", { name: "β" })).toHaveValue("1.0");
    expect(screen.queryByText("β는 0보다 큰 숫자여야 합니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("β 를 직접 지우면 여전히 오류이고 '다음'이 잠긴다", async () => {
    useWorkflowStore.setState({
      selectedMetricIds: ["M4", "M5", "M17"],
      metricDetails: withTargets(["M4", "M17"]),
    });
    renderPage();
    await userEvent.type(screen.getByRole("textbox", { name: "M5 목표값" }), "0.7");
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();

    await userEvent.clear(screen.getByRole("textbox", { name: "β" }));

    expect(useWorkflowStore.getState().metricDetails.M5?.beta).toBe("");
    expect(screen.getByText("β는 0보다 큰 숫자여야 합니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });
});

describe("매핑으로 계산할 수 없는 지표 (docs/MATERIAL_PICKER.md §3)", () => {
  const mapped = (...roles: ("y_true" | "y_pred" | "score")[]) =>
    roles.map((role) => ({
      originalName: role,
      sampleValues: [],
      inferredRole: role,
      confirmedRole: role,
      modified: false,
      warnings: [],
    }));

  it("확률 컬럼 없이 매핑했으면 AUROC 를 고를 수 없다", () => {
    useWorkflowStore.setState({
      taskType: "binary",
      selectedMetricIds: ["M1"],
      columnMapping: mapped("y_true", "y_pred"),
    });
    renderPage();

    expect(screen.getByRole("checkbox", { name: "AUROC" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Accuracy" })).toBeEnabled();
  });

  it("매핑을 바꿔 계산할 수 없게 된 지표는 들어올 때 선택에서 빼고 알린다", () => {
    useWorkflowStore.setState({
      taskType: "binary",
      selectedMetricIds: ["M1", "M9"],
      columnMapping: mapped("y_true", "y_pred"),
    });
    renderPage();

    expect(useWorkflowStore.getState().selectedMetricIds).toEqual(["M1"]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "매핑한 컬럼으로 계산할 수 없게 된 지표를 선택에서 뺐습니다: AUROC",
    );
  });

  it("확률 컬럼이 있으면 그대로 둔다", () => {
    useWorkflowStore.setState({
      taskType: "binary",
      selectedMetricIds: ["M1", "M9"],
      columnMapping: mapped("y_true", "y_pred", "score"),
    });
    renderPage();

    expect(useWorkflowStore.getState().selectedMetricIds).toEqual(["M1", "M9"]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("지표 선택 이유 — 재료 선택 점검 2층(12번): 비어도 막지 않는다", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      composerMetrics: {},
      metricDetails: withTargets(["M2", "M4", "M17"]),
    });
  });

  it("비어 있어도 '다음'으로 진행하고, 성적서에 '제공되지 않음'으로 표시된다고 알린다", async () => {
    renderPage();

    expect(screen.getByText(/비어 있으면 성적서에 "제공되지 않음"으로 표시됩니다/)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /^다음$/ });
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(useWorkflowStore.getState().completedStepIds).toContain("metrics");
  });

  it("'모름'을 고를 수 있다", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /모름/ })).toBeInTheDocument();
  });
});
