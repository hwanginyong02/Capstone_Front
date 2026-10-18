/**
 * Step 6 페이지 게이트 — ISSUES.md E-04.
 *
 * 검증이 실패했거나 수행되지 않았을 때 다음 버튼(run 저장)이 눌리면, 검증 절이 통째로
 * 비어 있는 성적서가 만들어진다(6절에 "오류 0건 / 경고 0건"이 인쇄된다).
 * 이 결함은 rawFile 이 멀쩡히 살아 있어도 서버가 500 을 내거나 네트워크가 끊기면
 * 발동하므로 E-01(상태 비영속)의 자식이 아니다 — 독립적으로 막아야 한다.
 */
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDataValidation = vi.fn();

vi.mock("../hooks/useDataValidation", () => ({
  useDataValidation: () => mockUseDataValidation(),
}));

// 안내는 본문 칸 안(제목 아래)에 그려지도록 본문 컴포넌트에 넘긴다 — 대역도 그 자리를 그린다.
vi.mock("../components/data-validation/DataValidation", () => ({
  DataValidation: ({ notices }: { notices?: ReactNode }) => (
    <div data-testid="validation-content">{notices}</div>
  ),
}));

import { DataValidation } from "./DataValidation";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage(hookResult: Record<string, unknown>) {
  mockUseDataValidation.mockReturnValue({
    validationData: null,
    isLoading: false,
    error: null,
    buildEvaluationResult: vi.fn(),
    ...hookResult,
  });
  render(
    <MemoryRouter initialEntries={["/app/data-validation"]}>
      <DataValidation />
    </MemoryRouter>
  );
  return screen.getByRole("button", { name: /^다음$/ });
}

beforeEach(() => {
  mockUseDataValidation.mockReset();
});

describe("Step 6 평가 실행 게이트", () => {
  it("[E-04] 검증이 수행되지 않았으면(validationData=null) 실행 버튼이 비활성이다", () => {
    expect(renderPage({ validationData: null })).toBeDisabled();
  });

  it("[E-04] 검증 요청이 실패했으면 실행 버튼이 비활성이다", () => {
    expect(renderPage({ validationData: null, error: "Failed to fetch" })).toBeDisabled();
  });

  it("[E-04] 응답을 받았더라도 error 상태면 실행 버튼이 비활성이다", () => {
    expect(
      renderPage({ validationData: { error_count: 0 }, error: "예상치 못한 응답 형식" })
    ).toBeDisabled();
  });

  it("[E-04] 차단 오류가 있으면 실행 버튼이 비활성이다(기존 동작 보존)", () => {
    expect(renderPage({ validationData: { error_count: 2 } })).toBeDisabled();
  });

  it("[E-04] 로딩 중에는 실행 버튼이 비활성이다(기존 동작 보존)", () => {
    expect(renderPage({ validationData: null, isLoading: true })).toBeDisabled();
  });

  it("[E-04] 검증이 성공하고 오류가 0건이면 실행할 수 있다", () => {
    expect(renderPage({ validationData: { error_count: 0 } })).toBeEnabled();
  });

  it("[E-04] 차단된 이유가 화면에 표시된다", () => {
    renderPage({ validationData: null, error: "Failed to fetch" });
    expect(screen.getByText(/평가를 실행할 수 없습니다/)).toBeInTheDocument();
  });
});

