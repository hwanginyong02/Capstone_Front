import { describe, expect, it } from "vitest";

import { DEFAULT_COMPOSER_SELECTION, type ComposerCardId } from "../../types/reportComposer.types";
import { DEFAULT_CARD_ORDER, moveLane, orderAfterPlacing } from "./cardOrder";
import { flowEdges, flowNodes, ghostIndex, terminalLabel } from "./flowChart";

const shown = (...ids: ComposerCardId[]) => new Set<ComposerCardId>(ids);
const ids = (nodes: ReturnType<typeof flowNodes>) => nodes.map((node) => node.id);
const edgeList = (nodes: ReturnType<typeof flowNodes>) =>
  flowEdges(nodes).map((edge) => `${edge.from}→${edge.to}:${edge.kind}${edge.dashed ? ":dashed" : ""}`);

describe("flowNodes", () => {
  it("빈 흐름은 시작 → 단계마다 빈 자리 → 검증 → 확인과 생성이다", () => {
    expect(ids(flowNodes(DEFAULT_CARD_ORDER, shown()))).toEqual([
      "start",
      "slot:info",
      "slot:model",
      "slot:data",
      "slot:criteria",
      "validation",
      "report",
    ]);
  });

  it("블록이 놓인 단계는 빈 자리 대신 블록이 입력 순서대로 오고, 번호는 놓인 블록만 1..n 이다", () => {
    const nodes = flowNodes(DEFAULT_CARD_ORDER, shown("metrics", "model", "trainingData", "evalData"));
    expect(ids(nodes)).toEqual([
      "start",
      "slot:info",
      "model",
      "evalData",
      "trainingData",
      "metrics",
      "validation",
      "report",
    ]);
    expect(nodes.filter((node) => node.kind === "block").map((node) => [node.id, node.number])).toEqual([
      ["model", 1],
      ["evalData", 2],
      ["trainingData", 3],
      ["metrics", 4],
    ]);
    // 빈 자리와 단말에는 번호가 없다.
    expect(nodes.filter((node) => node.kind !== "block").every((node) => node.number === undefined)).toBe(true);
  });

  it("단계 순서를 바꾸면 노드와 번호가 그 순서를 따른다", () => {
    const order = moveLane(DEFAULT_CARD_ORDER, "model", "info", "before");
    const nodes = flowNodes(order, shown("clientInfo", "model"));
    expect(ids(nodes).slice(0, 3)).toEqual(["start", "model", "clientInfo"]);
    expect(nodes[1].number).toBe(1);
    expect(nodes[2].number).toBe(2);
  });
});

describe("flowEdges", () => {
  it("빈 흐름: 이웃끼리 잇고, 빈 자리에 닿는 선은 점선이다. 검증 → 확인과 생성은 실선이다", () => {
    const edges = edgeList(flowNodes(DEFAULT_CARD_ORDER, shown()));
    expect(edges.length).toBeGreaterThan(0);
    expect(edges).toEqual([
      "start→slot:info:start:dashed",
      "slot:info→slot:model:crossLane:dashed",
      "slot:model→slot:data:crossLane:dashed",
      "slot:data→slot:criteria:crossLane:dashed",
      "slot:criteria→validation:end:dashed",
      "validation→report:end",
    ]);
  });

  it("같은 단계 안은 inLane, 단계를 넘으면 crossLane, 블록끼리는 실선이다", () => {
    const edges = edgeList(flowNodes(DEFAULT_CARD_ORDER, shown("clientInfo", "model", "modelEnv", "evalData", "perspective")));
    expect(edges).toEqual([
      "start→clientInfo:start",
      "clientInfo→model:crossLane",
      "model→modelEnv:inLane",
      "modelEnv→evalData:crossLane",
      "evalData→perspective:crossLane",
      "perspective→validation:end",
      "validation→report:end",
    ]);
  });
});

describe("ghostIndex", () => {
  const selection = { ...DEFAULT_COMPOSER_SELECTION };

  it("필수 블록은 제자리에 나타난다 — 학습 데이터만 있어도 평가 데이터는 그 앞이다", () => {
    expect(ghostIndex(DEFAULT_CARD_ORDER, selection, shown("trainingData"), "evalData")).toBe(0);
  });

  it("꺼진 선택 블록은 단계 끝에 나타난다 — 카탈로그 순서가 앞이어도", () => {
    // 카탈로그로는 trainingData 가 groundTruth 보다 앞이지만, 넣으면 단계 끝으로 간다.
    expect(ghostIndex(DEFAULT_CARD_ORDER, selection, shown("evalData", "groundTruth"), "trainingData")).toBe(2);
  });

  it("이미 흐름도에 있는 블록은 -1 이다", () => {
    expect(ghostIndex(DEFAULT_CARD_ORDER, selection, shown("evalData"), "evalData")).toBe(-1);
  });

  it("미리 보인 자리는 스토어가 실제로 놓는 자리와 같다", () => {
    const cases: Array<[ComposerCardId, ComposerCardId[]]> = [
      ["evalData", ["trainingData", "testData"]],
      ["trainingData", ["evalData", "groundTruth"]],
      ["modelEnv", []],
      ["model", ["modelEnv"]],
    ];
    for (const [cardId, others] of cases) {
      const visible = shown(...others);
      const after = orderAfterPlacing(DEFAULT_CARD_ORDER, selection, cardId);
      const placed = flowNodes(after, shown(...others, cardId)).filter((node) => node.kind === "block");
      const sameLane = placed.filter((node) => node.laneId === placed.find((item) => item.id === cardId)?.laneId);
      expect(sameLane.findIndex((node) => node.id === cardId)).toBe(
        ghostIndex(DEFAULT_CARD_ORDER, selection, visible, cardId),
      );
    }
  });
});

describe("terminalLabel", () => {
  it("단말 이름은 단계 정의의 이름이다", () => {
    expect([terminalLabel("start"), terminalLabel("validation"), terminalLabel("report")]).toEqual([
      "시작",
      "검증",
      "확인과 생성",
    ]);
  });
});
