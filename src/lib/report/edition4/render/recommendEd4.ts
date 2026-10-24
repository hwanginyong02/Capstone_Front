/**
 * 판 4 6절 개선 권고의 배치(판 4 라운드 계획 4절 "6절 6.1/6.2 + 6번 문구", 갈래 b5) — 저장값을 **읽기만** 한다.
 *
 * - 문제의 저장된 `recommend_section`(칸 이름 9.1/9.2)으로 6.1 데이터 / 6.2 모델과 운영 에 나눈다(`narrativeSlots.ED4_RECOMMEND_SECTIONS`).
 *   소절마다 칸 서술(9.1 = `recommendationNarrative.dataQuality`, 9.2 = `modelOps`)과 표 "우선순위 | 대응 문제 번호 | 권고 | 기대 효과".
 * - 표 행: 그 소절 문제의 번호 순서대로, 문제마다 그 문제 번호가 붙은 권고 행(저장 순서). 우선순위는 문제의 우선순위를 판 4 글자로
 *   (`priorityLabelEd4` — 판 3 문제 표와 같이 문제의 값), 대응 문제 칸은 "P2 · {판 4 문제 이름}". 권고가 아직 없는 문제는 판 3 처럼
 *   자리표시 행. **문제 번호가 없거나 모르는 번호인 권고는 찍지 않는다**(계획 4절).
 * - 한쪽에 문제가 없으면 부록 B19 — 소제목과 그 칸 서술만, 표 없음. 문제가 하나도 없으면 고정 문구 6 만(판 3 9절과 같은 규칙 —
 *   6.1·6.2 소제목·서술 없음).
 * - 권고 분류(category)는 찍지 않는다(예시본에 열이 없음).
 */
import type { FinalReportData, Problem } from "../../../../types/finalReport.types";
import { sectionBadgeKind } from "../../../../components/report/shared/SectionSourceBadge";
import { recommendationPlaceholder } from "../../../../components/report/shared/narrativePlaceholder";
import { priorityLabelEd4, problemLabel } from "../../problemList";
import { ED4_DASH, type Ed4TitleNumber } from "../edition4Text";
import { ED4_RECOMMEND_SECTIONS } from "../narrativeSlots";
import { ed4SlotBody, type Ed4SlotBody } from "./findingsEd4";
import { ED3_RECOMMEND_PLACEHOLDER, ED3_RECOMMENDATION_PENDING } from "./recommendText";

/** 권고 표 한 행(칸 글 넷 — 예시본 순서). */
export type Ed4RecommendRow = readonly [priority: string, problem: string, action: string, impact: string];

export interface Ed4RecommendSide {
  place: Ed4TitleNumber;
  slot: string;
  body: Ed4SlotBody;
  /** 표 행 — 이 소절에 문제가 없으면 null(B19, 표 없음). */
  rows: Ed4RecommendRow[] | null;
}

export type Ed4RecommendLayout =
  | { kind: "no_problem" }
  | { kind: "sides"; sides: Ed4RecommendSide[]; badge: "fallback" | null };

const NARRATIVE_OF: Record<string, (data: FinalReportData) => string | undefined> = {
  "9.1": (data) => data.recommendationNarrative?.dataQuality,
  "9.2": (data) => data.recommendationNarrative?.modelOps,
};

/** 한 소절 문제들의 권고 표 행. */
export function ed4RecommendRows(data: FinalReportData, problems: ReadonlyArray<Problem>): Ed4RecommendRow[] {
  const recommendations = data.recommendations ?? [];
  const rows: Ed4RecommendRow[] = [];
  for (const problem of problems) {
    const priority = priorityLabelEd4(problem.priority);
    const label = problemLabel(problem);
    const recs = recommendations.filter((rec) => rec.problemId === problem.id);
    if (recs.length === 0) {
      rows.push([priority, label, recommendationPlaceholder(data.narrativeSource, ED3_RECOMMENDATION_PENDING), ED4_DASH]);
    }
    for (const rec of recs) rows.push([priority, label, rec.action, rec.expectedImpact]);
  }
  return rows;
}

/** 6절 배치. */
export function ed4RecommendLayout(data: FinalReportData): Ed4RecommendLayout {
  const problems = data.problems ?? [];
  if (problems.length === 0) return { kind: "no_problem" };
  const sides = ED4_RECOMMEND_SECTIONS.map(({ slot, edition4_place }) => {
    const mine = problems.filter((p) => p.recommend_section === slot);
    return {
      place: edition4_place as Ed4TitleNumber,
      slot,
      body: ed4SlotBody(data, NARRATIVE_OF[slot](data), undefined, ED3_RECOMMEND_PLACEHOLDER),
      rows: mine.length > 0 ? ed4RecommendRows(data, mine) : null,
    };
  });
  return { kind: "sides", sides, badge: sectionBadgeKind(true, data.narrativeSource, data.narrativeSections, "9") };
}
