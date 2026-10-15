/**
 * 재료 고르기 화면 — 3단 구조와 저장 규칙(docs/MATERIAL_PICKER.md §4·§6·§7).
 *
 * 저장은 "그 카드에서 무엇을 받을지 확정"하는 것이다. 체크는 저장해야 반영되고, 저장하지 않은
 * 필수 카드가 있으면 다음으로 넘어가지 않는다. 선택 카드는 항목을 골라 저장해야 들어간다.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { MaterialPicker } from "./MaterialPicker";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/app/composer"]}>
      <Routes>
        <Route path="/app/composer" element={<MaterialPicker />} />
        <Route path="/app/data-upload" element={<div data-testid="upload-step" />} />
        <Route path="/app" element={<div data-testid="task-type" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const inputOrder = () => screen.getByRole("list", { name: "입력 순서" });
const categoryTile = (name: string) => screen.getByRole("button", { name: new RegExp("^" + name), pressed: false });
const cardInList = (name: string) =>
  within(screen.getByRole("list", { name: / 카드$/ })).getByRole("button", { name: new RegExp("^" + name) });
const save = () => userEvent.click(screen.getByRole("button", { name: "저장" }));

async function openCard(category: string, card: string) {
  await userEvent.click(categoryTile(category));
  await userEvent.click(cardInList(card));
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary" });
});

describe("화면 구조", () => {
  it("처음에는 의뢰 정보의 의뢰자 정보를 보인다 — 필드는 하나씩 쪼개 보인다", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "의뢰자 정보" })).toBeInTheDocument();
    for (const name of ["회사명", "대표자", "사업자등록번호", "전화번호", "주소"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // 필수는 체크박스 없이 글자만, 선택은 항목마다 체크한다(§4·§6).
    expect(screen.queryByRole("checkbox", { name: "회사명" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "홈페이지" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "팩스" })).not.toBeChecked();
    // 조건부는 조건 문구와 함께 보인다.
    expect(screen.getAllByText("조건: 과제 제출일 때")).toHaveLength(2);
  });

  it("대분류 네 개와 카드 목록 — 필수 카드에는 '필수'를 붙인다", async () => {
    renderPage();

    for (const name of ["의뢰 정보", "모델", "데이터", "평가 기준"]) {
      expect(screen.getByRole("button", { name: new RegExp("^" + name) })).toBeInTheDocument();
    }
    await userEvent.click(categoryTile("데이터"));

    const list = screen.getByRole("list", { name: "데이터 카드" });
    expect(within(list).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "평가 데이터필수",
      "학습 데이터",
      "테스트 데이터",
      "정답 라벨",
    ]);
  });

  it("선택 카드의 표준 보고 항목은 권장이고 기본은 꺼져 있다", async () => {
    renderPage();
    await openCard("데이터", "학습 데이터");

    expect(screen.getByRole("heading", { level: 2, name: "권장" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "선택" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "필수" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "데이터 이름" })).not.toBeChecked();
  });

  it("권장 항목은 한 줄로 체크하고 그 안의 칸은 아래에 나열한다", async () => {
    renderPage();
    await openCard("모델", "모델 설정과 실행 환경");

    expect(screen.getByRole("checkbox", { name: "실행 환경" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "운영체제" })).not.toBeInTheDocument();
    expect(screen.getByText("운영체제")).toBeInTheDocument();
  });

  it("입력 순서에는 처음부터 필수 카드 다섯 장이 카탈로그 순서로 나온다", () => {
    renderPage();

    expect(within(inputOrder()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "의뢰자 정보",
      "평가 대상 모델",
      "평가 데이터",
      "평가 관점",
      "지표와 합격 기준",
    ]);
    expect(screen.getByText("필수 5개 중 0개 저장")).toBeInTheDocument();
  });
});

describe("저장 규칙 (§7)", () => {
  it("저장하면 카드 줄과 입력 순서에 저장 표시가 붙고, 대분류도 저장 표시로 바뀐다", async () => {
    renderPage();
    await save();

    expect(within(cardInList("의뢰자 정보")).getByRole("img", { name: "저장됨" })).toBeInTheDocument();
    expect(
      within(within(inputOrder()).getByRole("button", { name: /의뢰자 정보/ })).getByRole("img", {
        name: "저장됨",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "필수 카드 모두 저장됨" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장됨" })).toBeDisabled();
    expect(screen.getByText("필수 5개 중 1개 저장")).toBeInTheDocument();
  });

  it("필수 카드를 저장하지 않고 다음을 누르면 넘어가지 않고 그 이름을 알린다", async () => {
    renderPage();
    await save();
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("저장하지 않은 필수 카드가 있어요");
    expect(alert).toHaveTextContent("평가 대상 모델, 평가 데이터, 평가 관점, 지표와 합격 기준");
    expect(alert).not.toHaveTextContent("의뢰자 정보");
    expect(screen.queryByTestId("upload-step")).not.toBeInTheDocument();
  });

  it("필수 카드를 모두 저장하면 오류가 사라지고 첫 입력 단계로 간다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    for (const name of ["의뢰자 정보", "평가 대상 모델", "평가 데이터", "평가 관점", "지표와 합격 기준"]) {
      await userEvent.click(within(inputOrder()).getByRole("button", { name: new RegExp("^" + name) }));
      await save();
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByTestId("upload-step")).toBeInTheDocument();
  });

  it("항목을 골라 저장한 선택 카드는 입력 순서에 들어가고 단계가 생긴다", async () => {
    renderPage();
    await openCard("데이터", "학습 데이터");
    await userEvent.click(screen.getByRole("checkbox", { name: "데이터 이름" }));
    await save();

    expect(within(inputOrder()).getByRole("button", { name: /학습 데이터/ })).toHaveTextContent(
      "고른 항목 1개",
    );
    const state = useWorkflowStore.getState();
    expect(state.materialPicks.trainingData).toEqual(["trainingDatasetName"]);
    expect(state.composerCards.trainingData).toBe(true);
  });

  it("아무것도 고르지 않고 저장한 선택 카드는 '넣지 않기로 확정'이다", async () => {
    renderPage();
    await openCard("데이터", "학습 데이터");
    await save();

    expect(within(inputOrder()).queryByRole("button", { name: /학습 데이터/ })).not.toBeInTheDocument();
    expect(within(cardInList("학습 데이터")).getByRole("img", { name: "저장됨" })).toBeInTheDocument();
    const state = useWorkflowStore.getState();
    expect(state.materialPicks.trainingData).toEqual([]);
    expect(state.composerCards.trainingData).toBe(false);
  });

  it("저장하지 않은 체크는 화면에 남지만 반영되지 않는다", async () => {
    renderPage();
    await openCard("데이터", "학습 데이터");
    await userEvent.click(screen.getByRole("checkbox", { name: "데이터 이름" }));

    expect(screen.getByText("저장해야 반영돼요")).toBeInTheDocument();
    expect(within(inputOrder()).queryByRole("button", { name: /학습 데이터/ })).not.toBeInTheDocument();

    await userEvent.click(cardInList("테스트 데이터"));
    await userEvent.click(cardInList("학습 데이터"));
    expect(screen.getByRole("checkbox", { name: "데이터 이름" })).toBeChecked();
    expect(useWorkflowStore.getState().materialPicks.trainingData).toBeUndefined();
    expect(useWorkflowStore.getState().composerCards.trainingData).toBe(false);
  });

  it("저장한 뒤 체크를 바꾸면 저장하지 않은 변경을 알린다", async () => {
    renderPage();
    await openCard("데이터", "학습 데이터");
    await userEvent.click(screen.getByRole("checkbox", { name: "데이터 이름" }));
    await save();
    await userEvent.click(screen.getByRole("checkbox", { name: "데이터 출처" }));

    expect(screen.getByText("저장하지 않은 변경이 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
    // 다음을 누르면 마지막으로 저장한 내용이 적용된다.
    expect(useWorkflowStore.getState().materialPicks.trainingData).toEqual(["trainingDatasetName"]);
  });
});

describe("진입", () => {
  it("유형을 고르지 않았으면 작업 유형 화면으로 보낸다", () => {
    useWorkflowStore.setState({ taskType: "" });
    renderPage();

    expect(screen.getByTestId("task-type")).toBeInTheDocument();
  });
});
