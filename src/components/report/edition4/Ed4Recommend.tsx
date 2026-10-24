/**
 * 판 4 6절 개선 권고(판 4 라운드 계획 4절, 갈래 b5) — 6.1 데이터(권고 칸 9.1)·6.2 모델과 운영(9.2). 배치는 순수 함수 `ed4RecommendLayout`.
 * - 소절마다 칸 서술 + 표 "우선순위 | 대응 문제 번호 | 권고 | 기대 효과". 한쪽에 문제가 없으면 표 없이 서술만(부록 B19).
 * - 문제가 하나도 없으면 고정 문구 6 만.
 * - 9 칸 배지(규칙 기반)는 판 3 9절처럼 절 제목 옆에, **화면에만**.
 */
import { SectionSourceBadge } from "../shared/SectionSourceBadge";
import { Ed4SlotBodyView, Ed4SlotHeading } from "./Ed4Findings";
import type { Ed4PartProps } from "./shared/ed4PartProps";
import { Ed4SectionTitle } from "./shared/Ed4Headings";
import { Ed4Paragraph } from "./shared/Ed4Paragraph";
import { Ed4Table } from "./shared/Ed4Table";
import { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import { ed4RecommendLayout } from "../../../lib/report/edition4/render/recommendEd4";
import { EX_RECOMMEND_COLUMNS } from "../../../lib/report/edition4/render/recommendText";

export function Ed4Recommend({ data, mode }: Ed4PartProps) {
  const layout = ed4RecommendLayout(data);
  const badge = layout.kind === "sides" ? layout.badge : null;
  return (
    <section data-ed4-part="Ed4Recommend">
      {mode === "screen" && badge !== null ? (
        <div className="flex items-center gap-2">
          <Ed4SectionTitle number="6" />
          <SectionSourceBadge kind={badge} />
        </div>
      ) : (
        <Ed4SectionTitle number="6" />
      )}
      {layout.kind === "no_problem" ? (
        <Ed4Paragraph>{NO_PROBLEM_SENTENCE}</Ed4Paragraph>
      ) : (
        layout.sides.map((side) => (
          <div key={side.place} data-ed4-slot={side.slot}>
            <Ed4SlotHeading place={side.place} badge={null} mode={mode} />
            <Ed4SlotBodyView body={side.body} />
            {side.rows && <Ed4Table columns={EX_RECOMMEND_COLUMNS} rows={side.rows} />}
          </div>
        ))
      )}
    </section>
  );
}
