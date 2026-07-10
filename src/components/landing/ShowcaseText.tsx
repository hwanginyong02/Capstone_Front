import { CheckCircle2 } from "lucide-react";
import type { ShowcaseScreen } from "../../data/landingData";

/**
 * ScreenShowcase의 각 화면 설명 텍스트 블록(스텝 번호/제목/설명/하이라이트).
 */
export function ShowcaseText({ screen }: { screen: ShowcaseScreen }) {
  return (
    <div className="max-w-2xl">
      <p className="text-base font-medium text-primary">{screen.step}</p>
      <h3 className="mt-4 text-4xl font-semibold leading-tight text-foreground md:text-5xl">
        {screen.title}
      </h3>
      <p className="mt-6 text-xl leading-9 text-muted-foreground">
        {screen.description}
      </p>
      <div className="mt-7 flex gap-3 text-base leading-7 text-muted-foreground">
        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <span>{screen.highlight}</span>
      </div>
    </div>
  );
}
