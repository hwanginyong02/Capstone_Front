/**
 * 재료 고르기 화면의 규칙(docs/MATERIAL_PICKER.md §6·§11) — 순수 함수만 둔다.
 *
 * 무엇을 받을지(`materialPicks`)는 넣고 빼는 즉시 반영된다. 저장 단계는 없다. 필수 카드와 그 안의
 * 필수·조건부 필드는 처음부터 들어가 있고, 사용자가 고르는 것은 권장·선택 항목과 선택 카드다.
 * 선택 카드는 항목이 하나라도 들어가면 들어간 것이다(스토어의 `setMaterialPick` 이 맞춘다).
 *
 * 쓰는 곳: `pages/MaterialPicker.tsx`, `components/material-picker/*`, 확인과 생성의 빠진 권장
 * 항목 안내.
 */
import type { TaskType } from "../../data/evaluationData";
import {
  catalogCards,
  conditionTriggerIds,
  fieldFormat,
  fieldParts,
  getCard,
  getCardFields,
  getVisibleCards,
  isFieldPicked,
  leafKind,
  partPickId,
  pickKind,
  pickableIds,
  placeableIds,
} from "../../data/reportComposer";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerField,
  FieldPart,
  FlowEntryState,
  FlowLeaf,
  MaterialPicks,
  PickKind,
} from "../../types/reportComposer.types";
import { normalizeCardOrder } from "./cardOrder";

/** 그 카드에서 들어간 항목 수. */
export function pickCount(picks: MaterialPicks, cardId: ComposerCardId): number {
  return picks[cardId]?.length ?? 0;
}

/** 이 유형에서 고를 수 있는 항목만, 화면 순서로. */
export function orderPicks(cardId: ComposerCardId, taskType: TaskType | "", ids: readonly string[]): string[] {
  return pickableIds(cardId, taskType).filter((id) => ids.includes(id));
}

/** 항목 하나를 넣거나 뺀 결과. */
export function togglePick(
  cardId: ComposerCardId,
  taskType: TaskType | "",
  current: readonly string[] | undefined,
  pickId: string,
): string[] {
  const ids = current ?? [];
  return orderPicks(
    cardId,
    taskType,
    ids.includes(pickId) ? ids.filter((id) => id !== pickId) : [...ids, pickId],
  );
}

/** 팔레트와 다이어그램 칩에 보일, 넣고 뺄 수 있는 항목 하나. */
export interface PickItem {
  pickId: string;
  label: string;
  kind: "recommended" | "optional";
  description?: string;
}

/**
 * 카드에서 넣고 뺄 수 있는 항목을 화면 순서로. 권장은 필드 한 줄 단위, 선택은 하나씩이고 쪼갠
 * 항목이 있으면 항목마다다(③ 홈페이지·팩스, docs/MATERIAL_PICKER.md §6).
 */
export function pickItems(cardId: ComposerCardId, taskType: TaskType | ""): PickItem[] {
  const card = getCard(cardId);
  return getCardFields(cardId, taskType).flatMap((field): PickItem[] => {
    const kind = pickKind(card, field);
    if (kind === "recommended") {
      return [{ pickId: field.id, label: field.label, kind, description: field.description }];
    }
    if (kind !== "optional") return [];
    if (field.parts) {
      return field.parts.map((part) => ({
        pickId: `${field.id}:${part.key}`,
        label: part.label,
        kind,
        description: part.description,
      }));
    }
    return [{ pickId: field.id, label: field.label, kind, description: field.description }];
  });
}

/**
 * 재료 목록에 보일 필드 한 줄(또는 쪼갠 항목 한 줄). 이름·형식·설명을 마우스를 올리지 않아도
 * 보이게 그린다 — 설명을 읽고 고른다(docs/MATERIAL_PICKER.md §8·§11).
 */
export interface FieldRow {
  key: string;
  name: string;
  /** 이름 오른쪽에 회색으로 보일 입력 형식. */
  format?: string;
  description?: string;
  /** 조건부 필드의 조건 문구. */
  condition?: string;
  /** 넣고 뺄 수 있는 줄(권장·선택)이면 그 항목 id. */
  pickId?: string;
  /** 권장 필드 아래에 나열만 하는 칸(⑨ 실행 환경의 운영체제·CPU·… 처럼). */
  subs?: FieldPart[];
  /** 파일을 받는 필드인지(① 결과 파일). 필드 패널이 파일 예시를 표로 붙인다. */
  file?: boolean;
}

export const FIELD_SECTIONS: Array<{ kind: PickKind; title: string }> = [
  { kind: "required", title: "필수" },
  { kind: "recommended", title: "권장" },
  { kind: "optional", title: "선택" },
  { kind: "conditional", title: "조건부" },
];

/**
 * 카드의 필드를 구분별 줄로. 권장은 필드 한 줄 단위로 넣고 빼며 그 안의 칸은 아래에 나열만 한다.
 * 필수·선택·조건부는 쪼갠 항목이 있으면 항목마다 한 줄이다(§8 "필드는 하나씩 쪼개 보여준다").
 */