describe("검증 단계 상단 안내 (ISSUES.md B-03·B-04·A-12)", () => {
  /**
   * 백엔드가 평가 데이터·매핑 단계에서 내려보낸 안내를 여기 합쳐 **보여준다**.
   * 마운트 여부만이 아니라 **실제로 화면에 보이는지**를 확인한다 — 렌더는 하되
   * 숨겨 두는 회귀는 소스 검색으로 잡히지 않는다.
   */
  it("컬럼 분석·매핑 안내가 보인다", () => {
    useWorkflowStore.setState({
      columnNotes: [
        { llm_column: "memo", matched_column: null, status: "unmapped_header", message: "memo 를 제외했습니다" },
      ],
      mappingWarnings: [{ code: "X", message: "예측을 파생합니다" }],
    });

    renderPage({});

    expect(screen.getByText(/memo 를 제외했습니다/)).toBeVisible();
    expect(screen.getByText(/예측을 파생합니다/)).toBeVisible();
  });

  it("안내가 없으면 배너를 그리지 않는다", () => {
    useWorkflowStore.setState({ columnNotes: [], mappingWarnings: [] });

    renderPage({});

    expect(
      screen.queryByText(/\[컬럼 분석\]|\[매핑\]|\[전처리\]/),
    ).not.toBeInTheDocument();
  });
});

