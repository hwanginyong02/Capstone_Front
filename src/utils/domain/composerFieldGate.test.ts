/**
 * 켠 카드의 필수 입력 점검.
 *
 * 문서가 못박은 규칙 셋을 고정한다(docs/COMPOSER_COMPONENTS.md "구분 규칙" + 열린 결정):
 * 카드를 끄면 검사하지 않는다 · 켰으면 비운 채 진행할 수 없다 · 모르면 "모름"을 고른다.
 * 그리고 "알려진 것 없음"이 "모름"과 **다르게** 다뤄지는지도 본다.
 */
import { describe, expect, it } from "vitest";

import {
  getCardIssues,
  hasValue,
  isCardComplete,
  isFieldRequired,
  isFieldVisible,
} from "./composerFieldGate";
import { getCard, getCardFields } from "../../data/reportComposer";
import type { ComposerValueMap } from "../../types/reportComposer.types";

const 정답라벨 = getCard("groundTruth");
const 학습데이터 = getCard("trainingData");
const 모델환경 = getCard("modelEnv");
const 평가관점 = getCard("perspective");

/** 카드의 필수 필드를 전부 채운 값 맵을 만든다. */
function fill(cardId: Parameters<typeof getCard>[0], taskType: "binary" = "binary"): ComposerValueMap {
  const values: ComposerValueMap = {};
  for (const field of getCardFields(cardId, taskType)) {
    if (field.kind !== "required") continue;
    if (field.input === "multi") values[field.id] = { choices: [field.choices![1]] };
    else if (field.input === "entries") {
      values[field.id] = field.entryKeys
        ? { entries: field.entryKeys.map((key) => ({ key, value: "1" })) }
        : { entries: [{ key: "a", value: "1" }] };
    } else values[field.id] = { text: "채움" };
  }
  return values;
}

describe("카드를 끄면 검사하지 않는다", () => {
  it("빈 값이어도 문제가 없다", () => {
    expect(getCardIssues(정답라벨, "binary", {}, false)).toEqual([]);
    expect(isCardComplete(정답라벨, "binary", {}, false)).toBe(true);
  });

  it("카드를 켜면 같은 값이 문제가 된다", () => {
    // 끄는 것은 허용된 선택이고, 켜는 순간 안의 필수 항목이 살아난다.
    expect(isCardComplete(정답라벨, "binary", {}, true)).toBe(false);
  });
});

describe("켠 카드의 필수 필드", () => {
  it("비어 있으면 막는다", () => {
    const issues = getCardIssues(정답라벨, "binary", {}, true);
    expect(issues.map((i) => i.fieldId)).toEqual(["labelAuthor", "labelReview"]);
    expect(issues.every((i) => i.reason === "missing")).toBe(true);
  });

  it("다 채우면 통과한다", () => {
    expect(isCardComplete(정답라벨, "binary", fill("groundTruth"), true)).toBe(true);
  });

  it("공백만 넣은 것은 채운 것이 아니다", () => {
    const values: ComposerValueMap = { labelAuthor: { text: "   " }, labelReview: { text: "1인 검수" } };
    expect(getCardIssues(정답라벨, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "labelAuthor",
    ]);
  });

  it("선택 필드는 비어도 막지 않는다", () => {
    // ⑦ 의 수집 기간은 더보기에 있는 선택 항목이다.
    const values: ComposerValueMap = {
      testDataSource: { text: "2025년 1분기" },
      testSourceRelation: { text: "같음" },
    };
    expect(isCardComplete(getCard("testData"), "binary", values, true)).toBe(true);
  });
});

describe('"모름"은 진행을 막지 않는다', () => {
  it("모름을 고르면 채운 것으로 센다", () => {
    const values: ComposerValueMap = {
      labelAuthor: { unknown: true },
      labelReview: { unknown: true },
    };
    expect(isCardComplete(정답라벨, "binary", values, true)).toBe(true);
  });

  it("텍스트 필드도 모름으로 넘어간다", () => {
    // ⑨ 알고리즘·실행 환경처럼 자유 입력인 필수 필드의 탈출구다.
    const values: ComposerValueMap = {
      algorithm: { unknown: true },
      hyperparameters: { unknown: true },
      runtimeEnv: { unknown: true },
      gpuUsage: { unknown: true },
    };
    expect(isCardComplete(모델환경, "binary", values, true)).toBe(true);
  });
});

describe('"알려진 것 없음"은 "모름"과 다르다', () => {
  const base = fill("trainingData");

  it("단독으로 고르면 제공된 것으로 센다", () => {
    const values = { ...base, channelEffects: { choices: ["None known"] } };
    expect(isCardComplete(학습데이터, "binary", values, true)).toBe(true);
  });

  it("다른 선택지와 함께 고를 수 없다", () => {
    const values = { ...base, channelEffects: { choices: ["None known", "Different equipment"] } };
    const issues = getCardIssues(학습데이터, "binary", values, true);
    expect(issues).toEqual([
      {
        cardId: "trainingData",
        fieldId: "channelEffects",
        label: "Collection differences",
        reason: "exclusive",
        // 이 필드의 탈출구는 "모름" 이 아니라 "알려진 것 없음" 이다.
        allowsUnknown: false,
      },
    ]);
  });

  it("다른 선택지끼리는 여럿 고를 수 있다", () => {
    const values = { ...base, channelEffects: { choices: ["장비 차이", "수집자 차이"] } };
    expect(isCardComplete(학습데이터, "binary", values, true)).toBe(true);
  });

  it("아무것도 안 고르면 막는다", () => {
    const values = { ...base, channelEffects: { choices: [] } };
    expect(getCardIssues(학습데이터, "binary", values, true).map((i) => i.reason)).toEqual([
      "missing",
    ]);
  });
});

