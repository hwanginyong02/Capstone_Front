import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { WorkflowShell } from "../layout/WorkflowShell";
import { MaterialPicker as MaterialPickerContent } from "../components/material-picker/MaterialPicker";
import { InputOrderPanel } from "../components/material-picker/InputOrderPanel";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { buildStepList } from "../utils/domain/workflowSteps";
import { picksToSave, unsavedRequiredCards } from "../utils/domain/materialPicks";
import { getStepDefinition } from "../data/workflowSteps";
import type { ComposerCardId } from "../types/reportComposer.types";

/**
 * 재료 고르기 (`/app/composer`) — 작업 유형 다음, 입력 단계 시작 전(docs/MATERIAL_PICKER.md §1).
 *
 * 3단이다(§4): 왼쪽 대분류·카드, 가운데 필드와 저장, 오른쪽 입력 순서와 이전·다음.
 *
 * 저장 규칙(§7):
 * - 저장은 그 카드에서 무엇을 받을지 확정하는 것이다. 체크는 저장해야 반영된다 — 저장하지 않고
 *   다른 카드로 가도 체크는 화면(`drafts`)에 남지만 스토어에는 들지 않는다.
 * - 저장하지 않은 필수 카드가 있으면 다음으로 넘어가지 않고 그 이름을 오류로 보인다. 버튼을
 *   잠그지 않는다 — 누르면 무엇이 남았는지 알려 준다.
 * - 선택 카드를 저장하지 않거나 아무것도 체크하지 않고 저장하면 그 카드는 빼고 진행한다.
 *
 * 입력 단계에 들어가기 **전** 화면이라 단계 탭을 두지 않고(`showStepTabs={false}`), 단계도
 * 아니다(`isStepPage={false}` — URL→단계 유도와 진입 가드를 끈다). 유형을 고르지 않고 URL 로
 * 바로 들어오면 고를 것이 없으므로 작업 유형 화면으로 보낸다.
 */
export function MaterialPicker() {
  const navigate = useNavigate();
  const taskType = useWorkflowStore((s) => s.taskType);
  const picks = useWorkflowStore((s) => s.materialPicks);
  const saveMaterialPick = useWorkflowStore((s) => s.saveMaterialPick);

  const [cardId, setCardId] = useState<ComposerCardId>("clientInfo");
  /** 손댄 카드의 화면 체크. 손대지 않은 카드는 저장한 체크를 그대로 보인다. */
  const [drafts, setDrafts] = useState<Partial<Record<ComposerCardId, string[]>>>({});
  const [triedNext, setTriedNext] = useState(false);

  // 렌더 중에 navigate 를 부르지 않는다 — 라우트 테이블의 리다이렉트와 같은 방식을 쓴다.
  if (!taskType) return <Navigate to="/app" replace />;

  const draftOf = (id: ComposerCardId) => drafts[id] ?? picks[id] ?? [];
  const unsaved = unsavedRequiredCards(taskType, picks);
  const error =
    triedNext && unsaved.length > 0
      ? "저장하지 않은 필수 카드가 있어요: " + unsaved.map((card) => card.name).join(", ")
      : null;

  const handleToggle = (pickId: string) => {
    const current = draftOf(cardId);
    const next = current.includes(pickId)
      ? current.filter((id) => id !== pickId)
      : [...current, pickId];
    setDrafts((prev) => ({ ...prev, [cardId]: next }));
  };

  const handleSave = () => {
    saveMaterialPick(cardId, picksToSave(cardId, taskType, draftOf(cardId)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  /** 고른 카드로 계산한 첫 단계로 간다. 저장한 선택만 반영된 상태다. */
  const handleNext = () => {
    if (unsaved.length > 0) {
      setTriedNext(true);
      return;
    }
    const [firstStep] = buildStepList(useWorkflowStore.getState().composerCards);
    navigate(getStepDefinition(firstStep).path ?? "/app/data-upload");
  };

  return (
    <WorkflowShell
      showStepTabs={false}
      isStepPage={false}
      aside={
        <InputOrderPanel
          taskType={taskType}
          picks={picks}
          cardId={cardId}
          onSelectCard={setCardId}
          error={error}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 px-4 text-base" onClick={() => navigate("/app")}>
                이전
              </Button>
              <Button className="h-11 flex-1 text-base" onClick={handleNext}>
                다음
              </Button>
            </div>
          }
        />
      }
    >
      <MaterialPickerContent
        taskType={taskType}
        cardId={cardId}
        picks={picks}
        draft={draftOf(cardId)}
        onSelectCard={setCardId}
        onToggle={handleToggle}
        onSave={handleSave}
      />
    </WorkflowShell>
  );
}
