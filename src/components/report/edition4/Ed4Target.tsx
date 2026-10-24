/**
 * 판 4 2절 시험 대상(2.1 대상 모델, 2.2 평가 데이터, 2.3 학습 데이터).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4Target({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Target">
      <Ed4SectionTitle number="2" />
      <Ed4SubsectionTitle number="2.1" />
      <Ed4SubsectionTitle number="2.2" />
      <Ed4SubsectionTitle number="2.3" />
    </section>
  );
}
