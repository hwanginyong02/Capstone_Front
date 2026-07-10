import { useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { cn } from "../../utils/styling/styles";

/**
 * 최종 성적서 미리보기 iframe. 휠/드래그로 내부 리포트를 스크롤할 수 있게 오버레이를 제공한다.
 */
export function ScrollableReportPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    iframeRef.current?.contentWindow?.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto",
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const previous = lastPointerRef.current;
    const deltaX = previous.x - event.clientX;
    const deltaY = previous.y - event.clientY;

    iframeRef.current?.contentWindow?.scrollBy({
      top: deltaY,
      left: deltaX,
      behavior: "auto",
    });

    lastPointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="relative h-full">
      <iframe
        ref={iframeRef}
        title="Final report preview"
        src="/report/preview"
        className="landing-report-preview-iframe border-0"
      />
      <div
        className={cn(
          "absolute inset-0 cursor-grab touch-none",
          isDragging && "cursor-grabbing",
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="Scrollable final report preview"
      />
    </div>
  );
}
