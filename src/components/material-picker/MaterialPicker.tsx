/**
 * 재료 고르기 화면의 본문 — 왼쪽 카탈로그와 가운데 필드(docs/MATERIAL_PICKER.md §4).
 *
 * 오른쪽 입력 순서는 셸의 옆 패널로 들어간다(`WorkflowShell` 의 `aside`). 상태는 페이지가 든다 —
 * 이 컴포넌트는 그리기만 한다(FRONTEND_DEVELOPMENT_GUIDELINE §1).
 */
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCardId, MaterialPicks } from "../../types/reportComposer.types";
import { CategoryNav } from "./CategoryNav";
import { FieldPicker } from "./FieldPicker";

interface MaterialPickerProps {
  taskType: TaskType | "";
  cardId: ComposerCardId;
  picks: MaterialPicks;
  draft: string[];
  onSelectCard: (cardId: ComposerCardId) => void;
  onToggle: (pickId: string) => void;
  onSave: () => void;
}

export function MaterialPicker({
  taskType,
  cardId,
  picks,
  draft,
  onSelectCard,
  onToggle,
  onSave,
}: MaterialPickerProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      <div className="w-full border-b border-border p-6 lg:w-[340px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <CategoryNav taskType={taskType} cardId={cardId} picks={picks} onSelectCard={onSelectCard} />
      </div>
      <div className="min-w-0 flex-1 px-6 pb-14 pt-8 lg:px-10">
        <FieldPicker
          taskType={taskType}
          cardId={cardId}
          draft={draft}
          saved={picks[cardId]}
          onToggle={onToggle}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
