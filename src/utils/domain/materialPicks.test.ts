/** 재료 고르기 규칙의 순수 함수(docs/MATERIAL_PICKER.md §4·§7). */
import { describe, expect, it } from "vitest";

import { MATERIAL_CATEGORIES } from "../../data/reportComposer";
import type { MaterialPicks } from "../../types/reportComposer.types";
import {
  inputOrderCards,
  isCardSaved,
  isCategoryComplete,
  isDraftDirty,
  missingRecommended,
  picksToSave,
  requiredProgress,
  unsavedRequiredCards,
} from "./materialPicks";

const category = (id: string) => MATERIAL_CATEGORIES.find((item) => item.id === id)!;

describe("저장", () => {
  it("빈 배열로 저장한 것도 저장이다 — 넣지 않기로 확정", () => {
    expect(isCardSaved({ trainingData: [] }, "trainingData")).toBe(true);
    expect(isCardSaved({}, "trainingData")).toBe(false);
  });

  it("저장할 체크는 이 카드에서 고를 수 있는 항목만, 화면 순서로", () => {
    expect(picksToSave("modelEnv", "binary", ["gpuUsage", "nope", "algorithm"])).toEqual([
      "algorithm",
      "gpuUsage",
    ]);
  });

  it("화면 체크가 저장한 것과 다르면 변경이 있다 — 순서는 보지 않는다", () => {
    expect(isDraftDirty(["a", "b"], ["b", "a"])).toBe(false);
    expect(isDraftDirty(["a"], ["a", "b"])).toBe(true);
    expect(isDraftDirty([], undefined)).toBe(false);
    expect(isDraftDirty(["a"], undefined)).toBe(true);
  });
});

describe("입력 순서와 진행", () => {
  it("필수 카드와 항목을 골라 저장한 선택 카드만, 카탈로그 순서로", () => {
    const picks: MaterialPicks = { groundTruth: ["labelAuthor"], trainingData: [], modelEnv: ["algorithm"] };
    expect(inputOrderCards("binary", picks).map((card) => card.id)).toEqual([
      "clientInfo",
      "model",
      "modelEnv",
      "evalData",
      "groundTruth",
      "perspective",
      "metrics",
    ]);
  });

  it("저장하지 않은 필수 카드와 진행 수", () => {
    const picks: MaterialPicks = { clientInfo: [], metrics: [] };
    expect(unsavedRequiredCards("binary", picks).map((card) => card.id)).toEqual([
      "model",
      "evalData",
      "perspective",
    ]);
    expect(requiredProgress("binary", picks)).toEqual({ total: 5, saved: 2 });
  });

  it("대분류는 그 안의 필수 카드를 모두 저장하면 완료다 — 선택 카드는 보지 않는다", () => {
    expect(isCategoryComplete(category("model"), { model: [] })).toBe(true);
    expect(isCategoryComplete(category("data"), { trainingData: ["trainingDatasetName"] })).toBe(false);
    expect(isCategoryComplete(category("criteria"), { perspective: [] })).toBe(false);
    expect(isCategoryComplete(category("criteria"), { perspective: [], metrics: [] })).toBe(true);
  });
});

describe("빠진 권장 항목 (§5·§6)", () => {
  it("고르지 않은 권장 항목을 카드별로, 카탈로그 순서로 돌려준다", () => {
    const picks: MaterialPicks = {
      modelEnv: ["algorithm", "hyperparameters", "runtimeEnv"],
      trainingData: [
        "trainingDatasetName",
        "trainingDataSource",
        "trainingVolume",
        "trainingClassVolume",
        "channelEffects",
        "imbalanceHandling",
      ],
    };
    const missing = missingRecommended("binary", picks);

    expect(missing.map((item) => item.card.id)).toEqual(["modelEnv", "testData", "groundTruth"]);
    expect(missing[0].fields.map((field) => field.id)).toEqual(["gpuUsage"]);
  });

  it("선택 항목은 빠져도 알리지 않는다 — 권장 항목만 제공되지 않음으로 찍힌다", () => {
    const missing = missingRecommended("binary", { testData: ["testDataSource", "testSourceRelation"] });

    expect(missing.find((item) => item.card.id === "testData")).toBeUndefined();
  });
});
