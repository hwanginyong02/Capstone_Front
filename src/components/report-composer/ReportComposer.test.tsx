/**
 * 성적서 구성 화면의 동작을 고정한다.
 *
 * 이 화면의 핵심은 **보는 것과 넣고 빼는 것이 분리돼 있다**는 점이다. 카드를 누르면 상세만
 * 바뀌고, 성적서에 넣고 빼는 것은 상세 영역의 버튼이 한다 — 내용을 읽고 나서 정하게 하려는
 * 것이고, 보려고 눌렀다가 카드가 빠지는 일도 막는다.
 *
 * 컨텐츠 컴포넌트는 스토어를 읽지 않고 props 로만 상태를 받으므로(가이드라인 §1), 여기서는
 * 상태 조합을 직접 넣고 콜백으로 보고된 것을 본다 — `ColumnMapping.test.tsx` 와 같은 방식이다.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportComposer } from "./ReportComposer";
import { presetSelection } from "../../data/reportComposer";
import { DEFAULT_COMPOSER_SELECTION } from "../../types/reportComposer.types";
import type { ComposerSelection } from "../../types/reportComposer.types";
import type { TaskType } from "../../data/evaluationData";

function renderComposer(
  overrides: {
    taskType?: TaskType;
    selection?: ComposerSelection;
    onToggleCard?: (id: never, on: boolean) => void;
    onApplyPreset?: (preset: never) => void;
  } = {},
) {
  const onToggleCard = overrides.onToggleCard ?? vi.fn();
  const onApplyPreset = overrides.onApplyPreset ?? vi.fn();

  render(
    <ReportComposer
      taskType={overrides.taskType ?? "binary"}
      selection={overrides.selection ?? DEFAULT_COMPOSER_SELECTION}
      onToggleCard={onToggleCard as never}
      onApplyPreset={onApplyPreset as never}
    />,
  );

  return { onToggleCard, onApplyPreset };
}

/** 상세 영역(aria-live 영역)의 제목을 읽는다. */
const detailTitle = () => screen.getByRole("heading", { level: 3 }).textContent ?? "";
/** 상세 영역의 머리 — 필드 표에도 "필수" 배지가 있어 범위를 좁혀야 한다. */
const detailHeader = () => document.querySelector('[data-slot="card-header"]') as HTMLElement;

