/**
 * 평가 흐름 만들기 가운데 — 흐름도(docs/MATERIAL_PICKER.md §12.3). FigJam 순서도처럼 그린다.
 *
 * 시작 → 단계 섹션 안의 놓인 블록 → 검증 → 확인과 생성. 블록 번호가 입력 순서다(놓인 블록만 센다).
 * 빈 단계에는 점선 빈 자리가 흐름에 끼어 있다. 블록을 잇는 꺾은선과 화살촉은 SVG 로 겹쳐 그린다
 * (`flowEdges` → `routeEdge`, 좌표는 `useDiagramGeometry`).
 *
 * - 단계는 흐름도 폭에 따라 4열·2열·1열이다(컨테이너 쿼리) — 어떤 폭에서도 가로로 잘리지 않는다(U1).
 * - 흐름도는 안에서 세로로 스크롤한다. 얇은 스크롤바가 늘 보이고, 가려진 쪽 가장자리에 선이 생기고,
 *   아래로 완전히 가려진 블록이 있으면 "아래에 블록 n개가 더 있어요" 알약이 나온다.
 * - 트리의 항목은 흐름도 어디에 놓아도 그 항목의 단계로 간다. 끄는 동안 맞는 단계가 강조된다.
 * - 위쪽 알림 줄(막힌 순서의 이유)은 스크롤 영역 밖에 있다.
 */
import { useRef } from "react";
import { useDragLayer, useDrop } from "react-dnd";
import { ArrowDown } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerSelection,
  MaterialCategory,
  MaterialCategoryId,
} from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import { flowEdges, flowNodes, ghostIndex } from "../../utils/domain/flowChart";
import type { TreeBlock } from "../../utils/domain/materialPicks";
import type { ScrollEdges } from "../../hooks/useScrollEdges";
import { cn } from "../../utils/styling/styles";
import { ScrollPane } from "../ui/scroll-pane";
import { DiagramEdges } from "./DiagramEdges";
import { DiagramLane } from "./DiagramLane";
import { DiagramTerminal } from "./DiagramTerminal";
import { firstHiddenBelow, hiddenBelowCount, type Rect } from "./diagramGeometry";
import { DND, type LeafDragItem, type PickerActions } from "./dnd";
import { useDiagramGeometry } from "./useDiagramGeometry";

/**
 * 단계 격자 — 흐름도 폭 62rem 이상 4열, 30rem 이상 2열, 그 밑은 1열. 시작·끝 단말 줄도 같은 격자를
 * 써서 시작은 첫 열, 끝은 마지막 열 가운데에 온다. 단계는 늘 넷이라 마지막 단계는 늘 마지막 열이다.
 */
const GRID = "grid grid-cols-1 items-start gap-x-10 gap-y-12 @min-[30rem]/flow:grid-cols-2 @min-[62rem]/flow:grid-cols-4";
const LAST_COLUMN = "col-start-1 @min-[30rem]/flow:col-start-2 @min-[62rem]/flow:col-start-4";

interface PickDiagramProps {
  taskType: TaskType | "";
  /** 입력 순서(넣지 않은 블록 포함) — 노드 순서와 놓을 자리 미리보기가 쓴다. */
  order: ComposerCardId[];
  selection: ComposerSelection;
  lanes: MaterialCategory[];
  /** 흐름에 놓인 블록, 입력 순서대로. */
  cards: ComposerCard[];
  /** 블록마다 트리 모델(놓인 항목, 필수 수). */
  blocks: ReadonlyMap<ComposerCardId, TreeBlock>;
  /** 방금 막힌 순서 변경의 이유. */
  blockedReason: string | null;
  /** "다음"을 눌러 빠진 필수 항목을 보이는 중. */
  showMissing: boolean;
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}

