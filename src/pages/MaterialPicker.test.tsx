/**
 * 평가 흐름 만들기 화면 — 왼쪽 항목 트리(단계 > 블록 > 항목), 설명 팝업, 가운데 흐름도, 하단 현황과
 * "다음" 게이트(docs/MATERIAL_PICKER.md §12).
 *
 * 빈 흐름에서 시작한다. 넣고 빼는 것과 순서를 바꾸는 것이 바로 스토어에 들어가고 흐름도에 보인다.
 * 끌어 놓기와 같은 일을 하는 버튼이 모두 있어, 여기서는 버튼으로 확인한다(jsdom 은 HTML5 끌어 놓기를
 * 재현하지 못한다). 수는 이진 분류 기준 리터럴로 고정한다 — 필수 15 · 권장 15 · 선택 13(§12.1).
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { MaterialPicker } from "./MaterialPicker";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList } from "../utils/domain/workflowSteps";
import { blockFillIds } from "../utils/domain/materialPicks";
import { catalogCards } from "../data/reportComposer";
import type { FlowEntryState } from "../types/reportComposer.types";

function renderPage(state?: FlowEntryState) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/app/composer", state }]}>
      <Routes>
        <Route path="/app/composer" element={<MaterialPicker />} />
        <Route path="/app/client-info" element={<div data-testid="step-client-info" />} />
        <Route path="/app/model" element={<div data-testid="step-model" />} />
        <Route path="/app/ground-truth" element={<div data-testid="step-ground-truth" />} />
        <Route path="/app/data-validation" element={<div data-testid="step-validation" />} />
        <Route path="/app" element={<div data-testid="task-type" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const flow = () => screen.getByRole("region", { name: "평가 흐름" });
const tree = () => screen.getByRole("navigation", { name: "항목 목록" });
const blockRow = (block: string) => within(tree()).getByRole("button", { name: block });
async function openBlock(block: string) {
  const row = blockRow(block);
  if (row.getAttribute("aria-expanded") !== "true") await userEvent.click(row);
}
/** 블록의 항목 목록. 같은 이름이 두 블록에 나오므로("데이터 출처", "수집 기간") 늘 이 안에서 찾는다. */
const leaves = (block: string) => within(tree()).getByRole("list", { name: `${block}의 항목` });
async function addLeaf(block: string, item: string) {
  await openBlock(block);
  await userEvent.click(within(leaves(block)).getByRole("button", { name: `${item} 넣기` }));
}
/** 흐름도의 단계 이름, 왼쪽부터. */
const laneNames = () =>
  within(within(flow()).getByRole("list", { name: "단계" }))
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
/** 흐름도의 블록, 입력 순서대로(왼쪽 단계부터, 단계 안에서는 위부터). 빈 단계에는 블록 목록이 없다. */
const flowBlocks = () =>
  laneNames().flatMap((lane) => {
    const list = within(flow()).queryByRole("list", { name: `${lane} 블록` });
    if (!list) return [];
    return within(list)
      .queryAllByRole("listitem")
      .filter((item) => item.parentElement === list)
      .map((item) => item.getAttribute("aria-label"));
  });
const node = (block: string) => within(flow()).getByRole("listitem", { name: block });
/** 흐름도의 연결선, "출발→도착". */
const edges = () =>
  [...flow().querySelectorAll("[data-edge-from]")].map(
    (path) => `${path.getAttribute("data-edge-from")}→${path.getAttribute("data-edge-to")}`,
  );
const edgeAttr = (from: string, to: string, attribute: string) =>
  flow().querySelector(`[data-edge-from="${from}"][data-edge-to="${to}"]`)?.getAttribute(attribute);
const status = () => screen.getByRole("status", { name: "항목 현황" });
const next = () => screen.getByRole("button", { name: "다음" });

/** 잠긴 블록(필수)을 모두 블록째 넣은 상태 — persist v15 가 옮긴 저장분과 같다. */
function fillRequired() {
  for (const card of catalogCards("binary").filter((item) => item.locked)) {
    useWorkflowStore.getState().setMaterialPick(card.id, blockFillIds(card.id, "binary"));
  }
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({ taskType: "binary" });
});

