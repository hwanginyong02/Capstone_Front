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
    // 조건부 필드인 라벨러 수·일치도에는 없다.
    expect(
      screen.queryByRole("checkbox", { name: /Number of reviewers unknown/ }),
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

    expect(screen.queryByText("Data format")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show 3 optional fields/ }));

    expect(screen.getByText("Data format")).toBeInTheDocument();
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

/**
 * 필수 표시와 차단.
 *
 * 비어 있는 것은 **아직** 잘못이 아니다. 화면에 들어오자마자 빨갛게 칠하면 아무 일도 하지
 * 않은 사용자를 꾸짖는 꼴이라, 넘어가려 한 뒤에야 칠한다. 그 전까지는 별표가 어느 칸이
 * 필수인지 말한다.
 */
describe("필수 표시", () => {
  it("필수 필드에만 별표를 단다", () => {
    renderForm("trainingData");

    const required = screen.getByText("Dataset name").querySelector("span");
    expect(required).toHaveTextContent("*");
  });

  it("조건부 필드는 조건이 성립해야 별표가 붙는다", () => {
    // 조건이 성립하기 전에는 그려지지도 않는다.
    renderForm("groundTruth");
    expect(screen.queryByText("Number of reviewers")).not.toBeInTheDocument();

    renderForm("groundTruth", { values: { labelReview: { text: "Several reviewers" } } });
    expect(screen.getByText("Number of reviewers").querySelector("span")).toHaveTextContent("*");
    // 일치도는 종류를 먼저 묻는다. 값 칸은 종류를 고른 뒤에 나타난다.
    expect(screen.getByText("Agreement measure").querySelector("span")).toHaveTextContent("*");
    expect(screen.queryByText("Agreement value")).not.toBeInTheDocument();
  });
});

describe("차단 표시", () => {
  it("들어오자마자는 빈 칸을 꾸짖지 않는다", () => {
    renderForm("modelEnv");

    expect(screen.queryByText(/^Required\./)).not.toBeInTheDocument();
  });

  it("showErrors 를 켜면 빈 필수 칸마다 이유를 적는다", () => {
    const card = getCard("modelEnv");
    render(
      <ComposerCardForm
        card={card}
        taskType="binary"
        values={{}}
        onChange={vi.fn()}
        issues={getCardIssues(card, "binary", {}, true)}
        showErrors
      />,
    );

    // ⑨ 의 필수 넷이 모두 비어 있다.
    expect(screen.getAllByText(/^Required\./)).toHaveLength(4);
    // 모름이 있는 칸에는 그 길도 함께 알려준다.
    expect(screen.getAllByText(/Choose Unknown if you do not know/).length).toBeGreaterThan(0);
  });

  it("채운 칸에는 적지 않는다", () => {
    const card = getCard("perspective");
    const values = { usageMode: { text: "Batch" } };
    render(
      <ComposerCardForm
        card={card}
        taskType="binary"
        values={values}
        onChange={vi.fn()}
        issues={getCardIssues(card, "binary", values, true)}
        showErrors
      />,
    );

    // ⑤ 이진은 질문 둘 중 하나만 남았다. 모름이 없는 카드라 그 길은 알려주지 않는다.
    expect(screen.getAllByText(/^Required\.$/)).toHaveLength(1);
  });
});

/**
 * 선택지 타일.
 *
 * 과녁이 16px 짜리 표식 하나뿐이면 누르기 어렵다. 줄 전체가 label 이라 글자를 눌러도
 * 골라지고, 고른 줄은 구성 화면의 카드와 같은 강조색 테두리를 단다.
 */
describe("선택지 타일", () => {
  it("글자를 눌러도 골라진다", async () => {
    const { onChange } = renderForm("groundTruth");

    await userEvent.click(screen.getByText("Domain experts"));

    expect(onChange).toHaveBeenCalledWith("labelAuthor", {
      text: "Domain experts",
      unknown: false,
    });
  });

  it("여럿 고르는 질문도 글자를 눌러 켜고 끈다 — 두 번 뒤집히지 않는다", async () => {
    const { onChange } = renderForm("trainingData");

    await userEvent.click(screen.getByText("Different equipment"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["Different equipment"],
      unknown: false,
    });
  });

  it("고른 줄에 강조색 테두리를 단다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { text: "Domain experts" } } });

    const chosen = screen.getByRole("radio", { name: "Domain experts" }).closest("label");
    const other = screen.getByRole("radio", { name: "Outside workers" }).closest("label");

    expect(chosen?.className).toContain("border-primary");
    expect(other?.className).not.toContain("border-primary");
  });

  it("하나만 고를 수 있다는 사실은 그대로 알린다", () => {
    renderForm("groundTruth");

    // 모양은 체크박스를 닮았지만 역할은 radio 다.
    expect(screen.getByRole("radio", { name: "Domain experts" })).toBeInTheDocument();
  });
});

