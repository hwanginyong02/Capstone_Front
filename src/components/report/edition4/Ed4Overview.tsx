/**
 * 판 4 1절 시험 개요(1.1 의뢰자와 시험기관, 1.2 시험 목적과 성적서 용도, 1.3 제약사항).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4Overview({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4Overview">
      <Ed4SectionTitle number="1" />
      <Ed4SubsectionTitle number="1.1" />
      <Ed4SubsectionTitle number="1.2" />
      <Ed4SubsectionTitle number="1.3" />
    </section>
  );
}
