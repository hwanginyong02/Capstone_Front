/**
 * 판 4 3절 시험 방법(3.1 의뢰자 요구사항 ~ 3.5 시험 절차와 평가 환경).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4Method({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Method">
      <Ed4SectionTitle number="3" />
      <Ed4SubsectionTitle number="3.1" />
      <Ed4SubsectionTitle number="3.2" />
      <Ed4SubsectionTitle number="3.3" />
      <Ed4SubsectionTitle number="3.4" />
      <Ed4SubsectionTitle number="3.5" />
    </section>
  );
}
