/**
 * 입력 순서 — 레인 순서와 레인 안 카드 순서, 그리고 깨면 놓지 못하는 순서 규칙
 * (docs/MATERIAL_PICKER.md §11).
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_COMPOSER_SELECTION, type ComposerCardId } from "../../types/reportComposer.types";
import {
  DEFAULT_CARD_ORDER,
  includedCardsInOrder,
  laneCards,
  laneOrder,
  moveCard,
  moveLane,
  normalizeCardOrder,
  orderHints,
  orderViolation,
  placeAtLaneEnd,
} from "./cardOrder";

const ids = (cards: { id: ComposerCardId }[]) => cards.map((card) => card.id);

describe("기본 순서", () => {
  it("카탈로그 순서다 — 의뢰 정보 → 모델 → 데이터 → 평가 기준", () => {
    expect(laneOrder(DEFAULT_CARD_ORDER).map((lane) => lane.id)).toEqual(["info", "model", "data", "criteria"]);
    expect(DEFAULT_CARD_ORDER).toEqual([
      "clientInfo",
      "model",
      "modelEnv",
      "evalData",
      "trainingData",
      "testData",
      "groundTruth",
      "perspective",
      "metrics",
    ]);
  });

  it("들어간 카드는 필수 카드와 켠 선택 카드다", () => {
    expect(ids(includedCardsInOrder(DEFAULT_CARD_ORDER, DEFAULT_COMPOSER_SELECTION))).toEqual([
      "clientInfo",
      "model",
      "evalData",
      "perspective",
      "metrics",
    ]);
  });
});

describe("저장된 순서 맞추기", () => {
  it("모르는 id·중복은 버리고 빠진 카드는 더한다", () => {
    const order = normalizeCardOrder(["metrics", "nope", "metrics", "perspective"]);
    expect(order).toHaveLength(DEFAULT_CARD_ORDER.length);
    expect(new Set(order)).toEqual(new Set(DEFAULT_CARD_ORDER));
    // 처음 나온 대분류(평가 기준)가 맨 앞 레인이 된다.
    expect(order.slice(0, 2)).toEqual(["metrics", "perspective"]);
  });

  it("같은 대분류의 카드는 붙어 있게 모은다", () => {
    const order = normalizeCardOrder(["model", "clientInfo", "modelEnv"]);
    expect(order.slice(0, 3)).toEqual(["model", "modelEnv", "clientInfo"]);
  });

  it("배열이 아니면 기본 순서다", () => {
    expect(normalizeCardOrder(undefined)).toEqual(DEFAULT_CARD_ORDER);
    expect(normalizeCardOrder(null)).toEqual(DEFAULT_CARD_ORDER);
  });
});

describe("레인 옮기기", () => {
  it("레인을 다른 레인 앞이나 뒤로 옮긴다 — 레인 안 순서는 그대로다", () => {
    const order = moveLane(DEFAULT_CARD_ORDER, "model", "info", "before");
    expect(laneOrder(order).map((lane) => lane.id)).toEqual(["model", "info", "data", "criteria"]);
    expect(laneCards(order, "model")).toEqual(["model", "modelEnv"]);

    const last = moveLane(DEFAULT_CARD_ORDER, "info", "criteria", "after");
    expect(laneOrder(last).map((lane) => lane.id)).toEqual(["model", "data", "criteria", "info"]);
  });

  it("같은 레인에 놓으면 그대로다", () => {
    expect(moveLane(DEFAULT_CARD_ORDER, "data", "data", "before")).toEqual(DEFAULT_CARD_ORDER);
  });
});

describe("카드 옮기기", () => {
  it("같은 레인의 카드 앞이나 뒤로 옮긴다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "groundTruth", "evalData", "before");
    expect(laneCards(order, "data")).toEqual(["groundTruth", "evalData", "trainingData", "testData"]);

    const after = moveCard(DEFAULT_CARD_ORDER, "perspective", "metrics", "after");
    expect(laneCards(after, "criteria")).toEqual(["metrics", "perspective"]);
  });

  it("다른 레인의 카드에는 놓을 수 없다 — 대분류끼리는 섞이지 않는다", () => {
    expect(moveCard(DEFAULT_CARD_ORDER, "clientInfo", "metrics", "before")).toEqual(DEFAULT_CARD_ORDER);
  });

  it("새로 넣은 카드는 레인 맨 아래로 간다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "testData", "evalData", "before");
    expect(laneCards(placeAtLaneEnd(order, "testData"), "data")).toEqual([
      "evalData",
      "trainingData",
      "groundTruth",
      "testData",
    ]);
  });
});

describe("순서 규칙 — 깨면 놓지 못한다", () => {
  it("지표와 합격 기준은 평가 데이터 뒤다 — 평가 기준 레인을 데이터 레인 앞으로 옮길 수 없다", () => {
    const order = moveLane(DEFAULT_CARD_ORDER, "criteria", "data", "before");
    const included = ids(includedCardsInOrder(order, DEFAULT_COMPOSER_SELECTION));
    expect(orderViolation(included)).toMatch(/지표와 합격 기준은 평가 데이터 뒤/);
  });

  it("학습 데이터는 평가 데이터 뒤다 — 클래스별 데이터 양에 클래스 목록이 필요하다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "trainingData", "evalData", "before");
    const included = ids(includedCardsInOrder(order, { ...DEFAULT_COMPOSER_SELECTION, trainingData: true }));
    expect(orderViolation(included)).toMatch(/학습 데이터는 평가 데이터 뒤/);
  });

  it("빠진 카드에는 규칙을 묻지 않는다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "trainingData", "evalData", "before");
    expect(orderViolation(ids(includedCardsInOrder(order, DEFAULT_COMPOSER_SELECTION)))).toBeNull();
  });

  it("규칙과 무관한 카드는 마음대로 옮긴다 — 테스트 데이터·정답 라벨은 평가 데이터 앞에도 된다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "testData", "evalData", "before");
    const included = ids(
      includedCardsInOrder(order, { ...DEFAULT_COMPOSER_SELECTION, testData: true, groundTruth: true }),
    );
    expect(orderViolation(included)).toBeNull();

    const infoLast = moveLane(DEFAULT_CARD_ORDER, "info", "criteria", "after");
    expect(orderViolation(ids(includedCardsInOrder(infoLast, DEFAULT_COMPOSER_SELECTION)))).toBeNull();
  });
});

describe("순서 권고 — 막지 않는다", () => {
  it("평가 관점이 지표보다 뒤면 지표 추천을 받을 수 없다고 알린다", () => {
    const order = moveCard(DEFAULT_CARD_ORDER, "perspective", "metrics", "after");
    const included = ids(includedCardsInOrder(order, DEFAULT_COMPOSER_SELECTION));
    expect(orderViolation(included)).toBeNull();
    expect(orderHints(included)).toEqual([expect.stringMatching(/지표를 추천받을 수 있어요/)]);
  });

  it("기본 순서에는 권고가 없다", () => {
    expect(orderHints(ids(includedCardsInOrder(DEFAULT_CARD_ORDER, DEFAULT_COMPOSER_SELECTION)))).toEqual([]);
  });
});
