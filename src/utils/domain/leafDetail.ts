/**
 * 평가 흐름 만들기의 설명 팝업 내용(docs/MATERIAL_PICKER.md §12.3) — 순수 함수만 둔다.
 *
 * 팝업은 항목마다 의미 / 입력 형태 / 입력 예시 / 표준 근거를 보인다. 내용은 모두 레지스트리
 * (`data/reportComposer.ts`)에서 읽는다 — 문구를 따로 두지 않아 레지스트리를 고치면 팝업도 따라간다.
 * 표준 근거가 없는 항목은 그 줄을 **아예 그리지 않는다**("근거 없음"은 "중요하지 않다"로 읽힌다).
 */
import {
  conditionTriggerIds,
  fieldFormat,
  fieldOfLeaf,
  fieldParts,
  getCard,
} from "../../data/reportComposer";
import { REPORTING_ITEMS } from "../../lib/report/materialCheck";
import type { FieldPart, FlowLeaf, StandardBasis } from "../../types/reportComposer.types";

/** "하나 선택: A / B" 처럼 선택지가 붙은 형식을 형식 이름과 선택지로 나눈다. */
export function splitFormat(format: string): { kind: string; choices?: string } {
  const at = format.indexOf(": ");
  return at < 0 ? { kind: format } : { kind: format.slice(0, at), choices: format.slice(at + 2) };
}

/** 설명 끝의 "예: …"를 떼어 낸다. */
export function splitExample(description: string): { text: string; example?: string } {
  const at = description.lastIndexOf("예: ");
  if (at < 0) return { text: description };
  return { text: description.slice(0, at).trim(), example: description.slice(at + 3).trim() };
}

/**
 * 표준 근거 한 줄. 조항 번호와, 있으면 재료 선택 점검 2층 항목 이름이다. 원문과 대조한 요구 문장
 * (`requirement`)이 있으면 그것을 쓴다.
 * 예: "ISO/IEC TS 4213 8절 — 학습 데이터의 출처·크기·구성", "ISO/IEC 17025 7.8.2.1 e)"
 */
export function standardBasisText(basis: StandardBasis): string {
  const head = `${basis.standard} ${basis.clause}`;
  const item = REPORTING_ITEMS.find((def) => def.item === basis.reportingItem)?.name;
  const tail = basis.requirement ?? item;
  return tail ? `${head} — ${tail}` : head;
}

/** 팝업 하나의 내용. 없는 칸은 그리지 않는다. */
export interface LeafDetail {
  label: string;
  blockName: string;
  /** 칸 항목(홈페이지·팩스처럼 필드를 쪼갠 것)이면 묶음 필드의 이름과 설명. */
  group?: { label: string; description?: string };
  meaning?: string;
  format?: { kind: string; choices?: string };
  /** 칸이 여럿인 필드의 칸 목록(실행 환경의 운영체제·CPU·…, 회사 정보의 회사명·대표자·…). */
  parts?: FieldPart[];
  allowsUnknown: boolean;
  example?: string;
  /** 결과 파일 — 팝업이 파일 예시 표를 붙인다. */
  file: boolean;
  /** 표준 근거 한 줄. 없으면 그 줄을 그리지 않는다. */
  basis?: string;
  /** 함께 들어감 — 조건을 정하는 항목 이름과 조건 문구. */
  companion?: { triggerLabels: string[]; condition?: string };
}

/** 항목 하나의 설명 팝업 내용. */
export function leafDetail(leaf: FlowLeaf): LeafDetail {
  const card = getCard(leaf.cardId);
  const field = fieldOfLeaf(leaf.cardId, leaf.leafId);
  if (!field) throw new Error(`모르는 항목: ${leaf.cardId}/${leaf.leafId}`);

  const part = leaf.partKey ? field.parts?.find((item) => item.key === leaf.partKey) : undefined;
  const description = part ? part.description : field.description;
  const { text, example } = description ? splitExample(description) : { text: undefined, example: undefined };
  const format = part ? part.format : fieldFormat(field);
  const parts = part ? [] : fieldParts(field);

  return {
    label: leaf.label,
    blockName: card.name,
    group: part ? { label: field.label, description: field.description } : undefined,
    meaning: text || undefined,
    format: format ? splitFormat(format) : undefined,
    parts: parts.length > 0 ? parts : undefined,
    allowsUnknown: Boolean(field.allowsUnknown),
    // 필드는 레지스트리의 입력 예시(`inputExample`), 칸 항목은 칸 설명 끝의 "예: …"다.
    example: part ? example : field.inputExample || example,
    file: field.input === "file",
    // 칸 항목은 필드의 근거를 물려받는다.
    basis: field.standardBasis ? standardBasisText(field.standardBasis) : undefined,
    companion:
      leaf.kind === "conditional"
        ? {
            triggerLabels: conditionTriggerIds(field).map(
              (id) => card.fields.find((item) => item.id === id)?.label ?? id,
            ),
            condition: field.conditionLabel,
          }
        : undefined,
  };
}
