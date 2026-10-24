/**
 * 판 4 5절 분석 소견의 칸 배치(판 4 라운드 계획 4절 "5절 배치 + ※ 줄", 갈래 b5) — 저장값을 **읽기만** 해서 자리마다 그릴 것을 정한다.
 *
 * 칸 → 자리(`narrativeSlots.ts` 의 대응표 순서):
 * - 8.2 → 5.1 `conclusion.narrative`, 뒤에 고정 문구 11a·11b(`sourceRelationSentence`, 저장값)
 * - 7.1 → 5.2 `interpretation.confusionAnalysis`
 * - 7.2 → 5.3 `interpretation.distributionAnalysis`, 앞에 고정 문구 12(`labelCautionSentence`, 저장값 — 판 3 처럼 서술 앞)
 * - 8.1 → 5.4 `conclusion.benchmark` — 서술이 끝났고 빈 글이며 칸 출처가 fixed(모든 지표가 기준표 밖)면 B18 "해당 없음"
 * - 8.3 → 5.5 `conclusion.risks`
 * - 7.3 → 5.6 `interpretation.additionalObservations` — 서술이 끝났고 키가 있는데 빈 글이면 고정 문구 15 "해당 없음"
 *
 * 빈 칸 규칙은 판 3 절과 같다: 서술 대기·실패(`narrativeSource` pending·failed)면 빈 칸 문구 대신 공용 `narrativePlaceholder` 의
 * 대기·실패 글, 그 밖의 빈 칸은 판 3 자리표시 글. 칸 배지(규칙 기반 칸)는 판 3 공용 `sectionBadgeKind` 와 같은 규칙(대기·실패면 없음).
 */
import type { FinalReportData } from "../../../../types/finalReport.types";
import { sectionBadgeKind } from "../../../../components/report/shared/SectionSourceBadge";
import { draftPlaceholder, narrativePlaceholder } from "../../../../components/report/shared/narrativePlaceholder";
import { NO_ADDITIONAL_OBSERVATION_TEXT } from "../../narrativeSectionText";
import { B18_NOT_APPLICABLE, type Ed4TitleNumber } from "../edition4Text";
import { edition4PlaceOfSlot } from "../narrativeSlots";
import { ED3_CONCLUSION_PLACEHOLDER, ED3_INTERPRET_PLACEHOLDER } from "./findingsText";

/** 칸 몸통 — 서술 글(문단으로), 빈 칸 고정 문구(B18·15), 자리표시(대기·실패·미작성). */
export type Ed4SlotBody =
  | { kind: "narrative"; text: string }
  | { kind: "fixed"; text: string }
  | { kind: "placeholder"; text: string };

export interface Ed4FindingBlock {
  /** 판 4 자리("5.1"…). */
  place: Ed4TitleNumber;
  /** 서술 칸 이름(저장값 키 — "8.2"…). */
  slot: string;
  /** 서술 앞에 찍는 저장 문장(고정 문구 12). */
  before: string[];
  body: Ed4SlotBody;
  /** 서술 뒤에 찍는 저장 문장(고정 문구 11a·11b). */
  after: string[];
  /** 화면 전용 칸 배지 — 규칙 기반 칸이면 "fallback". */
  badge: "fallback" | null;
}

const isWaiting = (data: FinalReportData) => data.narrativeSource === "pending" || data.narrativeSource === "failed";

/**
 * 칸 몸통 하나 — 판 3 `NarrativeBlock` 과 같은 규칙. 글이 있으면 서술, 빈 글이고 서술이 끝났으며 빈 칸 문구가 있으면 그 문구,
 * 아니면 자리표시(대기·실패 글 또는 판 3 미작성 글).
 */
export function ed4SlotBody(
  data: FinalReportData,
  text: string | null | undefined,
  emptyText: string | undefined,
  otherwise: string,
): Ed4SlotBody {
  if ((text ?? "").trim() !== "") return { kind: "narrative", text: text as string };
  if (emptyText !== undefined && !isWaiting(data)) return { kind: "fixed", text: emptyText };
  return { kind: "placeholder", text: narrativePlaceholder(data.narrativeSource, draftPlaceholder(otherwise, true)) };
}

const present = (s: string | null | undefined): string[] => (s && s.trim() !== "" ? [s] : []);

/** 5.1~5.6 여섯 자리(대응표 순서). */
export function ed4FindingBlocks(data: FinalReportData): Ed4FindingBlock[] {
  const interp = data.interpretation ?? { confusionAnalysis: "", distributionAnalysis: "" };
  const conclusion = data.conclusion;
  const sections = data.narrativeSections;
  const block = (
    slot: string,
    text: string | null | undefined,
    otherwise: string,
    extra: { before?: string[]; after?: string[]; emptyText?: string } = {},
  ): Ed4FindingBlock => ({
    place: edition4PlaceOfSlot(slot) as Ed4TitleNumber,
    slot,
    before: extra.before ?? [],
    body: ed4SlotBody(data, text, extra.emptyText, otherwise),
    after: extra.after ?? [],
    badge: sectionBadgeKind(true, data.narrativeSource, sections, slot),
  });
  return [
    block("8.2", conclusion?.narrative, ED3_CONCLUSION_PLACEHOLDER, { after: present(data.sourceRelationSentence) }),
    block("7.1", interp.confusionAnalysis, ED3_INTERPRET_PLACEHOLDER),
    block("7.2", interp.distributionAnalysis, ED3_INTERPRET_PLACEHOLDER, { before: present(data.labelCautionSentence) }),
    block("8.1", conclusion?.benchmark, ED3_CONCLUSION_PLACEHOLDER, {
      emptyText: sections?.["8.1"] === "fixed" ? B18_NOT_APPLICABLE : undefined,
    }),
    block("8.3", conclusion?.risks, ED3_CONCLUSION_PLACEHOLDER),
    block("7.3", interp.additionalObservations, ED3_INTERPRET_PLACEHOLDER, {
      emptyText: interp.additionalObservations !== undefined ? NO_ADDITIONAL_OBSERVATION_TEXT : undefined,
    }),
  ];
}
