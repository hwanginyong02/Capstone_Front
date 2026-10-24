/**
 * 판 4 4절 시험 결과의 앞부분(절 제목, 4.1 데이터 점검, 4.2 종합 판정, 4.3 지표별 결과).
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle, Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4ResultsCore({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4ResultsCore">
      <Ed4SectionTitle number="4" />
      <Ed4SubsectionTitle number="4.1" />
      <Ed4SubsectionTitle number="4.2" />
      <Ed4SubsectionTitle number="4.3" />
    </section>
  );
}
