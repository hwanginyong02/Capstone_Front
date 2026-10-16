/**
 * 7절 첫머리 — 파생 예측 사실(고정 문구 9, 7.1 앞)과 TP·TN·FP·FN 건수(7.1).
 *
 * 재료 목록 4·9절: 결정 임계값과 파생 예측 사실은 "7.1 앞 고정 문구", 건수는 "항상, 7.1". 종전에는
 * 파생 사실이 6.0 일러두기에, 건수는 혼동행렬(M21)을 골랐을 때만 6절에 있었다.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { InterpretSection } from "./InterpretSection";

const empty = { confusionAnalysis: "", distributionAnalysis: "" };

describe("7.1 앞 고정 문구 9 — 파생 예측 사실", () => {
  it("이진: 결정 임계값을 적용해 산출했다고 적는다", () => {
    render(
      <InterpretSection
        interpretation={empty}
        derivedPrediction={{ method: "threshold", threshold: 0.35, source_columns: ["score"], target_role: "y_pred" }}
      />,
    );
    expect(
      screen.getByText(/본 평가의 예측값은 제출된 확률값에 결정 임계값 0.35를 적용하여 산출하였다\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/점수 컬럼: score/)).toBeInTheDocument();
  });

  it("멀티레이블 레이블별 임계값은 표로 찍는다", () => {
    render(
      <InterpretSection
        interpretation={empty}
        derivedPrediction={{
          method: "threshold_per_label",
          threshold: { score_a: 0.4, score_b: 0.65 },
          source_columns: ["score_a", "score_b"],
          target_role: "pred_labels",
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "레이블별 결정 임계값" });
    expect(table).toHaveTextContent("score_a");
    expect(table).toHaveTextContent("0.65");
  });

  it("argmax 는 임계값이 없다고 적는다", () => {
    render(
      <InterpretSection
        interpretation={empty}
        derivedPrediction={{ method: "argmax", threshold: null, source_columns: ["p_a", "p_b"], target_role: "y_pred" }}
      />,
    );
    expect(screen.getByText(/가장 큰 값의 클래스를 택하여 산출하였다\(결정 임계값 없음\)/)).toBeInTheDocument();
  });

  it("파생이 없으면 문장도 없다", () => {
    render(<InterpretSection interpretation={empty} />);
    expect(screen.queryByText(/본 평가의 예측값은/)).not.toBeInTheDocument();
  });
});

describe("7.1 TP·TN·FP·FN 건수", () => {
  it("이진은 양성 클래스 한 줄을 찍는다", () => {
    render(
      <InterpretSection
        interpretation={empty}
        confusionCounts={{ kind: "binary", rows: [{ label: "1", tp: 52, tn: 49, fp: 56, fn: 43 }] }}
      />,
    );
    const table = screen.getByRole("table", { name: "TP·TN·FP·FN 건수" });
    expect(table).toHaveTextContent("양성 클래스");
    for (const n of ["52", "49", "56", "43"]) expect(table).toHaveTextContent(n);
  });

  it("다중은 클래스마다 찍고 일대다라고 밝힌다", () => {
    render(
      <InterpretSection
        interpretation={empty}
        confusionCounts={{
          kind: "perClass",
          rows: [
            { label: "cat", tp: 17, tn: 93, fp: 50, fn: 40 },
            { label: "dog", tp: 29, tn: 81, fp: 45, fn: 45 },
          ],
        }}
      />,
    );
    expect(screen.getByRole("table", { name: "TP·TN·FP·FN 건수" })).toHaveTextContent("cat");
    expect(screen.getByText(/그 클래스를 양성, 나머지를 음성으로 본 건수/)).toBeInTheDocument();
  });
});
