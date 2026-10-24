/** 판 4 6절 배치 순수 함수(갈래 b5) — 6.1/6.2 가름, 권고 행, B19, 고정 문구 6, 배지. 그린 글 시험은 `Ed4Recommend.test.tsx`. */
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData } from "../../../../types/finalReport.types";
import { NARRATIVE_PENDING_TEXT } from "../../../../components/report/shared/narrativePlaceholder";
import { ed4RecommendLayout, ed4RecommendRows } from "./recommendEd4";

const copy = (d: FinalReportData) => structuredClone(d);

function sides(data: FinalReportData) {
  const layout = ed4RecommendLayout(data);
  if (layout.kind !== "sides") throw new Error("문제가 있는데 sides 가 아니다");
  return layout;
}

describe("ed4RecommendLayout", () => {
  it("bc_strong — 9.1→6.1(P2 1행), 9.2→6.2(P1 2행), 서술은 dataQuality·modelOps", () => {
    const data = loadEd4("bc_strong", "issued");
    const layout = sides(data);
    expect(layout.badge).toBeNull();
    expect(layout.sides.map((s) => [s.place, s.slot])).toEqual([
      ["6.1", "9.1"],
      ["6.2", "9.2"],
    ]);
    expect(layout.sides[0].body).toEqual({ kind: "narrative", text: data.recommendationNarrative.dataQuality });
    expect(layout.sides[1].body).toEqual({ kind: "narrative", text: data.recommendationNarrative.modelOps });
    const [rec1, rec2, rec3] = data.recommendations;
    expect(layout.sides[0].rows).toEqual([["낮음", "P2 · 평가 데이터가 학습과 같은 출처", rec3.action, rec3.expectedImpact]]);
    expect(layout.sides[1].rows).toEqual([
      ["중간", "P1 · 핵심 지표 근소 합격 (Recall)", rec1.action, rec1.expectedImpact],
      ["중간", "P1 · 핵심 지표 근소 합격 (Recall)", rec2.action, rec2.expectedImpact],
    ]);
  });

  it("yeast_strong — 6.1 에 P2·P3·P4(문제 순서), 6.2 에 P1", () => {
    const layout = sides(loadEd4("yeast_strong", "issued"));
    expect(layout.sides[0].rows!.map((r) => r[1].slice(0, 2))).toEqual(["P2", "P3", "P4"]);
    expect(layout.sides[0].rows!.map((r) => r[0])).toEqual(["중간", "낮음", "낮음"]);
    expect(layout.sides[1].rows!.map((r) => [r[0], r[1]])).toEqual([["중간", "P1 · 비핵심 지표 미달 (F1 Score)"]]);
  });

  it("B19 — 한쪽에 문제가 없으면 그쪽 rows 는 null, 서술은 그대로", () => {
    const data = copy(loadEd4("digits_strong", "issued"));
    data.problems = data.problems!.filter((p) => p.recommend_section === "9.2");
    const layout = sides(data);
    expect(layout.sides[0].rows).toBeNull();
    expect(layout.sides[0].body).toEqual({ kind: "narrative", text: "〔9.1 칸 서술 — digits_strong〕" });
    expect(layout.sides[1].rows).toHaveLength(1);
  });

  it("문제 0개 → no_problem(문제 키가 없어도)", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.problems = [];
    expect(ed4RecommendLayout(data)).toEqual({ kind: "no_problem" });
    delete data.problems;
    expect(ed4RecommendLayout(data)).toEqual({ kind: "no_problem" });
  });

  it("9 칸 fallback → 배지, 대기면 없음", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.narrativeSections = { ...data.narrativeSections, "9": "fallback" };
    expect(sides(data).badge).toBe("fallback");
    expect(sides({ ...data, narrativeSource: "pending" }).badge).toBeNull();
  });

  it("대기 — 서술 자리표시, 권고 행은 '권고를 만드는 중 | —'", () => {
    const layout = sides(loadEd4("bc_strong", "pending"));
    expect(layout.sides[0].body).toEqual({ kind: "placeholder", text: NARRATIVE_PENDING_TEXT });
    expect(layout.sides[0].rows).toEqual([["낮음", "P2 · 평가 데이터가 학습과 같은 출처", "권고를 만드는 중", "—"]]);
  });
});

describe("ed4RecommendRows", () => {
  it("번호 없는·모르는 번호 권고는 버리고, 우선순위는 문제의 것", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    const p2 = { ...data.problems![1], priority: "HIGH" as const };
    data.recommendations = [
      { ...data.recommendations[2], problemId: undefined },
      { ...data.recommendations[2], problemId: "P7" },
      { ...data.recommendations[2], priority: "LOW" },
    ];
    expect(ed4RecommendRows(data, [p2])).toEqual([
      ["높음", "P2 · 평가 데이터가 학습과 같은 출처", data.recommendations[2].action, data.recommendations[2].expectedImpact],
    ]);
  });

  it("권고가 없는 문제(서술 끝남) → '권고 생성 예정 | —'", () => {
    const data = copy(loadEd4("bc_strong", "issued"));
    data.recommendations = [];
    expect(ed4RecommendRows(data, data.problems!)).toEqual([
      ["중간", "P1 · 핵심 지표 근소 합격 (Recall)", "권고 생성 예정", "—"],
      ["낮음", "P2 · 평가 데이터가 학습과 같은 출처", "권고 생성 예정", "—"],
    ]);
  });
});
