/**
 * 평가 흐름 만들기 왼쪽 — 항목 트리(단계 > 블록 > 항목, docs/MATERIAL_PICKER.md §12.3).
 *
 * - **펼침 버튼과 중첩 목록**이다(ARIA tree 가 아님). 한 줄에 동작이 셋(설명, ＋, 끌기)이라 진짜
 *   버튼으로 둬야 Tab 으로 닿는다.
 * - 트리는 카탈로그 순서에 고정한다. 사용자가 단계 순서를 바꾸면 흐름도만 바뀐다.
 * - 항목 이름을 누르면 설명 팝업, 두 번 누르면 넣기, 줄을 끌어 흐름도에 놓아도 넣기. ＋는 넣기만 한다.
 * - 블록 줄은 끌 수 없다(끄는 단위는 항목). ⊕ 로 블록째(필수·권장) 넣는다.
 * - 함께 들어감 줄은 조건을 정하는 항목 아래 점선으로 둔다. 따로 넣지 않으므로 ＋가 없다.
 * - 흐름도의 블록·칩을 여기로 끌어 오면 빠진다.
 *
 * 펼침·강조·열린 팝업은 페이지가 쥔다("다음"이 막혔을 때, 다른 화면에서 들어올 때 페이지가 펼친다).
 */
import { useDrag, useDrop } from "react-dnd";
import { Check, ChevronDown, ChevronRight, CirclePlus, Plus } from "lucide-react";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCardId, FlowLeaf } from "../../types/reportComposer.types";
import { leafDetail } from "../../utils/domain/leafDetail";
import type { BlockFillKinds, TreeBlock, TreeLeaf, TreeStage } from "../../utils/domain/materialPicks";
import { FOCUS_RING, cn } from "../../utils/styling/styles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { IconAction } from "./IconAction";
import { KindMarker } from "./KindMarker";
import { KIND_LABEL } from "./kindStyles";
import { LeafPopover } from "./LeafPopover";
import { DND, type CardDragItem, type LeafDragItem, type PickerActions } from "./dnd";

/** 펼침 상태의 키. */
export const stageKey = (id: string) => `stage:${id}`;
export const blockKey = (id: ComposerCardId) => `block:${id}`;
/** 트리 줄의 DOM id — 페이지가 그 줄로 스크롤한다. */
export const treeBlockId = (cardId: ComposerCardId) => `tree-block-${cardId}`;
export const treeLeafId = (cardId: ComposerCardId, leafId: string) => `tree-leaf-${cardId}-${leafId.replace(":", "-")}`;
/** 열린 팝업의 키. */
export const treeLeafKey = (cardId: ComposerCardId, leafId: string) => `tree:${cardId}:${leafId}`;

const FILL_LABEL: Record<BlockFillKinds, string> = {
  "required+recommended": "필수·권장 항목 모두 넣기",
  required: "필수 항목 모두 넣기",
  recommended: "권장 항목 모두 넣기",
};

interface PickTreeProps {
  stages: TreeStage[];
  taskType: TaskType | "";
  expanded: ReadonlySet<string>;
  onExpandedChange: (key: string, open: boolean) => void;
  /** 흐름도나 다른 화면에서 찾아온 블록. 강조 막대로 보인다. */
  revealedCardId: ComposerCardId | null;
  /** 다른 화면에서 들어올 때 강조할 항목(`focusLeafIds`). */
  focusLeafIds: ReadonlySet<string>;
  /** "다음"을 누른 뒤 빠진 필수 항목을 강조할지. */
  showMissing: boolean;
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}

