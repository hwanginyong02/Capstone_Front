/**
 * 넣은 카드의 필수 입력 점검.
 *
 * 문서가 못박은 규칙을 고정한다(docs/MATERIAL_PICKER.md §5·§6, 종전 docs/COMPOSER_COMPONENTS.md
 * "구분 규칙" + 열린 결정): 넣지 않은 카드는 검사하지 않는다 · 받기로 한 필드는 비운 채 진행할
 * 수 없다 · 모르면 "모름"을 고른다.
 * 그리고 "알려진 것 없음"이 "모름"과 **다르게** 다뤄지는지도 본다.
 */
import { describe, expect, it } from "vitest";

import {
  getCardIssues,
  getFieldIssue,
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
    // 클래스마다 칸이 있는 필드는 지금 클래스 목록이 있어야 채울 수 있다 — 다른 필드를 보는 테스트라 모름으로 둔다.
    else if (field.entryKeysFrom === "classes") values[field.id] = { unknown: true };
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
        label: "수집 방식 차이(채널 효과)",
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

describe("전용 화면이 받는 필드", () => {
  it("필수여도 여기서 따지지 않는다 — 값이 카드 값 모음 밖에 있다", () => {
    const card = { ...학습데이터, fields: [{ ...학습데이터.fields[0], dedicatedScreen: true as const }] };
    expect(getFieldIssue(card, card.fields[0], {})).toBeNull();
    // 표시가 없으면 같은 빈 값이 빈칸이다.
    expect(getFieldIssue(학습데이터, 학습데이터.fields[0], {})?.reason).toBe("missing");
  });
});

describe("조건부 필드", () => {
  it("조건이 성립할 때만 필수가 된다", () => {
    const 일치율 = 정답라벨.fields.find((f) => f.id === "labelReviewerCount")!;

    expect(isFieldRequired(일치율, { labelReview: { text: "1인 검수" } })).toBe(false);
    expect(isFieldRequired(일치율, { labelReview: { text: "Several reviewers" } })).toBe(true);
  });

  it("복수 교차 검수를 고르면 인원·일치율을 요구한다", () => {
    const values: ComposerValueMap = {
      labelAuthor: { text: "Domain experts" },
      labelReview: { text: "Several reviewers" },
    };
    // 일치도는 종류를 먼저 묻는다. 값 칸은 종류를 고른 뒤에 나타난다.
    expect(getCardIssues(정답라벨, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "labelReviewerCount",
      "labelAgreementKind",
    ]);

    values.labelReviewerCount = { text: "3" };
    values.labelAgreementKind = { text: "Fleiss' kappa" };
    expect(getCardIssues(정답라벨, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "labelAgreementValue",
    ]);

    values.labelAgreementValue = { text: "0.71" };
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
  const 일치율 = 정답라벨.fields.find((f) => f.id === "labelReviewerCount")!;

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

/**
 * "Other" — 고르면 무엇인지 적어야 답한 것이다.
 *
 * 종전에는 ⑥ 수집 환경 차이에 "Other (free text)" 선택지만 있고 적을 칸이 없었다. 고르기만
 * 하고 넘어가면 성적서에는 "기타"라는 말만 남는다.
 */
describe("Other 선택지", () => {
  const base = fill("trainingData");

  it("여럿 고르기에서 Other 를 고르고 비워 두면 막는다", () => {
    const values = { ...base, channelEffects: { choices: ["Different equipment", "Other (free text)"] } };
    expect(getCardIssues(학습데이터, "binary", values, true).map((i) => [i.fieldId, i.reason])).toEqual([
      ["channelEffects", "missing"],
    ]);
  });

  it("내용을 적으면 통과한다", () => {
    const values = {
      ...base,
      channelEffects: { choices: ["Other (free text)"], otherText: "Two hospitals, two scanners" },
    };
    expect(isCardComplete(학습데이터, "binary", values, true)).toBe(true);
  });

  it("하나 고르기에서도 같다 — ⑧ 라벨 작성 주체", () => {
    const values: ComposerValueMap = {
      labelAuthor: { text: "Other (free text)", otherText: "  " },
      labelReview: { text: "No review" },
    };
    expect(getCardIssues(정답라벨, "binary", values, true).map((i) => i.fieldId)).toEqual([
      "labelAuthor",
    ]);

    values.labelAuthor = { text: "Other (free text)", otherText: "Partner clinic staff" };
    expect(isCardComplete(정답라벨, "binary", values, true)).toBe(true);
  });

  it("Other 를 고르지 않았으면 남은 글은 따지지 않는다", () => {
    const values: ComposerValueMap = {
      labelAuthor: { text: "Domain experts", otherText: "" },
      labelReview: { text: "No review" },
    };
    expect(isCardComplete(정답라벨, "binary", values, true)).toBe(true);
  });
});

describe("⑥ 편향 감소 노력", () => {
  const base = fill("trainingData");

  it("여럿 고를 수 있다", () => {
    const values = {
      ...base,
      imbalanceHandling: { choices: ["Balanced the counts", "Widened the sources"] },
    };
    expect(isCardComplete(학습데이터, "binary", values, true)).toBe(true);
  });

  it('"Did nothing" 은 다른 노력과 함께 고를 수 없다', () => {
    const values = {
      ...base,
      imbalanceHandling: { choices: ["Did nothing", "Balanced the counts"] },
    };
    expect(getCardIssues(학습데이터, "binary", values, true).map((i) => i.reason)).toEqual([
      "exclusive",
    ]);
  });
});

/**
 * 숫자 범위 — ⑧ 라벨러 수는 1 이상의 정수, 일치도는 0~100(%) 이다.
 *
 * 비어 있는 것은 필수 점검이 따로 본다. 여기서 보는 것은 **값이 있는데 틀린** 경우다.
 */
describe("숫자 범위", () => {
  // 일치도는 단순 일치율(%)로 — 0~100 범위다.
  const several = (count: string, rate: string): ComposerValueMap => ({
    labelAuthor: { text: "Domain experts" },
    labelReview: { text: "Several reviewers" },
    labelReviewerCount: { text: count },
    labelAgreementKind: { text: "Percent agreement" },
    labelAgreementValue: { text: rate },
  });
  const reasonsOf = (values: ComposerValueMap) =>
    getCardIssues(정답라벨, "binary", values, true).map((i) => [i.fieldId, i.reason]);

  it("범위 안이면 통과한다", () => {
    expect(reasonsOf(several("3", "82"))).toEqual([]);
    expect(reasonsOf(several("2", "0"))).toEqual([]);
    expect(reasonsOf(several("12", "100"))).toEqual([]);
    expect(reasonsOf(several("2", "82.5"))).toEqual([]);
  });

  it.each([
    ["0", "라벨러가 0명"],
    ["1", "라벨러가 1명 — 복수 라벨러 합의는 2명부터다(W10)"],
    ["1.5", "라벨러 수가 정수가 아님"],
    ["three", "숫자가 아님"],
  ])("라벨러 수 %s 는 범위 밖이다 (%s)", (count) => {
    expect(reasonsOf(several(count, "82"))).toEqual([["labelReviewerCount", "outOfRange"]]);
  });

  it.each(["101", "-1"])("일치도 %s 는 범위 밖이다", (rate) => {
    expect(reasonsOf(several("3", rate))).toEqual([["labelAgreementValue", "outOfRange"]]);
  });

  it("조건이 사라져 그려지지 않는 칸의 값은 따지지 않는다", () => {
    // 복수 검수를 골라 0 을 적었다가 1인 검수로 바꾼 경우 — 사용자가 고칠 칸이 화면에 없다.
    const values = { ...several("0", "500"), labelReview: { text: "One reviewer" } };
    expect(reasonsOf(values)).toEqual([]);
  });
});

/** 수집 기간 — 시작 월·끝 월 두 칸이다. 선택 항목이라 비워도 되지만, 적었다면 맞아야 한다. */
describe("수집 기간", () => {
  const 테스트데이터 = getCard("testData");
  const filled: ComposerValueMap = {
    testDataSource: { text: "Q1 logs" },
    testSourceRelation: { text: "Different source" },
  };
  const period = (from: string, to: string): ComposerValueMap => ({
    ...filled,
    testPeriod: {
      entries: [
        { key: "From", value: from },
        { key: "To", value: to },
      ],
    },
  });
  const reasonsOf = (values: ComposerValueMap) =>
    getCardIssues(테스트데이터, "binary", values, true).map((i) => [i.fieldId, i.reason]);

  it("비워 두면 막지 않는다", () => {
    expect(reasonsOf(filled)).toEqual([]);
    expect(reasonsOf(period("", ""))).toEqual([]);
  });

  it("시작이 끝보다 앞이거나 같으면 통과한다", () => {
    expect(reasonsOf(period("2025-01", "2025-03"))).toEqual([]);
    expect(reasonsOf(period("2025-01", "2025-01"))).toEqual([]);
  });

  it("한쪽만 적으면 막는다", () => {
    expect(reasonsOf(period("2025-01", ""))).toEqual([["testPeriod", "invalidPeriod"]]);
    expect(reasonsOf(period("", "2025-03"))).toEqual([["testPeriod", "invalidPeriod"]]);
  });

  it("시작이 끝보다 늦으면 막는다", () => {
    expect(reasonsOf(period("2025-03", "2024-12"))).toEqual([["testPeriod", "invalidPeriod"]]);
  });
});

/**
 * ② 는 필드마다 그리는 방식이 다르다. 지표 화면은 레지스트리로 그리는 칸(지표 선택 이유)만 이
 * 점검으로 검사한다 — 카드 전체를 검사하면 화면이 직접 그리는 합격 기준까지 여기서 걸린다.
 */
describe("필드 하나만 검사", () => {
  const 지표 = getCard("metrics");
  const 선택이유 = 지표.fields.find((f) => f.id === "metricRationale")!;

  it("비어 있으면 그 필드만 걸린다", () => {
    expect(getFieldIssue(지표, 선택이유, {})?.fieldId).toBe("metricRationale");
  });

  it("고르면 통과한다", () => {
    expect(getFieldIssue(지표, 선택이유, { metricRationale: { text: "Degree of overlap" } })).toBeNull();
  });

  it("Other 를 고르면 내용까지 적어야 한다", () => {
    expect(
      getFieldIssue(지표, 선택이유, { metricRationale: { text: "Other (own words)" } })?.reason,
    ).toBe("missing");
    expect(
      getFieldIssue(지표, 선택이유, {
        metricRationale: { text: "Other (own words)", otherText: "Matches the client's KPI" },
      }),
    ).toBeNull();
  });
});

/**
 * 라벨 일치도 — 종류를 먼저 고르고, 값의 범위는 종류를 따른다(서술 설계 D42).
 * 단순 일치율은 화면에서 % 로 받는다(0~100). 카파·알파는 −1~1. 기타는 검사하지 않는다.
 */
describe("라벨 일치도 종류와 범위", () => {
  const withKind = (kind: string, value?: string, count = "2"): ComposerValueMap => ({
    labelAuthor: { text: "Domain experts" },
    labelReview: { text: "Several reviewers" },
    labelReviewerCount: { text: count },
    labelAgreementKind: { text: kind },
    ...(value !== undefined ? { labelAgreementValue: { text: value } } : {}),
  });
  const reasonsOf = (values: ComposerValueMap) =>
    getCardIssues(정답라벨, "binary", values, true).map((i) => [i.fieldId, i.reason]);

  it("카파는 −1~1 이다 — 음수도 받는다", () => {
    expect(reasonsOf(withKind("Cohen's kappa", "-0.2"))).toEqual([]);
    expect(reasonsOf(withKind("Cohen's kappa", "1.2"))).toEqual([["labelAgreementValue", "outOfRange"]]);
  });

  it("단순 일치율은 % 로 받는다 — 82 는 범위 안이다", () => {
    expect(reasonsOf(withKind("Percent agreement", "82"))).toEqual([]);
  });

  it("기타는 범위를 검사하지 않는다 — 대신 이름을 적어야 한다", () => {
    const values = withKind("Other", "37");
    expect(reasonsOf(values)).toEqual([["labelAgreementKind", "missing"]]);
    values.labelAgreementKind = { text: "Other", otherText: "Gwet's AC1" };
    expect(reasonsOf(values)).toEqual([]);
  });

  it("측정 안 함이면 값 칸이 없고, 제공된 답으로 센다", () => {
    const values = withKind("Not measured");
    const valueField = 정답라벨.fields.find((f) => f.id === "labelAgreementValue")!;
    expect(isFieldVisible(valueField, values)).toBe(false);
    expect(reasonsOf(values)).toEqual([]);
  });

  it("라벨러가 2명이면 Fleiss의 카파를 고를 수 없다", () => {
    const issues = getCardIssues(정답라벨, "binary", withKind("Fleiss' kappa", "0.6", "2"), true);
    expect(issues.map((i) => [i.fieldId, i.reason])).toEqual([["labelAgreementKind", "incompatible"]]);
    expect(issues[0].message).toMatch(/세 명 이상/);
  });

  it("라벨러가 3명 이상이면 Cohen의 카파를 고를 수 없다", () => {
    expect(reasonsOf(withKind("Cohen's kappa", "0.6", "4"))).toEqual([
      ["labelAgreementKind", "incompatible"],
    ]);
    expect(reasonsOf(withKind("Fleiss' kappa", "0.6", "4"))).toEqual([]);
  });

  it("검수 방식을 바꾸면 일치도 칸이 함께 사라진다 — 조건이 둘 다 성립해야 한다", () => {
    const values = { ...withKind("Cohen's kappa", "5"), labelReview: { text: "One reviewer" } };
    expect(reasonsOf(values)).toEqual([]);
  });
});

describe('조건이 걸린 답에 "모름"을 체크하면', () => {
  it("그 조건으로 나타나던 칸은 필수가 아니다", () => {
    // 종전에는 "복수 검수"를 고른 뒤 모름을 체크해도 라벨러 수 칸이 계속 필수였다.
    const values: ComposerValueMap = {
      labelAuthor: { text: "Domain experts" },
      labelReview: { text: "Several reviewers", unknown: true },
    };
    expect(isCardComplete(정답라벨, "binary", values, true)).toBe(true);
  });
});

describe("덧붙이는 글", () => {
  const 전처리 = getCard("trainingData").fields.find((f) => f.id === "preprocessingMatch")!;

  it("맞는 선택지가 없으면 글만 써도 답한 것이다 (서술 설계 D26)", () => {
    expect(hasValue(전처리, { note: "Test data had extra outlier filtering" })).toBe(true);
    expect(hasValue(전처리, { note: "   " })).toBe(false);
  });

  it("글을 받지 않는 필드는 글만으로 답이 되지 않는다", () => {
    const 관계 = getCard("testData").fields.find((f) => f.id === "testSourceRelation")!;
    expect(hasValue(관계, { note: "something" })).toBe(false);
  });
});

/**
 * ⑥ 학습·검증 표본 수와 학습 클래스 분포는 건수다 — 0 이상의 정수만 받는다(재료 목록 6절).
 * 종전에는 숫자 키패드만 띄우고 검사하지 않아 글자를 넣어도 통과했다.
 */
describe("숫자 칸 묶음은 0 이상의 정수만 받는다", () => {
  const volume = 학습데이터.fields.find((f) => f.id === "trainingVolume")!;
  const classVolume = 학습데이터.fields.find((f) => f.id === "trainingClassVolume")!;
  const issueOf = (field: typeof volume, entries: Array<{ key: string; value: string }>) =>
    getFieldIssue(학습데이터, field, { [field.id]: { entries } }, undefined, ["cat"]);

  it("글자를 넣으면 걸린다", () => {
    const issue = issueOf(volume, [
      { key: "Training", value: "많음" },
      { key: "Validation", value: "3000" },
    ]);
    expect(issue?.reason).toBe("outOfRange");
    expect(issue?.message).toBe("0 이상의 정수로 적어 주세요.");
  });

  it("음수와 소수도 걸린다", () => {
    expect(issueOf(classVolume, [{ key: "cat", value: "-3" }])?.reason).toBe("outOfRange");
    expect(issueOf(classVolume, [{ key: "cat", value: "2.5" }])?.reason).toBe("outOfRange");
  });

  it("정수는 통과한다 — 천 단위 쉼표도 된다", () => {
    expect(
      issueOf(volume, [
        { key: "Training", value: "12,000" },
        { key: "Validation", value: "3000" },
      ]),
    ).toBeNull();
  });

  it("빈 칸은 숫자 검사가 아니라 필수 검사의 몫이다", () => {
    expect(issueOf(classVolume, [{ key: "cat", value: "" }])?.reason).not.toBe("outOfRange");
  });
});

describe("[B2] 조건부 칸은 조건을 정하는 칸을 받을 때만 따진다", () => {
  const field = (id: string) => 정답라벨.fields.find((item) => item.id === id)!;
  const several: ComposerValueMap = {
    labelReview: { text: "Several reviewers" },
    labelAgreementKind: { text: "Cohen's kappa" },
  };

  it("검수 방식을 받지 않으면 남은 값이 있어도 라벨러 수·일치도가 빈칸 문제가 되지 않는다", () => {
    for (const id of ["labelReviewerCount", "labelAgreementKind", "labelAgreementValue"]) {
      expect(getFieldIssue(정답라벨, field(id), several, ["labelAuthor"]), id).toBeNull();
    }
    expect(getCardIssues(정답라벨, "binary", { ...several, labelAuthor: { text: "Client" } }, true, ["labelAuthor"])).toEqual(
      [],
    );
  });

  it("검수 방식을 받으면 비어 있는 라벨러 수가 막는다 — 일치도 값은 종류를 따라 함께 나온다", () => {
    const picks = ["labelAuthor", "labelReview"];
    expect(getFieldIssue(정답라벨, field("labelReviewerCount"), several, picks)?.reason).toBe("missing");
    expect(getFieldIssue(정답라벨, field("labelAgreementValue"), several, picks)?.reason).toBe("missing");
  });

  it("picks 가 없으면(흐름을 지나기 전) 종전처럼 모두 받는다", () => {
    expect(getFieldIssue(정답라벨, field("labelReviewerCount"), several)?.reason).toBe("missing");
  });
});

/**
 * B5② · N6 — ⑥ 클래스별 데이터 양은 지금 클래스를 모두 채우거나 "모름"이어야 한다(사용자 결정 "학습 클래스
 * 분포 모두 입력(또는 모름)"). 옛 클래스 칸은 세지 않는다. 클래스 목록이 비면 "모름"만 통과한다 — 빈 목록의
 * `every` 는 참이라 빈칸이 통과하던 함정(N6).
 */
describe("[B5②·N6] 클래스별 데이터 양은 지금 클래스를 모두", () => {
  const field = 학습데이터.fields.find((f) => f.id === "trainingClassVolume")!;
  const CLASSES = ["cat", "dog", "bird"];
  const entries = (...keys: string[]) => ({ entries: keys.map((key) => ({ key, value: "10" })) });
  const issue = (value: ComposerValueMap[string], classNames: string[]) =>
    getFieldIssue(학습데이터, field, { trainingClassVolume: value }, undefined, classNames);

  it("세 클래스 중 둘만 채우면 빈칸 문제다", () => {
    expect(hasValue(field, entries("cat", "dog"), CLASSES)).toBe(false);
    expect(issue(entries("cat", "dog"), CLASSES)?.reason).toBe("missing");
  });

  it("셋 다 채우거나 '모름'이면 통과한다", () => {
    expect(issue(entries("cat", "dog", "bird"), CLASSES)).toBeNull();
    expect(issue({ ...entries("cat"), unknown: true }, CLASSES)).toBeNull();
  });

  it("옛 클래스 칸만 있으면 빈칸 문제다 — 옛 칸의 틀린 값은 고칠 수 없어 따지지 않는다", () => {
    expect(issue(entries("x", "y", "z"), CLASSES)?.reason).toBe("missing");
    const stale = { entries: [...entries("cat", "dog", "bird").entries, { key: "x", value: "많음" }] };
    expect(issue(stale, CLASSES)).toBeNull();
  });

  it("지금 클래스 칸의 틀린 값은 걸린다", () => {
    const wrong = { entries: [{ key: "cat", value: "-1" }, { key: "dog", value: "1" }, { key: "bird", value: "1" }] };
    expect(issue(wrong, CLASSES)?.reason).toBe("outOfRange");
  });

  it("[N6] 클래스 목록이 비면 채운 칸이 있어도 빈칸 문제이고 '모름'만 통과한다", () => {
    expect(hasValue(field, entries("cat"), [])).toBe(false);
    expect(issue(entries("cat"), [])?.reason).toBe("missing");
    expect(issue({ unknown: true }, [])).toBeNull();
    // 목록을 넘기지 않아도 같다(기본값 빈 목록).
    expect(hasValue(field, entries("cat"))).toBe(false);
  });

  it("카드 전체 점검도 같은 목록을 쓴다", () => {
    const values: ComposerValueMap = { ...fill("trainingData"), trainingClassVolume: entries("cat", "dog") };
    expect(getCardIssues(학습데이터, "binary", values, true, undefined, CLASSES).map((i) => i.fieldId)).toEqual([
      "trainingClassVolume",
    ]);
    values.trainingClassVolume = entries("cat", "dog", "bird");
    expect(isCardComplete(학습데이터, "binary", values, true, undefined, CLASSES)).toBe(true);
  });
});
