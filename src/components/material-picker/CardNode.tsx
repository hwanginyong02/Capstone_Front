/**
 * 흐름도의 블록 하나(docs/MATERIAL_PICKER.md §12.3).
 *
 * 왼쪽 위에 입력 순서 번호가 있고, 블록에는 **넣은 모든 항목**(필수 포함)이 칩으로 붙는다. 함께
 * 들어감 항목은 조건 항목 바로 뒤에 점선 칩으로 붙는다. 블록끼리 잇는 선은 흐름도가 SVG 로 그린다.
 *
 * - 블록 이름을 누르면 트리에서 그 블록을 펼쳐 보인다.
 * - 블록 전체를 끌거나 ▲▼ 로 같은 단계 안의 순서를 바꾸고, ✕ 로 블록째 뺀다(필수 블록도 — 다시
 *   "다음"이 막힐 뿐이다). ▲▼✕ 는 마우스를 올리거나 포커스가 갈 때만 보인다(터치에선 늘).
 * - 필수 항목이 덜 들어갔으면 바닥 줄에 남은 수를 적는다. "다음"을 누른 뒤엔 빨간 글자다. 권장
 *   부족은 적지 않는다 — 하단 바가 맡는다.
 */
import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard, ComposerCardId } from "../../types/reportComposer.types";
import type { DropPosition } from "../../utils/domain/cardOrder";
import { categoryOf } from "../../data/reportComposer";
import type { TreeBlock } from "../../utils/domain/materialPicks";
import { FOCUS_RING, cn } from "../../utils/styling/styles";
import { DND, dropPosition, type CardDragItem, type PickerActions } from "./dnd";
import { IconAction } from "./IconAction";
import { LeafChip } from "./LeafChip";

interface CardNodeProps {
  card: ComposerCard;
  /** 입력 순서 번호(1부터). */
  number: number;
  /** 이 블록의 트리 모델. 놓인 항목이 칩이 된다. */
  block: TreeBlock | undefined;
  /** 같은 단계의 위·아래 블록. 없으면 그쪽으로 옮기는 버튼을 끈다. */
  previousCardId?: ComposerCardId;
  nextCardId?: ComposerCardId;
  /** 트리에서 이 블록의 항목을 끌어 흐름도 위에 올려 둔 동안. */
  dropTarget: boolean;
  /** "다음"을 눌러 빠진 필수 항목을 보이는 중. */
  showMissing: boolean;
  taskType: TaskType | "";
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}

export function CardNode({
  card,
  number,
  block,
  previousCardId,
  nextCardId,
  dropTarget,
  showMissing,
  taskType,
  openLeafKey,
  onOpenLeaf,
  actions,
}: CardNodeProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverPosition, setHoverPosition] = useState<DropPosition | null>(null);
  // 넣은 항목과, 그 뒤에 함께 들어간 항목.
  const chips = (block?.leaves ?? [])
    .filter((leaf) => leaf.placed)
    .flatMap((leaf) => [
      { leaf, companion: false },
      ...leaf.companions.filter((item) => item.placed).map((item) => ({ leaf: item, companion: true })),
    ]);
  const missingRequired = block ? block.required.total - block.required.placed : 0;

  const [{ isDragging }, drag] = useDrag<CardDragItem, unknown, { isDragging: boolean }>({
    type: DND.node,
    item: () => {
      actions.onDragBegin();
      return { cardId: card.id };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<CardDragItem, unknown, { isOver: boolean }>({
    accept: DND.node,
    canDrop: (item) => item.cardId !== card.id && categoryOf(item.cardId).id === categoryOf(card.id).id,
    hover: (_item, monitor) => {
      if (!monitor.canDrop()) return;
      const next = dropPosition(ref.current, monitor.getClientOffset(), "y");
      if (next !== hoverPosition) setHoverPosition(next);
    },
    drop: (item, monitor) => {
      actions.onMoveCard(item.cardId, card.id, dropPosition(ref.current, monitor.getClientOffset(), "y"));
      setHoverPosition(null);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  drag(drop(ref));
  const showIndicator = isOver ? hoverPosition : null;

  return (
    <li
      ref={ref}
      data-flow-node={card.id}
      aria-label={card.name}
      className={cn(
        "group/node relative flex cursor-grab flex-col gap-2.5 rounded-lg border border-border-strong bg-card p-3 active:cursor-grabbing",
        dropTarget && "ring-2 ring-primary",
        isDragging && "opacity-40",
      )}
    >
      {showIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 h-0.5 rounded-full bg-primary",
            showIndicator === "before" ? "-top-3.5" : "-bottom-3.5",
          )}
        />
      )}

      <div className="flex items-start gap-2">
        <span
          aria-label={`입력 순서 ${number}번`}
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
        >
          {number}
        </span>
        <button
          type="button"
          onClick={() => actions.onRevealBlock(card.id)}
          className={cn(
            "min-w-0 flex-1 rounded-sm pt-0.5 text-left text-sm font-medium leading-5 text-foreground",
            FOCUS_RING,
          )}
        >
          {card.name}
        </button>
        <span className="-mr-1.5 -mt-1 flex shrink-0 items-center">
          <IconAction
            label={`${card.name} 위로`}
            reveal="node"
            disabled={!previousCardId}
            onClick={() => previousCardId && actions.onMoveCard(card.id, previousCardId, "before")}
          >
            <ChevronUp className="size-4" />
          </IconAction>
          <IconAction
            label={`${card.name} 아래로`}
            reveal="node"
            disabled={!nextCardId}
            onClick={() => nextCardId && actions.onMoveCard(card.id, nextCardId, "after")}
          >
            <ChevronDown className="size-4" />
          </IconAction>
          <IconAction label={`${card.name} 블록 빼기`} reveal="node" onClick={() => actions.onRemoveBlock(card.id)}>
            <X className="size-4" />
          </IconAction>
        </span>
      </div>

      {chips.length > 0 && (
        <ul aria-label={`${card.name}에 넣은 항목`} className="flex flex-wrap items-center gap-1.5">
          {chips.map(({ leaf, companion }) => (
            <LeafChip
              key={leaf.leafId}
              leaf={leaf}
              companion={companion}
              taskType={taskType}
              openLeafKey={openLeafKey}
              onOpenLeaf={onOpenLeaf}
              actions={actions}
            />
          ))}
        </ul>
      )}

      {missingRequired > 0 && (
        <p
          data-missing={showMissing || undefined}
          className={cn(
            "flex items-center gap-1.5 text-xs leading-[18px]",
            showMissing ? "text-destructive" : "text-muted-foreground",
          )}
        >
          필수 항목 {missingRequired}개를 더 넣어야 해요
          <button
            type="button"
            onClick={() => actions.onRevealBlock(card.id)}
            aria-label={`${card.name}의 빠진 필수 항목 보기`}
            className={cn("rounded-sm font-medium underline underline-offset-2", FOCUS_RING)}
          >
            보기
          </button>
        </p>
      )}
    </li>
  );
}