export function PickTree({
  stages,
  taskType,
  expanded,
  onExpandedChange,
  revealedCardId,
  focusLeafIds,
  showMissing,
  openLeafKey,
  onOpenLeaf,
  actions,
}: PickTreeProps) {
  const [{ isOver }, drop] = useDrop<CardDragItem | LeafDragItem, unknown, { isOver: boolean }>({
    accept: [DND.node, DND.chip],
    drop: (item, monitor) => {
      if (monitor.getItemType() === DND.chip) {
        const { cardId, leafId } = item as LeafDragItem;
        actions.onToggleLeaf(cardId, leafId);
      } else {
        actions.onRemoveBlock(item.cardId);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });

  return (
    <nav
      ref={(element) => {
        drop(element);
      }}
      aria-label="항목 목록"
      className={cn(
        "flex flex-col gap-2 rounded-xl border-2 border-dashed p-1 transition-colors",
        isOver ? "border-primary bg-primary-subtle" : "border-transparent",
      )}
    >
      <div className="flex flex-col gap-0.5 px-1">
        <h2 className="text-sm font-medium text-foreground">항목</h2>
        <p className="text-xs leading-[18px] text-muted-foreground">
          항목을 누르면 설명이 나와요. ＋를 눌러도 넣을 수 있어요.
        </p>
      </div>
      <ul className="flex flex-col">
        {stages.map((stage) => {
          const key = stageKey(stage.category.id);
          return (
            <li key={stage.category.id}>
              <Collapsible open={expanded.has(key)} onOpenChange={(open) => onExpandedChange(key, open)}>
                <CollapsibleTrigger
                  className={cn(
                    "flex h-8 w-full items-center gap-1 rounded-md px-1 text-left text-xs font-medium text-foreground-secondary hover:bg-muted",
                    FOCUS_RING,
                  )}
                >
                  <Chevron open={expanded.has(key)} />
                  {stage.category.name}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul aria-label={`${stage.category.name}의 블록`} className="ml-3 flex flex-col border-l border-border pl-1.5">
                    {stage.blocks.map((block) => (
                      <BlockRow
                        key={block.card.id}
                        block={block}
                        taskType={taskType}
                        open={expanded.has(blockKey(block.card.id))}
                        onOpenChange={(open) => onExpandedChange(blockKey(block.card.id), open)}
                        revealed={revealedCardId === block.card.id}
                        focusLeafIds={focusLeafIds}
                        showMissing={showMissing}
                        openLeafKey={openLeafKey}
                        onOpenLeaf={onOpenLeaf}
                        actions={actions}
                      />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Chevron({ open }: { open: boolean }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return <Icon aria-hidden="true" className="size-3.5 shrink-0 text-foreground-subtle" />;
}

function BlockRow({
  block,
  taskType,
  open,
  onOpenChange,
  revealed,
  focusLeafIds,
  showMissing,
  openLeafKey,
  onOpenLeaf,
  actions,
}: {
  block: TreeBlock;
  taskType: TaskType | "";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revealed: boolean;
  focusLeafIds: ReadonlySet<string>;
  showMissing: boolean;
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}) {
  const { card, required } = block;
  const requiredDone = required.total > 0 && required.placed === required.total;
  const missingInBlock = showMissing && required.placed < required.total;
  const fillLabel = `${card.name} ${FILL_LABEL[block.fillKinds]}`;

  return (
    <li id={treeBlockId(card.id)} data-revealed={revealed || undefined} className="scroll-mt-2">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div
          className={cn(
            "group/row relative flex h-9 items-center gap-1 rounded-md pr-1 hover:bg-muted",
            revealed && "bg-primary-subtle hover:bg-primary-subtle",
          )}
        >
          {revealed && <span aria-hidden="true" className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />}
          <CollapsibleTrigger
            className={cn(
              "flex h-9 min-w-0 flex-1 items-center gap-1 rounded-md pl-1 text-left text-sm text-foreground",
              FOCUS_RING,
            )}
          >
            <Chevron open={open} />
            <span className="truncate">{card.name}</span>
          </CollapsibleTrigger>
          {required.total > 0 && !requiredDone && (
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-px text-[11px] font-medium",
                missingInBlock ? "bg-destructive/10 text-destructive" : "bg-primary-subtle text-primary",
              )}
            >
              필수 {required.placed}/{required.total}
            </span>
          )}
          {(requiredDone || (required.total === 0 && block.onFlow)) && (
            <span className="flex size-7 shrink-0 items-center justify-center text-primary">
              <Check aria-hidden="true" className="size-4" />
              <span className="sr-only">{requiredDone ? "필수 항목을 다 넣었어요" : "흐름에 있어요"}</span>
            </span>
          )}
          <IconAction
            label={fillLabel}
            reveal="row"
            disabled={!block.addable}
            onClick={() => actions.onPlaceBlock(card.id)}
          >
            <CirclePlus className="size-4" />
          </IconAction>
        </div>
        <CollapsibleContent>
          <p className="ml-6 pb-1 pr-2 text-xs leading-[18px] text-muted-foreground">{card.description}</p>
          <ul aria-label={`${card.name}의 항목`} className="ml-3 flex flex-col border-l border-border pl-1.5">
            {block.leaves.map((leaf) => (
              <LeafRows
                key={leaf.leafId}
                leaf={leaf}
                blockName={card.name}
                taskType={taskType}
                focused={focusLeafIds.has(leaf.leafId)}
                missing={showMissing && leaf.kind === "required" && !leaf.placed}
                openLeafKey={openLeafKey}
                onOpenLeaf={onOpenLeaf}
                actions={actions}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** 항목 한 줄과 그 아래 함께 들어감 줄. */
function LeafRows({
  leaf,
  blockName,
  taskType,
  focused,
  missing,
  openLeafKey,
  onOpenLeaf,
  actions,
}: {
  leaf: TreeLeaf;
  blockName: string;
  taskType: TaskType | "";
  focused: boolean;
  missing: boolean;
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
  actions: PickerActions;
}) {
  const key = treeLeafKey(leaf.cardId, leaf.leafId);
  const [{ isDragging }, drag] = useDrag<LeafDragItem, unknown, { isDragging: boolean }>({
    type: DND.paletteItem,
    item: () => {
      actions.onDragBegin();
      return { cardId: leaf.cardId, leafId: leaf.leafId, label: leaf.label };
    },
    canDrag: () => !leaf.placed,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <>
      <li
        id={treeLeafId(leaf.cardId, leaf.leafId)}
        ref={(element) => {
          drag(element);
        }}
        data-missing={missing || undefined}
        data-focused={focused || undefined}
        className={cn(
          "group/row flex h-8 scroll-mt-2 items-center gap-1.5 rounded-md pl-1 pr-1",
          missing ? "bg-destructive/5" : focused ? "bg-primary-subtle" : "hover:bg-muted",
          !leaf.placed && "cursor-grab",
          isDragging && "opacity-40",
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
          onToggle={() => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
          onDoubleClick={() => actions.onPlaceLeaf(leaf.cardId, leaf.leafId)}
          describedBy={`${treeLeafId(leaf.cardId, leaf.leafId)}-kind`}
          buttonClassName={cn(
            "min-w-0 flex-1 truncate rounded-sm text-left text-sm text-foreground",
            leaf.kind === "required" && !leaf.placed && "font-medium",
          )}
        >
          {leaf.label}
        </LeafPopover>
        <span id={`${treeLeafId(leaf.cardId, leaf.leafId)}-kind`} className="sr-only">
          {KIND_LABEL[leaf.kind]} 항목
        </span>
        {missing ? (
          <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-px text-[11px] font-medium text-destructive">
            빠짐
          </span>
        ) : (
          leaf.kind === "required" &&
          !leaf.placed && (
            <span aria-hidden="true" className="shrink-0 text-[11px] font-medium text-primary">
              필수
            </span>
          )
        )}
        {leaf.placed ? (
          <IconAction
            label={`${leaf.label} 빼기`}
            onClick={() => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
            className="text-primary hover:text-primary"
          >
            <Check className="size-4" />
          </IconAction>
        ) : (
          <IconAction
            label={`${leaf.label} 넣기`}
            reveal="row"
            onClick={() => actions.onToggleLeaf(leaf.cardId, leaf.leafId)}
          >
            <Plus className="size-4" />
          </IconAction>
        )}
      </li>
      {leaf.companions.map((companion) => (
        <CompanionRow
          key={companion.leafId}
          leaf={companion}
          blockName={blockName}
          taskType={taskType}
          openLeafKey={openLeafKey}
          onOpenLeaf={onOpenLeaf}
        />
      ))}
    </>
  );
}

/** 함께 들어감 줄 — 끌 수 없고 ＋도 없다. 조건을 정하는 항목이 들어가 있으면 흐린 ✓. */
function CompanionRow({
  leaf,
  taskType,
  openLeafKey,
  onOpenLeaf,
}: {
  leaf: FlowLeaf & { placed: boolean };
  blockName: string;
  taskType: TaskType | "";
  openLeafKey: string | null;
  onOpenLeaf: (key: string | null) => void;
}) {
  const key = treeLeafKey(leaf.cardId, leaf.leafId);
  return (
    <li data-companion="true" className="flex h-8 items-center gap-1.5 pl-4 pr-2">
      <KindMarker kind="conditional" />
      <LeafPopover
        open={openLeafKey === key}
        onOpenChange={(open) => onOpenLeaf(open ? key : null)}
        kind="conditional"
        detail={leafDetail(leaf)}
        placed={leaf.placed}
        taskType={taskType}
        buttonClassName="min-w-0 flex-1 truncate rounded-sm border border-dashed border-border-strong px-1.5 text-left text-xs text-foreground-secondary"
      >
        {leaf.label}
      </LeafPopover>
      <span className="shrink-0 text-[11px] text-muted-foreground">함께</span>
      {leaf.placed && (
        <span className="flex shrink-0 items-center text-foreground-subtle">
          <Check aria-hidden="true" className="size-3.5" />
          <span className="sr-only">함께 들어가 있어요</span>
        </span>
      )}
    </li>
  );
}
