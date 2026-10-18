import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { WorkflowShell } from "../layout/WorkflowShell";
import { MaterialPicker as MaterialPickerContent } from "../components/material-picker/MaterialPicker";
import { NextBlockedNotice } from "../components/material-picker/NextBlockedNotice";
import { PickStatusBar } from "../components/material-picker/PickStatusBar";
import { blockKey, stageKey, treeBlockId, treeLeafId } from "../components/material-picker/PickTree";
import type { PickerActions } from "../components/material-picker/dnd";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList, composerNextStep } from "../utils/domain/workflowSteps";
import {
  includedCardsInOrder,
  laneOrder,
  moveCard,
  moveLane,
  orderViolation,
} from "../utils/domain/cardOrder";
import {
  flowStatus,
  flowTree,
  focusLeafIds,
  orderPlaced,
  shownBlocksInOrder,
  togglePlaced,
} from "../utils/domain/materialPicks";
import { MATERIAL_CATEGORIES, categoryOf } from "../data/reportComposer";
import { getStepDefinition } from "../data/workflowSteps";
import type { ComposerCardId, FlowEntryState } from "../types/reportComposer.types";

/**
 * 평가 흐름 만들기 (`/app/composer`) — 작업 유형 다음, 입력 화면 시작 전(docs/MATERIAL_PICKER.md §12).
 *
 * 빈 흐름에서 시작한다. 왼쪽 트리의 항목을 흐름도에 끌어 놓거나 ＋로 넣으면 그 블록이 생기고,
 * 흐름도에서 단계와 블록의 순서를 바꿔 입력 순서를 정한다. 바꾼 것은 저장 버튼 없이 바로 스토어에
 * 들어간다. 순서 규칙(`ORDER_RULES`)을 깨는 이동은 반영하지 않고 그 이유를 보인다.
 *
 * **판정 지점은 하나다.** 트리의 놓임 표시·블록 줄의 "필수 p/t"·하단 바의 수·빠진 항목·흐름도의 블록과
 * 칩·"다음" 게이트가 모두 렌더마다 한 번 부르는 `flowStatus` 의 결과를 나눠 쓴다.
 *
 * "다음"은 필수 항목이 빠졌으면 넘어가지 않고(버튼은 눌림) 빠진 항목을 다음 버튼 옆에 적고 트리에서
 * 펼쳐 강조한다. 다 넣었으면 돌아갈 화면(`returnStep`) → 처음 미완료 입력 화면 → 검증 순서로 간다
 * (`composerNextStep`). 진입 가드는 두지 않는다 — 필수 값은 입력 화면과 검증 화면의 1층 재확인이 막는다.
 *
 * 다른 화면(검증 화면의 "평가 흐름 만들기에서 넣기")은 `FlowEntryState` 를 넘긴다 — 그 블록을 트리에서
 * 펼쳐 강조하고, 넣을 항목을 칠한다.
 *
 * 입력 화면에 들어가기 **전** 화면이라 단계 표시줄을 두지 않고(`showStepRail={false}`), 입력 화면도
 * 아니다(`isStepPage={false}` — URL→화면 유도와 진입 가드를 끈다). 유형을 고르지 않고 URL 로
 * 바로 들어오면 고를 것이 없으므로 작업 유형 화면으로 보낸다.
 */
