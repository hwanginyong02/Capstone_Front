/**
 * 평가 흐름 만들기 가운데 — 흐름도(docs/MATERIAL_PICKER.md §12.3).
 *
 * 놓인 블록이 단계마다 입력 순서대로 보인다. 단계 사이는 화살표로 왼쪽에서 오른쪽, 단계 안은 위에서
 * 아래가 입력 순서이고, 블록 번호가 전체 순서다(놓인 블록만 센다). 빈 단계에는 점선 빈 자리가 있다.
 * 트리의 항목을 끌어 이 위에 놓으면 들어간다.
 *
 * 위쪽 알림 줄에는 방금 막힌 순서의 이유가 나온다.
 */
import { useDrop } from "react-dnd";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId, MaterialCategory } from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import type { TreeBlock } from "../../utils/domain/materialPicks";
import { cn } from "../../utils/styling/styles";
import { DiagramLane } from "./DiagramLane";
import { DND, type LeafDragItem, type PickerActions } from "./dnd";

interface PickDiagramProps {
  taskType: TaskType | "";
  lanes: MaterialCategory[];
  /** 흐름에 놓인 블록, 입력 순서대로. */
  cards: ComposerCard[];
  /** 블록마다 트리 모델(놓인 항목). */
  blocks: ReadonlyMap<ComposerCardId, TreeBlock>;
  /** 방금 막힌 순서 변경의 이유. */
  blockedReason: string | null;
  actions: PickerActions;
}

export function PickDiagram({ taskType, lanes, cards, blocks, blockedReason, actions }: PickDiagramProps) {
  const [{ isOver, active }, drop] = useDrop<LeafDragItem, unknown, { isOver: boolean; active: boolean }>({
    accept: DND.paletteItem,
    drop: (item) => actions.onPlaceLeaf(item.cardId, item.leafId),
    collect: (monitor) => ({ isOver: monitor.isOver(), active: monitor.canDrop() }),
  });

  const numberOf = (cardId: ComposerCardId) => cards.findIndex((card) => card.id === cardId) + 1;

  return (
    <section
      ref={(element) => {
        drop(element);
      }}
      aria-label="평가 흐름"
      className={cn(
        "flex min-h-full flex-col gap-4 rounded-xl border-2 border-dashed p-4 transition-colors",
        isOver ? "border-primary bg-primary-subtle" : active ? "border-border-strong" : "border-transparent",
      )}
    >
      {blockedReason && (
        <p role="alert" className="text-sm leading-[21px] text-destructive">
          {blockedReason}
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <ol aria-label="단계" className="grid min-w-[900px] grid-cols-4 gap-7">
          {lanes.map((lane, index) => (
            <DiagramLane
              key={lane.id}
              lane={lane}
              cards={cards.filter((card) => categoryOf(card.id).id === lane.id)}
              numberOf={numberOf}
              taskType={taskType}
              blocks={blocks}
              previousLaneId={lanes[index - 1]?.id}
              nextLaneId={lanes[index + 1]?.id}
              actions={actions}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
