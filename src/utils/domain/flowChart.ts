/**
 * 흐름도의 노드와 연결선 목록(docs/MATERIAL_PICKER.md §12.3).
 *
 * 흐름도는 FigJam 순서도처럼 그린다: 시작 → 단계마다 놓인 블록 → 검증 → 확인과 생성. 블록을 하나도
 * 놓지 않은 단계는 점선 빈 자리 노드(`slot:{단계}`)로 흐름에 끼운다. 연결선은 이웃한 노드끼리 잇는다.
 *
 * 좌표는 여기서 다루지 않는다 — 경로는 `diagramGeometry.ts`, 측정은 `useDiagramGeometry` 다. 여기
 * 함수들은 순수하다.
 */
import { categoryOf } from "../../data/reportComposer";
import { getStepDefinition } from "../../data/workflowSteps";
import { laneCards, laneOrder, orderAfterPlacing } from "./cardOrder";
import type {
  ComposerCardId,
  ComposerSelection,
  MaterialCategoryId,
} from "../../types/reportComposer.types";

export type FlowNodeId = "start" | "validation" | "report" | ComposerCardId | `slot:${MaterialCategoryId}`;

export interface FlowNode {
  id: FlowNodeId;
  kind: "terminal" | "block" | "slot";
  /** 블록·빈 자리가 속한 단계. 단말은 없다. */
  laneId?: MaterialCategoryId;
  /** 블록의 입력 순서 번호(1부터). 놓인 블록만 센다. */
  number?: number;
}

export interface FlowEdge {
  from: FlowNodeId;
  to: FlowNodeId;
  /** start: 시작에서, inLane: 같은 단계 안, crossLane: 다른 단계로, end: 끝 단말로. */
  kind: "start" | "inLane" | "crossLane" | "end";
  /** 빈 자리에 닿는 선은 점선이다. */
  dashed: boolean;
}

export const slotId = (laneId: MaterialCategoryId): FlowNodeId => `slot:${laneId}`;

/**
 * 노드를 흐름 순서대로. 단계는 `laneOrder` 순서, 단계 안의 블록은 입력 순서다. 번호는 놓인 블록만
 * 1..n 으로 센다 — "다음" 게이트 덕분에 화면을 떠날 때는 필수가 다 놓여 있어 이 번호가 입력 화면
 * 순서(`buildStepList`)와 같다.
 */
export function flowNodes(
  order: readonly ComposerCardId[],
  shownCardIds: ReadonlySet<ComposerCardId>,
): FlowNode[] {
  const nodes: FlowNode[] = [{ id: "start", kind: "terminal" }];
  let number = 0;
  for (const lane of laneOrder(order)) {
    const shown = laneCards(order, lane.id).filter((id) => shownCardIds.has(id));
    if (shown.length === 0) {
      nodes.push({ id: slotId(lane.id), kind: "slot", laneId: lane.id });
      continue;
    }
    for (const id of shown) {
      number += 1;
      nodes.push({ id, kind: "block", laneId: lane.id, number });
    }
  }
  nodes.push({ id: "validation", kind: "terminal" }, { id: "report", kind: "terminal" });
  return nodes;
}

/** 이웃한 노드끼리 잇는다. 검증 → 확인과 생성은 늘 실선이다. */
export function flowEdges(nodes: readonly FlowNode[]): FlowEdge[] {
  return nodes.slice(1).map((to, index) => {
    const from = nodes[index];
    const kind: FlowEdge["kind"] =
      from.id === "start"
        ? "start"
        : to.kind === "terminal"
          ? "end"
          : from.laneId === to.laneId
            ? "inLane"
            : "crossLane";
    return { from: from.id, to: to.id, kind, dashed: from.kind === "slot" || to.kind === "slot" };
  });
}

/**
 * 트리에서 항목을 끌어 단계 위에 올렸을 때, 새 블록이 나타날 자리(그 단계에 보이는 블록 사이의
 * 위치, 0부터). 블록이 이미 흐름도에 있으면 -1 — 그 블록을 강조하면 된다.
 *
 * 스토어가 실제로 놓는 함수(`orderAfterPlacing`)로 순서를 계산한다 — 미리 보인 자리와 실제로 놓이는
 * 자리가 갈리지 않게. 꺼져 있던 선택 블록은 단계 끝, 필수 블록은 제자리다.
 */
export function ghostIndex(
  order: readonly ComposerCardId[],
  selection: ComposerSelection,
  shownCardIds: ReadonlySet<ComposerCardId>,
  cardId: ComposerCardId,
): number {
  if (shownCardIds.has(cardId)) return -1;
  const next = orderAfterPlacing(order, selection, cardId);
  return laneCards(next, categoryOf(cardId).id)
    .filter((id) => id === cardId || shownCardIds.has(id))
    .indexOf(cardId);
}

/** 단말의 이름 — 단계 정의의 이름을 그대로 쓴다(문구를 새로 만들지 않음). */
export function terminalLabel(id: "start" | "validation" | "report"): string {
  return id === "start" ? "시작" : getStepDefinition(id).label;
}
