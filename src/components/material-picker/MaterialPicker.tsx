/**
 * 평가 흐름 만들기 화면의 본문(docs/MATERIAL_PICKER.md §12.3).
 *
 * - 머리: 제목, 안내, 범례(한 번).
 * - 왼쪽: 항목 트리 — 단계 > 블록 > 항목. 이름을 누르면 설명 팝업이 열린다.
 * - 가운데: 흐름도 — 놓인 블록과 입력 순서. 남은 높이를 다 쓴다.
 *
 * 바꾼 것은 그 자리에서 바로 보인다. 저장 버튼은 없다. 현황과 이전·다음은 셸의 하단 바에 있다.
 *
 * 데스크톱(lg 이상)에서는 페이지 전체 스크롤을 만들지 않는다(셸의 `fitViewport`). 트리와 흐름도가
 * 각자 안에서 스크롤한다. 상태는 페이지가 든다 — 이 컴포넌트는 그리기만 한다
 * (FRONTEND_DEVELOPMENT_GUIDELINE §1).
 */
import type { ComponentProps } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TooltipProvider } from "../ui/tooltip";
import { KindLegend } from "./KindLegend";
import { PickDiagram } from "./PickDiagram";
import { PickTree } from "./PickTree";

interface MaterialPickerProps {
  tree: ComponentProps<typeof PickTree>;
  diagram: ComponentProps<typeof PickDiagram>;
}

export function MaterialPicker({ tree, diagram }: MaterialPickerProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <TooltipProvider>
        <div className="flex flex-col gap-4 px-6 pb-4 pt-5 lg:min-h-0 lg:flex-1 lg:px-8">
          <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-heading-large font-medium text-foreground">평가 흐름 만들기</h1>
              <p className="text-sm leading-[21px] text-muted-foreground">
                왼쪽에서 항목을 끌어 단계에 놓으면 블록이 만들어져요. 블록과 단계를 끌어 입력할 순서를 바꿀 수 있어요.
              </p>
            </div>
            <KindLegend />
          </header>

          <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
            <div className="max-h-[60vh] w-full overflow-y-auto lg:max-h-none lg:w-70 lg:shrink-0 xl:w-76">
              <PickTree {...tree} />
            </div>
            {/* 흐름도는 남은 높이를 다 쓰고 안에서 스크롤한다(스크롤 단서는 흐름도가 그린다). */}
            <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
              <PickDiagram {...diagram} />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DndProvider>
  );
}
