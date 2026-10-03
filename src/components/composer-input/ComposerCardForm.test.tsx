/**
 * 새 입력 화면의 공통 폼.
 *
 * 레지스트리가 그리는 방식을 정하므로(`field.input`), 여기서 검사하는 것은 **레지스트리의
 * 뜻이 화면에 제대로 나타나는가**다 — 유형별로 다른 질문, 배타 선택지, "모름"의 잠금.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ComposerCardForm } from "./ComposerCardForm";
import { RemainingNotice } from "./RemainingNotice";
import { getCard } from "../../data/reportComposer";
import { getCardIssues } from "../../utils/domain/composerFieldGate";
import type { ComposerCardId, ComposerValueMap } from "../../types/reportComposer.types";
import type { TaskType } from "../../data/evaluationData";

function renderForm(
  cardId: ComposerCardId,
  options: { taskType?: TaskType; values?: ComposerValueMap } = {},
) {
  const taskType = options.taskType ?? "binary";
  const values = options.values ?? {};
  const onChange = vi.fn();
  const card = getCard(cardId);

  render(
    <ComposerCardForm
      card={card}
      taskType={taskType}
      values={values}
      onChange={onChange}
      issues={getCardIssues(card, taskType, values, true)}
      classNames={["정상", "이탈"]}
    />,
  );

  return { onChange };
}

describe("⑤ 평가 관점 — 유형별 질문", () => {
  it("이진은 중요 오류 유형을 묻는다", () => {
    renderForm("perspective", { taskType: "binary" });

    expect(screen.getByText("Critical error type")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Missed (FN)" })).toBeInTheDocument();
    expect(screen.queryByText("Class priority")).not.toBeInTheDocument();
  });

  it("다중 클래스는 클래스 중요도를 묻는다", () => {
    renderForm("perspective", { taskType: "multiclass" });

    expect(screen.getByText("Class priority")).toBeInTheDocument();
    expect(screen.queryByText("Critical error type")).not.toBeInTheDocument();
  });

  it("고른 답을 보고한다", async () => {
    const { onChange } = renderForm("perspective", { taskType: "binary" });

    await userEvent.click(screen.getByRole("radio", { name: "Batch" }));

    expect(onChange).toHaveBeenCalledWith("usageMode", { text: "Batch", unknown: false });
  });
});

describe('"모름"', () => {
  it("모름을 고를 수 있는 필드에만 체크박스가 있다", () => {
    renderForm("groundTruth");

    expect(screen.getByRole("checkbox", { name: "라벨 작성 주체 모름" })).toBeInTheDocument();
    // 조건부 필드인 검수 인원·일치율에는 없다.
    expect(screen.queryByRole("checkbox", { name: /검수 인원·일치율 모름/ })).not.toBeInTheDocument();
  });

  it("모름을 고르면 그 필드의 컨트롤을 잠근다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { unknown: true } } });

    // 값과 "모름" 이 동시에 남아 어느 쪽이 참인지 모르게 되는 상태를 만들지 않는다.
    expect(screen.getByRole("radio", { name: "전문가" })).toBeDisabled();
  });

  it("모름을 보고한다", async () => {
    const { onChange } = renderForm("modelEnv");

    await userEvent.click(screen.getByRole("checkbox", { name: "알고리즘 모름" }));

    expect(onChange).toHaveBeenCalledWith("algorithm", { unknown: true });
  });
});

describe("⑥ 배타 선택지", () => {
  it('"알려진 것 없음"을 고르면 다른 선택을 치운다', async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["장비 차이", "수집자 차이"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "알려진 것 없음" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["알려진 것 없음"],
      unknown: false,
    });
  });

  it("다른 선택지를 고르면 배타 선택지가 빠진다", async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["알려진 것 없음"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "장비 차이" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["장비 차이"],
      unknown: false,
    });
  });

  it("배타 위반이면 그 필드에 이유를 적는다", () => {
    renderForm("trainingData", {
      values: { channelEffects: { choices: ["알려진 것 없음", "장비 차이"] } },
    });

    expect(screen.getByText(/다른 항목과 함께 고를 수 없습니다/)).toBeInTheDocument();
  });
});

describe("칸이 정해진 입력", () => {
  it("⑥ 클래스별 데이터 양은 업로드한 클래스로 칸을 만든다", () => {
    renderForm("trainingData");

    expect(screen.getByLabelText("정상")).toBeInTheDocument();
    expect(screen.getByLabelText("이탈")).toBeInTheDocument();
  });

  it("⑨ GPU 사용 여부는 학습·추론을 따로 고른다", () => {
    renderForm("modelEnv");

    expect(screen.getByRole("radiogroup", { name: "GPU 사용 여부 학습" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "GPU 사용 여부 추론" })).toBeInTheDocument();
  });

  it("⑨ 하이퍼파라미터는 줄을 추가한다", async () => {
    const { onChange } = renderForm("modelEnv");

    await userEvent.click(screen.getByRole("button", { name: "줄 추가" }));

    expect(onChange).toHaveBeenCalledWith("hyperparameters", {
      entries: [{ key: "", value: "" }],
      unknown: false,
    });
  });
});

describe("더보기", () => {
  it("선택 항목은 접혀 있다", async () => {
    renderForm("trainingData");

    expect(screen.queryByText("전처리 여부")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /선택 항목 2개 더 보기/ }));

    expect(screen.getByText("전처리 여부")).toBeInTheDocument();
  });
});

describe("남은 항목 안내", () => {
  it('"모름"이 있는 카드에서는 그 길을 알려준다', () => {
    const card = getCard("modelEnv");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/모르면 모름을 고르세요/)).toBeInTheDocument();
  });

  it('"모름"이 없는 카드에서는 알려주지 않는다', () => {
    // ⑤ 평가 관점에는 모름이 없다 — 있지도 않은 길을 알려주면 안 된다.
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/비어 있습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/모름을 고르세요/)).not.toBeInTheDocument();
  });

  it("남은 개수를 적는다", () => {
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/Critical error type 외/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("다 채우면 아무것도 적지 않는다", () => {
    const { container } = render(<RemainingNotice issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("남은 항목 안내 — 영어 화면", () => {
  it("평가 구간 화면에서는 영어로 적는다", () => {
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} lang="en" />);

    expect(screen.getByText(/Critical error type and/)).toBeInTheDocument();
    expect(screen.getByText(/more are empty/)).toBeInTheDocument();
    // ⑤ 에는 "모름" 이 없으므로 그 길을 알려주지 않는다.
    expect(screen.queryByText(/Choose Unknown/)).not.toBeInTheDocument();
  });

  it("하나만 남으면 단수로 적는다", () => {
    const card = getCard("perspective");
    const issues = getCardIssues(card, "binary", { usageMode: { text: "Batch" } }, true);
    render(<RemainingNotice issues={issues} lang="en" />);

    expect(screen.getByText(/is empty/)).toBeInTheDocument();
  });

  it('"모름"이 있는 카드에서는 영어로도 그 길을 알려준다', () => {
    const card = getCard("modelEnv");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} lang="en" />);

    expect(screen.getByText(/Choose Unknown if you do not know/)).toBeInTheDocument();
  });
});
