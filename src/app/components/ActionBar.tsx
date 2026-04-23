import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ActionBarProps {
  showPrevious?: boolean;
  showNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

export function ActionBar({
  showPrevious = true,
  showNext = true,
  onPrevious,
  onNext,
  nextDisabled = false,
  nextLabel = "다음 단계",
}: ActionBarProps) {
  return (
    <div className="h-18 border-t border-border bg-background sticky bottom-0 z-40">
      <div className="h-full px-8 py-4 flex items-center justify-between max-w-[1344px] mx-auto">
        {/* Left: Previous Button */}
        <div>
          {showPrevious && (
            <Button variant="outline" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
          )}
        </div>

        {/* Right: Next Button */}
        <div>
          {showNext && (
            <Button onClick={onNext} disabled={nextDisabled}>
              {nextLabel}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