export function MaterialPicker() {
  const navigate = useNavigate();
  const location = useLocation();
  const taskType = useWorkflowStore((s) => s.taskType);
  const picks = useWorkflowStore((s) => s.materialPicks);
  const selection = useWorkflowStore((s) => s.composerCards);
  const cardOrder = useWorkflowStore((s) => s.cardOrder);
  const setMaterialPick = useWorkflowStore((s) => s.setMaterialPick);
  const setCardOrder = useWorkflowStore((s) => s.setCardOrder);

  const entry = (location.state as FlowEntryState | null) ?? null;
  const entryCardId = entry?.cardId ?? null;

  /** 펼친 단계·블록. 처음엔 단계 넷과 첫 블록(의뢰자 정보), 그리고 들고 온 블록. */
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set([
        ...MATERIAL_CATEGORIES.map((category) => stageKey(category.id)),
        blockKey("clientInfo"),
        ...(entryCardId ? [blockKey(entryCardId)] : []),
      ]),
  );
  /** 흐름도나 다른 화면에서 찾아온 블록. */
  const [revealedCardId, setRevealedCardId] = useState<ComposerCardId | null>(entryCardId);
  /** 들어올 때 한 번만 계산한다 — 넣는 동안 강조가 바뀌지 않게(`focusLeafIds`). */
  const [focused] = useState<ReadonlySet<string>>(
    () => new Set(entry ? focusLeafIds(entry, taskType, picks) : []),
  );
  const [openLeafKey, setOpenLeafKey] = useState<string | null>(null);
  const [triedNext, setTriedNext] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  /** 그리고 나서 트리의 이 줄로 스크롤한다. */
  const [scrollTarget, setScrollTarget] = useState<string | null>(entryCardId ? treeBlockId(entryCardId) : null);

  useEffect(() => {
    if (!scrollTarget) return;
    // 줄이 이미 보이면 움직이지 않는다. 펼친 직후라 다음 그림에서 찾는다.
    document.getElementById(scrollTarget)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    setScrollTarget(null);
  }, [scrollTarget]);

  // 렌더 중에 navigate 를 부르지 않는다 — 라우트 테이블의 리다이렉트와 같은 방식을 쓴다.
  if (!taskType) return <Navigate to="/app" replace />;

  const status = flowStatus(taskType, picks);
  const stages = flowTree(taskType, status);
  const blocks = new Map(stages.flatMap((stage) => stage.blocks).map((block) => [block.card.id, block]));
  const shownCards = shownBlocksInOrder(cardOrder, status);
  // 다 채우면 "다음"을 누른 일은 지나간 일이다 — 다시 빼도 다음을 누르기 전엔 안내와 칠하기를 되살리지 않는다.
  if (triedNext && status.missingRequired.length === 0) setTriedNext(false);
  const showMissing = triedNext && status.missingRequired.length > 0;

  const expand = (keys: string[]) => setExpanded((current) => new Set([...current, ...keys]));

  /** 항목을 바꾼다. 막힌 순서 이유는 지난 일이 된다. */
  const changePicks = (cardId: ComposerCardId, ids: string[]) => {
    setMaterialPick(cardId, ids);
    setBlockedReason(null);
  };

  /** 순서를 바꾼다. 규칙을 깨면 반영하지 않고 이유를 보인다. 규칙은 잠긴 카드를 포함한 집합으로 본다. */
  const reorder = (next: ComposerCardId[]) => {
    const violation = orderViolation(includedCardsInOrder(next, selection).map((card) => card.id));
    setBlockedReason(violation);
    if (!violation) setCardOrder(next);
  };

  const actions: PickerActions = {
    onToggleLeaf: (cardId, leafId) => changePicks(cardId, togglePlaced(cardId, picks[cardId], leafId)),
    onPlaceLeaf: (cardId, leafId) => {
      if ((picks[cardId] ?? []).includes(leafId)) return;
      changePicks(cardId, togglePlaced(cardId, picks[cardId], leafId));
    },
    onPlaceBlock: (cardId) => {
      const block = blocks.get(cardId);
      if (!block?.addable) return;
      changePicks(cardId, orderPlaced(cardId, [...(picks[cardId] ?? []), ...block.fillIds]));
    },
    onRemoveBlock: (cardId) => changePicks(cardId, []),
    onMoveCard: (cardId, targetCardId, position) => reorder(moveCard(cardOrder, cardId, targetCardId, position)),
    onMoveLane: (laneId, targetLaneId, position) => reorder(moveLane(cardOrder, laneId, targetLaneId, position)),
    onRevealBlock: (cardId) => {
      expand([stageKey(categoryOf(cardId).id), blockKey(cardId)]);
      setRevealedCardId(cardId);
      setScrollTarget(treeBlockId(cardId));
    },
    onDragBegin: () => setOpenLeafKey(null),
  };

  /**
   * 필수가 빠졌으면 넘어가지 않고 그 블록을 펼쳐 첫 빠진 줄로 트리를 스크롤한다. 포커스는 옮기지
   * 않는다 — 막힘 안내(role=alert)가 읽힌다. 다 넣었으면 다음 화면으로 간다.
   */
  const handleNext = () => {
    const missing = status.missingRequired;
    if (missing.length > 0) {
      setTriedNext(true);
      expand(missing.flatMap((leaf) => [stageKey(categoryOf(leaf.cardId).id), blockKey(leaf.cardId)]));
      setScrollTarget(treeLeafId(missing[0].cardId, missing[0].leafId));
      return;
    }
    const state = useWorkflowStore.getState();
    const steps = buildStepList(state.composerCards, state.cardOrder);
    navigate(
      getStepDefinition(composerNextStep(steps, state.completedStepIds, entry?.returnStep)).path ?? "/app/client-info",
    );
  };

  return (
    <WorkflowShell
      showStepRail={false}
      isStepPage={false}
      fitViewport
      showActionBar
      showPrevious
      showNext
      onPrevious={() => navigate("/app")}
      onNext={handleNext}
      previousLabel="이전"
      nextLabel="다음"
      leftAction={
        <PickStatusBar
          counts={status.counts}
          missingRequired={status.missingRequired}
          unplacedRecommended={status.unplacedRecommended}
          compact={showMissing}
          onPlaceLeaf={actions.onPlaceLeaf}
        />
      }
      rightAction={showMissing ? <NextBlockedNotice missing={status.missingRequired} /> : undefined}
    >
      <MaterialPickerContent
        tree={{
          stages,
          taskType,
          expanded,
          onExpandedChange: (key, open) =>
            setExpanded((current) => {
              const next = new Set(current);
              if (open) next.add(key);
              else next.delete(key);
              return next;
            }),
          revealedCardId,
          focusLeafIds: focused,
          showMissing,
          openLeafKey,
          onOpenLeaf: setOpenLeafKey,
          actions,
        }}
        diagram={{
          taskType,
          lanes: laneOrder(cardOrder),
          cards: shownCards,
          blocks,
          blockedReason,
          actions,
        }}
      />
    </WorkflowShell>
  );
}
