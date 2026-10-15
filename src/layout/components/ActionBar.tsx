import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";

interface ActionBarProps {
  showPrevious?: boolean;
  showNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  /** 이전 버튼 문구. 기본값은 "이전"이다(docs/MATERIAL_PICKER.md §8). */
  previousLabel?: string;
  leftAction?: React.ReactNode;
  /**
   * 다음 버튼 **왼쪽**에 놓는 요소. 입력 화면의 "비어 있는 칸" 한 줄(`RemainingNotice`)이
   * 여기 들어간다. 배치는 docs/COMPOSER_DESIGN.md "Action Bar" 를 따른다.
   */
  rightAction?: React.ReactNode;
  /** 버튼 높이. 기본 36px, `lg` 는 40px. */
  buttonSize?: "default" | "lg";
}

export function ActionBar({
  showPrevious = true,
  showNext = true,
  onPrevious,
  onNext,
  nextDisabled = false,
  nextLabel = "다음",
  previousLabel = "이전",
  leftAction,
  rightAction,
  buttonSize = "default",
}: ActionBarProps) {
  return (
    <div className="h-18 border-t border-border bg-background sticky bottom-0 z-40">
      <div className="h-full px-8 py-4 flex items-center justify-between max-w-[1344px] mx-auto">
        <div className="flex items-center gap-4">
          {showPrevious && (
            <Button variant="outline" size={buttonSize} onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {previousLabel}
            </Button>
          )}
          {leftAction}
        </div>

        {/* 요약과 다음 버튼 사이 16px(docs/COMPOSER_DESIGN.md). 요약이 없으면 차이가 없다. */}
        <div className="flex items-center gap-4">
          {rightAction}
          {showNext && (
            <Button size={buttonSize} onClick={onNext} disabled={nextDisabled}>
              {nextLabel}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
