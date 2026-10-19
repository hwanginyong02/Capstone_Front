/**
 * 흐름도 블록에 붙는 항목 칩(docs/MATERIAL_PICKER.md §12.3).
 *
 * - 이름을 누르면 설명 팝업이 열린다(트리와 같은 팝업, 열림 상태는 페이지가 쥔다).
 * - ✕ 로 빼거나 칩을 트리로 끌어 뺀다. ✕ 는 마우스를 올리거나 포커스가 갈 때만 보이고(터치에선 늘),
 *   자리는 늘 차지해 칩 폭이 바뀌지 않는다 — 칩이 다시 줄바꿈하지 않는다.
 * - 함께 들어감 칩은 점선이고 ✕ 도 끌기도 없다. 조건 항목을 빼면 함께 빠진다.
 * - 구분(필수·권장…)은 마커가 아니라 숨은 글자로 읽힌다.
 */
import { useDrag } from "react-dnd";
import { X } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { FlowLeaf } from "../../types/reportComposer.types";
import { leafDetail } from "../../utils/domain/leafDetail";
import { cn } from "../../utils/styling/styles";
import { DND, type LeafDragItem, type PickerActions } from "./dnd";
import { IconAction } from "./IconAction";
import { KindMarker } from "./KindMarker";
import { KIND_LABEL } from "./kindStyles";
import { LeafPopover } from "./LeafPopover";

/** 칩 팝업의 열림 키 — 트리 줄의 팝업(`tree:`)과 겹치지 않게. */
export const chipLeafKey = (leaf: FlowLeaf) => `chip:${leaf.cardId}:${leaf.leafId}`;

interface LeafChipProps {
  leaf: FlowLeaf & { placed: boolean };
  companion: boolean;
  taskType: TaskType | "";
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}

export function LeafChip({ leaf, companion, taskType, openLeafKey, onOpenLeaf, actions }: LeafChipProps) {
  const key = chipLeafKey(leaf);
  const kindId = `${key.replace(/[^a-zA-Z0-9_-]/g, "-")}-kind`;
  const [, drag] = useDrag<LeafDragItem>({
    type: DND.chip,
    item: () => {
      actions.onDragBegin();
      return { cardId: leaf.cardId, leafId: leaf.leafId, label: leaf.label };
    },
    canDrag: () => !companion,
  });

  return (
    <li
      ref={(element) => {
        drag(element);
      }}
      data-companion={companion || undefined}
      className={cn(
        "group/chip inline-flex max-w-full items-center gap-1.5 rounded-md border bg-card py-0.5 pl-2 text-xs",
        companion
          ? "border-dashed border-border-strong pr-2 text-foreground-secondary"
          : "cursor-grab border-border-strong pr-0.5 text-foreground",
      )}
    >
      <KindMarker kind={leaf.kind} />
      <LeafPopover
        open={openLeafKey === key}
        onOpenChange={(open) => onOpenLeaf(open ? key : null)}
        kind={leaf.kind}
        detail={leafDetail(leaf)}
        placed={leaf.placed}
        taskType={taskType}
        onToggle={companion ? undefined : () => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
        side="bottom"
        describedBy={kindId}
        buttonClassName="min-w-0 truncate rounded-sm text-left"
      >
        {leaf.label}
      </LeafPopover>
      <span id={kindId} className="sr-only">
        {KIND_LABEL[leaf.kind]} 항목
      </span>
      {!companion && (
        <IconAction
          label={`${leaf.label} 빼기`}
          reveal="chip"
          onClick={() => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
          className="size-5 rounded"
        >
          <X className="size-3" />
        </IconAction>
      )}
    </li>
  );
}