describe("화면 구조", () => {
  it("제목은 '평가 흐름 만들기'이고, 화면 글자에 '재료'·'카드'·'필드'가 없다", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "평가 흐름 만들기" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/재료|카드|필드/);
  });

  it("처음엔 흐름도에 블록이 없고 단계마다 빈 자리가 있다. 추천 세트와 품질 단계가 없다", () => {
    renderPage();

    expect(laneNames()).toEqual(["의뢰 정보", "모델", "데이터", "평가 기준"]);
    expect(flowBlocks()).toEqual([]);
    for (const lane of ["의뢰 정보", "모델", "데이터", "평가 기준"]) {
      expect(within(flow()).getByText(`여기에 ${lane} 항목을 끌어 놓으세요`)).toBeInTheDocument();
    }
    for (const name of ["최소", "표준", "상세", "되돌리기"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/추천 세트|품질/)).not.toBeInTheDocument();
    // 들어오기만 해서는 아무것도 넣지 않는다 — 키는 사용자가 넣을 때만 생긴다(persist v15).
    expect(useWorkflowStore.getState().materialPicks).toEqual({});
  });

  it("범례는 머리에 한 번, 네 구분이다", () => {
    renderPage();

    const legends = screen.getAllByRole("list", { name: "범례" });
    expect(legends).toHaveLength(1);
    expect(within(legends[0]).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "필수",
      "권장",
      "선택",
      "함께 들어감",
    ]);
  });

  it("트리는 단계 넷이 펼쳐져 있고, 블록은 의뢰자 정보만 펼쳐져 있다", () => {
    renderPage();

    for (const stage of ["의뢰 정보", "모델", "데이터", "평가 기준"]) {
      expect(within(tree()).getByRole("button", { name: stage })).toHaveAttribute("aria-expanded", "true");
    }
    expect(blockRow("의뢰자 정보")).toHaveAttribute("aria-expanded", "true");
    for (const block of ["평가 대상 모델", "평가 데이터", "학습 데이터", "지표와 합격 기준"]) {
      expect(blockRow(block)).toHaveAttribute("aria-expanded", "false");
    }
    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보" })).toBeInTheDocument();
  });

  it("옛 하단 필드 패널이 없다", () => {
    renderPage();

    expect(screen.queryByRole("region", { name: /필드/ })).not.toBeInTheDocument();
  });
});

