import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";

interface ActionBarProps {
  showPrevious?: boolean;
  showNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  /** 이전 버튼 문구. 기본값은 기존 화면이 쓰는 영문이다. */
  previousLabel?: string;
  leftAction?: React.ReactNode;
  /**
   * 다음 버튼 **왼쪽**에 놓는 요소. 성적서 구성 화면의 요약 한 줄이 여기 들어간다
   * (docs/COMPOSER_DESIGN.md "Action Bar").
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
  nextLabel = "Next",
  previousLabel = "Previous",
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
