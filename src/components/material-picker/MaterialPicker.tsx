/**
 * 재료 고르기 화면의 본문 — 왼쪽 재료 목록과 가운데 큰 다이어그램(docs/MATERIAL_PICKER.md §11).
 *
 * 무엇을 넣을지와 어떤 순서로 입력할지를 한 다이어그램에서 정하고, 바꾼 것은 그 자리에서 바로
 * 보인다. 저장 버튼은 없다. 현황과 이전·다음은 셸의 하단 바에 있다.
 *
 * 상태는 페이지가 든다 — 이 컴포넌트는 그리기만 한다(FRONTEND_DEVELOPMENT_GUIDELINE §1).
 */
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCard,
  ComposerCardId,
  ComposerSelection,
  MaterialCategory,
  MaterialPicks,
} from "../../types/reportComposer.types";
import type { PickTier } from "../../utils/domain/materialPicks";
import { PickDiagram } from "./PickDiagram";
import { PickPalette } from "./PickPalette";
import { PickSetToggle } from "./PickSetToggle";
import type { PickerActions } from "./dnd";

interface MaterialPickerProps {
  taskType: TaskType | "";
  picks: MaterialPicks;
  selection: ComposerSelection;
  lanes: MaterialCategory[];
  /** 들어간 카드, 입력 순서대로. */
  cards: ComposerCard[];
  expandedCardId: ComposerCardId | null;
  onToggleExpanded: (cardId: ComposerCardId) => void;
  /** 처음에 팔레트에서 펼쳐 둘 카드. */
  focusCardId?: ComposerCardId | null;
  blockedReason: string | null;
  hints: string[];
  /** 지금 고른 것과 똑같은 추천 세트. */
  currentSet: PickTier | null;
  onApplySet: (tier: PickTier) => void;
  /** 추천 세트를 적용한 직후의 되돌리기. */
  undo: { label: string; onUndo: () => void } | null;
  actions: PickerActions;
}

export function MaterialPicker({
  taskType,
  picks,
  selection,
  lanes,
  cards,
  expandedCardId,
  onToggleExpanded,
  focusCardId,
  blockedReason,
  hints,
  currentSet,
  onApplySet,
  undo,
  actions,
}: MaterialPickerProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-6 px-6 pb-6 pt-8 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="flex max-w-[640px] flex-col gap-2">
            <h1 className="text-heading-large font-medium text-foreground">재료 고르기</h1>
            <p className="text-sm leading-[21px] text-muted-foreground">
              성적서에 넣을 재료를 가운데 다이어그램에 끌어 놓고, 입력할 순서를 정하세요. 바꾼 것은 바로
              반영돼요. 입력은 다이어그램의 번호 순서대로 진행돼요.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <PickSetToggle current={currentSet} onApply={onApplySet} />
            {undo && (
              <p role="status" className="text-sm text-muted-foreground">
                '{undo.label}' 세트를 적용했어요.{" "}
                <button
                  type="button"
                  onClick={undo.onUndo}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  되돌리기
                </button>
              </p>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full lg:sticky lg:top-20 lg:max-h-[calc(100vh-11rem)] lg:w-[300px] lg:shrink-0 lg:overflow-y-auto">
            <PickPalette
              taskType={taskType}
              picks={picks}
              selection={selection}
              initialExpanded={focusCardId}
              actions={actions}
            />
          </div>
          <div className="min-w-0 flex-1">
            <PickDiagram
              taskType={taskType}
              lanes={lanes}
              cards={cards}
              picks={picks}
              expandedCardId={expandedCardId}
              onToggleExpanded={onToggleExpanded}
              blockedReason={blockedReason}
              hints={hints}
              actions={actions}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
