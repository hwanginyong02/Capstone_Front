import { describe, expect, it } from "vitest";

import { scrollEdges } from "./useScrollEdges";

describe("scrollEdges", () => {
  it("맨 위에서는 아래에만 더 있다", () => {
    expect(scrollEdges({ scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })).toMatchObject({
      top: false,
      bottom: true,
    });
  });

  it("가운데에서는 위아래 모두 더 있다", () => {
    expect(scrollEdges({ scrollTop: 300, scrollHeight: 1000, clientHeight: 400 })).toMatchObject({
      top: true,
      bottom: true,
    });
  });

  it("맨 아래(소수 px 차이 포함)에서는 위에만 더 있다", () => {
    expect(scrollEdges({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toMatchObject({
      top: true,
      bottom: false,
    });
    expect(scrollEdges({ scrollTop: 599.5, scrollHeight: 1000, clientHeight: 400 }).bottom).toBe(false);
  });

  it("넘치지 않으면 어느 쪽도 없다", () => {
    expect(scrollEdges({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 })).toMatchObject({
      top: false,
      bottom: false,
    });
  });
});
