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
  options: { taskType?: TaskType; values?: ComposerValueMap; picks?: string[] } = {},
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
      issues={getCardIssues(card, taskType, values, true, options.picks)}
      picks={options.picks}
      // 클래스 이름은 사용자가 올린 파일에서 온다 — 화면 문구와 달리 번역 대상이 아니다.
      classNames={["정상", "이탈"]}
    />,
  );

  return { onChange };
}

describe("⑤ 평가 관점 — 유형별 질문", () => {
  it("이진은 중요 오류 유형을 묻는다", () => {
    renderForm("perspective", { taskType: "binary" });

    expect(screen.getByText("중요 오류 유형")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "놓침(FN)" })).toBeInTheDocument();
    expect(screen.queryByText("클래스 중요도")).not.toBeInTheDocument();
  });

  it("다중 클래스는 클래스 중요도를 묻는다", () => {
    renderForm("perspective", { taskType: "multiclass" });

    expect(screen.getByText("클래스 중요도")).toBeInTheDocument();
    expect(screen.queryByText("중요 오류 유형")).not.toBeInTheDocument();
  });

  it("고른 답을 보고한다", async () => {
    const { onChange } = renderForm("perspective", { taskType: "binary" });

    await userEvent.click(screen.getByRole("radio", { name: "일괄 처리" }));

    expect(onChange).toHaveBeenCalledWith("usageMode", { text: "Batch", unknown: false });
  });
});

describe("⑧ 정답 라벨 신뢰성 — 성적서와 같은 말 (W1)", () => {
  it("선택지 이름이 성적서 표기와 같고, 무엇을 뜻하는지 한 줄 설명이 붙는다", () => {
    renderForm("groundTruth");

    expect(screen.getByText("정답 라벨 신뢰성")).toBeInTheDocument();
    for (const name of ["복수 라벨러 합의", "단일 라벨러", "검토 없음"]) {
      expect(screen.getByRole("radio", { name: new RegExp("^" + name) }), name).toBeInTheDocument();
    }
    expect(screen.getByText("한 사람이 붙였어요")).toBeInTheDocument();
    expect(screen.queryByText("1인 검수")).not.toBeInTheDocument();
  });
});

describe("글자 수 상한 (B7)", () => {
  it("긴 설명 칸은 상한을 넘겨 받지 않고 남은 글자를 늘 보인다", () => {
    renderForm("trainingData", { values: { trainingDescription: { text: "가".repeat(1_990) } } });

    expect(screen.getByLabelText("학습 데이터 설명")).toHaveAttribute("maxLength", "2000");
    expect(screen.getByText("10자 남음")).toBeInTheDocument();
  });

  it("한 줄 칸은 상한의 80% 를 넘었을 때만 남은 글자를 보인다", () => {
    // 여러 줄 칸(설명·비고·덧붙이는 글)은 늘 보이므로, 이 칸의 남은 수(50자)만 본다.
    renderForm("trainingData", { values: { trainingDatasetName: { text: "가".repeat(150) } } });
    expect(screen.queryByText("50자 남음")).not.toBeInTheDocument();
  });

  it("한 줄 칸이 상한에 닿으면 그렇다고 알린다", () => {
    renderForm("trainingData", { values: { trainingDatasetName: { text: "가".repeat(200) } } });
    expect(screen.getByRole("textbox", { name: /^데이터 이름/ })).toHaveAttribute("maxLength", "200");
    expect(screen.getByText("최대 200자까지 적을 수 있어요")).toBeInTheDocument();
  });
});

describe("전용 화면이 받는 필드는 그리지 않는다", () => {
  it("⑥ 예시 파일 두 칸은 학습 데이터 화면의 예시 파일 칸이 받는다", () => {
    renderForm("trainingData");

    expect(screen.getByText("데이터 이름")).toBeInTheDocument();
    expect(screen.queryByText("적합 예시 파일")).not.toBeInTheDocument();
    expect(screen.queryByText("부적합 예시 파일")).not.toBeInTheDocument();
  });
});

describe("카드 제목에는 번호가 없다", () => {
  it("이름만 적는다 — ⑥ 같은 기호는 사용자에게 뜻이 없다", () => {
    renderForm("trainingData");

    expect(screen.getByRole("heading", { name: "학습 데이터" })).toBeInTheDocument();
    expect(screen.queryByText(/⑥/)).not.toBeInTheDocument();
  });
});

