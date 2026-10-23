/**
 * 흐름도의 연결선(docs/MATERIAL_PICKER.md §12.3) — 노드 위에 겹친 SVG. 선과 화살촉은 토큰 색만 쓴다.
 *
 * 선 목록은 `flowEdges`, 경로는 `routeEdge`, 좌표는 `useDiagramGeometry` 가 준다. 좌표가 아직 없으면
 * (첫 그림, jsdom) 경로는 비어도 선 요소는 늘 그린다 — 테스트가 data 속성으로 선이 있는지 본다.
 * 빈 자리에 닿는 선은 점선이다.
 */
import { useId } from "react";
import type { FlowEdge, FlowNode } from "../../utils/domain/flowChart";
import { routeEdge, toPath, CORRIDOR_OFFSET } from "./diagramGeometry";
import type { DiagramGeometry } from "./useDiagramGeometry";

interface DiagramEdgesProps {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  geometry: DiagramGeometry;
}

export function DiagramEdges({ nodes, edges, geometry }: DiagramEdgesProps) {
  // useId 의 콜론 등은 url(#…) 참조에서 깨질 수 있어 뺀다.
  const id = `flow${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const solidMarker = `${id}-arrow`;
  const dashedMarker = `${id}-arrow-dashed`;
  const laneOf = new Map(nodes.map((node) => [node.id, node.laneId]));

  const pathOf = (edge: FlowEdge) => {
    const from = geometry.nodes.get(edge.from);
    const to = geometry.nodes.get(edge.to);
    if (!from || !to) return "";
    // 줄바꿈은 대상 단계 섹션 위의 행 사이 틈에서 옆으로 간다(블록 위가 아니라 — 단계 머리를 지나지 않게).
    const lane = laneOf.get(edge.to);
    const laneRect = lane ? geometry.lanes.get(lane) : undefined;
    return toPath(routeEdge(from, to, laneRect ? laneRect.y - CORRIDOR_OFFSET : undefined));
  };

  return (
    <svg
      aria-hidden="true"
      width={geometry.size.width}
      height={geometry.size.height}
      // 단계 섹션(relative) 위에 그린다 — 선이 섹션 안쪽 여백을 지나 블록 테두리까지 닿는다.
      className="pointer-events-none absolute left-0 top-0 z-10 overflow-visible"
    >
      <defs>
        <marker id={solidMarker} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" className="fill-foreground-subtle" />
        </marker>
        <marker id={dashedMarker} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" className="fill-border-strong" />
        </marker>
      </defs>
      {edges.map((edge) => (
        <path
          key={`${edge.from}-${edge.to}`}
          data-edge-from={edge.from}
          data-edge-to={edge.to}
          data-edge-kind={edge.kind}
          data-edge-style={edge.dashed ? "dashed" : "solid"}
          d={pathOf(edge)}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray={edge.dashed ? "4 4" : undefined}
          markerEnd={`url(#${edge.dashed ? dashedMarker : solidMarker})`}
          className={edge.dashed ? "stroke-border-strong" : "stroke-foreground-subtle"}
        />
      ))}
    </svg>
  );
}
