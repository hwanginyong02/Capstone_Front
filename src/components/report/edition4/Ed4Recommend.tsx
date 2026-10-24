/**
 * 판 4 6절 개선 권고(6.1 데이터 = 권고 칸 9.1, 6.2 모델과 운영 = 9.2).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4Recommend({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Recommend">
      <Ed4SectionTitle number="6" />
      <Ed4SubsectionTitle number="6.1" />
      <Ed4SubsectionTitle number="6.2" />
    </section>
  );
}