export function fieldRows(cardId: ComposerCardId, taskType: TaskType | ""): Record<PickKind, FieldRow[]> {
  const card = getCard(cardId);
  const rows: Record<PickKind, FieldRow[]> = { required: [], recommended: [], optional: [], conditional: [] };

  for (const field of getCardFields(cardId, taskType)) {
    const kind = pickKind(card, field);
    const condition = kind === "conditional" ? field.conditionLabel : undefined;

    if (kind === "recommended") {
      const subs = fieldParts(field);
      rows.recommended.push({
        key: field.id,
        name: field.label,
        format: subs.length > 0 ? undefined : fieldFormat(field),
        description: field.description,
        pickId: field.id,
        subs: subs.length > 0 ? subs : undefined,
        file: field.input === "file" || undefined,
      });
      continue;
    }

    if (field.parts) {
      for (const part of field.parts) {
        rows[kind].push({
          key: partPickId(field, part.key),
          name: part.label,
          format: part.format,
          description: part.description,
          condition,
          pickId: kind === "optional" ? partPickId(field, part.key) : undefined,
        });
      }
      continue;
    }

    rows[kind].push({
      key: field.id,
      name: field.label,
      format: fieldFormat(field),
      description: field.description,
      condition,
      pickId: kind === "optional" ? field.id : undefined,
      file: field.input === "file" || undefined,
    });
  }
  return rows;
}

/** 항목 하나의 구분(권장 또는 선택). 체크할 수 없는 id 면 null. */
export function pickIdKind(cardId: ComposerCardId, pickId: string): "recommended" | "optional" | null {
  const card = getCard(cardId);
  const field = card.fields.find((item) => item.id === pickId.split(":")[0]);
  if (!field) return null;
  const kind = pickKind(card, field);
  return kind === "recommended" || kind === "optional" ? kind : null;
}

/**
 * 선택 카드를 통째로 넣을 때 들어갈 항목 — 권장 항목 전부. 권장이 없는 카드면 선택 항목 전부.
 *
 * 카드를 끌어 넣는 것은 "이 카드를 성적서에 싣겠다"는 뜻이라, 표준 보고 항목을 빠짐없이 받는 쪽을
 * 기본으로 둔다. 빼고 싶은 항목은 칩의 ×로 뺀다.
 */
export function includeCardPicks(cardId: ComposerCardId, taskType: TaskType | ""): string[] {
  const ids = pickableIds(cardId, taskType);
  const recommended = ids.filter((id) => pickIdKind(cardId, id) === "recommended");
  return recommended.length > 0 ? recommended : ids;
}

/** 품질 단계 = 추천 세트(docs/MATERIAL_PICKER.md §11). */
export type PickTier = "minimum" | "standard" | "detailed";

export interface PickTierInfo {
  id: PickTier;
  name: string;
  /** 하단 바와 세트 버튼의 설명. 이 세트로 만든 성적서가 어떤 모습인지. */
  description: string;
}

/**
 * 세 단계. **표준이 충분한 품질의 기준선이다** — TS 4213 이 성적서에 적으라고 요구하는 표준 보고
 * 항목(권장)을 모두 받는다. 최소로도 성적서는 나오지만 빠진 권장 항목이 "제공되지 않음"으로 찍힌다.
 */
export const PICK_TIERS: PickTierInfo[] = [
  {
    id: "minimum",
    name: "최소",
    description: "필수 항목만 받아요. 성적서는 나오지만 표준 보고 항목이 \"제공되지 않음\"으로 찍혀요.",
  },
  {
    id: "standard",
    name: "표준",
    description: "표준 보고 항목(권장)을 모두 받아요. 성적서가 충분한 품질로 나오는 기준이에요.",
  },
  {
    id: "detailed",
    name: "상세",
    description: "선택 항목까지 모두 받아요. AI 서술이 기댈 근거가 가장 많아요.",
  },
];

export function tierInfo(tier: PickTier): PickTierInfo {
  return PICK_TIERS.find((item) => item.id === tier)!;
}

/** 추천 세트 하나를 적용한 체크. 이 유형에서 보이는 카드마다 값을 둔다. */
export function picksForTier(tier: PickTier, taskType: TaskType | ""): MaterialPicks {
  const picks: MaterialPicks = {};
  for (const card of catalogCards(taskType)) {
    const ids = pickableIds(card.id, taskType);
    picks[card.id] =
      tier === "detailed"
        ? ids
        : tier === "standard"
          ? ids.filter((id) => pickIdKind(card.id, id) === "recommended")
          : [];
  }
  return picks;
}

/** 지금 체크가 그 세트와 똑같은지. 세트 버튼이 눌린 모양이 된다. */
export function matchesTier(tier: PickTier, taskType: TaskType | "", picks: MaterialPicks): boolean {
  const target = picksForTier(tier, taskType);
  return catalogCards(taskType).every((card) => {
    const a = orderPicks(card.id, taskType, picks[card.id] ?? []);
    const b = target[card.id] ?? [];
    return a.length === b.length && a.every((id, index) => id === b[index]);
  });
}

