import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { NO_PROBLEM_SENTENCE, RecommendSection } from "./RecommendSection";
import type { Problem, RecommendationNarrative } from "../../../types/finalReport.types";
import type { ReportRecommendation } from "../../../types/report.types";

/**
 * 9절 권고표(서술 설계 D22). 문제 목록 키가 있는 성적서만 문제 번호 표로 그린다 — 0개면 고정 문구 6.
 * 키가 없는 옛 성적서는 종전 표(우선순위·분류·권고 내용·기대 효과) 그대로다.
 */

const NARRATIVE: RecommendationNarrative = { dataQuality: "데이터 보완", modelOps: "모델 운영" };

function problem(p: Partial<Problem>): Problem {
  return {
    id: "P1",
    kind: "core_fail",
    priority: "HIGH",
    title: "핵심 지표 미달 (F1 Score)",
    source_section: "8.2",
    recommend_section: "9.2",
    evidence: {},
    note: null,
    ...p,
  };
}

function rec(p: Partial<ReportRecommendation>): ReportRecommendation {
  return { priority: "MEDIUM", category: "모델", action: "권고", expectedImpact: "효과", ...p };
}

const headers = () => screen.getAllByRole("columnheader").map((th) => th.textContent);
const bodyRows = () => screen.getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell").map((td) => td.textContent));

describe("문제 0개 — 고정 문구 6", () => {
  it("문구를 그대로 찍고 표는 그리지 않는다", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} problems={[]} />);
    expect(screen.getByText(NO_PROBLEM_SENTENCE)).toBeInTheDocument();
    expect(NO_PROBLEM_SENTENCE).toBe("본 평가에서 지목된 데이터 또는 모델상의 문제점은 없다. 별도 권고 사항 없음.");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/권고 항목은 자동 서술 생성/)).toBeNull();
  });
});

describe("문제가 있는 성적서 — 4열 문제 번호 표", () => {
  const problems = [
    problem({ id: "P1", priority: "HIGH", title: "핵심 지표 미달 (F1 Score)" }),
    problem({ id: "P2", kind: "label_caution", priority: "LOW", title: "정답 라벨 주의 (신뢰성 검토 없음)" }),
  ];

  it("열은 우선순위 · 대응 문제 번호 · 권고 · 기대 효과", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} problems={problems} />);
    expect(headers()).toEqual(["우선순위", "대응 문제 번호", "권고", "기대 효과"]);
  });

  it("권고를 문제 번호 순서로, 칸 이름은 'P1 · 문제 이름'", () => {
    render(
      <RecommendSection
        recommendations={[
          rec({ problemId: "P2", action: "라벨 재검수", expectedImpact: "정답 신뢰도 향상" }),
          rec({ problemId: "P1", action: "학습 데이터 보강", expectedImpact: "F1 개선" }),
          rec({ problemId: "P1", action: "임계값 재설정", expectedImpact: "재현율 개선" }),
        ]}
        narrative={NARRATIVE}
        problems={problems}
      />,
    );
    expect(bodyRows()).toEqual([
      ["HIGH", "P1 · 핵심 지표 미달 (F1 Score)", "학습 데이터 보강", "F1 개선"],
      ["HIGH", "P1 · 핵심 지표 미달 (F1 Score)", "임계값 재설정", "재현율 개선"],
      ["LOW", "P2 · 정답 라벨 주의 (신뢰성 검토 없음)", "라벨 재검수", "정답 신뢰도 향상"],
    ]);
  });

  it("서술이 없어도(호출 실패) 문제 줄은 찍고 권고 칸은 '권고 생성 예정'", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} problems={problems} />);
    expect(bodyRows()).toEqual([
      ["HIGH", "P1 · 핵심 지표 미달 (F1 Score)", "권고 생성 예정", "—"],
      ["LOW", "P2 · 정답 라벨 주의 (신뢰성 검토 없음)", "권고 생성 예정", "—"],
    ]);
  });

  it("문제 번호가 없거나 모르는 권고는 끝에 '—' 로 붙인다", () => {
    render(
      <RecommendSection
        recommendations={[rec({ action: "번호 없음" }), rec({ problemId: "P9", action: "모르는 번호" })]}
        narrative={NARRATIVE}
        problems={[problems[0]]}
      />,
    );
    expect(bodyRows().map((r) => [r[1], r[2]])).toEqual([
      ["P1 · 핵심 지표 미달 (F1 Score)", "권고 생성 예정"],
      ["—", "번호 없음"],
      ["—", "모르는 번호"],
    ]);
  });
});

describe("옛 성적서(문제 목록 키 없음) — 종전 표", () => {
  it("우선순위 · 분류 · 권고 내용 · 기대 효과", () => {
    render(
      <RecommendSection
        recommendations={[rec({ priority: "HIGH", category: "데이터", action: "라벨 재검토", expectedImpact: "오류 감소" })]}
        narrative={NARRATIVE}
      />,
    );
    expect(headers()).toEqual(["우선순위", "분류", "권고 내용", "기대 효과"]);
    expect(bodyRows()).toEqual([["HIGH", "데이터", "라벨 재검토", "오류 감소"]]);
    expect(screen.queryByText(NO_PROBLEM_SENTENCE)).toBeNull();
  });

  it("권고가 없으면 종전 안내", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} />);
    expect(screen.getByText(/권고 항목은 자동 서술 생성\(LLM\) 연동 시 표시됩니다/)).toBeInTheDocument();
    expect(screen.queryByText(NO_PROBLEM_SENTENCE)).toBeNull();
  });
});
