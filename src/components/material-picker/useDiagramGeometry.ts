/**
 * 흐름도 노드와 단계 섹션의 좌표를 잰다(docs/MATERIAL_PICKER.md §12.3). 연결선 경로(`routeEdge`)가
 * 이 좌표를 쓴다.
 *
 * - 좌표는 흐름도 안쪽 래퍼(`relative`, 함께 스크롤됨) 기준이다. 그래서 스크롤해도 다시 잴 필요가 없다.
 * - `[data-flow-node]`·`[data-flow-lane]` 요소를 잰다. 칩이 하나 늘면 같은 단계 아래 노드가 밀리므로
 *   래퍼와 각 노드를 따로 지켜본다(ResizeObserver). 노드 목록이 바뀌면(`layoutKey`) 다시 재고, 글꼴이
 *   다 불린 뒤에도 다시 잰다.
 * - ResizeObserver 가 없으면(jsdom) 한 번만 잰다. 테스트는 좌표가 아니라 선이 있는지만 본다.
 */
import { useLayoutEffect, useState, type RefObject } from "react";
import type { Rect } from "./diagramGeometry";

export interface DiagramGeometry {
  nodes: ReadonlyMap<string, Rect>;
  lanes: ReadonlyMap<string, Rect>;
  size: { width: number; height: number };
}

const EMPTY: DiagramGeometry = { nodes: new Map(), lanes: new Map(), size: { width: 0, height: 0 } };

function measure(container: HTMLElement): DiagramGeometry {
  const origin = container.getBoundingClientRect();
  const read = (selector: string, attribute: string) =>
    new Map(
      [...container.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const box = element.getBoundingClientRect();
        return [
          element.getAttribute(attribute) ?? "",
          { x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height },
        ] as const;
      }),
    );
  return {
    nodes: read("[data-flow-node]", "data-flow-node"),
    lanes: read("[data-flow-lane]", "data-flow-lane"),
    size: { width: origin.width, height: origin.height },
  };
}

/** 같은 좌표면 상태를 바꾸지 않는다 — 재고 그리고 다시 재는 고리를 끊는다. */
function sameGeometry(a: DiagramGeometry, b: DiagramGeometry): boolean {
  if (a.size.width !== b.size.width || a.size.height !== b.size.height) return false;
  const same = (x: ReadonlyMap<string, Rect>, y: ReadonlyMap<string, Rect>) =>
    x.size === y.size &&
    [...x].every(([key, rect]) => {
      const other = y.get(key);
      return (
        other !== undefined &&
        other.x === rect.x &&
        other.y === rect.y &&
        other.width === rect.width &&
        other.height === rect.height
      );
    });
  return same(a.nodes, b.nodes) && same(a.lanes, b.lanes);
}

export function useDiagramGeometry(contentRef: RefObject<HTMLElement | null>, layoutKey: string): DiagramGeometry {
  const [geometry, setGeometry] = useState<DiagramGeometry>(EMPTY);

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const update = () => {
      const next = measure(container);
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };
    update();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) update();
    });
    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }
    const observer = new ResizeObserver(update);
    observer.observe(container);
    container.querySelectorAll("[data-flow-node], [data-flow-lane]").forEach((element) => observer.observe(element));
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [contentRef, layoutKey]);

  return geometry;
}
