/**
 * 숨긴 버튼의 키보드·터치 접근(U2). CSS 로 숨긴 버튼은 jsdom 에서도 보이므로, 숨김 규칙이 키보드
 * 포커스와 터치를 막지 않는지는 이 테스트만 잡는다.
 */
import { describe, expect, it } from "vitest";

import { REVEAL } from "./controlStyles";

describe("REVEAL", () => {
  const groups = Object.entries(REVEAL);

  it("그룹마다 마우스 기기에서만 숨기고, 올리거나 포커스가 가면 보인다", () => {
    expect(groups.length).toBeGreaterThan(0);
    for (const [group, classes] of groups) {
      const tokens = classes.split(/\s+/);
      expect(tokens).toContain("can-hover:opacity-0");
      expect(tokens).toContain(`group-hover/${group}:opacity-100`);
      expect(tokens).toContain(`group-focus-within/${group}:opacity-100`);
      expect(tokens).toContain("focus-visible:opacity-100");
    }
  });

  it("DOM 에서 빼거나 보이지 않게 하는 클래스를 쓰지 않는다", () => {
    for (const [, classes] of groups) {
      for (const token of classes.split(/\s+/)) {
        expect(token).not.toMatch(/(^|:)(hidden|invisible|sr-only)$/);
        // 숨김은 can-hover 일 때만이다 — 맨 opacity-0 은 터치에서도 숨긴다.
        expect(token).not.toBe("opacity-0");
      }
    }
  });
});
