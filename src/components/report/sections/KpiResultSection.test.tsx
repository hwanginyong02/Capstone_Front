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