describe("조건부 필드", () => {
  it("조건이 성립할 때만 필수가 된다", () => {
    const 일치율 = 정답라벨.fields.find((f) => f.id === "labelAgreement")!;

    expect(isFieldRequired(일치율, { labelReview: { text: "1인 검수" } })).toBe(false);
    expect(isFieldRequired(일치율, { labelReview: { text: "Several reviewers" } })).toBe(true);
  });

  it("복수 교차 검수를 고르면 인원·일치율을 요구한다", () => {
    const values: ComposerValueMap = {
      labelAuthor: { text: "Domain experts" },
      labelReview: { text: "Several reviewers" },
    };
    expect(getCardIssues(정답라벨, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "labelAgreement",
    ]);

    values.labelAgreement = { text: "3명 · 82%" };
    expect(isCardComplete(정답라벨, "binary", values, true)).toBe(true);
  });

  it("조건을 기계가 읽을 수 없는 필드는 여기서 강제하지 않는다", () => {
    // ② 의 β 는 지표 선택에 달려 있다 — 그 조건을 아는 지표 선택 화면이 검사한다.
    const beta = getCard("metrics").fields.find((f) => f.id === "beta")!;
    expect(isFieldRequired(beta, {})).toBe(false);
  });
});

describe("칸이 정해진 입력", () => {
  it("⑨ GPU 사용 여부는 학습·추론을 모두 골라야 한다", () => {
    const gpu = 모델환경.fields.find((f) => f.id === "gpuUsage")!;

    expect(hasValue(gpu, { entries: [{ key: "Training", value: "Yes" }] })).toBe(false);
    expect(
      hasValue(gpu, { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "No" }] }),
    ).toBe(true);
  });

  it("⑥ 데이터 양은 학습·검증을 모두 채워야 한다", () => {
    const volume = 학습데이터.fields.find((f) => f.id === "trainingVolume")!;

    expect(hasValue(volume, { entries: [{ key: "Training", value: "12000" }] })).toBe(false);
    expect(
      hasValue(volume, { entries: [{ key: "Training", value: "12000" }, { key: "Validation", value: "3000" }] }),
    ).toBe(true);
  });

  it("줄을 추가하는 입력은 한 줄만 채워도 된다", () => {
    // ⑨ 하이퍼파라미터는 몇 줄이 필요한지 미리 알 수 없다.
    const hyper = 모델환경.fields.find((f) => f.id === "hyperparameters")!;

    expect(hasValue(hyper, { entries: [] })).toBe(false);
    expect(hasValue(hyper, { entries: [{ key: "max_depth", value: "6" }] })).toBe(true);
  });

  it("빈 값만 있는 줄은 채운 것이 아니다", () => {
    const hyper = 모델환경.fields.find((f) => f.id === "hyperparameters")!;
    expect(hasValue(hyper, { entries: [{ key: "max_depth", value: "  " }] })).toBe(false);
  });
});

describe("⑤ 평가 관점은 유형에 따라 다른 필드를 요구한다", () => {
  it("이진은 중요 오류 유형과 사용 방식", () => {
    expect(getCardIssues(평가관점, "binary", {}, true).map((i) => i.fieldId)).toEqual([
      "criticalErrorType",
      "usageMode",
    ]);
  });

  it("다중 클래스는 클래스 중요도와 사용 방식", () => {
    expect(getCardIssues(평가관점, "multiclass", {}, true).map((i) => i.fieldId)).toEqual([
      "classPriority",
      "usageMode",
    ]);
  });

  it("이진에서 클래스 중요도를 채워도 중요 오류 유형을 대신하지 못한다", () => {
    const values: ComposerValueMap = { classPriority: { text: "모두 동등" }, usageMode: { text: "일괄 처리" } };
    expect(getCardIssues(평가관점, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "criticalErrorType",
    ]);
  });
});

describe("조건부 필드는 조건이 성립할 때만 나타난다", () => {
  const 일치율 = 정답라벨.fields.find((f) => f.id === "labelAgreement")!;

  it("조건 전에는 그리지 않는다", () => {
    // 조건이 성립하기 전에 보여주면 왜 비어 있는 칸이 있는지 알 수 없다.
    expect(isFieldVisible(일치율, {})).toBe(false);
    expect(isFieldVisible(일치율, { labelReview: { text: "1인 검수" } })).toBe(false);
  });

  it("조건이 성립하면 그린다", () => {
    expect(isFieldVisible(일치율, { labelReview: { text: "Several reviewers" } })).toBe(true);
  });

  it("필수·선택 필드는 늘 그린다", () => {
    for (const field of getCardFields("groundTruth", "binary")) {
      if (field.kind !== "conditional") expect(isFieldVisible(field, {}), field.id).toBe(true);
    }
  });

  it("조건을 기계가 읽을 수 없는 필드는 늘 그린다", () => {
    // ② 의 β 는 지표 선택에 달려 있어 그 조건을 아는 화면이 따로 다룬다.
    const beta = getCard("metrics").fields.find((f) => f.id === "beta")!;
    expect(isFieldVisible(beta, {})).toBe(true);
  });
});
