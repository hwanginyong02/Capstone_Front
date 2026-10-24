/**
 * 판 4 4절 시험 결과의 뒷부분(4.4 오분류 ~ 4.8 응답시간). 절 제목은 `Ed4ResultsCore` 가 그린다.
 * 지금은 제목만 그린다(판 4 라운드 S4·S5 1단계 뼈대) — 2단계가 예시본 모양으로 채운다.
 */
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SubsectionTitle } from "./shared/Ed4Headings";
export function Ed4ResultsDetail({ data, mode }: Ed4PartProps) {
  return (
    <section data-ed4-part="Ed4ResultsDetail">
      <Ed4SubsectionTitle number="4.4" />
      <Ed4SubsectionTitle number="4.5" />
      <Ed4SubsectionTitle number="4.6" />
      <Ed4SubsectionTitle number="4.7" />
      <Ed4SubsectionTitle number="4.8" />
    </section>
  );
}
