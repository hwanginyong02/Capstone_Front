/**
 * 재료 고르기 화면 — 왼쪽 재료 목록(대분류·카드), 가운데 위 4열 다이어그램, 가운데 아래 필드 패널,
 * 하단 현황(docs/MATERIAL_PICKER.md §11).
 *
 * 저장 버튼은 없다. 넣고 빼는 것과 순서를 바꾸는 것이 바로 스토어에 들어가고 다이어그램에 보인다.
 * 필수 카드는 처음부터 들어가 있어 다음을 막지 않는다. 끌어 놓기와 같은 일을 하는 버튼이 모두
 * 있어, 여기서는 버튼으로 확인한다(jsdom 은 HTML5 끌어 놓기를 재현하지 못한다).
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { MaterialPicker } from "./MaterialPicker";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList } from "../utils/domain/workflowSteps";

function renderPage(state?: { cardId: string }) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/app/composer", state }]}>
      <Routes>
        <Route path="/app/composer" element={<MaterialPicker />} />
        <Route path="/app/client-info" element={<div data-testid="step-client-info" />} />
        <Route path="/app/model" element={<div data-testid="step-model" />} />
        <Route path="/app" element={<div data-testid="task-type" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const diagram = () => screen.getByRole("region", { name: "입력 순서 다이어그램" });
const palette = () => screen.getByRole("navigation", { name: "재료 목록" });
/** 가운데 아래 필드 패널. 고른 카드의 이름이 붙는다. */
const fieldPanel = (card: string) => screen.getByRole("region", { name: `${card} 필드` });
/** 재료 목록의 카드 버튼. 필수 카드는 이름 뒤에 "필수"가 붙어 읽힌다. */
const paletteCard = (card: string, pressed: boolean) =>
  within(palette()).getByRole("button", { name: new RegExp("^" + card + "(필수)?$"), pressed });
const selectInPalette = (card: string) => userEvent.click(paletteCard(card, false));

/** 다이어그램의 레인 이름, 왼쪽부터. */
const laneNames = () =>
  within(screen.getByRole("list", { name: "대분류 레인" }))
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);

/** 다이어그램의 카드, 입력 순서대로(왼쪽 레인부터, 레인 안에서는 위부터). */
const diagramCards = () =>
  laneNames().flatMap((lane) => {
    const list = screen.getByRole("list", { name: `${lane} 카드` });
    return within(list)
      .queryAllByRole("listitem")
      .filter((item) => item.parentElement === list)
      .map((item) => item.getAttribute("aria-label"));
  });

const node = (name: string) => within(diagram()).getByRole("listitem", { name });

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary" });
});

