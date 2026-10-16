/**
 * 재료 고르기 화면의 본문(docs/MATERIAL_PICKER.md §11).
 *
 * - 왼쪽: 재료 목록 — 대분류와 카드만.
 * - 가운데 위: 다이어그램 — 무엇이 들어갔고 어떤 순서로 입력하는지.
 * - 가운데 아래: 필드 패널 — 왼쪽이나 다이어그램에서 고른 카드의 필드 설명과 형식. 여기서
 *   다이어그램으로 끌어 놓거나 ＋로 넣는다.
 *
 * 바꾼 것은 그 자리에서 바로 보인다. 저장 버튼은 없다. 현황과 이전·다음은 셸의 하단 바에 있다.
 *
 * 데스크톱(lg 이상)에서는 페이지 전체 스크롤을 만들지 않는다(셸의 `fitViewport`). 화면 높이를
 * 영역끼리 나누고 넘치는 것은 각자 안에서 스크롤한다 — 재료 목록, 다이어그램(가운데 높이의 최대
 * 55%), 필드 패널의 필드 목록(남은 높이 전부).
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
import { getCard } from "../../data/reportComposer";
import { isCardIncluded } from "../../utils/domain/cardOrder";
import type { PickTier } from "../../utils/domain/materialPicks";
import { FieldPanel } from "./FieldPanel";
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
  /** 필드 패널에 보이는 카드. */
  selectedCardId: ComposerCardId;
  onSelectCard: (cardId: ComposerCardId) => void;
  /** 다이어그램 노드를 눌렀을 때 — 그 카드를 필드 패널에 열고 보이게 한다. */
  onSelectInDiagram: (cardId: ComposerCardId) => void;
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
  selectedCardId,
  onSelectCard,
  onSelectInDiagram,
  blockedReason,
  hints,
  currentSet,
  onApplySet,
  undo,
  actions,
}: MaterialPickerProps) {
  const selectedCard = getCard(selectedCardId);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-4 px-6 pb-4 pt-5 lg:min-h-0 lg:flex-1 lg:px-8">
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-heading-large font-medium text-foreground">재료 고르기</h1>
            <p className="text-sm leading-[21px] text-muted-foreground">
              카드를 고르면 아래에 필드가 나와요. 넣을 재료를 다이어그램에 끌어 놓고 입력할 순서를 정하세요.
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

        <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
          <div className="w-full lg:w-[260px] lg:shrink-0 lg:overflow-y-auto">
            <PickPalette
              taskType={taskType}
              selection={selection}
              selectedCardId={selectedCardId}
              onSelectCard={onSelectCard}
              actions={actions}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
            {/* 다이어그램은 제 높이만큼, 가운데 높이의 55%까지. 넘치면 안에서 스크롤한다. */}
            <div className="lg:max-h-[55%] lg:shrink-0 lg:overflow-y-auto">
              <PickDiagram
                taskType={taskType}
                lanes={lanes}
                cards={cards}
                picks={picks}
                selectedCardId={selectedCardId}
                onSelectCard={onSelectInDiagram}
                blockedReason={blockedReason}
                hints={hints}
                actions={actions}
              />
            </div>
            {/* 필드 패널은 남은 높이를 다 쓴다. 필드 목록만 패널 안에서 스크롤한다. */}
            <div className="flex lg:min-h-0 lg:flex-1">
              <FieldPanel
                key={selectedCardId}
                taskType={taskType}
                card={selectedCard}
                picks={picks[selectedCardId] ?? []}
                included={isCardIncluded(selectedCard, selection)}
                actions={actions}
              />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