describe("Other 직접 입력", () => {
  it("Other 를 고르기 전에는 칸이 없다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { text: "Domain experts" } } });

    expect(screen.queryByRole("textbox", { name: "Who labelled it other" })).not.toBeInTheDocument();
  });

  it("Other 를 고르면 칸이 나타나고, 적은 내용을 보고한다", async () => {
    const { onChange } = renderForm("groundTruth", {
      values: { labelAuthor: { text: "Other (free text)" } },
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Who labelled it other" }), "X");

    expect(onChange).toHaveBeenLastCalledWith("labelAuthor", {
      text: "Other (free text)",
      otherText: "X",
      unknown: false,
    });
  });

  it("여럿 고르기에서도 Other 를 고르면 칸이 나타난다 — ⑥ 수집 환경 차이", () => {
    renderForm("trainingData", {
      values: { channelEffects: { choices: ["Different equipment", "Other (free text)"] } },
    });

    expect(
      screen.getByRole("textbox", { name: "Collection differences other" }),
    ).toBeInTheDocument();
  });
});

describe("숫자 칸", () => {
  it("라벨러 수와 일치도 종류를 받고, 종류를 고르면 값 칸이 나타난다", () => {
    renderForm("groundTruth", {
      values: {
        labelReview: { text: "Several reviewers" },
        labelAgreementKind: { text: "Cohen's kappa" },
      },
    });

    // 필수 표시(*)가 이름 끝에 붙는다.
    expect(screen.getByRole("textbox", { name: /^Number of reviewers/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Krippendorff's alpha" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Agreement value/ })).toBeInTheDocument();
  });

  it("범위 밖이면 다음을 누르기 전에 바로 알린다 — 범위는 고른 종류를 따른다", () => {
    renderForm("groundTruth", {
      values: {
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "0" },
        labelAgreementKind: { text: "Krippendorff's alpha" },
        labelAgreementValue: { text: "1.5" },
      },
    });

    expect(screen.getByText("Enter a whole number of at least 1.")).toBeInTheDocument();
    expect(screen.getByText("Enter a number from -1 to 1.")).toBeInTheDocument();
  });

  it("라벨러 수와 맞지 않는 종류를 고르면 이유를 적는다", () => {
    renderForm("groundTruth", {
      values: {
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "2" },
        labelAgreementKind: { text: "Fleiss' kappa" },
      },
    });

    expect(screen.getByText(/Fleiss' kappa is for three or more reviewers/)).toBeInTheDocument();
  });
});

describe("수집 기간", () => {
  it("시작 월·끝 월 두 칸이다", async () => {
    renderForm("testData");

    await userEvent.click(screen.getByRole("button", { name: /Show 1 optional field/ }));

    expect(screen.getByLabelText("From")).toHaveAttribute("type", "month");
    expect(screen.getByLabelText("To")).toHaveAttribute("type", "month");
  });

  it("틀린 기간이 더보기 안에 있으면 펼쳐서 보여준다 — 접힌 채로 막히면 찾을 수 없다", () => {
    renderForm("testData", {
      values: {
        testPeriod: {
          entries: [
            { key: "From", value: "2025-03" },
            { key: "To", value: "2024-12" },
          ],
        },
      },
    });

    expect(screen.getByText("Enter both months, with From no later than To.")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2025-03");
  });
});

describe("덧붙이는 글", () => {
  it("전처리 일치 칸은 선택지와 함께 글을 받는다 (서술 설계 D26)", async () => {
    const { onChange } = renderForm("testData", { values: { preprocessingMatch: { text: "Different" } } });

    await userEvent.type(screen.getByRole("textbox", { name: "Same preprocessing as training note" }), "Y");

    expect(onChange).toHaveBeenLastCalledWith("preprocessingMatch", {
      text: "Different",
      note: "Y",
      unknown: false,
    });
  });

  it("글을 받지 않는 칸에는 글칸이 없다", () => {
    renderForm("testData");
    expect(screen.queryByRole("textbox", { name: "Relation to the training data note" })).not.toBeInTheDocument();
  });
});