export function PickDiagram({
  taskType,
  order,
  selection,
  lanes,
  cards,
  blocks,
  blockedReason,
  showMissing,
  openLeafKey,
  onOpenLeaf,
  actions,
}: PickDiagramProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const shownIds = new Set(cards.map((card) => card.id));
  const nodes = flowNodes(order, shownIds);
  const edges = flowEdges(nodes);
  const numberOf = (cardId: ComposerCardId) => nodes.find((node) => node.id === cardId)?.number ?? 0;
  const geometry = useDiagramGeometry(contentRef, nodes.map((node) => node.id).join(","));

  // 트리에서 끌고 있는 항목 — 맞는 단계를 강조하고 놓일 자리를 미리 보인다.
  const { dragCardId } = useDragLayer((monitor) => ({
    dragCardId:
      monitor.isDragging() && monitor.getItemType() === DND.paletteItem
        ? (monitor.getItem() as LeafDragItem).cardId
        : null,
  }));
  // 흐름도 어디에 놓아도 그 항목의 단계로 간다.
  const [{ isOver }, drop] = useDrop<LeafDragItem, unknown, { isOver: boolean }>({
    accept: DND.paletteItem,
    drop: (item) => actions.onPlaceLeaf(item.cardId, item.leafId),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  /** 단계마다 아예 놓지 않은 필수 블록 수(N7). */
  const missingBlocksIn = (laneId: MaterialCategoryId) =>
    [...blocks.values()].filter(
      (block) => categoryOf(block.card.id).id === laneId && block.required.total > 0 && !block.onFlow,
    ).length;

  /** 아래로 완전히 가려진 블록이 있으면 알약. 좌표를 스크롤 영역 기준으로 옮겨 센다. */
  const pill = (edges: ScrollEdges, viewport: HTMLDivElement | null) => {
    if (!edges.bottom || !viewport) return null;
    const offset = contentRef.current?.offsetTop ?? 0;
    const rects: Rect[] = cards
      .map((card) => geometry.nodes.get(card.id))
      .filter((rect): rect is Rect => rect !== undefined)
      .map((rect) => ({ ...rect, y: rect.y + offset }));
    const count = hiddenBelowCount(rects, edges.scrollTop, edges.clientHeight);
    if (count === 0) return null;
    const target = firstHiddenBelow(rects, edges.scrollTop, edges.clientHeight);
    return (
      <button
        type="button"
        onClick={() => target && viewport.scrollTo({ top: target.y - 16, behavior: "smooth" })}
        className="absolute bottom-3 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-strong bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
      >
        아래에 블록 {count}개가 더 있어요
        <ArrowDown aria-hidden="true" className="size-3.5" />
      </button>
    );
  };

  return (
    <section aria-label="평가 흐름" className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      {blockedReason && (
        <p role="alert" className="shrink-0 text-sm leading-[21px] text-destructive">
          {blockedReason}
        </p>
      )}
      <ScrollPane
        className="lg:flex-1"
        viewportClassName="lg:overflow-y-auto"
        cue={pill}
      >
        <div
          ref={(element) => {
            drop(element);
          }}
          className={cn(
            "@container/flow rounded-xl border-2 border-dashed p-4 transition-colors",
            isOver ? "border-primary/60" : "border-transparent",
          )}
        >
          <div ref={contentRef} className="relative flex flex-col gap-10">
            <DiagramEdges nodes={nodes} edges={edges} geometry={geometry} />
            <div className={GRID}>
              <div className="justify-self-center">
                <DiagramTerminal id="start" />
              </div>
            </div>
            <ol aria-label="단계" className={GRID}>
              {lanes.map((lane, index) => (
                <DiagramLane
                  key={lane.id}
                  lane={lane}
                  cards={cards.filter((card) => categoryOf(card.id).id === lane.id)}
                  numberOf={numberOf}
                  blocks={blocks}
                  previousLaneId={lanes[index - 1]?.id}
                  nextLaneId={lanes[index + 1]?.id}
                  dragCardId={dragCardId}
                  dragOverFlow={isOver}
                  ghostAt={
                    dragCardId && categoryOf(dragCardId).id === lane.id
                      ? ghostIndex(order, selection, shownIds, dragCardId)
                      : -1
                  }
                  missingBlocks={missingBlocksIn(lane.id)}
                  showMissing={showMissing}
                  taskType={taskType}
                  openLeafKey={openLeafKey}
                  onOpenLeaf={onOpenLeaf}
                  actions={actions}
                />
              ))}
            </ol>
            <div className={GRID}>
              <div className={cn("flex flex-col items-center gap-8 justify-self-center", LAST_COLUMN)}>
                <DiagramTerminal id="validation" />
                <DiagramTerminal id="report" />
                <p className="-mt-6 text-center text-xs leading-[18px] text-muted-foreground">
                  검증과 확인과 생성은 늘 맨 끝에 와요
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollPane>
    </section>
  );
}