describe("화면 구조", () => {
  it("가운데 다이어그램은 대분류 4열이고, 필수 카드 다섯 장이 처음부터 들어가 있다", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "재료 고르기" })).toBeInTheDocument();
    expect(laneNames()).toEqual(["의뢰 정보", "모델", "데이터", "평가 기준"]);
    expect(diagramCards()).toEqual(["의뢰자 정보", "평가 대상 모델", "평가 데이터", "평가 관점", "지표와 합격 기준"]);
    // 입력 순서 번호가 붙는다.
    expect(within(node("의뢰자 정보")).getByText("1")).toBeInTheDocument();
    expect(within(node("지표와 합격 기준")).getByText("5")).toBeInTheDocument();
  });

  it("필수 카드는 저장 없이 들어가 있고, 고르지 않은 선택 항목은 받지 않는다", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
    // 필수 카드의 키가 채워져 입력 화면이 홈페이지·팩스를 묻지 않는다.
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual([]);
  });

  it("재료 목록에서 카드를 고르면 가운데 아래에 필드가 구분별로 나오고, 이름·형식·설명이 마우스 없이 보인다", async () => {
    renderPage();
    await selectInPalette("모델 설정과 실행 환경");

    const fields = fieldPanel("모델 설정과 실행 환경");
    expect(within(fields).getByRole("heading", { name: /^권장/ })).toBeInTheDocument();
    expect(within(fields).getByText("알고리즘")).toBeInTheDocument();
    expect(within(fields).getByText("모델 학습에 쓴 알고리즘입니다.")).toBeVisible();
    // 설명 끝의 예시는 한 줄 떼어 보인다. 형식은 이름 옆 칩이다.
    expect(within(fields).getByText("랜덤포레스트, XGBoost")).toBeVisible();
    expect(within(fields).getAllByText("텍스트").length).toBeGreaterThan(0);
    // 권장 필드 안의 칸도 나열한다.
    expect(within(fields).getByText("운영체제")).toBeInTheDocument();
    // 설명을 읽고 바로 넣는다.
    await userEvent.click(within(fields).getByRole("button", { name: "알고리즘 넣기" }));
    expect(useWorkflowStore.getState().materialPicks.modelEnv).toEqual(["algorithm"]);
  });

  it("파일을 받는 필드는 이 분류 유형의 파일 예시를 표로 보인다", async () => {
    renderPage();
    await selectInPalette("평가 데이터");

    const fields = fieldPanel("평가 데이터");
    expect(within(fields).getByText("결과 파일")).toBeInTheDocument();
    const table = within(fields).getByRole("table");
    for (const column of ["y_true", "y_pred", "score"]) {
      expect(within(table).getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    // 업로드 화면과 같은 필수 컬럼 안내도 붙는다.
    expect(within(fields).getByText(/정답\(y_true\)은 필수/)).toBeInTheDocument();
  });

  it("파일이 아닌 필드에는 예시 표가 없다", () => {
    renderPage();

    expect(within(fieldPanel("의뢰자 정보")).queryByRole("table")).not.toBeInTheDocument();
  });

  it("처음에는 의뢰자 정보의 필드를 보인다 — 필수·조건부도 나오고 필드는 하나씩 쪼개 보인다", () => {
    renderPage();

    const fields = fieldPanel("의뢰자 정보");
    for (const name of ["회사명", "대표자", "사업자등록번호", "전화번호", "주소"]) {
      expect(within(fields).getByText(name)).toBeInTheDocument();
    }
    // 필수는 버튼이 없다 — 늘 들어간다.
    expect(within(fields).queryByRole("button", { name: "회사명 넣기" })).not.toBeInTheDocument();
    expect(within(fields).getAllByText("조건: 성적서 용도에서 과제 산출물 선택 시")).toHaveLength(2);
    expect(within(fields).getByRole("button", { name: "홈페이지 넣기" })).toHaveAttribute("aria-pressed", "false");
  });

  it("재료 목록에는 대분류와 카드만 있고, 대분류에 카드 수 문구를 달지 않는다", () => {
    renderPage();

    for (const name of ["의뢰 정보", "모델", "데이터", "평가 기준"]) {
      const category = within(palette()).getByRole("region", { name });
      expect(within(category).getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
    expect(within(palette()).queryByText(/카드 \d+장/)).not.toBeInTheDocument();
    // 필드는 왼쪽에 두지 않는다 — 가운데 아래 필드 패널에서 읽는다.
    expect(within(palette()).queryByText("회사명")).not.toBeInTheDocument();
    expect(paletteCard("의뢰자 정보", true)).toBeInTheDocument();
    // 필수 카드는 이미 들어가 있다고 보인다.
    expect(within(palette()).getAllByText("들어감")).toHaveLength(5);
  });
});

describe("넣고 빼기 — 바로 반영", () => {
  it("선택 카드를 넣으면 권장 항목이 모두 든 채 레인 맨 아래에 나타나고 단계가 생긴다", async () => {
    renderPage();
    await userEvent.click(within(palette()).getByRole("button", { name: "모델 설정과 실행 환경 넣기" }));

    expect(diagramCards()).toEqual([
      "의뢰자 정보",
      "평가 대상 모델",
      "모델 설정과 실행 환경",
      "평가 데이터",
      "평가 관점",
      "지표와 합격 기준",
    ]);
    const card = node("모델 설정과 실행 환경");
    for (const label of ["알고리즘", "하이퍼파라미터", "실행 환경", "GPU 사용 여부"]) {
      expect(within(card).getByRole("button", { name: `${label} 빼기` })).toBeInTheDocument();
    }
    // 필드 수 같은 숫자는 노드에 두지 않는다 — 들어간 항목 칩만 보인다.
    expect(within(card).queryByText(/권장 \d+\/\d+|필수 \d+/)).not.toBeInTheDocument();

    const state = useWorkflowStore.getState();
    expect(state.composerCards.modelEnv).toBe(true);
    expect(buildStepList(state.composerCards, state.cardOrder)).toContain("modelEnv");
  });

  it("칩의 ×로 항목을 빼고, 마지막 항목을 빼면 카드가 다이어그램에서 빠진다", async () => {
    useWorkflowStore.getState().setMaterialPick("modelEnv", ["algorithm", "gpuUsage"]);
    renderPage();

    await userEvent.click(within(node("모델 설정과 실행 환경")).getByRole("button", { name: "알고리즘 빼기" }));
    expect(useWorkflowStore.getState().materialPicks.modelEnv).toEqual(["gpuUsage"]);

    await userEvent.click(within(node("모델 설정과 실행 환경")).getByRole("button", { name: "GPU 사용 여부 빼기" }));
    expect(diagramCards()).not.toContain("모델 설정과 실행 환경");
    expect(useWorkflowStore.getState().composerCards.modelEnv).toBe(false);
  });

  it("카드의 ×로 선택 카드를 통째로 뺀다 — 필수 카드에는 ×가 없다", async () => {
    useWorkflowStore.getState().setMaterialPick("modelEnv", ["algorithm"]);
    renderPage();

    expect(within(node("의뢰자 정보")).queryByRole("button", { name: "의뢰자 정보 빼기" })).not.toBeInTheDocument();
    await userEvent.click(within(diagram()).getByRole("button", { name: "모델 설정과 실행 환경 빼기" }));

    expect(diagramCards()).not.toContain("모델 설정과 실행 환경");
  });

  it("다이어그램의 카드를 누르면 그 카드가 필드 패널에 열린다 — 필드 보기 버튼은 따로 없다", async () => {
    renderPage();
    expect(within(diagram()).queryByRole("button", { name: /필드 보기/ })).not.toBeInTheDocument();

    await userEvent.click(within(node("평가 관점")).getByText("평가 관점"));

    expect(fieldPanel("평가 관점")).toBeInTheDocument();
    expect(within(node("평가 관점")).getByRole("button", { name: /^평가 관점/, pressed: true })).toBeInTheDocument();
    // 왼쪽 목록도 같은 카드를 고른 것으로 보인다.
    expect(paletteCard("평가 관점", true)).toBeInTheDocument();
  });

  it("다이어그램에서 연 카드의 항목을 넣으면 칩으로 바로 보인다", async () => {
    renderPage();
    await selectInPalette("평가 관점");
    await userEvent.click(within(node("의뢰자 정보")).getByText("의뢰자 정보"));

    const fields = fieldPanel("의뢰자 정보");
    const website = within(fields).getByRole("button", { name: "홈페이지 넣기" });
    await userEvent.click(website);

    expect(within(fields).getByRole("button", { name: "홈페이지 빼기" })).toHaveAttribute("aria-pressed", "true");
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual(["contactExtra:website"]);
    expect(within(node("의뢰자 정보")).getByRole("button", { name: "홈페이지 빼기" })).toBeInTheDocument();
  });

  it("빠진 카드의 항목을 필드 패널에서 넣으면 그 카드도 함께 들어간다", async () => {
    renderPage();
    await selectInPalette("정답 라벨");
    const items = fieldPanel("정답 라벨");
    // 필드 줄의 넣기만 — 머리의 "카드 넣기"는 권장 항목을 모두 넣는다.
    const [first] = within(items).getAllByRole("button", { name: / 넣기$/, pressed: false });
    await userEvent.click(first);

    expect(diagramCards()).toContain("정답 라벨");
    expect(useWorkflowStore.getState().materialPicks.groundTruth).toHaveLength(1);
  });
});

describe("입력 순서 — 다이어그램에서 정한다", () => {
  it("레인을 옮기면 입력 순서가 바뀌고, 다음은 그 첫 단계로 간다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "모델 왼쪽으로" }));

    expect(laneNames()).toEqual(["모델", "의뢰 정보", "데이터", "평가 기준"]);
    expect(within(node("평가 대상 모델")).getByText("1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByTestId("step-model")).toBeInTheDocument();
  });

  it("레인 안에서 카드를 옮긴다", async () => {
    useWorkflowStore.getState().setMaterialPick("testData", ["testDataSource"]);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "테스트 데이터 위로" }));

    expect(diagramCards().slice(2, 4)).toEqual(["테스트 데이터", "평가 데이터"]);
  });

  it("평가 기준 레인은 데이터 레인 앞으로 옮길 수 없다 — 원래 자리에 두고 이유를 보인다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "평가 기준 왼쪽으로" }));

    expect(screen.getByRole("alert")).toHaveTextContent("지표와 합격 기준은 평가 데이터 뒤에 둬야 해요");
    expect(laneNames()).toEqual(["의뢰 정보", "모델", "데이터", "평가 기준"]);
  });

  it("학습 데이터는 평가 데이터 위로 옮길 수 없다", async () => {
    useWorkflowStore.getState().setMaterialPick("trainingData", ["trainingDatasetName"]);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "학습 데이터 위로" }));

    expect(screen.getByRole("alert")).toHaveTextContent("학습 데이터는 평가 데이터 뒤에 둬야 해요");
    expect(diagramCards().slice(2, 4)).toEqual(["평가 데이터", "학습 데이터"]);
  });

  it("평가 관점을 지표 뒤로 옮기면 막지 않고 지표 추천에 대해 알린다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "평가 관점 아래로" }));

    expect(diagramCards().slice(-2)).toEqual(["지표와 합격 기준", "평가 관점"]);
    expect(within(diagram()).getByText(/관점에 맞는 지표를 추천받을 수 있어요/)).toBeInTheDocument();
  });
});

