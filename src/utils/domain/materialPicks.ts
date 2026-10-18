/**
 * 평가 흐름 만들기의 규칙(docs/MATERIAL_PICKER.md §12.2) — 순수 함수만 둔다.
 *
 * 무엇을 넣었는지(`materialPicks`)는 넣고 빼는 즉시 반영된다. 저장 단계는 없다. 빈 흐름에서 시작해
 * 필수 항목도 넣어야 들어간다. 선택 카드는 항목이 하나라도 들어가면 켜진다(스토어의 `setMaterialPick`
 * 이 맞춘다).
 *
 * - "놓였는가"(`isLeafPlaced`)는 입력 쪽 "받는가"(`isFieldPicked`)와 다르다. picks 가 없으면 아무것도
 *   놓이지 않은 것이고, 필수 항목도 넣어야 놓인다.
 * - 개수·"다음" 막힘·트리 강조·빠진 항목 보기는 모두 `flowStatus` 한 번의 결과를 쓴다(판정 지점 하나).
 */
import type { TaskType } from "../../data/evaluationData";
import {
  MATERIAL_CATEGORIES,
  catalogCards,
  conditionTriggerIds,
  getCard,
  getCardFields,
  getVisibleCards,
  leafKind,
  partPickId,
  placeableIds,
} from "../../data/reportComposer";
import type {
  ComposerCard,
  ComposerCardId,
  FlowEntryState,
  FlowLeaf,
  MaterialCategory,
  MaterialPicks,
} from "../../types/reportComposer.types";
import { normalizeCardOrder } from "./cardOrder";

const FLOW_KINDS = ["required", "recommended", "optional"] as const;
type FlowKind = (typeof FLOW_KINDS)[number];

/** 이 블록의 트리 항목을 화면 순서로. 조건부 항목도 들어 있다(조건을 정하는 항목 바로 뒤가 아니라 필드 자리). */
export function flowLeaves(cardId: ComposerCardId, taskType: TaskType | ""): FlowLeaf[] {
  const card = getCard(cardId);
  return getCardFields(cardId, taskType).flatMap((field): FlowLeaf[] => {
    const kind = leafKind(card, field);
    const base = { cardId, fieldId: field.id, kind };
    if (kind === "conditional") {
      return [
        {
          ...base,
          leafId: field.id,
          label: field.label,
          conditionLabel: field.conditionLabel,
          triggerIds: conditionTriggerIds(field),
        },
      ];
    }
    if (kind === "optional" && field.parts) {
      return field.parts.map((part) => ({
        ...base,
        leafId: partPickId(field, part.key),
        partKey: part.key,
        label: part.label,
      }));
    }
    return [{ ...base, leafId: field.id, label: field.label }];
  });
}

/** 필드가 놓였는지 — 필드 id 나 그 칸 id 가 들어 있거나, 조건부면 조건을 정하는 필드가 모두 놓였을 때. */
function isFieldPlaced(card: ComposerCard, fieldId: string, ids: readonly string[]): boolean {
  const field = card.fields.find((item) => item.id === fieldId);
  if (!field) return false;
  if (field.kind === "conditional") {
    const triggers = conditionTriggerIds(field);
    return triggers.length > 0 && triggers.every((id) => isFieldPlaced(card, id, ids));
  }
  return ids.some((id) => id === fieldId || id.startsWith(fieldId + ":"));
}

/**
 * 평가 흐름에 놓였는가. picks 에 그 블록 키가 없으면 아무것도 놓이지 않았다(`isFieldPicked` 와 반대 —
 * 그쪽은 "모두 받음"). 조건부는 조건을 정하는 항목이 모두 놓였을 때 놓인 것이다.
 */
export function isLeafPlaced(leaf: FlowLeaf, picks: MaterialPicks): boolean {
  const ids = picks[leaf.cardId];
  if (!ids) return false;
  if (leaf.kind === "conditional") return isFieldPlaced(getCard(leaf.cardId), leaf.fieldId, ids);
  return ids.includes(leaf.leafId);
}

/**
 * 놓은 항목을 레지스트리 순서로 맞춘다. 모르는 id·조건부 id·중복은 버린다. **다른 유형의 항목은
 * 남긴다** — 유형을 바꿨다 돌아와도 다시 넣지 않게 한다(셈은 지금 유형의 항목만 돈다).
 */
export function orderPlaced(cardId: ComposerCardId, ids: readonly string[]): string[] {
  return placeableIds(cardId, "").filter((id) => ids.includes(id));
}