describe("넣고 빼기 — 바로 반영", () => {
  it("＋로 필수 항목 하나를 넣으면 그 단계에 블록이 1번으로 생기고, 칩·트리 ✓·하단 수가 바뀐다", async () => {
    renderPage();
    await addLeaf("의뢰자 정보", "회사 정보");

    expect(flowBlocks()).toEqual(["의뢰자 정보"]);
    expect(within(node("의뢰자 정보")).getByLabelText("입력 순서 1번")).toBeInTheDocument();
    expect(within(node("의뢰자 정보")).getByRole("list", { name: "의뢰자 정보에 넣은 항목" })).toHaveTextContent(
      "회사 정보",
    );
    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보 빼기" })).toBeInTheDocument();
    expect(status()).toHaveTextContent("필수 항목 1/15");
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual(["companyInfo"]);
  });

  it("선택 블록의 항목을 넣으면 그 블록이 켜지고 입력 화면 목록에 들어간다", async () => {
    renderPage();
    await addLeaf("모델 설정과 실행 환경", "알고리즘");

    const state = useWorkflowStore.getState();
    expect(state.composerCards.modelEnv).toBe(true);
    expect(buildStepList(state.composerCards, state.cardOrder)).toContain("modelEnv");
    expect(flowBlocks()).toEqual(["모델 설정과 실행 환경"]);
  });

  it("마지막 칩을 빼면 블록이 사라진다 — 필수 블록은 흐름도에서만 사라지고 입력 화면 목록은 그대로다", async () => {
    renderPage();
    await addLeaf("의뢰자 정보", "회사 정보");
    await addLeaf("모델 설정과 실행 환경", "알고리즘");

    await userEvent.click(within(node("모델 설정과 실행 환경")).getByRole("button", { name: "알고리즘 빼기" }));
    expect(flowBlocks()).toEqual(["의뢰자 정보"]);
    expect(useWorkflowStore.getState().composerCards.modelEnv).toBe(false);

    await userEvent.click(within(node("의뢰자 정보")).getByRole("button", { name: "회사 정보 빼기" }));
    expect(flowBlocks()).toEqual([]);
    const state = useWorkflowStore.getState();
    expect(buildStepList(state.composerCards, state.cardOrder)).toContain("clientInfo");
  });

  it("블록째 넣기: 필수 블록은 필수·권장 전부, 선택 블록은 권장 전부. 다 넣으면 버튼이 꺼진다", async () => {
    renderPage();
    await userEvent.click(within(tree()).getByRole("button", { name: "평가 데이터 필수·권장 항목 모두 넣기" }));
    expect(useWorkflowStore.getState().materialPicks.evalData).toEqual([
      "resultFile",
      "yTrueColumn",
      "predictionColumns",
      "positiveClass",
      "latencyColumn",
    ]);
    const fill = within(tree()).getByRole("button", { name: "평가 데이터 필수·권장 항목 모두 넣기" });
    expect(fill).toHaveAttribute("aria-disabled", "true");
    // 누른 뒤 꺼져도 같은 버튼에 포커스가 남는다 — 키보드 사용자가 자리를 잃지 않는다.
    expect(fill).toHaveFocus();
    await userEvent.click(fill);
    expect(useWorkflowStore.getState().materialPicks.evalData).toHaveLength(5);

    await userEvent.click(within(tree()).getByRole("button", { name: "테스트 데이터 권장 항목 모두 넣기" }));
    expect(useWorkflowStore.getState().materialPicks.testData).toEqual(["testDataSource", "testSourceRelation"]);
    expect(within(tree()).getByRole("button", { name: "테스트 데이터 권장 항목 모두 넣기" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("함께 들어감: ＋가 없고, 조건 항목을 넣으면 함께 들어가 점선 칩이 생기지만 필수 수는 그대로다", async () => {
    renderPage();
    const list = leaves("의뢰자 정보");
    expect(within(list).getByRole("button", { name: "과제 정보" })).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: "과제 정보 넣기" })).not.toBeInTheDocument();

    await addLeaf("의뢰자 정보", "성적서 용도");

    expect(within(list).getByText("함께 들어가 있어요")).toBeInTheDocument();
    const chips = within(node("의뢰자 정보")).getByRole("list", { name: "의뢰자 정보에 넣은 항목" });
    // 칩 이름 버튼(설명 팝업을 여는 것)과 그 구분 글자 — 마커는 읽히지 않으므로 구분은 설명으로 읽는다.
    const names = within(chips).getAllByRole("button", { expanded: false });
    expect(names.map((button) => button.textContent)).toEqual(["성적서 용도", "과제 정보"]);
    expect(names[0]).toHaveAccessibleDescription("필수 항목");
    expect(names[1]).toHaveAccessibleDescription("함께 들어감 항목");
    // 함께 들어간 칩에는 ✕ 가 없다.
    expect(within(chips).queryByRole("button", { name: "과제 정보 빼기" })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("필수 항목 1/15");
  });

  it("블록 ✕ 는 필수 블록에도 있고 항목을 모두 뺀다", async () => {
    renderPage();
    await userEvent.click(within(tree()).getByRole("button", { name: "의뢰자 정보 필수 항목 모두 넣기" }));
    expect(flowBlocks()).toEqual(["의뢰자 정보"]);

    await userEvent.click(within(flow()).getByRole("button", { name: "의뢰자 정보 블록 빼기" }));

    expect(flowBlocks()).toEqual([]);
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual([]);
    expect(status()).toHaveTextContent("필수 항목 0/15");
  });

  it("이름을 두 번 누르면 설명이 열리고 넣어진다. 다시 두 번 눌러도 빠지지 않는다", async () => {
    renderPage();
    const name = within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보" });

    await userEvent.dblClick(name);
    expect(screen.getByRole("dialog", { name: "회사 정보" })).toBeInTheDocument();
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual(["companyInfo"]);

    await userEvent.dblClick(name);
    expect(useWorkflowStore.getState().materialPicks.clientInfo).toEqual(["companyInfo"]);
    expect(screen.getByRole("dialog", { name: "회사 정보" })).toBeInTheDocument();
  });
});

describe("설명 팝업", () => {
  async function openLeaf(block: string, item: string) {
    await openBlock(block);
    await userEvent.click(within(leaves(block)).getByRole("button", { name: item }));
    return screen.getByRole("dialog", { name: item });
  }

  it("테스트 데이터 › 수집 기간: 의미·입력 형태·입력 예시가 있고, 표준 근거 줄은 없다", async () => {
    renderPage();
    const dialog = await openLeaf("테스트 데이터", "수집 기간");

    expect(dialog).toHaveTextContent("테스트 데이터를 모은 기간입니다.");
    expect(dialog).toHaveTextContent("시작 월과 끝 월");
    expect(dialog).toHaveTextContent("2025-01 ~ 2025-03");
    expect(within(dialog).getByText("의미")).toBeInTheDocument();
    expect(within(dialog).queryByText("표준 근거")).not.toBeInTheDocument();
    // 파일이 아닌 항목에는 파일 예시 표가 없다.
    expect(within(dialog).queryByRole("table")).not.toBeInTheDocument();
  });

  it("테스트 데이터 › 데이터 출처: TS 4213 8절 근거", async () => {
    renderPage();
    const dialog = await openLeaf("테스트 데이터", "데이터 출처");

    expect(within(dialog).getByText("표준 근거")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("ISO/IEC TS 4213 8절 — 평가 데이터 출처");
    expect(dialog).toHaveTextContent("모르면 ‘모름’을 고를 수 있어요.");
  });

  it("의뢰자 정보 › 회사 정보: 17025 근거와 들어가는 칸", async () => {
    renderPage();
    const dialog = await openLeaf("의뢰자 정보", "회사 정보");

    expect(dialog).toHaveTextContent("ISO/IEC 17025 7.8.2.1 e)");
    expect(within(within(dialog).getByRole("list", { name: "들어가는 칸" })).getAllByRole("listitem")).toHaveLength(5);
    expect(dialog).toHaveTextContent("필수 항목이라 넣어야 다음으로 갈 수 있어요.");
  });

  it("홈페이지(칸 항목): 묶음 필드의 한 칸이라는 안내", async () => {
    renderPage();
    const dialog = await openLeaf("의뢰자 정보", "홈페이지");

    expect(dialog).toHaveTextContent("‘홈페이지·팩스’의 한 칸이에요.");
  });

  it("결과 파일: 이 유형의 파일 예시 표와 필수 컬럼 안내", async () => {
    renderPage();
    const dialog = await openLeaf("평가 데이터", "결과 파일");

    const table = within(dialog).getByRole("table");
    for (const column of ["y_true", "y_pred", "score"]) {
      expect(within(table).getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(within(dialog).getByText(/정답\(y_true\)은 필수/)).toBeInTheDocument();
  });

  it("과제 정보(함께 들어감): 조건 안내가 있고 넣기 버튼이 없다", async () => {
    renderPage();
    const dialog = await openLeaf("의뢰자 정보", "과제 정보");

    expect(dialog).toHaveTextContent("‘성적서 용도’ 항목을 넣으면 함께 들어가요.");
    expect(dialog).toHaveTextContent("성적서 용도에서 과제 산출물 선택 시");
    expect(within(dialog).queryByRole("button", { name: "넣기" })).not.toBeInTheDocument();
  });

  it("팝업의 [넣기]가 넣고 하단 수가 바뀐다", async () => {
    renderPage();
    const dialog = await openLeaf("평가 대상 모델", "모델 분류");

    await userEvent.click(within(dialog).getByRole("button", { name: "넣기" }));

    expect(useWorkflowStore.getState().materialPicks.model).toEqual(["modelCategory"]);
    expect(status()).toHaveTextContent("필수 항목 1/15");
    expect(within(dialog).getByRole("button", { name: "빼기" })).toBeInTheDocument();
  });

  it("다른 항목 이름을 누르면 그 팝업으로 바뀐다 — 앞 팝업이 포커스를 되찾아 가 새 팝업을 닫지 않는다", async () => {
    renderPage();
    await openLeaf("의뢰자 정보", "회사 정보");

    await userEvent.click(within(leaves("의뢰자 정보")).getByRole("button", { name: "성적서 용도" }));
    // 닫힌 팝업의 포커스 되돌리기는 다음 틱에 돈다.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole("dialog", { name: "회사 정보" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "성적서 용도" })).toBeInTheDocument();
  });

  it("항목 이름 버튼은 구분을 설명으로 읽는다", () => {
    renderPage();

    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보" })).toHaveAccessibleDescription(
      "필수 항목",
    );
    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "홈페이지" })).toHaveAccessibleDescription(
      "선택 항목",
    );
  });

  it("열면 포커스가 팝업으로 가고, Esc 로 닫으면 이름 버튼으로 돌아온다", async () => {
    renderPage();
    const dialog = await openLeaf("의뢰자 정보", "성적서 용도");
    expect(dialog).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "성적서 용도" })).toHaveFocus();
  });
});

