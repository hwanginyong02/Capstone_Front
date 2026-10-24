/**
 * 칸→자리 대응표 — 코드 상수가 공통 계약 `narrative_slots_ed4.json` 과 같고, 자리 변환이 백엔드 `sections.place(…, edition=4)` 와
 * 같은 결과다(백엔드 시험 test_p4_fact_view_ed4·test_p4_integration_ed4(f1796fe) 의 사례를 옮김).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  B26_RECORD_LINES,
  ED4_NARRATIVE_SLOTS,
  ED4_RECOMMEND_SECTIONS,
  ED4_SLOT_ORDER,
  edition4PlaceOfSlot,
  edition4PlacesText,
  edition4TitleOfSlot,
} from "./narrativeSlots";
import { ED4_TITLES } from "./edition4Text";

const SLOTS = JSON.parse(readFileSync(resolve(__dirname, "../../../test/contract/narrative_slots_ed4.json"), "utf8"));
const WORDING = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/fixedWording.ed4.json"), "utf8"));

describe("대응표 = 공통 계약 JSON", () => {
  it("slots·recommend_sections·order_edition4", () => {
    expect(ED4_NARRATIVE_SLOTS).toEqual(SLOTS.slots);
    expect(ED4_RECOMMEND_SECTIONS).toEqual(SLOTS.recommend_sections);
    expect(ED4_SLOT_ORDER).toEqual(SLOTS.order_edition4);
  });

  it("작성 기록 줄(B26) = JSON record_panel.lines = 계획 부록 B26 글", () => {
    expect(B26_RECORD_LINES).toEqual(SLOTS.record_panel.lines);
    expect(WORDING.appendixB_raw.B26.candidate.startsWith(`${B26_RECORD_LINES.map((l) => l.text).join(" / ")}. `)).toBe(true);
  });

  it("자리 제목 = 판 4 소절 제목(ED4_TITLES)", () => {
    for (const s of [...ED4_NARRATIVE_SLOTS, ...ED4_RECOMMEND_SECTIONS]) {
      expect(ED4_TITLES[s.edition4_place as keyof typeof ED4_TITLES]).toBe(s.edition4_title);
    }
  });
});

describe("자리 변환 = 백엔드 place(…, edition=4)", () => {
  it("칸 하나·권고 칸·모르는 이름", () => {
    expect(edition4PlaceOfSlot("8.2")).toBe("5.1");
    expect(edition4PlaceOfSlot("9.1")).toBe("6.1");
    expect(edition4PlaceOfSlot("4.3")).toBe("4.3");
    expect(edition4PlaceOfSlot("9")).toBe("6");
  });

  it("제목", () => {
    expect(edition4TitleOfSlot("8.2")).toBe("판정과 불확실성");
    expect(edition4TitleOfSlot("9.2")).toBe("모델과 운영");
    expect(edition4TitleOfSlot("4.3")).toBeNull();
  });

  it("가운뎃점으로 이은 값(최약 클래스 '7.1·8.3' → '5.2·5.5')", () => {
    expect(edition4PlacesText("7.1·8.3")).toBe("5.2·5.5");
    expect(edition4PlacesText("8.2")).toBe("5.1");
    expect(edition4PlacesText("7.2·4.3")).toBe("5.3·4.3");
  });

  it("쉼표로 이은 값도 하나씩, 구분자는 그대로", () => {
    expect(edition4PlacesText("7.2, 8.2")).toBe("5.3, 5.1");
    expect(edition4PlacesText("7.3,9.2")).toBe("5.6,6.2");
    expect(edition4PlacesText("")).toBe("");
  });
});
