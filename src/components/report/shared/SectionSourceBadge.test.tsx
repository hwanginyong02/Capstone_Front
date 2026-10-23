/**
 * 칸별 출처 배지(서술 라운드 세션 B, 사용자 결정 3) — 판 3 && 서술 대기·실패 아님 && 그 칸이 fallback 일 때만.
 * 배치(어느 소절 옆)는 다음 갈래가 섹션에 단다 — 여기서는 판정 함수와 부품.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SECTION_SOURCE_BADGE_TEXT, SectionSourceBadge, sectionBadgeKind } from "./SectionSourceBadge";
import { SubsectionTitle, subsectionPrefix } from "./SubsectionTitle";

const SECTIONS = { "7.1": "llm", "7.3": "fixed", "8.1": "fallback", "9": "fallback" } as const;

describe("sectionBadgeKind", () => {
  it("판 3·서술 끝남·그 칸 fallback 이면 'fallback'", () => {
    expect(sectionBadgeKind(true, "fallback", SECTIONS, "8.1")).toBe("fallback");
    // 전체 출처가 llm 이어도(옛 값) 칸이 fallback 이면 단다 — 칸 출처가 기준이다.
    expect(sectionBadgeKind(true, "llm", SECTIONS, "9")).toBe("fallback");
  });

  it("llm·fixed·출처 없는 칸은 배지 없음", () => {
    expect(sectionBadgeKind(true, "fallback", SECTIONS, "7.1")).toBeNull();
    expect(sectionBadgeKind(true, "fallback", SECTIONS, "7.3")).toBeNull();
    expect(sectionBadgeKind(true, "fallback", SECTIONS, "8.2")).toBeNull();
    expect(sectionBadgeKind(true, "fallback", undefined, "8.1")).toBeNull();
  });

  it("판 1·2 는 칸별 배지 없음(옛 장 배지를 쓴다) — 판 2 보관본에도 칸별 출처가 있다", () => {
    expect(sectionBadgeKind(false, "fallback", SECTIONS, "8.1")).toBeNull();
    expect(sectionBadgeKind(undefined, "fallback", SECTIONS, "8.1")).toBeNull();
  });

  it.each(["pending", "failed"] as const)("서술 %s 이면 낡은 칸별 출처로 그리지 않는다", (source) => {
    expect(sectionBadgeKind(true, source, SECTIONS, "8.1")).toBeNull();
  });
});

describe("SectionSourceBadge", () => {
  it("fallback 이면 '규칙 기반 문장' — 화면에만(print:hidden)", () => {
    render(<SectionSourceBadge kind="fallback" />);
    const badge = screen.getByText(SECTION_SOURCE_BADGE_TEXT);
    expect(SECTION_SOURCE_BADGE_TEXT).toBe("규칙 기반 문장");
    expect(badge).toHaveClass("print:hidden");
  });

  it("null 이면 아무것도 그리지 않는다", () => {
    const { container } = render(<SectionSourceBadge kind={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SubsectionTitle", () => {
  it("판 3 이면 '{번호} ' 접두, 아니면 제목만(종전 h3 와 같은 요소)", () => {
    expect(subsectionPrefix("7.1", true)).toBe("7.1 ");
    expect(subsectionPrefix("7.1", false)).toBe("");
    const { container, rerender } = render(
      <SubsectionTitle number="7.1" schema3 className="c">
        제목
      </SubsectionTitle>,
    );
    expect(container.innerHTML).toBe('<h3 class="c">7.1 제목</h3>');
    rerender(
      <SubsectionTitle number="7.1" className="c">
        제목
      </SubsectionTitle>,
    );
    expect(container.innerHTML).toBe('<h3 class="c">제목</h3>');
    rerender(
      <SubsectionTitle number="3.1" schema3 as="h4" className="c">
        제목
      </SubsectionTitle>,
    );
    expect(container.innerHTML).toBe('<h4 class="c">3.1 제목</h4>');
  });
});