describe("흐름도", () => {
  it("번호는 놓인 블록만 1..n 이다", async () => {
    renderPage();
    await addLeaf("평가 관점", "사용 방식");
    await addLeaf("평가 대상 모델", "모델 분류");

    expect(flowBlocks()).toEqual(["평가 대상 모델", "평가 관점"]);
    expect(within(node("평가 대상 모델")).getByLabelText("입력 순서 1번")).toBeInTheDocument();
    expect(within(node("평가 관점")).getByLabelText("입력 순서 2번")).toBeInTheDocument();
  });

  it("블록 이름을 누르면 트리에서 그 블록이 펼쳐지고 강조된다", async () => {
    renderPage();
    await userEvent.click(within(tree()).getByRole("button", { name: "학습 데이터 권장 항목 모두 넣기" }));
    expect(blockRow("학습 데이터")).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(within(node("학습 데이터")).getByRole("button", { name: "학습 데이터" }));

    expect(blockRow("학습 데이터")).toHaveAttribute("aria-expanded", "true");
    expect(blockRow("학습 데이터").closest("li")).toHaveAttribute("data-revealed", "true");
  });

  it("단계를 옮기면 입력 순서가 바뀌고, 다음은 그 첫 화면으로 간다", async () => {
    fillRequired();
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "모델 단계 앞으로" }));

    expect(laneNames()).toEqual(["모델", "의뢰 정보", "데이터", "평가 기준"]);
    expect(within(node("평가 대상 모델")).getByLabelText("입력 순서 1번")).toBeInTheDocument();

    await userEvent.click(next());
    expect(screen.getByTestId("step-model")).toBeInTheDocument();
  });

  it("평가 기준 단계는 블록을 하나도 놓지 않았어도 데이터 앞으로 옮길 수 없다 — 규칙은 필수 블록을 늘 포함한다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "평가 기준 단계 앞으로" }));

    expect(screen.getByRole("alert")).toHaveTextContent("평가 기준 단계는 데이터 단계보다 앞에 둘 수 없어요");
    expect(laneNames()).toEqual(["의뢰 정보", "모델", "데이터", "평가 기준"]);
  });

  it("같은 단계 안에서 블록을 옮긴다. 학습 데이터는 평가 데이터 위로 갈 수 없다", async () => {
    fillRequired();
    useWorkflowStore.getState().setMaterialPick("trainingData", ["trainingDatasetName"]);
    useWorkflowStore.getState().setMaterialPick("testData", ["testDataSource"]);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "학습 데이터 위로" }));
    expect(screen.getByRole("alert")).toHaveTextContent("학습 데이터 블록은 평가 데이터 블록 뒤에 둬야 해요");

    await userEvent.click(screen.getByRole("button", { name: "테스트 데이터 위로" }));
    expect(flowBlocks().slice(2, 5)).toEqual(["평가 데이터", "테스트 데이터", "학습 데이터"]);
  });

  it("빈 흐름의 연결선은 시작 → 빈 자리 넷 → 검증 → 확인과 생성이고, 빈 자리에 닿는 선은 점선이다", () => {
    renderPage();

    const list = edges();
    expect(list.length).toBeGreaterThan(0);
    expect(list).toEqual([
      "start→slot:info",
      "slot:info→slot:model",
      "slot:model→slot:data",
      "slot:data→slot:criteria",
      "slot:criteria→validation",
      "validation→report",
    ]);
    expect(edgeAttr("start", "slot:info", "data-edge-style")).toBe("dashed");
    expect(edgeAttr("slot:criteria", "validation", "data-edge-style")).toBe("dashed");
    expect(edgeAttr("validation", "report", "data-edge-style")).toBe("solid");
    // 단말은 단계 정의의 이름이다.
    for (const name of ["시작", "검증", "확인과 생성"]) expect(within(flow()).getByText(name)).toBeInTheDocument();
  });

  it("같은 단계의 블록 사이는 inLane, 단계를 넘으면 crossLane 실선이다", async () => {
    renderPage();
    await addLeaf("평가 대상 모델", "모델 분류");
    await userEvent.click(within(tree()).getByRole("button", { name: "모델 설정과 실행 환경 권장 항목 모두 넣기" }));
    await addLeaf("평가 관점", "사용 방식");

    expect(edges()).toEqual([
      "start→slot:info",
      "slot:info→model",
      "model→modelEnv",
      "modelEnv→slot:data",
      "slot:data→perspective",
      "perspective→validation",
      "validation→report",
    ]);
    expect(edgeAttr("model", "modelEnv", "data-edge-kind")).toBe("inLane");
    expect(edgeAttr("model", "modelEnv", "data-edge-style")).toBe("solid");
    expect(edgeAttr("slot:info", "model", "data-edge-kind")).toBe("crossLane");
    expect(edgeAttr("perspective", "validation", "data-edge-kind")).toBe("end");
  });

  it("블록 바닥 줄에 남은 필수 수를 적는다 — 다 넣으면 사라진다", async () => {
    renderPage();
    await addLeaf("의뢰자 정보", "회사 정보");

    expect(node("의뢰자 정보")).toHaveTextContent("필수 항목 2개를 더 넣어야 해요");
    await userEvent.click(within(node("의뢰자 정보")).getByRole("button", { name: "의뢰자 정보의 빠진 필수 항목 보기" }));
    expect(blockRow("의뢰자 정보").closest("li")).toHaveAttribute("data-revealed", "true");

    await addLeaf("의뢰자 정보", "성적서 용도");
    await addLeaf("의뢰자 정보", "평가 의뢰일");
    expect(node("의뢰자 정보")).not.toHaveTextContent(/필수 항목 \d+개를 더/);
  });

  it("다음을 누르면 단계 머리에 아예 놓지 않은 필수 블록 수가 나온다(N7)", async () => {
    renderPage();
    // 데이터 단계에 선택 블록만 놓으면 빈 자리가 사라진다 — 평가 데이터가 빠진 것이 흐름도에 안 보인다.
    await userEvent.click(within(tree()).getByRole("button", { name: "학습 데이터 권장 항목 모두 넣기" }));
    const dataLane = within(flow()).getByRole("listitem", { name: "데이터 단계" });
    expect(within(dataLane).queryByText(/필수 블록/)).not.toBeInTheDocument();

    await userEvent.click(next());

    expect(within(dataLane).getByText("필수 블록 1개가 빠졌어요")).toBeInTheDocument();
    expect(within(within(flow()).getByRole("listitem", { name: "평가 기준 단계" })).getByText("필수 블록 2개가 빠졌어요")).toBeInTheDocument();
  });

  it("단계·블록·칩 버튼은 마우스를 올릴 때만 보이지만 DOM 에 남아 키보드로 닿는다", async () => {
    renderPage();
    await addLeaf("의뢰자 정보", "회사 정보");

    const buttons = [
      within(flow()).getByRole("button", { name: "모델 단계 앞으로" }),
      within(flow()).getByRole("button", { name: "의뢰자 정보 위로" }),
      within(flow()).getByRole("button", { name: "의뢰자 정보 블록 빼기" }),
      within(node("의뢰자 정보")).getByRole("button", { name: "회사 정보 빼기" }),
    ];
    for (const button of buttons) {
      // 버튼 자신이나 그 도구 막대가 마우스 기기에서만 숨는다.
      expect(button.closest('[class*="can-hover:opacity-0"]')).not.toBeNull();
      for (let element: HTMLElement | null = button; element && element !== flow(); element = element.parentElement) {
        expect(element.className).not.toMatch(/(^|\s)(hidden|invisible)(\s|$)/);
      }
    }
  });

  it("평가 관점을 지표 뒤로 옮기면 막고 이유를 보인다(D4)", async () => {
    fillRequired();
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "평가 관점 아래로" }));

    expect(screen.getByRole("alert")).toHaveTextContent("지표와 합격 기준 블록은 평가 관점 블록 뒤에 둬야 해요");
    expect(flowBlocks().slice(-2)).toEqual(["평가 관점", "지표와 합격 기준"]);
  });
});

