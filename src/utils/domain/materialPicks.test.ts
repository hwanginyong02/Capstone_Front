/** 재료 고르기 규칙의 순수 함수(docs/MATERIAL_PICKER.md §6·§11). */
import { describe, expect, it } from "vitest";

import { catalogCards, pickableIds } from "../../data/reportComposer";
import type { MaterialPicks } from "../../types/reportComposer.types";
import {
  fieldRows,
  includeCardPicks,
  matchesTier,
  missingRecommended,
  orderPicks,
  pickCoverage,
  pickItems,
  pickTier,
  picksForTier,
  togglePick,
} from "./materialPicks";

describe("넣고 빼기 — 바로 반영", () => {
  it("항목 하나를 넣고 다시 누르면 뺀다", () => {
    const on = togglePick("modelEnv", "binary", [], "gpuUsage");
    expect(on).toEqual(["gpuUsage"]);
    expect(togglePick("modelEnv", "binary", on, "gpuUsage")).toEqual([]);
  });

  it("넣은 순서와 상관없이 화면 순서로 둔다 — 고를 수 없는 id 는 버린다", () => {
    expect(orderPicks("modelEnv", "binary", ["gpuUsage", "nope", "algorithm"])).toEqual([
      "algorithm",
      "gpuUsage",
    ]);
    expect(togglePick("modelEnv", "binary", ["gpuUsage"], "algorithm")).toEqual(["algorithm", "gpuUsage"]);
  });

  it("선택 카드를 통째로 넣으면 권장 항목이 모두 들어간다", () => {
    expect(includeCardPicks("modelEnv", "binary")).toEqual([
      "algorithm",
      "hyperparameters",
      "runtimeEnv",
      "gpuUsage",
    ]);
    // 선택 항목은 들어가지 않는다 — 권장만 기본으로 받는다.
    const optional = pickItems("trainingData", "binary").filter((item) => item.kind === "optional");
    expect(optional.length).toBeGreaterThan(0);
    for (const item of optional) {
      expect(includeCardPicks("trainingData", "binary")).not.toContain(item.pickId);
    }
  });

  it("재료 목록의 필드 줄 — 필수는 버튼 없이, 권장은 필드 한 줄에 칸을 나열하고, 형식과 설명을 단다", () => {
    const env = fieldRows("modelEnv", "binary");
    expect(env.required).toEqual([]);
    expect(env.recommended.map((row) => row.pickId)).toEqual([
      "algorithm",
      "hyperparameters",
      "runtimeEnv",
      "gpuUsage",
    ]);
    const algorithm = env.recommended[0];
    expect(algorithm.format).toBe("텍스트");
    expect(algorithm.description).toMatch(/알고리즘입니다/);
    expect(env.recommended.find((row) => row.key === "runtimeEnv")?.subs?.map((sub) => sub.label)).toContain(
      "운영체제",
    );

    // 파일을 받는 필드만 파일 표시가 붙는다 — 필드 패널이 예시 표를 붙인다.
    expect(fieldRows("evalData", "binary").required.find((row) => row.key === "resultFile")?.file).toBe(true);
    expect(env.recommended.every((row) => !row.file)).toBe(true);

    const client = fieldRows("clientInfo", "binary");
    expect(client.required.length).toBeGreaterThan(0);
    expect(client.required.every((row) => row.pickId === undefined)).toBe(true);
    expect(client.conditional.every((row) => Boolean(row.condition))).toBe(true);
  });

  it("넣고 뺄 항목은 권장(필드 한 줄)과 선택(쪼갠 항목마다)이다", () => {
    const items = pickItems("clientInfo", "binary");
    expect(items.map((item) => item.pickId)).toEqual(pickableIds("clientInfo", "binary"));
    expect(items.find((item) => item.pickId === "contactExtra:website")?.label).toBe("홈페이지");
    expect(items.every((item) => item.kind === "optional")).toBe(true);
  });
});

describe("품질 단계와 추천 세트", () => {
  it("최소 세트는 권장·선택을 하나도 받지 않는다", () => {
    const picks = picksForTier("minimum", "binary");
    for (const card of catalogCards("binary")) {
      expect(picks[card.id], card.id).toEqual([]);
    }
    expect(pickTier("binary", picks)).toBe("minimum");
  });

  it("표준 세트는 권장을 모두 받고 선택은 받지 않는다 — 충분한 품질의 기준선", () => {
    const picks = picksForTier("standard", "binary");
    const coverage = pickCoverage("binary", picks);

    expect(coverage.recommended.picked).toBe(coverage.recommended.total);
    expect(coverage.recommended.total).toBeGreaterThan(0);
    expect(coverage.optional.picked).toBe(0);
    expect(pickTier("binary", picks)).toBe("standard");
  });

  it("상세 세트는 선택까지 모두 받는다", () => {
    const picks = picksForTier("detailed", "binary");
    const coverage = pickCoverage("binary", picks);

    expect(coverage.optional.picked).toBe(coverage.optional.total);
    expect(pickTier("binary", picks)).toBe("detailed");
  });

  it("권장이 하나라도 빠지면 표준에 못 미친다 — 선택을 다 넣어도 그렇다", () => {
    const picks = picksForTier("detailed", "binary");
    picks.modelEnv = (picks.modelEnv ?? []).filter((id) => id !== "gpuUsage");

    expect(pickTier("binary", picks)).toBe("minimum");
  });

  it("세트 버튼은 지금 고른 것이 그 세트와 똑같을 때만 눌린다", () => {
    const standard = picksForTier("standard", "binary");
    expect(matchesTier("standard", "binary", standard)).toBe(true);
    expect(matchesTier("detailed", "binary", standard)).toBe(false);

    // 순서가 달라도 같은 것으로 본다.
    const reversed: MaterialPicks = { ...standard, modelEnv: [...(standard.modelEnv ?? [])].reverse() };
    expect(matchesTier("standard", "binary", reversed)).toBe(true);

    // 하나만 더해도 어느 세트도 아니다.
    const plusOne = { ...standard, clientInfo: ["projectNumber"] };
    expect(matchesTier("standard", "binary", plusOne)).toBe(false);
  });

  it("아무것도 고르지 않은 처음 상태는 최소 세트와 같다", () => {
    expect(matchesTier("minimum", "binary", {})).toBe(true);
  });

  it("현황은 필수 카드 수와 권장·선택의 들어간 수/전체 수다", () => {
    const coverage = pickCoverage("binary", { modelEnv: ["algorithm"], clientInfo: ["projectNumber"] });

    expect(coverage.requiredCards).toBe(5);
    expect(coverage.recommended.picked).toBe(1);
    expect(coverage.optional.picked).toBe(1);
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

  it("표준 세트면 빠진 권장 항목이 없다", () => {
    expect(missingRecommended("binary", picksForTier("standard", "binary"))).toEqual([]);
  });
});
