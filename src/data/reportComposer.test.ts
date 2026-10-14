/**
 * 재료 레지스트리가 `docs/COMPOSER_COMPONENTS.md` 와 어긋나지 않는지 고정한다.
 *
 * 이 레지스트리는 구성 화면·단계 목록·필수 입력 점검이 모두 읽는 단일 출처라, 여기가
 * 어긋나면 세 곳이 함께 어긋난다. 그래서 문서가 숫자로 못박은 것(카드 9개, 필수 5·선택 4,
 * ⑤의 질문 2개, ⑥의 더보기 3개, ⑦의 더보기 1개, 지표 15·13·11개)을 그대로 검사한다.
 *
 * 지표 개수는 SPEC.md §1~§3 과의 **교차 검증**이다 — 레지스트리가 목록을 따로 들지 않고
 * `getAvailableMetrics` 에 넘기는지 확인하는 것이기도 하다.
 */
import { describe, expect, it } from "vitest";

import {
  COMPOSER_CARDS,
  OPTIONAL_CARD_IDS,
  REQUIRED_CARD_IDS,
  countAdvancedFields,
  countOptionalOn,
  getCard,
  getCardFields,
  getSelectableMetrics,
  getVisibleCards,
  isStandardReportingField,
  matchPreset,
  presetSelection,
} from "./reportComposer";
import { DEFAULT_COMPOSER_SELECTION } from "../types/reportComposer.types";
import type { TaskType } from "./evaluationData";

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("카드 구성", () => {
  it("카드는 9개, 필수 5개와 선택 4개다", () => {
    expect(COMPOSER_CARDS).toHaveLength(9);
    expect(REQUIRED_CARD_IDS).toHaveLength(5);
    expect(OPTIONAL_CARD_IDS).toHaveLength(4);
  });

  it("필수 카드는 ①~⑤, 선택 카드는 ⑥~⑨ 순서다", () => {
    expect(COMPOSER_CARDS.map((card) => card.number)).toEqual([
      "①",
      "②",
      "③",
      "④",
      "⑤",
      "⑥",
      "⑦",
      "⑧",
      "⑨",
    ]);
    // 앞 5개가 잠겨 있고 뒤 4개가 열려 있다 — 줄이 둘로 나뉘는 근거다.
    expect(COMPOSER_CARDS.map((card) => card.locked)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("선택 카드는 ⑥ 학습 데이터 · ⑦ 테스트 데이터 · ⑧ 정답 라벨 · ⑨ 모델 설정과 실행 환경이다", () => {
    expect(OPTIONAL_CARD_IDS).toEqual(["trainingData", "testData", "groundTruth", "modelEnv"]);
  });

  it("카드 id 와 번호는 유일하다", () => {
    expect(new Set(COMPOSER_CARDS.map((card) => card.id)).size).toBe(9);
    expect(new Set(COMPOSER_CARDS.map((card) => card.number)).size).toBe(9);
  });

  it("카드 9개 모두 전 유형에 적용된다", () => {
    for (const taskType of TASK_TYPES) {
      expect(getVisibleCards(taskType)).toHaveLength(9);
    }
  });

  it("보기 버튼은 ① 예시 파일과 ② 지표 목록 둘뿐이다", () => {
    const withViewer = COMPOSER_CARDS.filter((card) => card.viewer);
    expect(withViewer.map((card) => [card.id, card.viewer])).toEqual([
      ["evalData", "csvExample"],
      ["metrics", "metricList"],
    ]);
  });
});

describe("필드 스키마", () => {
  const allFields = COMPOSER_CARDS.flatMap((card) => card.fields);

  it("필드 id 는 레지스트리 전역에서 유일하다", () => {
    // 스토어 값 맵의 키가 되므로 겹치면 다른 카드의 입력을 덮어쓴다.
    expect(new Set(allFields.map((field) => field.id)).size).toBe(allFields.length);
  });

  it("모든 필드가 이름과 입력 예시를 갖는다", () => {
    for (const field of allFields) {
      expect(field.label.trim(), field.id).not.toBe("");
      expect(field.inputExample.trim(), field.id).not.toBe("");
    }
  });

  it("조건부 필드는 조건 문구를 갖는다", () => {
    const conditional = allFields.filter((field) => field.kind === "conditional");
    expect(conditional.length).toBeGreaterThan(0);
    for (const field of conditional) {
      expect(field.conditionLabel?.trim(), field.id).toBeTruthy();
    }
  });

  it("조건 문구는 조건부 필드에만 있다", () => {
    for (const field of allFields) {
      if (field.kind !== "conditional") expect(field.conditionLabel, field.id).toBeUndefined();
    }
  });

  it("필드의 단계는 그 카드의 단계 중 하나다", () => {
    // 한 카드가 두 단계로 나뉘는 경우(①, ④)에만 쓰는 값이다.
    for (const card of COMPOSER_CARDS) {
      for (const field of card.fields) {
        if (field.step) expect(card.steps, `${card.id}.${field.id}`).toContain(field.step);
      }
    }
  });

  it("선택지는 single·multi·entries 필드만 갖는다", () => {
    for (const field of allFields) {
      if (!field.choices) continue;
      expect(["single", "multi", "entries"], field.id).toContain(field.input);
      expect(field.choices.length, field.id).toBeGreaterThan(1);
    }
  });
});

describe("⑤ 평가 관점 — 유형에 따라 다르지만 항상 두 개", () => {
  it.each(TASK_TYPES)("%s 는 질문 두 개를 받는다", (taskType) => {
    expect(getCardFields("perspective", taskType)).toHaveLength(2);
  });

  it("이진은 중요 오류 유형과 사용 방식을 묻는다", () => {
    expect(getCardFields("perspective", "binary").map((field) => field.id)).toEqual([
      "criticalErrorType",
      "usageMode",
    ]);
  });

  it("다중 클래스·멀티레이블은 클래스 중요도와 사용 방식을 묻는다", () => {
    for (const taskType of ["multiclass", "multilabel"] as TaskType[]) {
      expect(getCardFields("perspective", taskType).map((field) => field.id)).toEqual([
        "classPriority",
        "usageMode",
      ]);
    }
  });

  it("세 질문 모두 TS 4213 근거 조항을 갖는다", () => {
    // 근거 조항과 점검 대상이 없는 질문은 평가 관점이 아니라 일반 입력 필드다.
    for (const field of getCard("perspective").fields) {
      expect(field.standardClause, field.id).toBeTruthy();
    }
  });
});

describe("② 지표와 합격 기준", () => {
  it("지표 선택 이유는 멀티레이블에서만 묻는다", () => {
    expect(getCardFields("metrics", "multilabel").map((field) => field.id)).toContain(
      "metricRationale",
    );
    for (const taskType of ["binary", "multiclass"] as TaskType[]) {
      expect(getCardFields("metrics", taskType).map((field) => field.id)).not.toContain(
        "metricRationale",
      );
    }
  });

  it("β 는 Fβ 를 고를 때만 받는 조건부 필드다", () => {
    const beta = getCard("metrics").fields.find((field) => field.id === "beta");
    expect(beta?.kind).toBe("conditional");
    expect(beta?.conditionLabel).toBe("When Fβ is chosen");
  });

  it("고를 수 있는 지표 수가 SPEC 과 같다 (이진 15 · 다중 클래스 13 · 멀티레이블 11)", () => {
    expect(getSelectableMetrics("binary")).toHaveLength(15);
    expect(getSelectableMetrics("multiclass")).toHaveLength(13);
    expect(getSelectableMetrics("multilabel")).toHaveLength(11);
  });

  it("멀티레이블에서는 M1·M11·M12·M13 을 고를 수 없다", () => {
    // 값이 다른 지표와 완전히 같기 때문이다(SPEC.md §3 규칙 6).
    const ids = getSelectableMetrics("multilabel").map((metric) => metric.id);
    for (const id of ["M1", "M11", "M12", "M13"]) expect(ids).not.toContain(id);
  });
});

describe("⑥ 학습 데이터", () => {
  it("더보기로 접히는 필드가 3개다 (수집 기간 · 데이터 형식 · 비고)", () => {
    expect(countAdvancedFields("trainingData", "binary")).toBe(3);
    const advanced = getCard("trainingData")
      .fields.filter((field) => field.advanced)
      .map((field) => field.id);
    expect(advanced).toEqual(["trainingPeriod", "trainingDataFormat", "trainingNotes"]);
  });

  it("학습 데이터 설명은 접지 않는다 — 접어 두었더니 칸이 없는 것으로 보였다", () => {
    const shown = getCardFields("trainingData", "binary", { includeAdvanced: false });
    expect(shown.map((field) => field.id)).toContain("trainingDescription");
  });

  it("Details 의 학습 데이터 폼을 흡수했다 — 이름·건수·클래스별 양·형식이 모두 여기 있다", () => {
    const ids = getCard("trainingData").fields.map((field) => field.id);
    for (const id of [
      "trainingDatasetName",
      "trainingVolume",
      "trainingClassVolume",
      "trainingDataFormat",
    ]) {
      expect(ids).toContain(id);
    }
    // 기존 저장소로 흘려보내지 않는다 — 성적서가 카드 값을 직접 읽는다.
    expect(getCard("trainingData").fields.some((field) => field.legacy)).toBe(false);
  });

  it("더보기를 접으면 보이는 필드에서 빠진다", () => {
    const shown = getCardFields("trainingData", "binary", { includeAdvanced: false });
    const all = getCardFields("trainingData", "binary");
    expect(all.length - shown.length).toBe(3);
    expect(shown.every((field) => !field.advanced)).toBe(true);
  });

  it("수집 환경 차이는 복수 선택이고 \"알려진 것 없음\"이 배타 선택지다", () => {
    const field = getCard("trainingData").fields.find((item) => item.id === "channelEffects");
    expect(field?.input).toBe("multi");
    expect(field?.exclusiveChoice).toBe("None known");
    expect(field?.choices).toContain("None known");
    expect(field?.choices).toContain("Other (free text)");
  });

  it("클래스별 데이터 양은 업로드한 클래스 목록으로 칸을 만든다", () => {
    const field = getCard("trainingData").fields.find(
      (item) => item.id === "trainingClassVolume",
    );
    expect(field?.input).toBe("entries");
    expect(field?.entryKeysFrom).toBe("classes");
  });
});

describe("⑦ 테스트 데이터", () => {
  it("더보기로 접히는 필드는 수집 기간 하나다", () => {
    expect(countAdvancedFields("testData", "binary")).toBe(1);
    const advanced = getCard("testData")
      .fields.filter((field) => field.advanced)
      .map((field) => field.id);
    expect(advanced).toEqual(["testPeriod"]);
  });

  /**
   * 전처리 자유서술 세 칸(⑥ 1개, ⑦ 2개)을 "학습과 같은 전처리인가" 한 칸으로 바꿨다(서술 설계
   * D44). TS 4213 5.3.3 은 전처리 보고를 요구하지 않아 2층 근거가 없다.
   */
  it("전처리는 같음 / 다름 / 모름 한 칸이고 글을 덧붙일 수 있다", () => {
    const field = getCard("testData").fields.find((item) => item.id === "preprocessingMatch");
    expect(field?.input).toBe("single");
    expect(field?.choices).toEqual(["Same", "Different", "Unknown"]);
    expect(field?.allowsNote).toBe(true);
    expect(field?.kind).toBe("optional");
  });

  it("옛 전처리 칸 세 개는 없다", () => {
    const ids = COMPOSER_CARDS.flatMap((card) => card.fields).map((field) => field.id);
    for (const id of ["preprocessing", "testPreprocessing", "testPreprocessingDetail"]) {
      expect(ids).not.toContain(id);
    }
  });
});

describe("필수 (표준 보고) 유도", () => {
  it("선택 카드의 필수 필드가 표준 보고 항목이다", () => {
    for (const id of OPTIONAL_CARD_IDS) {
      const card = getCard(id);
      const standard = card.fields.filter((field) => isStandardReportingField(card, field));
      expect(standard.length, id).toBeGreaterThan(0);
      expect(standard.every((field) => field.kind === "required")).toBe(true);
    }
  });

  it("필수 카드의 필드는 표준 보고 항목이 아니다", () => {
    // 필수 카드는 끌 수 없어 "제공되지 않음"이 될 수 없다.
    for (const id of REQUIRED_CARD_IDS) {
      const card = getCard(id);
      expect(card.fields.some((field) => isStandardReportingField(card, field)), id).toBe(false);
    }
  });

  it("표준 보고 항목은 모를 때 빠져나갈 길이 있다", () => {
    /**
     * 켠 카드의 표준 보고 필드는 비운 채로 진행할 수 없다(열린 결정). 그래서 모를 때
     * 고를 것이 반드시 있어야 한다 — 보통은 "모름"이고, ⑥ 수집 환경 차이만
     * "알려진 것 없음"이다. 둘의 뜻은 다르다: "모름"은 성적서에 "제공되지 않음"으로
     * 찍히고, "알려진 것 없음"은 원문이 요구하는 답이라 **제공된 것으로 센다**.
     */
    for (const id of OPTIONAL_CARD_IDS) {
      const card = getCard(id);
      for (const field of card.fields) {
        if (!isStandardReportingField(card, field)) continue;
        const hasWayOut = Boolean(field.allowsUnknown || field.exclusiveChoice);
        expect(hasWayOut, `${card.id}.${field.id}`).toBe(true);
      }
    }
  });

  it("\"알려진 것 없음\"으로 답하는 필드는 \"모름\"을 두지 않는다", () => {
    // 같은 칸에 둘을 함께 두면 "제공됨"과 "제공되지 않음"을 사용자가 구별해 골라야 한다.
    const channelEffects = getCard("trainingData").fields.find(
      (field) => field.id === "channelEffects",
    );
    expect(channelEffects?.exclusiveChoice).toBe("None known");
    expect(channelEffects?.allowsUnknown).toBeUndefined();
    expect(channelEffects?.choices).not.toContain("모름");
  });
});

describe("프리셋과 요약", () => {
  it("기본값은 프리셋 \"최소 구성\" 이다", () => {
    // 보지도 않은 카드의 필수 입력을 떠안은 채 시작하지 않는다.
    expect(matchPreset(DEFAULT_COMPOSER_SELECTION)).toBe("minimal");
    expect(countOptionalOn(DEFAULT_COMPOSER_SELECTION)).toBe(0);
  });

  it("최소 구성은 선택 카드를 모두 끈다", () => {
    const selection = presetSelection("minimal");
    expect(countOptionalOn(selection)).toBe(0);
    expect(matchPreset(selection)).toBe("minimal");
  });

  it("전체는 선택 카드를 모두 켠다", () => {
    const selection = presetSelection("full");
    expect(countOptionalOn(selection)).toBe(4);
    expect(matchPreset(selection)).toBe("full");
  });

  it("일부만 켜면 어느 프리셋과도 같지 않다", () => {
    const selection = { ...presetSelection("full"), modelEnv: false };
    expect(countOptionalOn(selection)).toBe(3);
    expect(matchPreset(selection)).toBeNull();
  });
});

/**
 * 재료 목록과 형태를 맞춘 필드(2026-10-06 입력 화면 점검).
 *
 * 화면이 없던 것 셋(핵심 지표·지표 선택 이유·학습 데이터 설명/비고)과 받는 형태가 문서와
 * 달랐던 것 다섯(편향 감소 노력·라벨 구축 방법·라벨러 수/일치도·채널 효과·수집 기간)이다.
 */
describe("재료 목록과 맞춘 형태", () => {
  const fieldOf = (cardId: Parameters<typeof getCard>[0], fieldId: string) =>
    getCard(cardId).fields.find((field) => field.id === fieldId);

  it("Other 선택지는 언제나 그 필드의 선택지 중 하나다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      if (field.otherChoice) expect(field.choices, field.id).toContain(field.otherChoice);
    }
  });

  it("② 지표 선택 이유에 직접 적는 Other 가 있고, 지표 화면에서 받는다", () => {
    const field = fieldOf("metrics", "metricRationale");
    expect(field?.otherChoice).toBe("Other (own words)");
    expect(field?.step).toBe("metrics");
  });

  it("② 핵심 지표는 Details 에서 고르고, 최소 1개가 필수다 (재료 목록 7절)", () => {
    const field = fieldOf("metrics", "coreMetrics");
    expect(field?.kind).toBe("required");
    expect(field?.step).toBe("clientInfo");
  });

  it("⑥ 편향 감소 노력은 여럿 고르고, 'Did nothing' 은 배타, Other 는 직접 적는다", () => {
    const field = fieldOf("trainingData", "imbalanceHandling");
    expect(field?.input).toBe("multi");
    expect(field?.exclusiveChoice).toBe("Did nothing");
    expect(field?.otherChoice).toBe("Other (free text)");
    expect(field?.allowsUnknown).toBe(true);
  });

  it("⑥ 채널 효과의 Other 는 직접 적는다", () => {
    expect(fieldOf("trainingData", "channelEffects")?.otherChoice).toBe("Other (free text)");
  });

  it("⑥ 학습 데이터 설명·비고가 있다", () => {
    expect(fieldOf("trainingData", "trainingDescription")?.input).toBe("textarea");
    expect(fieldOf("trainingData", "trainingNotes")?.input).toBe("textarea");
  });

  it("⑥ ⑦ 수집 기간은 시작 월·끝 월이다", () => {
    expect(fieldOf("trainingData", "trainingPeriod")?.input).toBe("monthRange");
    expect(fieldOf("testData", "testPeriod")?.input).toBe("monthRange");
  });

  it("⑧ 라벨 구축 방법은 Other 를 포함해 다섯 가지다", () => {
    const field = fieldOf("groundTruth", "labelAuthor");
    expect(field?.choices).toHaveLength(5);
    expect(field?.otherChoice).toBe("Other (free text)");
  });

  it("⑧ 라벨러 수는 1 이상의 정수다", () => {
    expect(fieldOf("groundTruth", "labelAgreement")).toBeUndefined();
    expect(fieldOf("groundTruth", "labelReviewerCount")?.numberRange).toEqual({
      min: 1,
      integer: true,
    });
  });

  /** 서술 설계 D42 — 종류를 알아야 숫자를 읽을 수 있다(같은 0.8 이라도 일치율과 카파는 다르다). */
  it("⑧ 라벨 일치도는 종류를 먼저 고르고, 범위는 종류를 따른다", () => {
    expect(fieldOf("groundTruth", "labelAgreementRate")).toBeUndefined();

    const kind = fieldOf("groundTruth", "labelAgreementKind");
    expect(kind?.choices).toEqual([
      "Percent agreement",
      "Cohen's kappa",
      "Fleiss' kappa",
      "Krippendorff's alpha",
      "Other",
      "Not measured",
    ]);
    expect(kind?.otherChoice).toBe("Other");

    const value = fieldOf("groundTruth", "labelAgreementValue");
    expect(value?.numberRangeBy?.ranges).toEqual({
      "Percent agreement": { min: 0, max: 100 },
      "Cohen's kappa": { min: -1, max: 1 },
      "Fleiss' kappa": { min: -1, max: 1 },
      "Krippendorff's alpha": { min: -1, max: 1 },
      Other: null,
    });
    // "측정 안 함"이면 값 칸이 없다.
    const conditions = Array.isArray(value?.requiredWhen) ? value.requiredWhen : [];
    expect(conditions.some((c) => c.in?.includes("Not measured"))).toBe(false);
  });

  it("⑧ Cohen의 카파는 라벨러 2명, Fleiss의 카파는 3명 이상에만 고를 수 있다", () => {
    const rules = fieldOf("groundTruth", "labelAgreementKind")?.choiceRequires;
    expect(rules?.["Cohen's kappa"]).toMatchObject({ field: "labelReviewerCount", max: 2 });
    expect(rules?.["Fleiss' kappa"]).toMatchObject({ field: "labelReviewerCount", min: 3 });
  });

  it("성적서 이름(reportLabels)은 그 필드의 선택지를 빠짐없이 덮는다", () => {
    for (const field of COMPOSER_CARDS.flatMap((card) => card.fields)) {
      if (!field.reportLabels) continue;
      for (const choice of field.choices ?? []) {
        expect(field.reportLabels[choice], `${field.id}: ${choice}`).toBeTruthy();
      }
    }
  });
});
