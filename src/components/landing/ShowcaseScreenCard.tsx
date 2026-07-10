import { cn } from "../../utils/styling/styles";
import type { ShowcaseScreen } from "../../data/landingData";
import { MetricSelectionPreview } from "./MetricSelectionPreview";

/**
 * ScreenShowcase의 개별 화면 카드. 지표 선택(index 1)은 정적 프리뷰, 그 외는 showcase iframe 을 렌더한다.
 */
export function ShowcaseScreenCard({
  screen,
  index,
  className,
}: {
  screen: ShowcaseScreen;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-xl font-semibold text-foreground">{screen.title}</h3>
      </div>
      <div
        className={cn(
          "landing-showcase-frame bg-[#FAFAFA] p-6",
          index === 1 && "landing-showcase-metrics-frame",
          `landing-showcase-frame-${index}`,
        )}
      >
        {index === 1 ? (
          <MetricSelectionPreview />
        ) : (
          <iframe
            title={`${screen.title} preview`}
            src={`${screen.route}?showcase=1`}
            className={cn(
              "landing-showcase-iframe border-0",
              `landing-showcase-iframe-${index}`,
            )}
          />
        )}
      </div>
    </div>
  );
}
