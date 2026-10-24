/**
 * 판 4 5절 분석 소견(5.1~5.6 — 서술 칸 8.2·7.1·7.2·8.1·8.3·7.3 의 자리, `narrativeSlots.ts`).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4Findings({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Findings">
      <Ed4SectionTitle number="5" />
      <Ed4SubsectionTitle number="5.1" />
      <Ed4SubsectionTitle number="5.2" />
      <Ed4SubsectionTitle number="5.3" />
      <Ed4SubsectionTitle number="5.4" />
      <Ed4SubsectionTitle number="5.5" />
      <Ed4SubsectionTitle number="5.6" />
    </section>
  );
}
