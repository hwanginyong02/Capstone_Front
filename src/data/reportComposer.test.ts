/**
 * 재료 레지스트리가 `docs/COMPOSER_COMPONENTS.md` 와 어긋나지 않는지 고정한다.
 *
 * 이 레지스트리는 구성 화면·단계 목록·필수 입력 점검이 모두 읽는 단일 출처라, 여기가
 * 어긋나면 세 곳이 함께 어긋난다. 그래서 문서가 숫자로 못박은 것(카드 9개, 필수 5·선택 4,
 * ⑤의 질문 2개, ⑥의 더보기 2개, 지표 15·13·11개)을 그대로 검사한다.
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
    expect(beta?.conditionLabel).toBe("Fβ 선택 시");
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
  it("더보기로 접히는 필드가 2개다 (수집 기간 · 전처리 여부)", () => {
    expect(countAdvancedFields("trainingData", "binary")).toBe(2);
    const advanced = getCard("trainingData")
      .fields.filter((field) => field.advanced)
      .map((field) => field.id);
    expect(advanced).toEqual(["trainingPeriod", "preprocessing"]);
  });

  it("더보기를 접으면 보이는 필드에서 빠진다", () => {
    const shown = getCardFields("trainingData", "binary", { includeAdvanced: false });
    const all = getCardFields("trainingData", "binary");
    expect(all.length - shown.length).toBe(2);
    expect(shown.every((field) => !field.advanced)).toBe(true);
  });

  it("수집 환경 차이는 복수 선택이고 \"알려진 것 없음\"이 배타 선택지다", () => {
    const field = getCard("trainingData").fields.find((item) => item.id === "channelEffects");
    expect(field?.input).toBe("multi");
    expect(field?.exclusiveChoice).toBe("알려진 것 없음");
    expect(field?.choices).toContain("알려진 것 없음");
    expect(field?.choices).toContain("기타(직접 입력)");
  });

  it("클래스별 데이터 양은 업로드한 클래스 목록으로 칸을 만든다", () => {
    const field = getCard("trainingData").fields.find(
      (item) => item.id === "trainingClassVolume",
    );
    expect(field?.input).toBe("entries");
    expect(field?.entryKeysFrom).toBe("classes");
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
    expect(channelEffects?.exclusiveChoice).toBe("알려진 것 없음");
    expect(channelEffects?.allowsUnknown).toBeUndefined();
    expect(channelEffects?.choices).not.toContain("모름");
  });
});

describe("프리셋과 요약", () => {
  it("기본값은 프리셋 \"전체\" 다", () => {
    expect(matchPreset(DEFAULT_COMPOSER_SELECTION)).toBe("full");
    expect(countOptionalOn(DEFAULT_COMPOSER_SELECTION)).toBe(4);
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
