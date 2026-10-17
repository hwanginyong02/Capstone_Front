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

describe("7.1 경계·확신 오류 문장 (설계 D30)", () => {
  const sentence =
    "확률이 있는 오분류 12건 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 5건(41.7%), " +
    "확신 오류(틀린 쪽 확률 0.9 이상)는 2건(16.7%)이다.";

  it("저장된 문장이 있으면 7.1 에 그대로 찍는다", () => {
    render(<InterpretSection interpretation={empty} errorRatioSentence={sentence} />);
    expect(screen.getByText(sentence)).toBeInTheDocument();
  });

  it("문장이 없으면(옛 성적서·확률 없음) 찍지 않는다", () => {
    render(<InterpretSection interpretation={empty} />);
    expect(screen.queryByText(/경계 오류/)).not.toBeInTheDocument();
  });
});

/** 7.2 정답 라벨 주의 고정 문구 12 — 생성 때 저장한 문장을 그대로 찍는다. */
describe("7.2 정답 라벨 주의 (고정 문구 12)", () => {
  const sentence =
    "정답 라벨의 구축 방법이 규칙·자동으로, 정답 자체의 오류가 성능 수치에 반영되었을 수 있다. 수치 해석 시 이를 고려해야 한다.";

  it("저장된 문장이 있으면 7.2 제목 아래 찍는다", () => {
    render(<InterpretSection interpretation={empty} labelCautionSentence={sentence} />);
    const line = screen.getByText(sentence);
    const heading = screen.getByText("데이터 분포 유의성 및 클래스 편향성 평가");
    // 7.2 묶음 안에 있고, 7.1 묶음에는 없다.
    expect(heading.parentElement?.contains(line)).toBe(true);
    expect(screen.getByText("혼동 행렬 기반 클래스 간 간섭 분석").parentElement?.contains(line)).toBe(false);
  });

  it("문장이 없으면(걸리지 않음·옛 성적서) 찍지 않는다", () => {
    render(<InterpretSection interpretation={empty} />);
    expect(screen.queryByText(/정답 자체의 오류/)).not.toBeInTheDocument();
  });
});