describe("Unknown", () => {
  it("Unknown 을 고를 수 있는 필드에만 체크박스가 있다", () => {
    renderForm("groundTruth");

    expect(screen.getByRole("checkbox", { name: "라벨 작성 주체 모름" })).toBeInTheDocument();
    // 조건부 필드인 라벨러 수·일치도에는 없다.
    expect(
      screen.queryByRole("checkbox", { name: /라벨러 수 모름/ }),
    ).not.toBeInTheDocument();
  });

  it("Unknown 을 고르면 그 필드의 컨트롤을 잠근다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { unknown: true } } });

    // 값과 Unknown 이 동시에 남아 어느 쪽이 참인지 모르게 되는 상태를 만들지 않는다.
    expect(screen.getByRole("radio", { name: "전문가" })).toBeDisabled();
  });

  it("Unknown 을 보고한다", async () => {
    const { onChange } = renderForm("modelEnv");

    await userEvent.click(screen.getByRole("checkbox", { name: "알고리즘 모름" }));

    expect(onChange).toHaveBeenCalledWith("algorithm", { unknown: true });
  });
});

describe("⑥ 배타 선택지", () => {
  it('"None known" 을 고르면 다른 선택을 치운다', async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["Different equipment", "Different collectors"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "알려진 것 없음" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["None known"],
      unknown: false,
    });
  });

  it("다른 선택지를 고르면 배타 선택지가 빠진다", async () => {
    const { onChange } = renderForm("trainingData", {
      values: { channelEffects: { choices: ["None known"] } },
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "수집 장치 차이" }));

    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["Different equipment"],
      unknown: false,
    });
  });

  it("배타 위반이면 그 필드에 이유를 적는다", () => {
    renderForm("trainingData", {
      values: { channelEffects: { choices: ["None known", "Different equipment"] } },
    });

    expect(screen.getByText(/다른 선택지와 함께 고를 수 없는 답입니다/)).toBeInTheDocument();
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
  it("재료 고르기에서 체크하지 않은 권장·선택 필드는 그리지 않는다 (MATERIAL_PICKER §5)", () => {
    renderForm("trainingData", { picks: ["trainingDatasetName"] });

    expect(screen.getByText("데이터 이름")).toBeInTheDocument();
    expect(screen.queryByText("데이터 출처")).not.toBeInTheDocument();
    expect(screen.queryByText("데이터 형식")).not.toBeInTheDocument();
  });

  it("체크한 선택 필드는 접지 않고 바로 보인다 — 고른 것 자체가 쓰겠다는 뜻이다", () => {
    renderForm("trainingData", { picks: ["trainingDataFormat"] });

    expect(screen.getByText("데이터 형식")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /더 보기/ })).not.toBeInTheDocument();
  });

  it("받지 않기로 한 권장 필드는 비어 있어도 막지 않는다 — 성적서에 제공되지 않음으로 찍힌다", () => {
    const card = getCard("trainingData");
    expect(getCardIssues(card, "binary", {}, true, [])).toEqual([]);
    expect(getCardIssues(card, "binary", {}, true, ["trainingDatasetName"]).map((i) => i.fieldId)).toEqual([
      "trainingDatasetName",
    ]);
  });
});

