/**
 * 성적서 구성 화면의 동작을 고정한다.
 *
 * 이 화면의 핵심은 **누르는 것과 켜는 것이 분리돼 있다**는 점이다
 * (docs/COMPOSER_COMPONENTS.md "구성 화면 레이아웃"). 합치면 내용을 보려고 눌렀다가 카드가
 * 꺼지는데, 그건 사용자가 성적서에서 절을 하나 잃는 일이다. 그래서 그 분리를 가장 먼저
 * 검사한다.
 *
 * 컨텐츠 컴포넌트는 스토어를 읽지 않고 props 로만 상태를 받으므로(가이드라인 §1), 여기서는
 * 상태 조합을 직접 넣고 콜백으로 보고된 것을 본다 — `ColumnMapping.test.tsx` 와 같은 방식이다.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportComposer } from "./ReportComposer";
import { ComposerSummary } from "./ComposerSummary";
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
function detailTitle(): string {
  const panel = screen.getByRole("heading", { level: 3 });
  return panel.textContent ?? "";
}

describe("카드 두 줄", () => {
  it("필수 5장과 선택 4장을 그린다", () => {
    renderComposer();

    expect(screen.getByRole("heading", { name: /필수/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /선택/ })).toBeInTheDocument();
    // 카드마다 "자세히 보기" 버튼이 하나씩 있다.
    expect(screen.getAllByRole("button", { name: /자세히 보기/ })).toHaveLength(9);
  });

  it("필수 카드는 자물쇠를 달고 체크박스를 두지 않는다", () => {
    renderComposer();

    expect(screen.getAllByLabelText("항상 포함")).toHaveLength(5);
    // 체크박스는 선택 카드 4장에만 있다.
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  });

  it("선택 카드의 체크박스에는 카드 이름이 들어간다", () => {
    renderComposer();

    expect(screen.getByRole("checkbox", { name: "⑥ 학습 데이터 포함" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "⑨ 모델 설정과 실행 환경 포함" })).toBeInTheDocument();
  });

  it("처음에는 선택 카드 4개가 모두 켜져 있다 (프리셋 전체)", () => {
    renderComposer();

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked();
    }
  });

  it("꺼진 카드의 체크박스는 비어 있다", () => {
    renderComposer({ selection: presetSelection("minimal") });

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });
});

describe("누르는 것과 켜는 것의 분리", () => {
  it("화면에 들어오면 ① 평가 데이터를 보고 있다", () => {
    renderComposer();

    expect(detailTitle()).toContain("① 평가 데이터");
  });

  it("카드 본문을 누르면 상세 영역만 바뀌고 켜짐/꺼짐은 그대로다", async () => {
    const { onToggleCard } = renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "⑥ 학습 데이터 자세히 보기" }));

    expect(detailTitle()).toContain("⑥ 학습 데이터");
    // 가장 중요한 단언 — 보려고 눌렀는데 카드가 꺼지면 안 된다.
    expect(onToggleCard).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "⑥ 학습 데이터 포함" })).toBeChecked();
  });

  it("보고 있는 카드는 aria-pressed 로 알린다", async () => {
    renderComposer();

    const target = screen.getByRole("button", { name: "⑦ 테스트 데이터 자세히 보기" });
    expect(target).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(target);

    expect(target).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "① 평가 데이터 자세히 보기" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("체크박스를 누르면 켜짐/꺼짐이 바뀌고 그 카드를 보게 된다", async () => {
    const { onToggleCard } = renderComposer();

    await userEvent.click(screen.getByRole("checkbox", { name: "⑧ 정답 라벨 포함" }));

    expect(onToggleCard).toHaveBeenCalledWith("groundTruth", false);
    expect(detailTitle()).toContain("⑧ 정답 라벨");
  });

  it("꺼진 카드의 체크박스를 누르면 켠다", async () => {
    const { onToggleCard } = renderComposer({ selection: presetSelection("minimal") });

    await userEvent.click(screen.getByRole("checkbox", { name: "⑥ 학습 데이터 포함" }));

    expect(onToggleCard).toHaveBeenCalledWith("trainingData", true);
  });
});

describe("상세 영역", () => {
  it("카드가 바뀌면 알린다 (aria-live)", () => {
    renderComposer();

    // 상세 영역 자체가 live 영역이라 카드 이름이 바뀔 때 읽힌다.
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toContain("① 평가 데이터");
  });

  it("상태 배지로 필수·켜짐·꺼짐을 구분한다", async () => {
    renderComposer({ selection: { ...DEFAULT_COMPOSER_SELECTION, modelEnv: false } });

    // 머리 영역으로 좁힌다 — 필드 표의 구분 열에도 "필수" 배지가 있다.
    const header = () =>
      document.querySelector('[data-slot="card-header"]') as HTMLElement;

    expect(within(header()).getByText("필수")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "⑥ 학습 데이터 자세히 보기" }));
    expect(within(header()).getByText("선택 · 켜짐")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "⑨ 모델 설정과 실행 환경 자세히 보기" }),
    );
    expect(within(header()).getByText("선택 · 꺼짐")).toBeInTheDocument();
  });

  it("필드 표에 이름과 입력 예시, 구분을 그린다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "⑦ 테스트 데이터 자세히 보기" }));

    expect(screen.getByText("데이터 출처")).toBeInTheDocument();
    expect(screen.getByText("학습 데이터와 출처 관계")).toBeInTheDocument();
    expect(screen.getByText("같음 / 다름 / 모름")).toBeInTheDocument();
  });

  it("더보기 필드는 접혀 있고 버튼으로 펼친다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "⑥ 학습 데이터 자세히 보기" }));

    // ⑥ 의 더보기는 수집 기간·전처리 여부 2개다.
    const moreButton = screen.getByRole("button", { name: /선택 항목 2개 더 보기/ });
    expect(screen.queryByText("전처리 여부")).not.toBeInTheDocument();

    await userEvent.click(moreButton);

    expect(screen.getByText("전처리 여부")).toBeInTheDocument();
    expect(screen.getByText("수집 기간")).toBeInTheDocument();
  });

  it("조건부 필드는 배지 대신 조건 문구를 보여준다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "⑧ 정답 라벨 자세히 보기" }));

    expect(screen.getByText("복수 교차 검수일 때")).toBeInTheDocument();
  });
});

describe("보기 버튼 (① 과 ② 만)", () => {
  it("① 은 예시 파일, ② 는 지표 목록 버튼을 갖는다", async () => {
    renderComposer();

    expect(screen.getByRole("button", { name: /예시 파일 보기/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "② 지표와 합격 기준 자세히 보기" }));
    expect(screen.getByRole("button", { name: /고를 수 있는 지표 보기/ })).toBeInTheDocument();
  });

  it("다른 카드에는 보기 버튼이 없다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "③ 의뢰자 정보 자세히 보기" }));

    // 카드 본문 버튼도 "…자세히 보기" 로 끝나므로 두 보기 버튼을 이름으로 짚는다.
    expect(screen.queryByRole("button", { name: /예시 파일 보기/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /고를 수 있는 지표 보기/ }),
    ).not.toBeInTheDocument();
  });

  it("예시 파일을 펼치면 선택한 유형의 컬럼이 보인다", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: /예시 파일 보기/ }));

    expect(screen.getByText("true_labels")).toBeInTheDocument();
    expect(screen.getByText("score_sports")).toBeInTheDocument();
  });

  it("다른 카드로 바꾸면 펼친 내용이 닫힌다", async () => {
    renderComposer();

    await userEvent.click(screen.getByRole("button", { name: /예시 파일 보기/ }));
    expect(screen.getByText("latency_ms")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "④ 평가 대상 모델 자세히 보기" }));
    await userEvent.click(screen.getByRole("button", { name: "① 평가 데이터 자세히 보기" }));

    expect(screen.queryByText("latency_ms")).not.toBeInTheDocument();
  });

  it("지표 목록은 유형별 개수를 따른다 (멀티레이블 11개)", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: "② 지표와 합격 기준 자세히 보기" }));
    await userEvent.click(screen.getByRole("button", { name: /고를 수 있는 지표 보기/ }));

    expect(screen.getByText(/지표 11개 중에서 고릅니다/)).toBeInTheDocument();
    // 멀티레이블에는 M1 이 없다.
    expect(screen.queryByText("M1")).not.toBeInTheDocument();
  });

  it("확률이 필요한 지표에 표시를 붙인다 (이진 M9·M10·M19)", async () => {
    renderComposer({ taskType: "binary" });

    await userEvent.click(screen.getByRole("button", { name: "② 지표와 합격 기준 자세히 보기" }));
    await userEvent.click(screen.getByRole("button", { name: /고를 수 있는 지표 보기/ }));

    expect(screen.getAllByText("확률 필요")).toHaveLength(3);
  });
});

describe("유형에 따라 달라지는 필드", () => {
  it("이진은 ⑤ 에서 중요 오류 유형을 묻는다", async () => {
    renderComposer({ taskType: "binary" });

    await userEvent.click(screen.getByRole("button", { name: "⑤ 평가 관점 자세히 보기" }));

    expect(screen.getByText("중요 오류 유형")).toBeInTheDocument();
    expect(screen.queryByText("클래스 중요도")).not.toBeInTheDocument();
  });

  it("다중 클래스는 ⑤ 에서 클래스 중요도를 묻는다", async () => {
    renderComposer({ taskType: "multiclass" });

    await userEvent.click(screen.getByRole("button", { name: "⑤ 평가 관점 자세히 보기" }));

    expect(screen.getByText("클래스 중요도")).toBeInTheDocument();
    expect(screen.queryByText("중요 오류 유형")).not.toBeInTheDocument();
  });

  it("지표 선택 이유는 멀티레이블에서만 보인다", async () => {
    renderComposer({ taskType: "multilabel" });

    await userEvent.click(screen.getByRole("button", { name: "② 지표와 합격 기준 자세히 보기" }));
    expect(screen.getByText("지표 선택 이유")).toBeInTheDocument();
  });
});

describe("프리셋", () => {
  it("전체가 켜져 있으면 전체 칸이 선택돼 보인다", () => {
    renderComposer({ selection: presetSelection("full") });

    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "최소 구성" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("일부만 켜면 두 칸 모두 선택 해제로 보인다", () => {
    renderComposer({ selection: { ...presetSelection("full"), modelEnv: false } });

    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "최소 구성" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("프리셋을 누르면 그 프리셋을 적용한다", async () => {
    const { onApplyPreset } = renderComposer();

    await userEvent.click(screen.getByRole("button", { name: "최소 구성" }));
    expect(onApplyPreset).toHaveBeenCalledWith("minimal");

    await userEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(onApplyPreset).toHaveBeenCalledWith("full");
  });
});

describe("하단 요약", () => {
  it("유형 · 켠 카드 수 · 입력 단계 수를 적는다", () => {
    render(
      <ComposerSummary
        taskType="binary"
        selection={{ ...presetSelection("full"), modelEnv: false }}
      />,
    );

    const summary = screen.getByText(/이진 분류/);
    expect(summary.textContent).toContain("이진 분류");
    expect(summary.textContent).toContain("선택 카드 3/4");
    expect(summary.textContent).toContain("입력 단계 9개");
  });

  it("최소 구성이면 입력 단계가 8개다", () => {
    render(<ComposerSummary taskType="multiclass" selection={presetSelection("minimal")} />);

    const summary = screen.getByText(/다중 클래스/);
    expect(summary.textContent).toContain("선택 카드 0/4");
    expect(summary.textContent).toContain("입력 단계 8개");
  });

  it("전체면 입력 단계가 10개다", () => {
    render(<ComposerSummary taskType="multilabel" selection={presetSelection("full")} />);

    const summary = screen.getByText(/다중 레이블/);
    expect(summary.textContent).toContain("선택 카드 4/4");
    expect(summary.textContent).toContain("입력 단계 10개");
  });
});