describe("카드 두 줄", () => {
  it("필수 5장과 선택 4장을 그린다", () => {
    renderComposer();

    expect(screen.getByRole("heading", { name: /Required/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Optional/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: / details/ })).toHaveLength(9);
  });

  it("필수 카드는 자물쇠를 단다", () => {
    renderComposer();

    expect(screen.getAllByLabelText("Always included")).toHaveLength(5);
  });

  it("카드에는 체크박스를 두지 않는다", () => {
    // 넣고 빼기는 상세 영역의 버튼으로 옮겼다 — 카드에는 설명 한 줄뿐이라, 거기서 빼면
    // 그 카드에 무엇이 들었는지 모른 채 빼게 된다.
    renderComposer();

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("처음에는 필수 카드만 들어간다", () => {
    // 기본이 "전체"면 사용자가 보지도 않은 카드 4개의 필수 입력을 떠안은 채 시작한다.
    renderComposer();

    expect(screen.getByRole("button", { name: "Minimal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("보는 것과 넣고 빼는 것의 분리", () => {
  it("화면에 들어오면 ① 평가 데이터를 보고 있다", () => {
    renderComposer();

    expect(detailTitle()).toContain("Evaluation data");
  });

  it("카드를 누르면 상세만 바뀌고 넣고 빼기는 일어나지 않는다", async () => {
    const { onToggleCard } = renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Training data details" }));

    expect(detailTitle()).toContain("Training data");
    // 가장 중요한 단언 — 보려고 눌렀는데 카드가 빠지면 안 된다.
    expect(onToggleCard).not.toHaveBeenCalled();
  });

  it("보고 있는 카드는 aria-pressed 로 알린다", async () => {
    renderComposer();

    const target = screen.getByRole("button", { name: "Test data details" });
    expect(target).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(target);

    expect(target).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Evaluation data details" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("상세 영역의 넣고 빼기 버튼", () => {
  it("필수 카드에는 버튼 대신 배지가 있다", () => {
    renderComposer();

    expect(within(detailHeader()).getByText("Required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: / report/ })).not.toBeInTheDocument();
  });

  it("빠진 카드에는 넣는 버튼이 있다", async () => {
    const { onToggleCard } = renderComposer({ selection: presetSelection("minimal") });

    await userEvent.click(screen.getByRole("button", { name: "Training data details" }));
    const button = within(detailHeader()).getByRole("button", { name: /Add to report/ });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);

    expect(onToggleCard).toHaveBeenCalledWith("trainingData", true);
  });

  it("들어간 카드에는 빼는 버튼이 있다", async () => {
    const { onToggleCard } = renderComposer({ selection: presetSelection("full") });

    await userEvent.click(screen.getByRole("button", { name: "Ground truth details" }));
    const button = within(detailHeader()).getByRole("button", { name: /Remove from report/ });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);

    expect(onToggleCard).toHaveBeenCalledWith("groundTruth", false);
  });

  it("버튼 문구는 누르면 일어날 일을 적는다", async () => {
    renderComposer({ selection: { ...presetSelection("minimal"), testData: true } });

    await userEvent.click(screen.getByRole("button", { name: "Test data details" }));
    expect(within(detailHeader()).getByRole("button", { name: /Remove/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Model settings and runtime details" }));
    expect(within(detailHeader()).getByRole("button", { name: /Add/ })).toBeInTheDocument();
  });
});

describe("상세 영역", () => {
  it("카드가 바뀌면 알린다 (aria-live)", () => {
    renderComposer();

    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toContain("Evaluation data");
  });

  it("필드 표에 이름과 입력 예시를 그린다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Test data details" }));

    expect(screen.getByText("Relation to the training data")).toBeInTheDocument();
    expect(screen.getByText("Same source / Different source")).toBeInTheDocument();
  });

  it("⑥ 학습 데이터와 ⑦ 테스트 데이터는 각자의 출처를 묻는다", async () => {
    // 서로 다른 데이터셋이라 출처도 따로다. 둘이 같은지는 ⑦ 의 "출처 관계"가 따로 묻는다.
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Training data details" }));
    expect(screen.getByText("Internal CRM logs (free text)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Test data details" }));
    expect(screen.getByText("Q1 2025 customer logs (free text)")).toBeInTheDocument();
  });

  it("더보기 필드는 접혀 있고 버튼으로 펼친다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Training data details" }));

    const moreButton = screen.getByRole("button", { name: /Show 2 optional fields/ });
    expect(screen.queryByText("Preprocessing")).not.toBeInTheDocument();

    await userEvent.click(moreButton);

    expect(screen.getByText("Preprocessing")).toBeInTheDocument();
    expect(screen.getByText("Collection period")).toBeInTheDocument();
  });

  it("조건부 필드는 배지 대신 조건 문구를 보여준다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Ground truth details" }));

    expect(screen.getByText("When several reviewers checked")).toBeInTheDocument();
  });

  it("③ 의뢰자 정보의 예시는 항목 이름을 붙여 보여준다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Client information details" }));

    expect(screen.getByText(/Company: Test Corp/)).toBeInTheDocument();
    expect(screen.getByText(/Representative: Hong Gil-dong/)).toBeInTheDocument();
    expect(screen.getByText(/Business number: 123-45-67890/)).toBeInTheDocument();
  });
});

