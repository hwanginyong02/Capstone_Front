/**
 * 서술 칸 → 판 4 자리 대응표(판 4 라운드 대응표 29) — 공통 계약 `src/test/contract/narrative_slots_ed4.json`(두 저장소 같은 바이트)과
 * 같은 내용을 코드 안 상수로 둔다(시험 `narrativeSlots.test.ts` 가 JSON 과 대조). 백엔드 짝은 `app/narrative/sections.py`
 * (`EDITION4_PLACES`·`EDITION4_TITLES`·`place`).
 *
 * 칸 이름(판 3 절 번호 7.1…9, 9.1·9.2)은 저장값 그대로이고 판 4 에서 찍히는 자리만 바뀐다(서술 설계 D47).
 */

export interface Ed4NarrativeSlot {
  slot: string;
  edition4_place: string;
  edition4_title: string;
  /** 서술 앞·뒤에 앱이 찍는 고정 문구 번호. */
  fixed_before_narrative: string[];
  fixed_after_narrative: string[];
  /** 빈 글·빈 칸일 때 찍는 것(설명). */
  empty: string | null;
}

/** 서술 칸 일곱(판 4 찍는 순서). */
export const ED4_NARRATIVE_SLOTS: ReadonlyArray<Ed4NarrativeSlot> = [
  { slot: "8.2", edition4_place: "5.1", edition4_title: "판정과 불확실성", fixed_before_narrative: [], fixed_after_narrative: ["11a", "11b"], empty: null },
  { slot: "7.1", edition4_place: "5.2", edition4_title: "오분류", fixed_before_narrative: [], fixed_after_narrative: [], empty: null },
  { slot: "7.2", edition4_place: "5.3", edition4_title: "데이터 분포", fixed_before_narrative: ["12"], fixed_after_narrative: [], empty: null },
  { slot: "8.1", edition4_place: "5.4", edition4_title: "참조 범위", fixed_before_narrative: [], fixed_after_narrative: [], empty: "B18 '해당 없음'(모든 지표가 기준표 밖)" },
  { slot: "8.3", edition4_place: "5.5", edition4_title: "운영 위험", fixed_before_narrative: [], fixed_after_narrative: [], empty: null },
  { slot: "7.3", edition4_place: "5.6", edition4_title: "추가 관찰", fixed_before_narrative: [], fixed_after_narrative: [], empty: "고정 문구 15 '해당 없음'(빈 글)" },
  { slot: "9", edition4_place: "6", edition4_title: "개선 권고", fixed_before_narrative: [], fixed_after_narrative: [], empty: "고정 문구 6(문제 0개)" },
];

/** 권고 칸 둘(문제의 recommend_section 9.1/9.2 → 6.1/6.2). */
export const ED4_RECOMMEND_SECTIONS: ReadonlyArray<{ slot: string; edition4_place: string; edition4_title: string; one_side_empty: string }> = [
  { slot: "9.1", edition4_place: "6.1", edition4_title: "데이터", one_side_empty: "B19 — 소제목은 두고 그 칸의 서술만 찍고 표는 그리지 않는다" },
  { slot: "9.2", edition4_place: "6.2", edition4_title: "모델과 운영", one_side_empty: "B19" },
];

/** 판 4 찍는 칸 순서(5.1→5.6, 6). */
export const ED4_SLOT_ORDER: ReadonlyArray<string> = ED4_NARRATIVE_SLOTS.map((s) => s.slot);

/** 부록 B26 — 화면 작성 기록 줄(칸마다). 뒤 이름표는 판 3 `narrativeRecordLabel` 그대로. */
export const B26_RECORD_LINES: ReadonlyArray<{ slot: string; text: string }> = ED4_NARRATIVE_SLOTS.map((s) => ({
  slot: s.slot,
  text: `${s.edition4_place} ${s.edition4_title}(${s.slot} 칸)`,
}));

const ALL = [...ED4_NARRATIVE_SLOTS, ...ED4_RECOMMEND_SECTIONS];
const PLACE_OF = new Map(ALL.map((s) => [s.slot, s.edition4_place]));
const TITLE_OF = new Map(ALL.map((s) => [s.slot, s.edition4_title]));

/** 칸 이름 → 판 4 자리("8.2" → "5.1", "9.1" → "6.1"). 모르는 이름은 그대로(백엔드 `place(…, edition=4)` 와 같음). */
export function edition4PlaceOfSlot(slot: string): string {
  return PLACE_OF.get(slot) ?? slot;
}

/** 칸 이름 → 판 4 자리 제목("8.2" → "판정과 불확실성"). 모르는 이름은 null. */
export function edition4TitleOfSlot(slot: string): string | null {
  return TITLE_OF.get(slot) ?? null;
}

/**
 * 문제의 '드러난 절' 같은 칸 이름 글을 판 4 자리로 — 가운뎃점·쉼표로 이은 값은 하나씩 바꾸고 구분자는 그대로 둔다
 * ("7.1·8.3" → "5.2·5.5", "7.2, 8.2" → "5.3, 5.1"). 모르는 이름은 그대로. 가운뎃점 갈래는 백엔드 `place` 와 같다
 * (백엔드는 쉼표를 나누지 않는다 — 지금 프론트 저장값에 쉼표로 이은 값은 없다).
 */
export function edition4PlacesText(text: string): string {
  return text
    .split(/(\s*[·,]\s*)/)
    .map((part, i) => (i % 2 === 1 ? part : edition4PlaceOfSlot(part)))
    .join("");
}
