import { describe, expect, it } from "vitest";

import { firstHiddenBelow, hiddenBelowCount, routeEdge, toPath, type Rect } from "./diagramGeometry";

const rect = (x: number, y: number, width = 100, height = 40): Rect => ({ x, y, width, height });

describe("routeEdge", () => {
  it("세로: 바로 아래 노드는 아래 가운데에서 위 가운데로 곧게 내려간다", () => {
    expect(routeEdge(rect(0, 0), rect(0, 80))).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 80 },
    ]);
  });

  it("세로: 가운데가 어긋나면 두 노드 사이 높이에서 옮겨 타고 대상 위로 들어간다", () => {
    expect(routeEdge(rect(0, 0, 40, 20), rect(0, 60, 200, 40))).toEqual([
      { x: 20, y: 20 },
      { x: 20, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 60 },
    ]);
  });

  it("오른쪽: 오른쪽 열의 노드는 틈 가운데에서 꺾어 대상 왼쪽으로 들어간다", () => {
    const points = routeEdge(rect(0, 100), rect(140, 0));
    expect(points).toEqual([
      { x: 100, y: 120 },
      { x: 120, y: 120 },
      { x: 120, y: 20 },
      { x: 140, y: 20 },
    ]);
    // 마지막 토막은 가로로 들어간다(화살촉이 오른쪽을 향함).
    const [before, last] = points.slice(-2);
    expect(before.y).toBe(last.y);
    expect(last.x).toBeGreaterThan(before.x);
  });

  it("오른쪽: 높이가 같으면 곧은 가로선 하나다", () => {
    expect(routeEdge(rect(0, 0), rect(140, 0))).toEqual([
      { x: 100, y: 20 },
      { x: 140, y: 20 },
    ]);
  });

  it("줄바꿈: 다음 행 왼쪽 노드는 행 사이 틈에서 옆으로 가고 대상 위로 들어간다", () => {
    const points = routeEdge(rect(300, 0), rect(0, 200), 170);
    expect(points).toEqual([
      { x: 350, y: 40 },
      { x: 350, y: 170 },
      { x: 50, y: 170 },
      { x: 50, y: 200 },
    ]);
    const [before, last] = points.slice(-2);
    expect(before.x).toBe(last.x);
    expect(last.y).toBeGreaterThan(before.y);
  });

  it("줄바꿈: 틈 높이를 주지 않으면 대상 위 24px 에서 옆으로 간다", () => {
    expect(routeEdge(rect(300, 0), rect(0, 200))[1]).toEqual({ x: 350, y: 176 });
  });
});

describe("toPath", () => {
  it("곧은 선은 M 과 L 뿐이다", () => {
    expect(toPath([{ x: 0, y: 0 }, { x: 0, y: 50 }])).toBe("M0 0 L0 50");
  });

  it("꺾인 곳은 Q 로 둥글린다", () => {
    expect(toPath([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 50, y: 50 }])).toBe("M0 0 L0 44 Q0 50 6 50 L50 50");
  });

  it("짧은 토막에서는 반지름을 토막의 절반으로 줄인다", () => {
    expect(toPath([{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 50, y: 4 }])).toBe("M0 0 L0 2 Q0 4 2 4 L50 4");
  });

  it("점이 없으면 빈 문자열이다", () => {
    expect(toPath([])).toBe("");
  });
});

describe("hiddenBelowCount", () => {
  const blocks = [rect(0, 0), rect(0, 300), rect(0, 600), rect(0, 900)];

  it("보이는 영역 아래로 완전히 가려진 블록만 센다", () => {
    expect(hiddenBelowCount(blocks, 0, 500)).toBe(2);
    expect(hiddenBelowCount(blocks, 0, 600)).toBe(2);
    expect(hiddenBelowCount(blocks, 0, 601)).toBe(1);
    expect(hiddenBelowCount(blocks, 500, 500)).toBe(0);
  });

  it("가장 위의 가려진 블록으로 스크롤한다", () => {
    expect(firstHiddenBelow([rect(0, 900), rect(0, 600), rect(0, 0)], 0, 500)).toEqual(rect(0, 600));
    expect(firstHiddenBelow(blocks, 500, 500)).toBeNull();
  });
});
