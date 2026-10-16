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
  fieldFormat,
  fieldParts,
  getCard,
  getCardFields,
  isFieldPicked,
  partPickId,
  pickKind,
  pickableIds,
} from "../../data/reportComposer";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerField,
  FieldPart,
  MaterialPicks,
  PickKind,
} from "../../types/reportComposer.types";

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
 * 재료 고르기 하단 바와 확인과 생성 단계에서 알린다. 넣지 않은 선택 카드는 아무것도 고르지 않은
 * 것으로 본다.
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
