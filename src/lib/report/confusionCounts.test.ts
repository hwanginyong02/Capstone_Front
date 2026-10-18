import { describe, expect, it } from "vitest";

import { parseConfusionCounts } from "./confusionCounts";

describe("parseConfusionCounts", () => {
  it("이진은 양성 클래스 한 줄", () => {
    expect(parseConfusionCounts({ type: "binary", positive_class: "1", tp: 5, tn: 4, fp: 3, fn: 2 })).toEqual({
      kind: "binary",
      rows: [{ label: "1", tp: 5, fp: 3, fn: 2, tn: 4 }],
    });
  });

  it("다중·멀티는 클래스마다", () => {
    const counts = parseConfusionCounts({
      type: "per_class",
      rows: [
        { label: "a", tp: 1, fp: 2, fn: 3, tn: 4 },
        { label: "b", tp: 4, fp: 3, fn: 2, tn: 1 },
      ],
    });
    expect(counts?.kind).toBe("perClass");
    expect(counts?.rows.map((r) => r.label)).toEqual(["a", "b"]);
  });

  it("없거나 모양이 틀리면 null — 성적서가 건수를 지어내지 않는다", () => {
    expect(parseConfusionCounts(undefined)).toBeNull();
    expect(parseConfusionCounts({ type: "binary", tp: -1, tn: 0, fp: 0, fn: 0 })).toBeNull();
    expect(parseConfusionCounts({ type: "per_class", rows: [] })).toBeNull();
  });
});
