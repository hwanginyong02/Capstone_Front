/**
 * 새 입력 화면의 공통 폼.
 *
 * 레지스트리가 그리는 방식을 정하므로(`field.input`), 여기서 검사하는 것은 **레지스트리의
 * 뜻이 화면에 제대로 나타나는가**다 — 유형별로 다른 질문, 배타 선택지, Unknown 의 잠금.
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
      // 클래스 이름은 사용자가 올린 파일에서 온다 — 화면 문구와 달리 번역 대상이 아니다.
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

describe("카드 제목에는 번호가 없다", () => {
  it("이름만 적는다 — ⑥ 같은 기호는 사용자에게 뜻이 없다", () => {
    renderForm("trainingData");

    expect(screen.getByRole("heading", { name: "Training data" })).toBeInTheDocument();
    expect(screen.queryByText(/⑥/)).not.toBeInTheDocument();
  });
});

describe("Unknown", () => {
  it("Unknown 을 고를 수 있는 필드에만 체크박스가 있다", () => {
    renderForm("groundTruth");

    expect(screen.getByRole("checkbox", { name: "Who labelled it unknown" })).toBeInTheDocument();
    // 조건부 필드인 검수 인원·일치율에는 없다.
    expect(
      screen.queryByRole("checkbox", { name: /Reviewers and agreement unknown/ }),
    ).not.toBeInTheDocument();
  });

  it("Unknown 을 고르면 그 필드의 컨트롤을 잠근다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { unknown: true } } });

    // 값과 Unknown 이 동시에 남아 어느 쪽이 참인지 모르게 되는 상태를 만들지 않는다.
    expect(screen.getByRole("radio", { name: "Domain experts" })).toBeDisabled();
  });

  it("Unknown 을 보고한다", async () => {
    const { onChange } = renderForm("modelEnv");

    await userEvent.click(screen.getByRole("checkbox", { name: "Algorithm unknown" }));

    expect(onChange).toHaveBeenCalledWith("algorithm", { unknown: true });
  });
});

describe("⑥ 배타 선택지", () => {
  it('"None known" 을 고르면 다른 선택을 치운다', async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["Different equipment", "Different collectors"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "None known" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["None known"],
      unknown: false,
    });
  });

  it("다른 선택지를 고르면 배타 선택지가 빠진다", async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["None known"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "Different equipment" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["Different equipment"],
      unknown: false,
    });
  });

  it("배타 위반이면 그 필드에 이유를 적는다", () => {
    renderForm("trainingData", {
      values: { channelEffects: { choices: ["None known", "Different equipment"] } },
    });

    expect(screen.getByText(/cannot be combined with the others/)).toBeInTheDocument();
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

    expect(screen.getByRole("radiogroup", { name: "GPU used Training" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "GPU used Inference" })).toBeInTheDocument();
  });

  it("⑨ 하이퍼파라미터는 줄을 추가한다", async () => {
    const { onChange } = renderForm("modelEnv");

    await userEvent.click(screen.getByRole("button", { name: "Add a row" }));

    expect(onChange).toHaveBeenCalledWith("hyperparameters", {
      entries: [{ key: "", value: "" }],
      unknown: false,
    });
  });
});

describe("더보기", () => {
  it("선택 항목은 접혀 있다", async () => {
    renderForm("trainingData");

    expect(screen.queryByText("Preprocessing")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show 2 optional fields/ }));

    expect(screen.getByText("Preprocessing")).toBeInTheDocument();
  });
});

describe("남은 항목 안내", () => {
  it('Unknown 이 있는 카드에서는 그 길을 알려준다', () => {
    const card = getCard("modelEnv");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/Choose Unknown if you do not know/)).toBeInTheDocument();
  });

  it('Unknown 이 없는 카드에서는 알려주지 않는다', () => {
    // ⑤ 평가 관점에는 Unknown 이 없다 — 있지도 않은 길을 알려주면 안 된다.
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/are empty/)).toBeInTheDocument();
    expect(screen.queryByText(/Choose Unknown/)).not.toBeInTheDocument();
  });

  it("남은 개수를 적는다", () => {
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/Critical error type/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("하나만 남으면 단수로 적는다", () => {
    const card = getCard("perspective");
    const issues = getCardIssues(card, "binary", { usageMode: { text: "Batch" } }, true);
    render(<RemainingNotice issues={issues} />);

    expect(screen.getByText(/is empty/)).toBeInTheDocument();
  });

  it("다 채우면 아무것도 적지 않는다", () => {
    const { container } = render(<RemainingNotice issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
