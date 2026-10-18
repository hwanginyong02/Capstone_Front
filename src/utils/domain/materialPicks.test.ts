/** 재료 고르기 규칙의 순수 함수(docs/MATERIAL_PICKER.md §6·§11). */
import { describe, expect, it } from "vitest";

import { catalogCards, getCard, isFieldReceived, pickableIds } from "../../data/reportComposer";
import type { MaterialPicks } from "../../types/reportComposer.types";
import { DEFAULT_CARD_ORDER } from "./cardOrder";
import {
  blockFillIds,
  describeMissingRequired,
  flowLeaves,
  flowStatus,
  flowTree,
  focusLeafIds,
  isBlockShown,
  orderPlaced,
  shownBlocksInOrder,
  togglePlaced,
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

// ─── 평가 흐름 만들기 규칙(§12.2) ───────────────────────────────────────────────

const TASK_TYPES = ["binary", "multiclass", "multilabel"] as const;

/** 이 유형의 잠긴 블록을 모두 블록째 넣은 picks. */
function fillLocked(taskType: (typeof TASK_TYPES)[number]): MaterialPicks {
  return Object.fromEntries(
    catalogCards(taskType)
      .filter((card) => card.locked)
      .map((card) => [card.id, blockFillIds(card.id, taskType)]),
  );
}

describe("평가 흐름 — 처음에는 아무것도 놓이지 않았다", () => {
  it.each([
    ["binary", 15, 15, 13],
    ["multiclass", 14, 15, 13],
    ["multilabel", 15, 15, 13],
  ] as const)("%s 의 처음 개수는 필수 0/%i · 권장 0/%i · 선택 0/%i 이다", (taskType, req, rec, opt) => {
    const { counts, missingRequired } = flowStatus(taskType, {});
    expect(counts).toEqual({
      required: { placed: 0, total: req },
      recommended: { placed: 0, total: rec },
      optional: { placed: 0, total: opt },
    });
    expect(missingRequired).toHaveLength(req);
  });

  it("잠긴 블록의 키가 빈 배열이어도 놓인 것이 없다 — 입력 쪽 '모두 받음'과 다르다", () => {
    const picks: MaterialPicks = { clientInfo: [], evalData: [] };
    expect(flowStatus("binary", picks).counts.required.placed).toBe(0);
    expect(isBlockShown("clientInfo", "binary", {})).toBe(false);
    expect(isBlockShown("clientInfo", "binary", picks)).toBe(false);
  });
});

describe("평가 흐름 — 블록째 넣기와 개수", () => {
  it.each(TASK_TYPES)("%s: 잠긴 블록을 모두 블록째 넣으면 빠진 필수가 없다", (taskType) => {
    const status = flowStatus(taskType, fillLocked(taskType));
    expect(status.counts.required.total).toBeGreaterThan(0);
    expect(status.missingRequired).toEqual([]);
    expect(status.counts.required.placed).toBe(status.counts.required.total);
  });

  it("필수 수 = 전체 − 빠진 필수 수 — 여러 picks 에서", () => {
    const samples: MaterialPicks[] = [
      {},
      { clientInfo: ["companyInfo"] },
      { clientInfo: ["companyInfo", "requestDate"], evalData: ["resultFile", "latencyColumn"] },
      fillLocked("binary"),
    ];
    for (const picks of samples) {
      const { counts, missingRequired } = flowStatus("binary", picks);
      expect(counts.required.total - counts.required.placed).toBe(missingRequired.length);
    }
  });

  it("평가 데이터를 블록째 넣으면 필수와 권장(지연시간)이 들어가고 선택은 들어가지 않는다", () => {
    expect(blockFillIds("evalData", "binary")).toEqual([
      "resultFile",
      "yTrueColumn",
      "predictionColumns",
      "positiveClass",
      "latencyColumn",
    ]);
    expect(blockFillIds("evalData", "multiclass")).not.toContain("positiveClass");
  });

  it("선택 카드를 블록째 넣으면 권장 전부 — 선택은 들어가지 않는다", () => {
    expect(blockFillIds("modelEnv", "binary")).toEqual(["algorithm", "hyperparameters", "runtimeEnv", "gpuUsage"]);
    const optional = flowLeaves("trainingData", "binary").filter((leaf) => leaf.kind === "optional");
    expect(optional.length).toBeGreaterThan(0);
    for (const leaf of optional) expect(blockFillIds("trainingData", "binary")).not.toContain(leaf.leafId);
  });

  it("빠진 권장 항목은 지연시간도 센다 — 잠긴 블록의 2층 보고 항목", () => {
    const status = flowStatus("binary", { evalData: ["resultFile"] });
    expect(status.unplacedRecommended.map((leaf) => leaf.leafId)).toContain("latencyColumn");
    const placed = flowStatus("binary", { evalData: ["latencyColumn"] });
    expect(placed.counts.recommended.placed).toBe(1);
  });

  it("다른 유형의 항목만 있으면 세지 않고 블록도 보이지 않는다", () => {
    // 양성 클래스는 이진에만 있다.
    const picks: MaterialPicks = { evalData: ["positiveClass"] };
    expect(isBlockShown("evalData", "binary", picks)).toBe(true);
    expect(isBlockShown("evalData", "multiclass", picks)).toBe(false);
    expect(flowStatus("multiclass", picks).counts.required.placed).toBe(0);
  });

  it("선택 카드에서 블록이 보이는 것은 composerCards 가 켜진 것과 같다 — 항목이 있을 때", () => {
    expect(isBlockShown("modelEnv", "binary", {})).toBe(false);
    expect(isBlockShown("modelEnv", "binary", { modelEnv: [] })).toBe(false);
    expect(isBlockShown("modelEnv", "binary", { modelEnv: ["gpuUsage"] })).toBe(true);
  });
});

describe("평가 흐름 — 조건부 항목은 함께 들어간다", () => {
  const conditionalPlaced = (taskType: (typeof TASK_TYPES)[number], picks: MaterialPicks) =>
    flowStatus(taskType, picks)
      .leaves.filter((leaf) => leaf.kind === "conditional" && leaf.placed)
      .map((leaf) => leaf.leafId);

  it("조건을 정하는 항목을 넣으면 함께 들어가고 빼면 빠진다", () => {
    expect(conditionalPlaced("binary", {})).toEqual([]);
    expect(conditionalPlaced("binary", { evalData: ["predictionColumns"] })).toEqual(["decisionThreshold"]);
    expect(conditionalPlaced("binary", { metrics: ["selectedMetrics"] })).toEqual(["beta"]);
    expect(conditionalPlaced("binary", { clientInfo: ["reportPurpose"] })).toEqual(["projectInfo"]);
    expect(conditionalPlaced("binary", { groundTruth: ["labelReview"] })).toEqual([
      "labelReviewerCount",
      "labelAgreementKind",
      "labelAgreementValue",
    ]);
  });

  it("조건부는 개수에 넣지 않는다 — 함께 들어가도 필수 수가 그대로다", () => {
    const one = flowStatus("binary", { evalData: ["predictionColumns"] }).counts;
    expect(one.required.placed).toBe(1);
    expect(one.recommended.placed + one.optional.placed).toBe(0);
  });

  it("다중 클래스에는 결정 임계값 항목이 없다", () => {
    expect(flowLeaves("evalData", "multiclass").map((leaf) => leaf.leafId)).not.toContain("decisionThreshold");
    expect(flowLeaves("evalData", "binary").find((leaf) => leaf.leafId === "decisionThreshold")?.triggerIds).toEqual([
      "predictionColumns",
    ]);
  });
});

describe("평가 흐름 — 넣고 빼기", () => {
  it("넣고 다시 누르면 뺀다. 필수 항목도 뺄 수 있다", () => {
    const on = togglePlaced("clientInfo", undefined, "companyInfo");
    expect(on).toEqual(["companyInfo"]);
    expect(togglePlaced("clientInfo", on, "companyInfo")).toEqual([]);
  });

  it("조건부·모르는 id 는 무시하고, 레지스트리 순서로 두며, 다른 유형의 항목은 남긴다", () => {
    expect(togglePlaced("clientInfo", ["requestDate"], "projectInfo")).toEqual(["requestDate"]);
    expect(togglePlaced("clientInfo", ["requestDate"], "nope")).toEqual(["requestDate"]);
    expect(togglePlaced("clientInfo", ["requestDate"], "companyInfo")).toEqual(["companyInfo", "requestDate"]);
    // 클래스 중요도(다중·멀티)를 둔 채 중요 오류 유형(이진)을 넣어도 남는다.
    expect(togglePlaced("perspective", ["classPriority"], "criticalErrorType")).toEqual([
      "criticalErrorType",
      "classPriority",
    ]);
    expect(orderPlaced("clientInfo", ["requestDate", "companyInfo", "companyInfo", "projectInfo"])).toEqual([
      "companyInfo",
      "requestDate",
    ]);
  });
});

describe("평가 흐름 — 막힘 안내와 강조", () => {
  it("빠진 필수가 없으면 안내가 없다", () => {
    expect(describeMissingRequired([])).toBeNull();
  });

  it("처음 셋의 이름과 나머지 개수를 적는다 — 카탈로그 순서(의뢰자 정보부터)", () => {
    const { missingRequired } = flowStatus("binary", {});
    expect(describeMissingRequired(missingRequired)).toBe(
      `넣지 않은 필수 항목이 있어요: 회사 정보, 성적서 용도, 평가 의뢰일 외 ${missingRequired.length - 3}개`,
    );
    expect(describeMissingRequired(missingRequired.slice(0, 2))).toBe(
      "넣지 않은 필수 항목이 있어요: 회사 정보, 성적서 용도",
    );
  });

  it("들어올 때 넘긴 항목을 강조하고, 없으면 그 블록의 넣지 않은 필수·권장을 강조한다", () => {
    expect(focusLeafIds({ cardId: "evalData", leafIds: ["latencyColumn"] }, "binary", {})).toEqual(["latencyColumn"]);
    expect(focusLeafIds({ cardId: "evalData" }, "binary", { evalData: ["resultFile"] })).toEqual([
      "yTrueColumn",
      "predictionColumns",
      "positiveClass",
      "latencyColumn",
    ]);
  });
});

describe("평가 흐름 — 보이는 블록의 순서", () => {
  it("놓인 블록만 입력 순서대로 — ⑥ 을 먼저 놓고 ① 을 놓아도 ① 이 앞이다", () => {
    const picks: MaterialPicks = { trainingData: ["trainingDatasetName"], evalData: ["resultFile"] };
    expect(shownBlocksInOrder(DEFAULT_CARD_ORDER, "binary", picks).map((card) => card.id)).toEqual([
      "evalData",
      "trainingData",
    ]);
    expect(shownBlocksInOrder(DEFAULT_CARD_ORDER, "binary", {})).toEqual([]);
  });
});

describe("[B2] 트리의 '함께 들어감'과 입력 쪽 '받는가'가 같은 조건을 쓴다", () => {
  it("⑧ 에서 검수 방식을 넣고 빼면 두 쪽이 같이 바뀐다", () => {
    const card = getCard("groundTruth");
    const conditional = card.fields.filter((field) => field.kind === "conditional");
    expect(conditional.length).toBeGreaterThan(0);
    for (const ids of [["labelAuthor"], ["labelAuthor", "labelReview"], ["labelReview"]]) {
      const placed = flowStatus("binary", { groundTruth: ids }).leaves;
      for (const field of conditional) {
        const leaf = placed.find((item) => item.leafId === field.id)!;
        expect(isFieldReceived(card, field, ids), `${field.id} ${ids}`).toBe(leaf.placed);
      }
    }
  });
});

describe("flowTree — 트리 모델(단계 > 블록 > 항목)", () => {
  const tree = (taskType: "binary" | "multiclass" | "multilabel", picks: MaterialPicks = {}) =>
    flowTree(taskType, flowStatus(taskType, picks));
  const block = (stages: ReturnType<typeof tree>, cardId: string) => {
    const found = stages.flatMap((stage) => stage.blocks).find((item) => item.card.id === cardId);
    if (!found) throw new Error(cardId);
    return found;
  };

  it("단계 넷을 카탈로그 순서로, 블록도 카탈로그 순서로 둔다", () => {
    const stages = tree("binary");
    expect(stages.map((stage) => stage.category.name)).toEqual(["의뢰 정보", "모델", "데이터", "평가 기준"]);
    expect(stages[2].blocks.map((item) => item.card.id)).toEqual(["evalData", "trainingData", "testData", "groundTruth"]);
  });

  it("함께 들어감 항목은 조건을 정하는 항목 아래에 붙고, 블록의 항목 줄에는 없다", () => {
    const stages = tree("binary");
    const companionsOf = (cardId: string, leafId: string) =>
      block(stages, cardId).leaves.find((leaf) => leaf.leafId === leafId)?.companions.map((leaf) => leaf.leafId);

    expect(companionsOf("clientInfo", "reportPurpose")).toEqual(["projectInfo"]);
    // 사슬(일치도 값 ← 일치도 종류 ← 신뢰성)도 뿌리 항목 하나 아래에 모인다.
    expect(companionsOf("groundTruth", "labelReview")).toEqual([
      "labelReviewerCount",
      "labelAgreementKind",
      "labelAgreementValue",
    ]);
    expect(companionsOf("metrics", "selectedMetrics")).toEqual(["beta"]);
    expect(companionsOf("evalData", "predictionColumns")).toEqual(["decisionThreshold"]);
    for (const stage of stages) {
      for (const item of stage.blocks) {
        expect(item.leaves.every((leaf) => leaf.kind !== "conditional")).toBe(true);
      }
    }
  });

  it("블록의 필수 수는 flowStatus 의 항목에서 읽고, 함께 들어감은 세지 않는다", () => {
    const picks: MaterialPicks = { clientInfo: ["companyInfo", "reportPurpose"] };
    const status = flowStatus("binary", picks);
    const clientInfo = block(flowTree("binary", status), "clientInfo");
    const required = status.leaves.filter((leaf) => leaf.cardId === "clientInfo" && leaf.kind === "required");

    expect(required.length).toBeGreaterThan(0);
    expect(clientInfo.required).toEqual({ placed: 2, total: required.length });
    // 과제 정보는 성적서 용도와 함께 놓였지만 필수 수에 들지 않는다.
    expect(clientInfo.leaves.find((leaf) => leaf.leafId === "reportPurpose")?.companions[0].placed).toBe(true);
    expect(clientInfo.onFlow).toBe(true);
    expect(block(flowTree("binary", status), "model").onFlow).toBe(false);
  });

  it("블록째 넣기의 구분과, 다 넣으면 더 넣을 것이 없다", () => {
    const empty = tree("binary");
    expect(block(empty, "clientInfo").fillKinds).toBe("required");
    expect(block(empty, "evalData").fillKinds).toBe("required+recommended");
    expect(block(empty, "modelEnv").fillKinds).toBe("recommended");
    expect(block(empty, "modelEnv").addable).toBe(true);

    const filled = tree("binary", { modelEnv: blockFillIds("modelEnv", "binary") });
    expect(block(filled, "modelEnv").addable).toBe(false);
    expect(block(filled, "modelEnv").onFlow).toBe(true);
  });
});
