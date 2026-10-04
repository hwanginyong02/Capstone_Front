/**
 * 성적서 구성 화면의 메인 컨텐츠.
 *
 * 분류 유형을 고른 바로 다음 화면이다. 사용자는 선택 카드를 켜고 끄는 것만으로 자신의
 * 시험성적서를 구성하고, "다음"을 누르면 고른 카드의 입력 단계만 만들어진다
 * (docs/COMPOSER_COMPONENTS.md · docs/COMPOSER_DESIGN.md).
 *
 * 순수 컨텐츠 컴포넌트다 — Action Bar 와 헤더는 `WorkflowShell` 이 그린다(가이드라인 §2).
 * 카드 선택 상태는 스토어에 있고, 이 컴포넌트는 props 로만 받는다. 그래야 테스트가 스토어
 * 없이 상태 조합을 직접 넣어볼 수 있다.
 */
import { useState } from "react";
import { ComposerCard } from "./ComposerCard";
import { ComposerCardRow } from "./ComposerCardRow";
import { CardDetailPanel } from "./CardDetailPanel";
import { PresetToggle } from "./PresetToggle";
import {
  OPTIONAL_CARD_IDS,
  REQUIRED_CARD_IDS,
  getCard,
  getVisibleCards,
  matchPreset,
} from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type {
  ComposerCardId,
  ComposerPreset,
  ComposerSelection,
  OptionalCardId,
} from "../../types/reportComposer.types";

interface ReportComposerProps {
  taskType: TaskType;
  selection: ComposerSelection;
  onToggleCard: (id: OptionalCardId, on: boolean) => void;
  onApplyPreset: (preset: ComposerPreset) => void;
}

export function ReportComposer({
  taskType,
  selection,
  onToggleCard,
  onApplyPreset,
}: ReportComposerProps) {
  // 화면에 들어오면 ① 평가 데이터가 "보고 있음" 상태다.
  const [viewingId, setViewingId] = useState<ComposerCardId>("evalData");

  const visible = getVisibleCards(taskType);
  const requiredCards = visible.filter((card) => card.locked);
  const optionalCards = visible.filter((card) => !card.locked);
  const viewingCard = getCard(viewingId);

  const isIncluded = (id: ComposerCardId) =>
    REQUIRED_CARD_IDS.includes(id) ? true : Boolean(selection[id as OptionalCardId]);

  // 넣고 빼기는 상세 영역의 버튼이 한다 — 카드는 누르면 보여주기만 한다.
  const handleToggleViewing = () => {
    if (REQUIRED_CARD_IDS.includes(viewingId)) return;
    onToggleCard(viewingId as OptionalCardId, !isIncluded(viewingId));
  };

  return (
    <main className="mx-auto max-w-[1344px] px-8 pt-12 pb-24">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-large font-bold text-foreground">Report composer</h1>
          <p className="mt-1 text-body-medium text-muted-foreground">
            Choose what goes into the report. Select a card to see what it asks for.
          </p>
        </div>
        <PresetToggle active={matchPreset(selection)} onApply={onApplyPreset} />
      </header>

      <div className="mb-6">
        <ComposerCardRow label="Required" count={requiredCards.length} columns="required">
          {requiredCards.map((card) => (
            <ComposerCard
              key={card.id}
              card={card}
              included
              viewing={viewingId === card.id}
              onView={() => setViewingId(card.id)}
            />
          ))}
        </ComposerCardRow>
      </div>

      <div className="mb-10">
        <ComposerCardRow
          label="Optional"
          count={OPTIONAL_CARD_IDS.length}
          note="Add one to the report and you fill in every required field inside it"
          columns="optional"
        >
          {optionalCards.map((card) => (
            <ComposerCard
              key={card.id}
              card={card}
              included={isIncluded(card.id)}
              viewing={viewingId === card.id}
              onView={() => setViewingId(card.id)}
            />
          ))}
        </ComposerCardRow>
      </div>

      <CardDetailPanel
        card={viewingCard}
        taskType={taskType}
        included={isIncluded(viewingId)}
        onToggle={handleToggleViewing}
      />
    </main>
  );
}