describe("하단 바와 다음", () => {
  it("처음엔 필수 0/15 · 권장 0/15 · 선택 0/13 이고 빠진 필수를 알린다. 품질 배지가 없다", () => {
    renderPage();

    expect(status()).toHaveTextContent("필수 항목 0/15");
    expect(status()).toHaveTextContent("권장 0/15");
    expect(status()).toHaveTextContent("선택 0/13");
    expect(screen.getByText("필수 항목 15개를 더 넣어야 다음으로 갈 수 있어요.")).toBeInTheDocument();
    // 알리는 영역은 수 한 줄뿐이다 — 안내 문장과 버튼은 그 밖에 있다.
    expect(status()).not.toHaveTextContent("더 넣어야");
    expect(within(status()).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/품질/)).not.toBeInTheDocument();
  });

  it("권장·선택을 넣으면 그 자리의 수만 오른다 — 필수 수와 안내 문장은 그대로다", async () => {
    renderPage();
    await userEvent.click(within(tree()).getByRole("button", { name: "테스트 데이터 권장 항목 모두 넣기" }));
    await addLeaf("의뢰자 정보", "과제 번호");

    expect(status()).toHaveTextContent("필수 항목 0/15");
    expect(status()).toHaveTextContent("권장 2/15");
    expect(status()).toHaveTextContent("선택 1/13");
    expect(screen.getByText("필수 항목 15개를 더 넣어야 다음으로 갈 수 있어요.")).toBeInTheDocument();
  });

  it("필수를 다 넣으면 안내가 빠진 권장 수로 바뀐다", async () => {
    fillRequired();
    renderPage();

    expect(status()).toHaveTextContent("필수 항목 15/15");
    // 필수 블록째 넣기는 그 블록의 권장도 넣는다 — 평가 데이터의 지연시간 컬럼 하나.
    expect(status()).toHaveTextContent("권장 1/15");
    expect(
      screen.getByText('권장 항목 14개가 빠졌어요. 빠진 항목은 성적서에 "제공되지 않음"으로 찍혀요.'),
    ).toBeInTheDocument();
  });

  it("다중 클래스는 필수 0/14 · 권장 0/15 · 선택 0/13 이다", () => {
    useWorkflowStore.setState({ taskType: "multiclass" });
    renderPage();

    expect(status()).toHaveTextContent("필수 항목 0/14");
    expect(status()).toHaveTextContent("권장 0/15");
    expect(status()).toHaveTextContent("선택 0/13");
  });

  it("같은 수를 자리마다 따로 고정한다 — 트리 블록 줄의 필수 0/3", () => {
    renderPage();

    const row = blockRow("의뢰자 정보").parentElement!;
    expect(row).toHaveTextContent("필수 0/3");
    expect(blockRow("평가 데이터").parentElement!).toHaveTextContent("필수 0/4");
  });

  it("필수가 빠진 채 다음: 화면이 그대로이고, 빠진 이름 셋과 '외 n개', 빠진 블록이 펼쳐지고 칠해진다", async () => {
    renderPage();
    await addLeaf("의뢰자 정보", "회사 정보");

    await userEvent.click(next());

    expect(screen.queryByTestId("step-client-info")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "넣지 않은 필수 항목이 있어요: 성적서 용도, 평가 의뢰일, 모델 이름·버전 외 11개",
    );
    expect(blockRow("평가 대상 모델")).toHaveAttribute("aria-expanded", "true");
    expect(blockRow("지표와 합격 기준")).toHaveAttribute("aria-expanded", "true");
    const missing = within(leaves("평가 대상 모델")).getByRole("button", { name: "모델 분류" }).closest("li");
    expect(missing).toHaveAttribute("data-missing", "true");
    expect(missing).toHaveTextContent("빠짐");
    // 넣은 항목은 칠하지 않는다.
    expect(within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보" }).closest("li")).not.toHaveAttribute(
      "data-missing",
    );
  });

  it("막힌 뒤 다 채우면 안내가 사라지고, 다시 빼도 다음을 누르기 전엔 안내·칠하기가 돌아오지 않는다", async () => {
    renderPage();
    await userEvent.click(next());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    for (const block of ["의뢰자 정보", "평가 대상 모델", "평가 관점", "지표와 합격 기준"]) {
      await userEvent.click(within(tree()).getByRole("button", { name: `${block} 필수 항목 모두 넣기` }));
    }
    await userEvent.click(within(tree()).getByRole("button", { name: "평가 데이터 필수·권장 항목 모두 넣기" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(within(leaves("의뢰자 정보")).getByRole("button", { name: "회사 정보 빼기" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-missing]")).toHaveLength(0);
  });

  it("빠진 항목 보기에서 넣으면 포커스가 다음 [넣기]로 간다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "빠진 항목 보기" }));
    const first = screen.getByRole("button", { name: "의뢰자 정보 회사 정보 넣기" });

    await userEvent.click(first);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(screen.getByRole("button", { name: "의뢰자 정보 성적서 용도 넣기" })).toHaveFocus();
  });

  it("빠진 항목 보기에서 마지막 하나를 넣으면 팝업이 사라지고 포커스는 '모두 넣었어요' 문장으로 간다", async () => {
    // 필수·권장을 모두 넣고 의뢰자 정보의 평가 의뢰일 하나만 남긴다.
    for (const card of catalogCards("binary")) {
      const ids = blockFillIds(card.id, "binary").filter((id) => !(card.id === "clientInfo" && id === "requestDate"));
      if (ids.length > 0) useWorkflowStore.getState().setMaterialPick(card.id, ids);
    }
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "빠진 항목 보기" }));

    await userEvent.click(screen.getByRole("button", { name: "의뢰자 정보 평가 의뢰일 넣기" }));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(screen.queryByRole("button", { name: "빠진 항목 보기" })).not.toBeInTheDocument();
    expect(screen.getByText("필수와 권장 항목을 모두 넣었어요.")).toHaveFocus();
  });

  it("필수 블록 다섯을 블록째 넣고 다음 → 첫 입력 화면", async () => {
    renderPage();
    for (const block of ["의뢰자 정보", "평가 대상 모델", "평가 관점", "지표와 합격 기준"]) {
      await userEvent.click(within(tree()).getByRole("button", { name: `${block} 필수 항목 모두 넣기` }));
    }
    await userEvent.click(within(tree()).getByRole("button", { name: "평가 데이터 필수·권장 항목 모두 넣기" }));
    expect(status()).toHaveTextContent("필수 항목 15/15");

    await userEvent.click(next());
    expect(screen.getByTestId("step-client-info")).toBeInTheDocument();
  });

  it("빠진 항목 보기에 '필수 항목'·'권장 항목' 묶음이 있고 바로 넣는다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "빠진 항목 보기" }));

    const box = screen.getByRole("group", { name: "빠진 항목" });
    expect(within(box).getByRole("region", { name: "필수 항목" })).toBeInTheDocument();
    expect(within(box).getByRole("region", { name: "권장 항목" })).toBeInTheDocument();
    await userEvent.click(within(box).getByRole("button", { name: "모델 설정과 실행 환경 알고리즘 넣기" }));

    expect(useWorkflowStore.getState().materialPicks.modelEnv).toEqual(["algorithm"]);
  });

  it("다 넣었으면 처음 미완료 입력 화면으로, 입력 화면을 다 마쳤으면 검증으로 간다", async () => {
    fillRequired();
    useWorkflowStore.setState({ completedStepIds: ["clientInfo"] });
    renderPage();
    await userEvent.click(next());
    expect(screen.getByTestId("step-model")).toBeInTheDocument();
  });

  it("입력 화면을 모두 마친 사용자는 검증으로 간다", async () => {
    fillRequired();
    useWorkflowStore.setState({
      completedStepIds: ["clientInfo", "model", "upload", "mapping", "perspective", "metrics"],
    });
    renderPage();
    await userEvent.click(next());
    expect(screen.getByTestId("step-validation")).toBeInTheDocument();
  });
});