/** 항목 하나를 넣거나 뺀 결과. 넣을 수 없는 id(조건부·모르는 id)는 무시한다. */
export function togglePlaced(
  cardId: ComposerCardId,
  current: readonly string[] | undefined,
  leafId: string,
): string[] {
  const ids = current ?? [];
  if (!placeableIds(cardId, "").includes(leafId)) return orderPlaced(cardId, ids);
  return orderPlaced(cardId, ids.includes(leafId) ? ids.filter((id) => id !== leafId) : [...ids, leafId]);
}

/**
 * 블록째 넣을 때 들어갈 항목 — 필수와 권장. 모든 블록에 필수나 권장이 있다(테스트가 지킨다).
 *
 * 블록을 넣는 것은 "이 블록을 성적서에 싣겠다"는 뜻이라 표준 보고 항목까지 빠짐없이 받는 쪽을 기본으로
 * 둔다. 빼고 싶은 항목은 하나씩 뺀다.
 */
export function blockFillIds(cardId: ComposerCardId, taskType: TaskType | ""): string[] {
  return flowLeaves(cardId, taskType)
    .filter((leaf) => leaf.kind === "required" || leaf.kind === "recommended")
    .map((leaf) => leaf.leafId);
}

/** 흐름도에 블록이 보이는가 — 이 유형의 (조건부가 아닌) 항목이 하나라도 놓였을 때(`FlowStatus.shownCardIds`). */
export function isBlockShown(cardId: ComposerCardId, taskType: TaskType | "", picks: MaterialPicks): boolean {
  return flowStatus(taskType, picks).shownCardIds.has(cardId);
}

/** 보이는 블록을 입력 순서대로. 흐름도 번호가 이 순서다. */
export function shownBlocksInOrder(order: readonly ComposerCardId[], status: FlowStatus): ComposerCard[] {
  return normalizeCardOrder(order)
    .filter((id) => status.shownCardIds.has(id))
    .map(getCard);
}

export interface FlowStatus {
  /** 모든 블록의 항목(조건부 포함), 카탈로그 순서. */
  leaves: Array<FlowLeaf & { placed: boolean }>;
  /** 조건부는 세지 않는다. */
  counts: Record<FlowKind, { placed: number; total: number }>;
  /** 넣지 않은 필수 항목 — 하단 바·"다음" 막힘·트리 강조가 이것 하나를 쓴다. */
  missingRequired: FlowLeaf[];
  /** 넣지 않은 권장 항목 — 하단 바 "빠진 항목 보기". */
  unplacedRecommended: FlowLeaf[];
  /** 흐름도에 보이는 블록 — (조건부가 아닌) 항목이 하나라도 놓인 블록. 트리의 ✓ 와 흐름도가 이것을 쓴다. */
  shownCardIds: ReadonlySet<ComposerCardId>;
}

/** 평가 흐름의 상태 한 벌. 화면은 이 결과만 읽고 따로 세지 않는다. */
export function flowStatus(taskType: TaskType | "", picks: MaterialPicks): FlowStatus {
  const leaves = catalogCards(taskType).flatMap((card) =>
    flowLeaves(card.id, taskType).map((leaf) => ({ ...leaf, placed: isLeafPlaced(leaf, picks) })),
  );
  const missingRequired = leaves.filter((leaf) => leaf.kind === "required" && !leaf.placed);
  const counts = Object.fromEntries(
    FLOW_KINDS.map((kind) => {
      const ofKind = leaves.filter((leaf) => leaf.kind === kind);
      return [kind, { placed: ofKind.filter((leaf) => leaf.placed).length, total: ofKind.length }];
    }),
  ) as FlowStatus["counts"];
  // 필수 수는 빠진 목록에서 만든다 — 하단 바 숫자와 막힘 안내가 다를 수 없게.
  counts.required.placed = counts.required.total - missingRequired.length;
  return {
    leaves,
    counts,
    missingRequired,
    unplacedRecommended: leaves.filter((leaf) => leaf.kind === "recommended" && !leaf.placed),
    shownCardIds: new Set(
      leaves.filter((leaf) => leaf.kind !== "conditional" && leaf.placed).map((leaf) => leaf.cardId),
    ),
  };
}

/** 막힘 안내에 이름을 몇 개까지 적을지. 나머지는 "외 n개"로 줄인다. */
export const MISSING_NAMES_SHOWN = 3;

/**
 * "다음"을 막을 때 보일 문장. 빠진 것이 없으면 null.
 * 예: "넣지 않은 필수 항목이 있어요: 회사 정보, 성적서 용도, 평가 의뢰일 외 2개"
 */
export function describeMissingRequired(missing: readonly FlowLeaf[]): string | null {
  if (missing.length === 0) return null;
  const names = missing.slice(0, MISSING_NAMES_SHOWN).map((leaf) => leaf.label).join(", ");
  const rest = missing.length - MISSING_NAMES_SHOWN;
  return `넣지 않은 필수 항목이 있어요: ${names}${rest > 0 ? ` 외 ${rest}개` : ""}`;
}