describe("생성 전 안내와 '다음' (재료 선택 점검 6절)", () => {
  const addEvaluationRun = vi.fn(() => ({ id: "run-1" }));

  /** 매퍼처럼 **부를 때의** 스토어 기록으로 점검한다 — 기록 → 재생성 순서가 성적서에 닿는지 본다. */
  async function setupLive(options: Parameters<typeof import("../test/materialCheckFixture").materialCheckFixture>[0]) {
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { FILLED_LAYER_ONE } = await import("../test/layerOneFixture");
    const { useWorkspaceStore } = await import("../utils/stores/useWorkspaceStore");
    useWorkspaceStore.setState({ addEvaluationRun } as never);
    useWorkflowStore.setState({ ...FILLED_LAYER_ONE, materialCheckAck: null });
    const buildEvaluationResult = vi.fn(() => ({
      workflowSnapshot: {},
      reportData: {
        evalScope: { version: "v1" },
        meta: { reportId: "R" },
        materialCheck: materialCheckFixture(options, useWorkflowStore.getState().materialCheckAck),
      },
    }));
    return renderPage({ validationData: { error_count: 0 }, buildEvaluationResult });
  }

  async function setup(materialCheck: unknown) {
    const { FILLED_LAYER_ONE } = await import("../test/layerOneFixture");
    const { useWorkspaceStore } = await import("../utils/stores/useWorkspaceStore");
    useWorkspaceStore.setState({ addEvaluationRun } as never);
    useWorkflowStore.setState({ ...FILLED_LAYER_ONE, materialCheckAck: null });
    const buildEvaluationResult = vi.fn(() => ({
      workflowSnapshot: {},
      reportData: { evalScope: { version: "v1" }, meta: { reportId: "R" }, materialCheck },
    }));
    const next = renderPage({ validationData: { error_count: 0 }, buildEvaluationResult });
    return { next, buildEvaluationResult };
  }

  beforeEach(() => addEvaluationRun.mockClear());

  it("1층 빈칸이 있으면 막고 그 단계로 안내한다 — run 을 저장하지 않는다", async () => {
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { next } = await setup(materialCheckFixture({ missingLatencyAndLabel: true }));
    useWorkflowStore.setState({ basicInfo: { ...useWorkflowStore.getState().basicInfo, companyName: "" } });

    next.click();

    const list = await screen.findByRole("list", { name: "비어 있는 필수 입력" });
    expect(list).toHaveTextContent("의뢰자 정보에서 채우기");
    expect(addEvaluationRun).not.toHaveBeenCalled();
    // 막혔으면 경고를 보고 진행한 것이 아니다 — 기록도 남기지 않는다.
    expect(useWorkflowStore.getState().materialCheckAck).toBeNull();
  });

  it("매핑을 고친 뒤 계산할 수 없게 된 지표가 남아 있으면 막고 지표 화면으로 이유와 함께 안내한다 (B8)", async () => {
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { next } = await setup(materialCheckFixture({}));
    const row = (role: string) => ({
      originalName: role,
      sampleValues: [],
      inferredRole: role,
      confirmedRole: role,
      modified: false,
      warnings: [],
    });
    useWorkflowStore.setState({
      taskType: "binary",
      selectedMetricIds: ["M1", "M9"],
      metricDetails: {
        M1: { targetValue: "0.8" },
        M9: { targetValue: "0.7" },
      } as never,
      columnMapping: [row("y_true"), row("y_pred")] as never,
      availableMetricIds: null,
    });

    next.click();

    const list = await screen.findByRole("list", { name: "비어 있는 필수 입력" });
    expect(list).toHaveTextContent("지표와 합격 기준에서 채우기");
    expect(screen.getByRole("list", { name: "지표와 합격 기준 문제" })).toHaveTextContent(/^AUROC: /);
    expect(addEvaluationRun).not.toHaveBeenCalled();
  });

  it("2·3층 경고는 화면에 보이고, '다음'을 누르면 기록을 남긴 뒤 진행한다", async () => {
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const check = materialCheckFixture({ missingLatencyAndLabel: true, realTime: true });
    const { next, buildEvaluationResult } = await setup(check);

    expect(screen.getByRole("region", { name: "생성 전 안내" })).toBeVisible();
    expect(screen.getByRole("list", { name: "빠진 보고 항목" })).toHaveTextContent("정답 라벨 구축 방법");
    buildEvaluationResult.mockClear();

    next.click();

    const ack = useWorkflowStore.getState().materialCheckAck;
    expect(ack).toMatchObject({ version: "1.0", warningIds: check.warningIds });
    expect(Number.isNaN(Date.parse(ack!.at))).toBe(false);
    // 기록을 남긴 뒤 성적서를 다시 만든다 — 그래야 6.0 이 "확인 후 진행"을 찍는다.
    expect(buildEvaluationResult).toHaveBeenCalledTimes(2);
    expect(addEvaluationRun).toHaveBeenCalledTimes(1);
  });

  it("경고가 없으면 안내를 그리지 않고 옛 기록을 비운다", async () => {
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { next } = await setup(materialCheckFixture());
    useWorkflowStore.setState({ materialCheckAck: { at: "2026-10-01T00:00:00Z", version: "1.0", warningIds: ["x"] } });

    expect(screen.queryByRole("region", { name: "생성 전 안내" })).not.toBeInTheDocument();
    next.click();
    expect(useWorkflowStore.getState().materialCheckAck).toBeNull();
    expect(addEvaluationRun).toHaveBeenCalledTimes(1);
  });

  it("저장되는 성적서에 '확인 후 진행'이 실린다(기록을 남긴 뒤 다시 만든 결과)", async () => {
    const next = await setupLive({ missingLatencyAndLabel: true });
    next.click();
    const saved = (addEvaluationRun.mock.calls[0] as unknown as [{ reportData: { materialCheck: { acknowledgement: unknown; printed: { summary: Array<{ value: string }> } } } }])[0];
    expect(saved.reportData.materialCheck.acknowledgement).not.toBeNull();
    expect(saved.reportData.materialCheck.printed.summary[2].value).toMatch(/^확인 후 진행 \(/);
  });
});

describe("생성 전 안내 → 평가 흐름 만들기", () => {
  it("넣으러 가면 그 블록과 돌아올 입력 화면을 넘긴다(FlowEntryState)", async () => {
    const { MemoryRouter: Router, Routes, Route, useLocation } = await import("react-router");
    const { default: userEvent } = await import("@testing-library/user-event");
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { FILLED_LAYER_ONE } = await import("../test/layerOneFixture");
    const { getCard } = await import("../data/reportComposer");
    useWorkflowStore.setState({ ...FILLED_LAYER_ONE, materialCheckAck: null });
    mockUseDataValidation.mockReturnValue({
      validationData: { error_count: 0 },
      isLoading: false,
      error: null,
      buildEvaluationResult: vi.fn(() => ({
        workflowSnapshot: {},
        reportData: {
          evalScope: { version: "v1" },
          meta: { reportId: "R" },
          materialCheck: materialCheckFixture({ missingLatencyAndLabel: true }),
        },
      })),
    });
    function Composer() {
      return <pre data-testid="composer-state">{JSON.stringify(useLocation().state)}</pre>;
    }
    render(
      <Router initialEntries={["/app/data-validation"]}>
        <Routes>
          <Route path="/app/data-validation" element={<DataValidation />} />
          <Route path="/app/composer" element={<Composer />} />
        </Routes>
      </Router>,
    );

    const list = screen.getByRole("list", { name: "빠진 보고 항목" });
    const fix = list.querySelectorAll("button");
    expect(fix.length).toBeGreaterThan(0);
    // 정답 라벨 구축 방법 → 정답 라벨 블록.
    const button = [...fix].find((item) => item.closest("li")?.textContent?.includes("정답 라벨 구축 방법"));
    await userEvent.click(button!);

    expect(JSON.parse(screen.getByTestId("composer-state").textContent!)).toEqual({
      cardId: "groundTruth",
      returnStep: getCard("groundTruth").steps[0],
    });
  });

  it("지연시간은 평가 데이터 › 지연시간 컬럼을 펼치고 컬럼 매핑으로 돌아오게 한다 — 놓았으면 '컬럼 매핑에서 고치기'도", async () => {
    const { MemoryRouter: Router, Routes, Route, useLocation } = await import("react-router");
    const { default: userEvent } = await import("@testing-library/user-event");
    const { materialCheckFixture } = await import("../test/materialCheckFixture");
    const { FILLED_LAYER_ONE } = await import("../test/layerOneFixture");
    useWorkflowStore.setState({ ...FILLED_LAYER_ONE, materialCheckAck: null });
    useWorkflowStore.setState({
      materialPicks: { ...useWorkflowStore.getState().materialPicks, evalData: ["yTrueColumn", "predictionColumns"] },
    });
    mockUseDataValidation.mockReturnValue({
      validationData: { error_count: 0 },
      isLoading: false,
      error: null,
      buildEvaluationResult: vi.fn(() => ({
        workflowSnapshot: {},
        reportData: {
          evalScope: { version: "v1" },
          meta: { reportId: "R" },
          materialCheck: materialCheckFixture({ missingLatencyAndLabel: true }),
        },
      })),
    });
    function Composer() {
      return <pre data-testid="composer-state">{JSON.stringify(useLocation().state)}</pre>;
    }
    const view = render(
      <Router initialEntries={["/app/data-validation"]}>
        <Routes>
          <Route path="/app/data-validation" element={<DataValidation />} />
          <Route path="/app/composer" element={<Composer />} />
        </Routes>
      </Router>,
    );

    // 놓지 않았다 — 컬럼 매핑으로 보내는 갈래가 없다.
    expect(screen.queryByRole("button", { name: "컬럼 매핑에서 고치기" })).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "빠진 보고 항목" });
    const button = [...list.querySelectorAll("button")].find((item) =>
      item.closest("li")?.textContent?.includes("평가 데이터 › 지연시간 컬럼"),
    );
    await userEvent.click(button!);
    expect(JSON.parse(screen.getByTestId("composer-state").textContent!)).toEqual({
      cardId: "evalData",
      leafIds: ["latencyColumn"],
      returnStep: "mapping",
    });
    view.unmount();

    // 놓았으면 "컬럼 매핑에서 고치기"도 보인다.
    useWorkflowStore.setState({
      materialPicks: { ...useWorkflowStore.getState().materialPicks, evalData: ["latencyColumn"] },
    });
    render(
      <Router initialEntries={["/app/data-validation"]}>
        <DataValidation />
      </Router>,
    );
    expect(screen.getByRole("button", { name: "컬럼 매핑에서 고치기" })).toBeInTheDocument();
  });
});
