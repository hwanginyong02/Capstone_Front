import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { WorkflowShell } from "../layout/WorkflowShell";
import { MaterialPicker as MaterialPickerContent } from "../components/material-picker/MaterialPicker";
import { PickStatusBar } from "../components/material-picker/PickStatusBar";
import type { PickerActions } from "../components/material-picker/dnd";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList } from "../utils/domain/workflowSteps";
import {
  includedCardsInOrder,
  laneOrder,
  moveCard,
  moveLane,
  orderHints,
  orderViolation,
} from "../utils/domain/cardOrder";
import {
  PICK_TIERS,
  includeCardPicks,
  matchesTier,
  missingRecommended,
  pickCount,
  pickCoverage,
  pickTier,
  picksForTier,
  tierInfo,
  togglePick,
  type PickTier,
} from "../utils/domain/materialPicks";
import { catalogCards, getCard } from "../data/reportComposer";
import { getStepDefinition } from "../data/workflowSteps";
import type { ComposerCardId, MaterialPicks } from "../types/reportComposer.types";

/**
 * 재료 고르기 (`/app/composer`) — 작업 유형 다음, 입력 단계 시작 전(docs/MATERIAL_PICKER.md §11).
 *
 * 왼쪽 재료 목록에서 카드와 항목을 가운데 다이어그램으로 끌어 놓고(또는 ＋), 다이어그램에서 대분류
 * 레인과 카드의 순서를 바꿔 입력 순서를 정한다. 바꾼 것은 저장 버튼 없이 바로 스토어에 들어간다.
 * 필수 카드는 처음부터 들어가 있어 다음을 막을 일이 없다.
 *
 * 순서 규칙(`ORDER_RULES`)을 깨는 이동은 반영하지 않고 그 이유를 보인다. 막지 않는 권고
 * (`ORDER_HINTS`)는 다이어그램 위에 남겨 둔다.
 *
 * 입력 단계에 들어가기 **전** 화면이라 단계 표시줄을 두지 않고(`showStepRail={false}`), 단계도
 * 아니다(`isStepPage={false}` — URL→단계 유도와 진입 가드를 끈다). 유형을 고르지 않고 URL 로
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
  const setMaterialPicks = useWorkflowStore((s) => s.setMaterialPicks);
  const setCardOrder = useWorkflowStore((s) => s.setCardOrder);
  const initRequiredPicks = useWorkflowStore((s) => s.initRequiredPicks);

  // 확인과 생성의 "재료 고르기에서 넣기"는 그 카드를 열어 둔 채 들어온다.
  const focusCardId = (location.state as { cardId?: ComposerCardId } | null)?.cardId ?? null;
  const [expandedCardId, setExpandedCardId] = useState<ComposerCardId | null>(focusCardId);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ label: string; picks: MaterialPicks; order: ComposerCardId[] } | null>(
    null,
  );

  // 필수 카드는 처음부터 들어가 있다 — 고르지 않은 선택 항목(홈페이지·팩스 등)을 받지 않게 키를 채운다.
  useEffect(() => {
    initRequiredPicks();
  }, [initRequiredPicks]);

  // 렌더 중에 navigate 를 부르지 않는다 — 라우트 테이블의 리다이렉트와 같은 방식을 쓴다.
  if (!taskType) return <Navigate to="/app" replace />;

  const cards = includedCardsInOrder(cardOrder, selection);

  /** 항목을 바꾼다. 세트 되돌리기와 막힌 이유는 지난 일이 된다. */
  const changePicks = (cardId: ComposerCardId, ids: string[]) => {
    setMaterialPick(cardId, ids);
    setUndo(null);
    setBlockedReason(null);
  };

  /** 순서를 바꾼다. 규칙을 깨면 반영하지 않고 이유를 보인다. */
  const reorder = (next: ComposerCardId[]) => {
    const violation = orderViolation(includedCardsInOrder(next, selection).map((card) => card.id));
    setBlockedReason(violation);
    if (!violation) setCardOrder(next);
  };

  const actions: PickerActions = {
    onTogglePick: (cardId, pickId) => changePicks(cardId, togglePick(cardId, taskType, picks[cardId], pickId)),
    onIncludeCard: (cardId) => {
      if (getCard(cardId).locked || pickCount(picks, cardId) > 0) return;
      changePicks(cardId, includeCardPicks(cardId, taskType));
    },
    onExcludeCard: (cardId) => {
      if (getCard(cardId).locked) return;
      changePicks(cardId, []);
      if (expandedCardId === cardId) setExpandedCardId(null);
    },
    onMoveCard: (cardId, targetCardId, position) => reorder(moveCard(cardOrder, cardId, targetCardId, position)),
    onMoveLane: (laneId, targetLaneId, position) => reorder(moveLane(cardOrder, laneId, targetLaneId, position)),
  };

  /** 추천 세트로 통째로 바꾼다. 직전 상태는 되돌리기로 남긴다. */
  const handleApplySet = (tier: PickTier) => {
    const snapshot: MaterialPicks = Object.fromEntries(
      catalogCards(taskType).map((card) => [card.id, picks[card.id] ?? []]),
    );
    setMaterialPicks(picksForTier(tier, taskType));
    setUndo({ label: tierInfo(tier).name, picks: snapshot, order: cardOrder });
    setBlockedReason(null);
  };

  const handleUndo = () => {
    if (!undo) return;
    setMaterialPicks(undo.picks);
    // 세트가 껐다 켠 카드는 레인 끝으로 갔다. 세트 전의 자리로 돌린다.
    setCardOrder(undo.order);
    setUndo(null);
  };

  /** 정한 순서의 첫 단계로 간다. */
  const handleNext = () => {
    const state = useWorkflowStore.getState();
    const [firstStep] = buildStepList(state.composerCards, state.cardOrder);
    navigate(getStepDefinition(firstStep).path ?? "/app/client-info");
  };

  return (
    <WorkflowShell
      showStepRail={false}
      isStepPage={false}
      showActionBar
      showPrevious
      showNext
      onPrevious={() => navigate("/app")}
      onNext={handleNext}
      previousLabel="이전"
      nextLabel="다음"
      leftAction={
        <PickStatusBar
          coverage={pickCoverage(taskType, picks)}
          tier={pickTier(taskType, picks)}
          missing={missingRecommended(taskType, picks)}
          onAddRecommended={(cardId, fieldId) => {
            if (!(picks[cardId] ?? []).includes(fieldId)) actions.onTogglePick(cardId, fieldId);
          }}
        />
      }
    >
      <MaterialPickerContent
        taskType={taskType}
        picks={picks}
        selection={selection}
        lanes={laneOrder(cardOrder)}
        cards={cards}
        expandedCardId={expandedCardId}
        onToggleExpanded={(cardId) => setExpandedCardId((prev) => (prev === cardId ? null : cardId))}
        focusCardId={focusCardId}
        blockedReason={blockedReason}
        hints={orderHints(cards.map((card) => card.id))}
        currentSet={PICK_TIERS.find((tier) => matchesTier(tier.id, taskType, picks))?.id ?? null}
        onApplySet={handleApplySet}
        undo={undo ? { label: undo.label, onUndo: handleUndo } : null}
        actions={actions}
      />
    </WorkflowShell>
  );
}
