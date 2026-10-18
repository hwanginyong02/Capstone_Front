/**
 * 흐름도 연결선의 경로(docs/MATERIAL_PICKER.md §12.3). 좌표를 받아 점과 SVG 경로를 돌려주는 순수
 * 함수다 — 측정은 `useDiagramGeometry` 가 한다.
 *
 * 꺾는 규칙은 셋이다. 모두 가로·세로로만 꺾고, 단계 사이 틈과 행 사이 틈만 지나 내용을 가로지르지
 * 않는다.
 * 1. 오른쪽: 대상이 오른쪽 열에 있으면 출발 노드 오른쪽 가운데 → 두 노드 사이 틈의 가운데 x →
 *    대상 가운데 높이 → 대상 **왼쪽**으로 들어간다.
 * 2. 세로: 대상이 아래에 있고 가로로 겹치면 출발 노드 아래 가운데 → 대상 **위** 가운데로 들어간다.
 *    가운데가 어긋나면 두 노드 사이 높이에서 한 번 옮겨 탄다.
 * 3. 줄바꿈: 대상이 다음 행 왼쪽에 있으면(2열에서 둘째 단계 → 셋째 단계) 출발 노드 아래 →
 *    행 사이 틈(`corridorY`) → 대상 가운데 x → 대상 위로 들어간다.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 줄바꿈 경로가 대상 위쪽 몇 px 에서 옆으로 가는지(행 사이 틈의 가운데, gap-y-12 의 절반). */
export const CORRIDOR_OFFSET = 24;

const right = (rect: Rect) => rect.x + rect.width;
const bottom = (rect: Rect) => rect.y + rect.height;
const centerX = (rect: Rect) => rect.x + rect.width / 2;
const centerY = (rect: Rect) => rect.y + rect.height / 2;

/** 같은 점이 이어지거나 한 직선 위의 가운데 점이면 뺀다. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    const before = out[out.length - 2];
    if (before && last && ((before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y))) {
      out[out.length - 1] = point;
      continue;
    }
    out.push(point);
  }
  return out;
}

/** 출발 노드에서 대상 노드까지의 직교 꺾은선. 마지막 점이 대상 테두리 위에 있다(화살촉 자리). */
export function routeEdge(from: Rect, to: Rect, corridorY?: number): Point[] {
  // 1. 오른쪽 열 — 대상 왼쪽으로 들어간다.
  if (to.x >= right(from)) {
    const gapX = (right(from) + to.x) / 2;
    return simplify([
      { x: right(from), y: centerY(from) },
      { x: gapX, y: centerY(from) },
      { x: gapX, y: centerY(to) },
      { x: to.x, y: centerY(to) },
    ]);
  }
  const overlaps = to.x < right(from) && right(to) > from.x;
  // 2. 아래, 가로로 겹침 — 대상 위로 들어간다.
  if (overlaps || to.y < bottom(from)) {
    const midY = (bottom(from) + to.y) / 2;
    return simplify([
      { x: centerX(from), y: bottom(from) },
      { x: centerX(from), y: midY },
      { x: centerX(to), y: midY },
      { x: centerX(to), y: to.y },
    ]);
  }
  // 3. 다음 행 왼쪽 — 행 사이 틈에서 옆으로 간다.
  const lane = corridorY ?? to.y - CORRIDOR_OFFSET;
  return simplify([
    { x: centerX(from), y: bottom(from) },
    { x: centerX(from), y: lane },
    { x: centerX(to), y: lane },
    { x: centerX(to), y: to.y },
  ]);
}

/** 꺾은선을 SVG 경로로. 꺾인 곳은 반지름 `radius` 로 둥글린다(짧은 토막에서는 줄인다). */
export function toPath(points: readonly Point[], radius = 6): string {
  if (points.length === 0) return "";
  const parts = [`M${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const [prev, corner, next] = [points[index - 1], points[index], points[index + 1]];
    const r = Math.min(radius, segment(prev, corner) / 2, segment(corner, next) / 2);
    const enter = towards(corner, prev, r);
    const leave = towards(corner, next, r);
    parts.push(`L${enter.x} ${enter.y}`, `Q${corner.x} ${corner.y} ${leave.x} ${leave.y}`);
  }
  const last = points[points.length - 1];
  parts.push(`L${last.x} ${last.y}`);
  return parts.join(" ");
}

const segment = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** `corner` 에서 `target` 쪽으로 `distance` 만큼 간 점(가로나 세로 한 방향). */
function towards(corner: Point, target: Point, distance: number): Point {
  return {
    x: corner.x + Math.sign(target.x - corner.x) * distance,
    y: corner.y + Math.sign(target.y - corner.y) * distance,
  };
}

/**
 * 스크롤 영역 아래로 완전히 가려진 블록 수 — "아래에 블록 n개가 더 있어요" 알약. 좌표는 스크롤되는
 * 내용 기준이다.
 */
export function hiddenBelowCount(blocks: readonly Rect[], scrollTop: number, clientHeight: number): number {
  const visibleBottom = scrollTop + clientHeight;
  return blocks.filter((block) => block.y >= visibleBottom).length;
}

/** 가려진 블록 중 가장 위의 것 — 알약을 누르면 그리로 스크롤한다. */
export function firstHiddenBelow(blocks: readonly Rect[], scrollTop: number, clientHeight: number): Rect | null {
  const visibleBottom = scrollTop + clientHeight;
  return (
    blocks.filter((block) => block.y >= visibleBottom).sort((a, b) => a.y - b.y)[0] ?? null
  );
}
