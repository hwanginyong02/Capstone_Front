import { cn } from "../../utils/styling/styles";
import { showcaseScreens } from "../../data/landingData";
import { ShowcaseScreenCard } from "./ShowcaseScreenCard";
import { ShowcaseText } from "./ShowcaseText";

/**
 * 랜딩 "How you can evaluate" 섹션. 화면 카드와 설명을 좌우 교차로 배치한다.
 */
export function ScreenShowcase() {
  return (
    <div className="space-y-24">
      {showcaseScreens.map((screen, index) => {
        const imageFirst = index % 2 === 0;

        return (
          <div
            key={screen.route}
            className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
          >
            <div className={cn(!imageFirst && "lg:order-2")}>
              <ShowcaseScreenCard screen={screen} index={index} />
            </div>
            <div className={cn(!imageFirst && "lg:order-1")}>
              <ShowcaseText screen={screen} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