/**
 * 다른 화면에서 들어올 때 트리에서 강조할 항목. 넘겨받은 항목이 있으면 그것, 없으면 그 블록의 넣지
 * 않은 필수·권장 항목이다. 들어올 때 한 번만 계산한다 — 넣는 동안 강조가 바뀌지 않게.
 */
export function focusLeafIds(entry: FlowEntryState, taskType: TaskType | "", picks: MaterialPicks): string[] {
  if (entry.leafIds) return [...entry.leafIds];
  return flowLeaves(entry.cardId, taskType)
    .filter((leaf) => (leaf.kind === "required" || leaf.kind === "recommended") && !isLeafPlaced(leaf, picks))
    .map((leaf) => leaf.leafId);
}

/** 트리의 항목 한 줄. 함께 들어감 항목은 조건을 정하는 항목 아래(`companions`)에 붙는다. */
export interface TreeLeaf extends FlowLeaf {
  placed: boolean;
  companions: Array<FlowLeaf & { placed: boolean }>;
}

/** 블록째 넣기(⊕)가 넣을 구분. */
export type BlockFillKinds = "required+recommended" | "required" | "recommended";

/** 트리의 블록 한 줄. */
export interface TreeBlock {
  card: ComposerCard;
  leaves: TreeLeaf[];
  /** 필수 항목 놓임/전체. 필수가 없는 블록은 total 0. */
  required: { placed: number; total: number };
  /** 흐름도에 있는가(`FlowStatus.shownCardIds`). */
  onFlow: boolean;
  /** 블록째 넣기가 넣을 항목(`blockFillIds`)과 그 구분. */
  fillIds: string[];
  fillKinds: BlockFillKinds;
  /** 블록째 넣기로 더 넣을 것이 있는가. */
  addable: boolean;
}

export interface TreeStage {
  category: MaterialCategory;
  blocks: TreeBlock[];
}

/** 조건부 항목이 매달릴 필드 — 조건을 정하는 필드를 따라 올라가 처음 만나는 조건부가 아닌 필드. */
function companionRoot(card: ComposerCard, fieldId: string, seen = new Set<string>()): string | undefined {
  const field = card.fields.find((item) => item.id === fieldId);
  if (!field || seen.has(fieldId)) return undefined;
  if (field.kind !== "conditional") return field.id;
  seen.add(fieldId);
  for (const triggerId of conditionTriggerIds(field)) {
    const root = companionRoot(card, triggerId, seen);
    if (root) return root;
  }
  return undefined;
}

/**
 * 트리(단계 > 블록 > 항목)를 카탈로그 순서로. 수는 `flowStatus` 의 결과에서만 읽는다 — 블록 줄의
 * "필수 p/t", 하단 바, 막힘 안내가 따로 세지 않게 한다.
 */
export function flowTree(taskType: TaskType | "", status: FlowStatus): TreeStage[] {
  const visible = new Set(getVisibleCards(taskType).map((card) => card.id));
  return MATERIAL_CATEGORIES.map((category) => ({
    category,
    blocks: category.cardIds
      .filter((id) => visible.has(id))
      .map((cardId): TreeBlock => {
        const card = getCard(cardId);
        const all = status.leaves.filter((leaf) => leaf.cardId === cardId);
        const leaves: TreeLeaf[] = all
          .filter((leaf) => leaf.kind !== "conditional")
          .map((leaf) => ({ ...leaf, companions: [] }));
        for (const companion of all.filter((leaf) => leaf.kind === "conditional")) {
          const root = companionRoot(card, companion.fieldId);
          const host = leaves.find((leaf) => leaf.fieldId === root);
          if (host) host.companions.push(companion);
        }
        const required = all.filter((leaf) => leaf.kind === "required");
        const fillIds = blockFillIds(cardId, taskType);
        const fillKindSet = new Set(all.filter((leaf) => fillIds.includes(leaf.leafId)).map((leaf) => leaf.kind));
        const fillKinds: BlockFillKinds =
          fillKindSet.has("required") && fillKindSet.has("recommended")
            ? "required+recommended"
            : fillKindSet.has("required")
              ? "required"
              : "recommended";
        return {
          card,
          leaves,
          required: { placed: required.filter((leaf) => leaf.placed).length, total: required.length },
          onFlow: status.shownCardIds.has(cardId),
          fillIds,
          fillKinds,
          addable: all.some((leaf) => fillIds.includes(leaf.leafId) && !leaf.placed),
        };
      }),
  }));
}