describe("들어오고 나가기", () => {
  it("다른 화면에서 블록을 들고 오면 트리에서 그 블록이 펼쳐지고 강조되며, 넣을 항목이 칠해진다", () => {
    renderPage({ cardId: "trainingData" });

    expect(blockRow("학습 데이터")).toHaveAttribute("aria-expanded", "true");
    expect(blockRow("학습 데이터").closest("li")).toHaveAttribute("data-revealed", "true");
    const focused = within(leaves("학습 데이터"))
      .getAllByRole("listitem")
      .filter((item) => item.getAttribute("data-focused") === "true");
    expect(focused.length).toBeGreaterThan(0);
    expect(focused[0]).toHaveTextContent("데이터 이름");
  });

  it("돌아갈 화면(returnStep)을 들고 왔으면 다 넣은 뒤 다음이 그 화면으로 간다", async () => {
    fillRequired();
    // 처음 미완료 화면(의뢰자 정보)과 돌아갈 화면이 다르다 — returnStep 을 무시하면 의뢰자 정보로 간다.
    renderPage({ cardId: "groundTruth", returnStep: "groundTruth" });
    await addLeaf("정답 라벨", "라벨 작성 주체");

    await userEvent.click(next());
    expect(screen.getByTestId("step-ground-truth")).toBeInTheDocument();
    expect(screen.queryByTestId("step-client-info")).not.toBeInTheDocument();
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
