/**
 * 재료 고르기 가운데 — 대분류 4열 레인 다이어그램(docs/MATERIAL_PICKER.md §11).
 *
 * 들어간 카드가 레인마다 입력 순서대로 보인다. 레인 사이는 화살표로 왼쪽에서 오른쪽, 레인 안은
 * 세로축을 따라 위에서 아래가 입력 순서이고, 세로축 위의 번호가 전체 순서다. 재료 목록의 카드나
 * 필드 패널의 항목을 끌어 이 위 아무 데나 놓으면 들어간다.
 *
 * 위쪽 알림 줄에는 방금 막힌 순서의 이유와 순서 권고(평가 관점 → 지표)가 나온다.
 */
import { useDrop } from "react-dnd";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  MaterialCategory,
  MaterialPicks,
} from "../../types/reportComposer.types";
import { categoryOf } from "../../data/reportComposer";
import { cn } from "../../utils/styling/styles";
import { DiagramLane } from "./DiagramLane";
import { DND, type CardDragItem, type ItemDragItem, type PickerActions } from "./dnd";

interface PickDiagramProps {
  taskType: TaskType | "";
  lanes: MaterialCategory[];
  /** 들어간 카드, 입력 순서대로. */
  cards: ComposerCard[];
  picks: MaterialPicks;
  /** 필드 패널에 열려 있는 카드. */
  selectedCardId: ComposerCardId;
  /** 필드 패널에 그 카드를 연다. */
  onSelectCard: (cardId: ComposerCardId) => void;
  /** 방금 막힌 순서 변경의 이유. */
  blockedReason: string | null;
  actions: PickerActions;
}

export function PickDiagram({
  taskType,
  lanes,
  cards,
  picks,
  selectedCardId,
  onSelectCard,
  blockedReason,
  actions,
}: PickDiagramProps) {
  const [{ isOver, active }, drop] = useDrop<
    CardDragItem | ItemDragItem,
    unknown,
    { isOver: boolean; active: boolean }
  >({
    accept: [DND.paletteCard, DND.paletteItem],
    drop: (item, monitor) => {
      if (monitor.getItemType() === DND.paletteItem) {
        const { cardId, pickId } = item as ItemDragItem;
        if (!(picks[cardId] ?? []).includes(pickId)) actions.onTogglePick(cardId, pickId);
      } else {
        actions.onIncludeCard(item.cardId);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), active: monitor.canDrop() }),
  });

  const numberOf = (cardId: ComposerCardId) => cards.findIndex((card) => card.id === cardId) + 1;

  return (
    <section
      ref={(element) => {
        drop(element);
      }}
      aria-label="입력 순서 다이어그램"
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
        <ol aria-label="대분류 레인" className="grid min-w-[900px] grid-cols-4 gap-7">
          {lanes.map((lane, index) => (
            <DiagramLane
              key={lane.id}
              lane={lane}
              cards={cards.filter((card) => categoryOf(card.id).id === lane.id)}
              numberOf={numberOf}
              taskType={taskType}
              picks={picks}
              selectedCardId={selectedCardId}
              onSelectCard={onSelectCard}
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