describe("남은 항목 안내", () => {
  it('Unknown 이 있는 카드에서는 그 길을 알려준다', () => {
    const card = getCard("modelEnv");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/모르면 모름을 고르세요/)).toBeInTheDocument();
  });

  it('Unknown 이 없는 카드에서는 알려주지 않는다', () => {
    // ⑤ 평가 관점에는 Unknown 이 없다 — 있지도 않은 길을 알려주면 안 된다.
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/비어 있는 칸/)).toBeInTheDocument();
    expect(screen.queryByText(/모름을 고르세요/)).not.toBeInTheDocument();
  });

  it("남은 개수를 적는다", () => {
    const card = getCard("perspective");
    render(<RemainingNotice issues={getCardIssues(card, "binary", {}, true)} />);

    expect(screen.getByText(/중요 오류 유형/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("하나만 남으면 개수를 붙이지 않는다", () => {
    const card = getCard("perspective");
    const issues = getCardIssues(card, "binary", { usageMode: { text: "Batch" } }, true);
    render(<RemainingNotice issues={issues} />);

    expect(screen.getByText("비어 있는 칸: 중요 오류 유형.")).toBeInTheDocument();
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

    const required = screen.getByText("데이터 이름").querySelector("span");
    expect(required).toHaveTextContent("*");
  });

  it("조건부 필드는 조건이 성립해야 별표가 붙는다", () => {
    // 조건이 성립하기 전에는 그려지지도 않는다.
    renderForm("groundTruth");
    expect(screen.queryByText("라벨러 수")).not.toBeInTheDocument();

    renderForm("groundTruth", { values: { labelReview: { text: "Several reviewers" } } });
    expect(screen.getByText("라벨러 수").querySelector("span")).toHaveTextContent("*");
    // 일치도는 종류를 먼저 묻는다. 값 칸은 종류를 고른 뒤에 나타난다.
    expect(screen.getByText("일치도 종류").querySelector("span")).toHaveTextContent("*");
    expect(screen.queryByText("일치도 값")).not.toBeInTheDocument();
  });

  it("[B2] 검수 방식을 받지 않으면 남은 '여러 명 검수' 값이 있어도 라벨러 수·일치도 칸이 없다", () => {
    const several = {
      labelReview: { text: "Several reviewers" },
      labelAgreementKind: { text: "Cohen's kappa" },
    };
    renderForm("groundTruth", { values: several, picks: ["labelAuthor"] });
    expect(screen.queryByText("라벨러 수")).not.toBeInTheDocument();
    expect(screen.queryByText("일치도 종류")).not.toBeInTheDocument();
    expect(screen.queryByText("일치도 값")).not.toBeInTheDocument();
  });

  it("[B2] 검수 방식을 받으면 라벨러 수 칸이 다시 나온다", () => {
    renderForm("groundTruth", {
      values: { labelReview: { text: "Several reviewers" } },
      picks: ["labelAuthor", "labelReview"],
    });
    expect(screen.getByText("라벨러 수")).toBeInTheDocument();
  });
});

describe("차단 표시", () => {
  it("들어오자마자는 빈 칸을 꾸짖지 않는다", () => {
    renderForm("modelEnv");

    expect(screen.queryByText(/^필수 항목입니다\./)).not.toBeInTheDocument();
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
    expect(screen.getAllByText(/^필수 항목입니다\./)).toHaveLength(4);
    // 모름이 있는 칸에는 그 길도 함께 알려준다.
    expect(screen.getAllByText(/모르면 모름을 고르세요/).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/^필수 항목입니다\.$/)).toHaveLength(1);
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

    await userEvent.click(screen.getByText("전문가"));

    expect(onChange).toHaveBeenCalledWith("labelAuthor", {
      text: "Domain experts",
      unknown: false,
    });
  });

  it("여럿 고르는 질문도 글자를 눌러 켜고 끈다 — 두 번 뒤집히지 않는다", async () => {
    const { onChange } = renderForm("trainingData");

    await userEvent.click(screen.getByText("수집 장치 차이"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("channelEffects", {
      choices: ["Different equipment"],
      unknown: false,
    });
  });

  it("고른 줄에 강조색 테두리를 단다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { text: "Domain experts" } } });

    const chosen = screen.getByRole("radio", { name: "전문가" }).closest("label");
    const other = screen.getByRole("radio", { name: "크라우드소싱(외부 작업자)" }).closest("label");

    expect(chosen?.className).toContain("border-primary");
    expect(other?.className).not.toContain("border-primary");
  });

  it("하나만 고를 수 있다는 사실은 그대로 알린다", () => {
    renderForm("groundTruth");

    // 모양은 체크박스를 닮았지만 역할은 radio 다.
    expect(screen.getByRole("radio", { name: "전문가" })).toBeInTheDocument();
  });
});

describe("Other 직접 입력", () => {
  it("Other 를 고르기 전에는 칸이 없다", () => {
    renderForm("groundTruth", { values: { labelAuthor: { text: "Domain experts" } } });

    expect(screen.queryByRole("textbox", { name: "라벨 작성 주체 기타 내용" })).not.toBeInTheDocument();
  });

  it("Other 를 고르면 칸이 나타나고, 적은 내용을 보고한다", async () => {
    const { onChange } = renderForm("groundTruth", {
      values: { labelAuthor: { text: "Other (free text)" } },
    });

    await userEvent.type(screen.getByRole("textbox", { name: "라벨 작성 주체 기타 내용" }), "X");

    expect(onChange).toHaveBeenLastCalledWith("labelAuthor", {
      text: "Other (free text)",
      otherText: "X",
      unknown: false,
    });
  });

  it("여럿 고르기에서도 Other 를 고르면 칸이 나타난다 — ⑥ 수집 방식 차이", () => {
    renderForm("trainingData", {
      values: { channelEffects: { choices: ["Different equipment", "Other (free text)"] } },
    });

    expect(
      screen.getByRole("textbox", { name: "수집 방식 차이(채널 효과) 기타 내용" }),
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
    expect(screen.getByRole("textbox", { name: /^라벨러 수/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Krippendorff의 알파" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^일치도 값/ })).toBeInTheDocument();
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

    expect(screen.getByText("2 이상의 정수를 넣으세요.")).toBeInTheDocument();
    expect(screen.getByText("-1~1 사이의 숫자를 넣으세요.")).toBeInTheDocument();
  });

  it("라벨러 수와 맞지 않는 종류를 고르면 이유를 적는다", () => {
    renderForm("groundTruth", {
      values: {
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "2" },
        labelAgreementKind: { text: "Fleiss' kappa" },
      },
    });

    expect(screen.getByText(/Fleiss의 카파는 세 명 이상일 때 씁니다/)).toBeInTheDocument();
  });
});

describe("수집 기간", () => {
  it("시작 월·끝 월 두 칸이다", () => {
    renderForm("testData");

    expect(screen.getByLabelText("시작 월")).toHaveAttribute("type", "month");
    expect(screen.getByLabelText("끝 월")).toHaveAttribute("type", "month");
  });

  it("틀린 기간은 다음을 누르기 전에 바로 알린다", () => {
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

    expect(screen.getByText("시작 월과 끝 월을 모두 넣고, 시작 월이 끝 월보다 늦지 않게 하세요.")).toBeInTheDocument();
    expect(screen.getByLabelText("시작 월")).toHaveValue("2025-03");
  });
});

describe("덧붙이는 글", () => {
  it("전처리 일치 칸은 선택지와 함께 글을 받는다 (서술 설계 D26)", async () => {
    const { onChange } = renderForm("trainingData", { values: { preprocessingMatch: { text: "Different" } } });

    await userEvent.type(screen.getByRole("textbox", { name: "학습과 같은 전처리 덧붙이는 글" }), "Y");

    expect(onChange).toHaveBeenLastCalledWith("preprocessingMatch", {
      text: "Different",
      note: "Y",
      unknown: false,
    });
  });

  it("글을 받지 않는 칸에는 글칸이 없다", () => {
    renderForm("testData");
    expect(screen.queryByRole("textbox", { name: "학습 데이터와 출처 관계 덧붙이는 글" })).not.toBeInTheDocument();
  });
});

describe("[B6②] 하이퍼파라미터 줄 — 이름과 값 둘 다", () => {
  const values: ComposerValueMap = {
    algorithm: { text: "XGBoost" },
    hyperparameters: { entries: [{ key: "", value: "6" }] },
  };

  it("다음을 누르기 전에는 칸 아래 안내가 없고, 하단 한 줄이 이유를 말한다", () => {
    renderForm("modelEnv", { values, picks: ["algorithm", "hyperparameters"] });
    expect(screen.queryByText("이름과 값을 모두 적어 주세요.")).not.toBeInTheDocument();

    const issues = getCardIssues(getCard("modelEnv"), "binary", values, true, ["algorithm", "hyperparameters"]);
    render(<RemainingNotice issues={issues} />);
    expect(screen.getByText("하이퍼파라미터: 이름과 값을 모두 적어 주세요.")).toBeInTheDocument();
  });

  it("다음을 누른 뒤에는 칸 아래 안내와 빈 쪽 칸의 오류 표시", () => {
    const card = getCard("modelEnv");
    const picks = ["algorithm", "hyperparameters"];
    render(
      <ComposerCardForm
        card={card}
        taskType="binary"
        values={values}
        onChange={vi.fn()}
        issues={getCardIssues(card, "binary", values, true, picks)}
        picks={picks}
        showErrors
      />,
    );
    expect(screen.getByText("이름과 값을 모두 적어 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "하이퍼파라미터 이름 1" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "하이퍼파라미터 값 1" })).not.toHaveAttribute("aria-invalid");
  });
});
