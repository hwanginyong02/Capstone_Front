import * as React from "react";

import { useScrollEdges, type ScrollEdges } from "../../hooks/useScrollEdges";
import { cn } from "../../utils/styling/styles";

/**
 * 스크롤 단서가 있는 세로 스크롤 영역(U1).
 *
 * - 얇은 스크롤바가 늘 보인다(`scrollbar-visible`).
 * - 가려진 내용이 있는 쪽 가장자리에 1px 선이 생긴다. 그라데이션·그림자는 쓰지 않는다(디자인 지침).
 * - `cue` 로 영역 위에 겹쳐 그릴 것(예: "아래에 더 있어요" 알약)을 받는다. 스크롤 상태와 스크롤되는
 *   요소를 넘겨준다.
 *
 * 스크롤되는 요소는 `relative` 라 안쪽 요소의 `offsetTop` 이 내용 기준 좌표다.
 */
interface ScrollPaneProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** 스크롤되는 요소의 클래스(바깥 클래스는 `className`). */
  viewportClassName?: string;
  cue?: (edges: ScrollEdges, viewport: HTMLDivElement | null) => React.ReactNode;
  children: React.ReactNode;
}

function ScrollPane({ className, viewportClassName, cue, children, ...props }: ScrollPaneProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(viewportRef);
  return (
    <div data-slot="scroll-pane" className={cn("relative flex min-h-0 flex-col", className)} {...props}>
      <div
        ref={viewportRef}
        data-slot="scroll-pane-viewport"
        className={cn("scrollbar-visible relative min-h-0 flex-1", viewportClassName)}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        data-edge="top"
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-border-strong", !edges.top && "opacity-0")}
      />
      <span
        aria-hidden="true"
        data-edge="bottom"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-strong",
          !edges.bottom && "opacity-0",
        )}
      />
      {cue?.(edges, viewportRef.current)}
    </div>
  );
}

export { ScrollPane };