/** 구분별로 들어간 수와 전체 수. */
export interface PickCoverage {
  /** 필수 카드 수. 필수 카드는 늘 들어가 있다. */
  requiredCards: number;
  recommended: { picked: number; total: number };
  optional: { picked: number; total: number };
}

export function pickCoverage(taskType: TaskType | "", picks: MaterialPicks): PickCoverage {
  const coverage: PickCoverage = {
    requiredCards: 0,
    recommended: { picked: 0, total: 0 },
    optional: { picked: 0, total: 0 },
  };
  for (const card of catalogCards(taskType)) {
    if (card.locked) coverage.requiredCards += 1;
    const chosen = picks[card.id] ?? [];
    for (const id of pickableIds(card.id, taskType)) {
      const kind = pickIdKind(card.id, id);
      if (!kind) continue;
      coverage[kind].total += 1;
      if (chosen.includes(id)) coverage[kind].picked += 1;
    }
  }
  return coverage;
}

/**
 * 지금 체크가 어느 품질 단계인지. 권장을 다 받으면 표준, 선택까지 다 받으면 상세, 그 밖은 최소다.
 */
export function pickTier(taskType: TaskType | "", picks: MaterialPicks): PickTier {
  const { recommended, optional } = pickCoverage(taskType, picks);
  if (recommended.picked < recommended.total) return "minimum";
  return optional.picked < optional.total ? "standard" : "detailed";
}

/** 카드 하나에서 고르지 않은 권장 항목. */
export interface MissingRecommended {
  card: ComposerCard;
  fields: ComposerField[];
}

/**
 * 고르지 않은 권장 항목을 카드별로, 카탈로그 순서로(docs/MATERIAL_PICKER.md §5·§6).
 *
 * 권장 항목은 선택 카드 안의 표준 보고 항목이다. 고르지 않으면 성적서에 "제공되지 않음"으로 찍히므로
 * 재료 고르기 하단 바("빠진 항목 보기")가 알린다. 넣지 않은 선택 카드는 아무것도 고르지 않은 것으로
 * 본다. 입력값까지 본 생성 전 안내는 재료 선택 점검이 검증 화면에서 맡는다.
 */
export function missingRecommended(taskType: TaskType | "", picks: MaterialPicks): MissingRecommended[] {
  return catalogCards(taskType)
    .filter((card) => !card.locked)
    .map((card) => ({
      card,
      fields: getCardFields(card.id, taskType).filter(
        (field) =>
          pickKind(card, field) === "recommended" && !isFieldPicked(card, field, picks[card.id] ?? []),
      ),
    }))
    .filter((item) => item.fields.length > 0);
}

// ─── 평가 흐름 만들기 규칙(docs/MATERIAL_PICKER.md §12.2) ──────────────────────────────
//
// 위 함수들은 옛 재료 고르기 화면용이다(S3 에서 화면과 함께 지운다). 아래는 빈 흐름에서 항목을 넣어
// 블록을 만드는 새 화면의 규칙이다.
//
// - "놓였는가"(`isLeafPlaced`)는 입력 쪽 "받는가"(`isFieldPicked`)와 다르다. picks 가 없으면 아무것도
//   놓이지 않은 것이고, 필수 항목도 넣어야 놓인다.
// - 개수·"다음" 막힘·트리 강조·빠진 항목 보기는 모두 `flowStatus` 한 번의 결과를 쓴다(판정 지점 하나).

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
 * 블록째 넣을 때 들어갈 항목 — 필수와 권장. 둘 다 없는 블록이면 선택 전부.
 *
 * 블록을 넣는 것은 "이 블록을 성적서에 싣겠다"는 뜻이라 표준 보고 항목까지 빠짐없이 받는 쪽을 기본으로
 * 둔다. 빼고 싶은 항목은 하나씩 뺀다.
 */
export function blockFillIds(cardId: ComposerCardId, taskType: TaskType | ""): string[] {
  const leaves = flowLeaves(cardId, taskType).filter((leaf) => leaf.kind !== "conditional");
  const main = leaves.filter((leaf) => leaf.kind === "required" || leaf.kind === "recommended");
  return (main.length > 0 ? main : leaves).map((leaf) => leaf.leafId);
}

/** 흐름도에 블록이 보이는가 — 이 유형의 (조건부가 아닌) 항목이 하나라도 놓였을 때. */
export function isBlockShown(cardId: ComposerCardId, taskType: TaskType | "", picks: MaterialPicks): boolean {
  return flowLeaves(cardId, taskType).some((leaf) => leaf.kind !== "conditional" && isLeafPlaced(leaf, picks));
}

/** 보이는 블록을 입력 순서대로. 흐름도 번호가 이 순서다. */
export function shownBlocksInOrder(
  order: readonly ComposerCardId[],
  taskType: TaskType | "",
  picks: MaterialPicks,
): ComposerCard[] {
  const visible = new Set(getVisibleCards(taskType).map((card) => card.id));
  return normalizeCardOrder(order)
    .filter((id) => visible.has(id) && isBlockShown(id, taskType, picks))
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
