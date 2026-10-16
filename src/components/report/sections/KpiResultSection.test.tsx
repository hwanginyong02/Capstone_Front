import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiResultSection } from "./KpiResultSection";
import type { DerivedPredictionFact, FinalReportMeta, KpiResult } from "../../../types/finalReport.types";

/**
 * ISSUES.md A-01 — 파생 예측의 성적서 기재.
 *
 * SPEC §0: "argmax·threshold 로 만든 예측은 모델의 실제 출력이 아니라 파생값이므로,
 * 성적서에 파생 사실과 사용한 임계값을 반드시 기재해야 한다."
 *
 * 이 기재가 빠지면 독자는 인쇄된 정확도를 모델의 하드 예측 성능으로 읽는다 —
 * 실제로는 평가자가 고른 임계값의 함수인데도.
 */

const kpi: KpiResult[] = [
  { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", higherIsBetter: true },
];

function meta(derivedPrediction?: DerivedPredictionFact): FinalReportMeta {
  return {
    reportId: "r1",
    title: "t",
    issuedAt: "2026-09-07",
    evaluationPeriod: { from: "2026-09-01", to: "2026-09-07" },
    taskType: "binary",
    taskTypeLabel: "Binary",
    positiveClass: "1",
    derivedPrediction,
  };
}

describe("성능 평가 산출 기준 — 파생 예측 기재", () => {
  it("파생이 없으면 기재하지 않는다", () => {
    render(<KpiResultSection kpiResults={kpi} taskType="binary" meta={meta()} />);
    expect(screen.queryByText(/파생한 값입니다/)).not.toBeInTheDocument();
  });

  it("binary 임계값 파생: 사실·임계값·출처 컬럼·양성 클래스를 모두 적는다", () => {
    render(
      <KpiResultSection
        kpiResults={kpi}
        taskType="binary"
        meta={meta({
          method: "threshold",
          threshold: 0.7,
          source_columns: ["score_positive"],
          target_role: "y_pred",
          positive_class: "spam",
        })}
      />,
    );
    expect(screen.getByText(/파생한 값입니다/)).toBeInTheDocument();
    const item = screen.getByText(/파생한 값입니다/).closest("li")!;
    expect(item.textContent).toContain("0.7");
    expect(item.textContent).toContain("score_positive");
    expect(item.textContent).toContain("spam");
  });

  it("multiclass argmax 파생: 임계값이 아니라 argmax 라고 적는다", () => {
    render(
      <KpiResultSection
        kpiResults={kpi}
        taskType="multiclass"
        meta={{
          ...meta({
            method: "argmax",
            threshold: null,
            source_columns: ["prob_cat", "prob_dog"],
            target_role: "y_pred",
            class_order: ["cat", "dog"],
          }),
          taskType: "multiclass",
        }}
      />,
    );
    const item = screen.getByText(/파생한 값입니다/).closest("li")!;
    expect(item.textContent).toContain("argmax");
    expect(item.textContent).toContain("prob_cat, prob_dog");
  });

  it("multilabel 레이블별 임계값: 컬럼마다의 값을 적는다", () => {
    render(
      <KpiResultSection
        kpiResults={kpi}
        taskType="multilabel"
        meta={{
          ...meta({
            method: "threshold_per_label",
            threshold: { score_a: 0.8, score_b: 0.5 },
            source_columns: ["score_a", "score_b"],
            target_role: "pred_labels",
            label_order: ["a", "b"],
          }),
          taskType: "multilabel",
        }}
      />,
    );
    const item = screen.getByText(/파생한 값입니다/).closest("li")!;
    expect(item.textContent).toContain("score_a ≥ 0.8");
    expect(item.textContent).toContain("score_b ≥ 0.5");
  });
});

/**
 * 6.1 판정 규칙 — 성적서 고정 문구 10(서술 설계 D19, D32).
 * 이 규칙으로 판정한 성적서에만 찍는다. 그 전 규칙으로 판정해 저장된 성적서에 새 규칙을 적으면
 * 판정과 설명이 어긋난다.
 */
describe("6.1 판정 규칙 문구", () => {
  const withCore: KpiResult[] = [
    { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", isCore: true },
    { metricId: "M4", name: "F1 Score", value: 0.7, threshold: 0.8, status: "fail" },
  ];

  it("의뢰자가 지정한 핵심 지표를 넣어 판정 규칙을 적는다", () => {
    render(<KpiResultSection kpiResults={withCore} taskType="binary" meta={meta()} showVerdictRule />);
    const rule = screen.getByText(/^판정 규칙:/);
    expect(rule.textContent).toContain("핵심 지표는 의뢰자가 지정하였다(Accuracy(M1))");
    expect(rule.textContent).toContain("판정 불가");
    // 근소 차이 표시(8.3)는 아직 구현되지 않아 그 문장을 찍지 않는다.
    expect(rule.textContent).not.toContain("8.3");
  });

  it("옛 규칙으로 판정한 성적서에는 찍지 않는다", () => {
    render(<KpiResultSection kpiResults={withCore} taskType="binary" meta={meta()} />);
    expect(screen.queryByText(/^판정 규칙:/)).not.toBeInTheDocument();
  });
});

/**
 * M22 클래스별 표 — 평균 줄을 버리지 않고, M22 만 골라도 보인다(재료 목록 9절, 서술 설계 D17·D39).
 * 이 표가 생기기 전 발급된 성적서는 지표별 클래스 판정을 종전대로 그린다.
 */
describe("6.2 클래스별 표(M22)", () => {
  const table = {
    rows: [
      { label: "cat", precision: 0.9, recall: 0.8, f1: 0.85, support: 50 },
      { label: "dog", precision: 0.7, recall: 0.75, f1: 0.72, support: 40 },
    ],
    averages: [
      { label: "매크로 평균", precision: 0.8, recall: 0.775, f1: 0.785, support: 90 },
      { label: "가중 평균", precision: 0.81, recall: 0.78, f1: 0.79, support: 90 },
    ],
  };

  it("클래스 줄과 평균 줄을 함께 찍는다", () => {
    render(<KpiResultSection kpiResults={kpi} classReport={table} taskType="multiclass" meta={meta()} />);
    const report = screen.getByRole("table", { name: "클래스별 세부 성능" });
    for (const label of ["cat", "dog", "매크로 평균", "가중 평균"]) {
      expect(report).toHaveTextContent(label);
    }
    expect(report).toHaveTextContent("0.785");
  });

  it("다른 지표를 고르지 않아도 표가 보인다", () => {
    render(<KpiResultSection kpiResults={[]} classReport={table} taskType="multiclass" meta={meta()} />);
    expect(screen.getByRole("table", { name: "클래스별 세부 성능" })).toBeInTheDocument();
  });

  it("표가 없는 옛 보관본은 지표별 클래스 판정을 종전대로 찍는다", () => {
    const legacy: KpiResult[] = [
      {
        metricId: "M2",
        name: "Precision",
        value: 0.8,
        threshold: 0.7,
        status: "pass",
        perClass: [{ label: "cat", value: 0.9, status: "pass" }],
      },
    ];
    render(<KpiResultSection kpiResults={legacy} taskType="multiclass" meta={meta()} />);
    expect(screen.queryByRole("table", { name: "클래스별 세부 성능" })).not.toBeInTheDocument();
    expect(screen.getByText("M2 — Precision")).toBeInTheDocument();
  });
});