describe("추천 세트와 하단 현황", () => {
  it("처음에는 최소이고 표준까지 남은 권장 항목을 경고한다", () => {
    renderPage();

    const status = screen.getByRole("status", { name: "재료 현황" });
    expect(status).toHaveTextContent("필수 카드 5장");
    expect(status).toHaveTextContent("품질 최소");
    expect(status).toHaveTextContent(/표준까지 권장 \d+개가 남았어요/);
    expect(screen.getByRole("button", { name: "최소" })).toHaveAttribute("aria-pressed", "true");
  });

  it("표준 세트를 고르면 선택 카드 넷이 권장 항목과 함께 들어가고, 되돌릴 수 있다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "표준" }));

    expect(screen.getByRole("button", { name: "표준" })).toHaveAttribute("aria-pressed", "true");
    expect(diagramCards()).toHaveLength(9);
    const status = screen.getByRole("status", { name: "재료 현황" });
    expect(status).toHaveTextContent("품질 표준");
    expect(status).not.toHaveTextContent("표준까지");

    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(diagramCards()).toHaveLength(5);
    expect(screen.getByRole("button", { name: "최소" })).toHaveAttribute("aria-pressed", "true");
  });

  it("빠진 권장 항목을 하단에서 펼쳐 바로 넣는다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "빠진 항목 보기" }));
    await userEvent.click(screen.getByRole("button", { name: "모델 설정과 실행 환경 알고리즘 넣기" }));

    expect(useWorkflowStore.getState().materialPicks.modelEnv).toEqual(["algorithm"]);
    expect(diagramCards()).toContain("모델 설정과 실행 환경");
  });

  it("다음은 막지 않는다 — 필수 카드가 늘 들어가 있다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(screen.getByTestId("step-client-info")).toBeInTheDocument();
  });
});

describe("들어오고 나가기", () => {
  it("확인과 생성에서 고른 카드를 열어 둔 채 들어온다", () => {
    renderPage({ cardId: "trainingData" });

    expect(fieldPanel("학습 데이터")).toBeInTheDocument();
  });

  it("유형을 고르지 않고 들어오면 작업 유형 화면으로 보낸다", () => {
    useWorkflowStore.setState({ taskType: "" });
    renderPage();

    expect(screen.getByTestId("task-type")).toBeInTheDocument();
  });

  it("이전은 작업 유형 화면으로 간다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "이전" }));

    expect(screen.getByTestId("task-type")).toBeInTheDocument();
  });
});