describe("보기 버튼 (① 과 ② 만)", () => {
  it("① 은 예시 파일, ② 는 지표 보기 버튼을 갖는다", async () => {
    renderComposer();

    expect(screen.getByRole("button", { name: /View an example file/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Metrics and pass criteria details" }));
    expect(screen.getByRole("button", { name: /View the metrics/ })).toBeInTheDocument();
  });

  it("다른 카드에는 보기 버튼이 없다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Client information details" }));

    expect(screen.queryByRole("button", { name: /View an example file/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View the metrics/ })).not.toBeInTheDocument();
  });

  it("예시 파일을 펼치면 선택한 유형의 컬럼이 보인다", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: /View an example file/ }));

    expect(screen.getByText("true_labels")).toBeInTheDocument();
    expect(screen.getByText("score_sports")).toBeInTheDocument();
  });

  it("예시 아래 안내는 컬럼 이름을 함께 적는다", async () => {
    renderComposer({ taskType: "binary" });

    await userEvent.click(screen.getByRole("button", { name: /View an example file/ }));

    expect(screen.getByText(/The answer \(y_true\) is required/)).toBeInTheDocument();
    expect(screen.getByText(/Latency \(latency_ms\) is optional/)).toBeInTheDocument();
  });

  it("다른 카드로 바꾸면 펼친 내용이 닫힌다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: /View an example file/ }));
    expect(screen.getByRole("columnheader", { name: "latency_ms" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Model under test details" }));
    await userEvent.click(screen.getByRole("button", { name: "Evaluation data details" }));

    expect(screen.queryByRole("columnheader", { name: "latency_ms" })).not.toBeInTheDocument();
  });

  it("지표 목록은 유형별 개수를 따른다 (멀티레이블 11개)", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: "Metrics and pass criteria details" }));
    await userEvent.click(screen.getByRole("button", { name: /View the metrics/ }));

    expect(screen.getByText(/metrics to choose from/)).toBeInTheDocument();
    expect(screen.queryByText("M1")).not.toBeInTheDocument();
  });

  it("확률이 필요한 지표에 표시를 붙인다 (이진 M9·M10·M19)", async () => {
    renderComposer({ taskType: "binary" });

    await userEvent.click(screen.getByRole("button", { name: "Metrics and pass criteria details" }));
    await userEvent.click(screen.getByRole("button", { name: /View the metrics/ }));

    expect(screen.getAllByText("needs probability")).toHaveLength(3);
  });
});

describe("유형에 따라 달라지는 필드", () => {
  it("이진은 ⑤ 에서 중요 오류 유형을 묻는다", async () => {
    renderComposer({ taskType: "binary" });

    await userEvent.click(screen.getByRole("button", { name: "Evaluation perspective details" }));

    expect(screen.getByText("Critical error type")).toBeInTheDocument();
    expect(screen.queryByText("Class priority")).not.toBeInTheDocument();
  });

  it("다중 클래스는 ⑤ 에서 클래스 중요도를 묻는다", async () => {
    renderComposer({ taskType: "multiclass" });

    await userEvent.click(screen.getByRole("button", { name: "Evaluation perspective details" }));

    expect(screen.getByText("Class priority")).toBeInTheDocument();
    expect(screen.queryByText("Critical error type")).not.toBeInTheDocument();
  });

  it("지표 선택 이유는 멀티레이블에서만 보인다", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: "Metrics and pass criteria details" }));
    expect(screen.getByText("Reason for this choice")).toBeInTheDocument();
  });
});

describe("프리셋", () => {
  it("전체가 들어가 있으면 전체 칸이 선택돼 보인다", () => {
    renderComposer({ selection: presetSelection("full") });

    expect(screen.getByRole("button", { name: "Everything" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Minimal" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("일부만 들어가면 두 칸 모두 선택 해제로 보인다", () => {
    renderComposer({ selection: { ...presetSelection("full"), modelEnv: false } });

    expect(screen.getByRole("button", { name: "Everything" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Minimal" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("프리셋을 누르면 그 프리셋을 적용한다", async () => {
    const { onApplyPreset } = renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "Everything" }));
    expect(onApplyPreset).toHaveBeenCalledWith("full");

    await userEvent.click(screen.getByRole("button", { name: "Minimal" }));
    expect(onApplyPreset).toHaveBeenCalledWith("minimal");
  });
});
