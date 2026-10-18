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

describe("성능 평가 산출 기준 — 파생 예측 기재(판 2 이전 보관본)", () => {
  // 판 2 부터는 7.1 앞 고정 문구로 찍는다(InterpretSection). 옛 보관본만 6.0 일러두기에 찍는다.
  it("파생이 없으면 기재하지 않는다", () => {
    render(<KpiResultSection kpiResults={kpi} derivationIn60 taskType="binary" meta={meta()} />);
    expect(screen.queryByText(/파생한 값입니다/)).not.toBeInTheDocument();
  });

  it("binary 임계값 파생: 사실·임계값·출처 컬럼·양성 클래스를 모두 적는다", () => {
    render(
      <KpiResultSection
        kpiResults={kpi}
        derivationIn60
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
        derivationIn60
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
        derivationIn60
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
    // 아슬아슬 표시 키가 없는 성적서(옛 성적서)는 8.3 에 표시한 적이 없어 3% 문장을 찍지 않는다.
    expect(rule.textContent).not.toContain("8.3");
  });

  it("아슬아슬 표시(nearTarget)를 붙인 성적서는 고정 문구 10 의 마지막 문장을 찍는다", () => {
    const marked: KpiResult[] = [
      { ...withCore[0], margin: 0.1, nearTarget: false },
      { ...withCore[1], margin: -0.1, nearTarget: false },
    ];
    render(<KpiResultSection kpiResults={marked} taskType="binary" meta={meta()} showVerdictRule />);
    const rule = screen.getByText(/^판정 규칙:/);
    expect(rule.textContent).toMatch(
      /측정 불확도는 반영하지 않았다\. 목표값과의 차이가 목표값의 3% 미만인 지표는 8\.3에 별도 표시하였다\.$/,
    );
  });

  it("핵심 지표가 기본값 그대로면 그렇게 적는다 (W8)", () => {
    render(
      <KpiResultSection kpiResults={withCore} taskType="binary" meta={meta()} showVerdictRule coreMetricsSource="default" />,
    );
    const rule = screen.getByText(/^판정 규칙:/);
    expect(rule.textContent).toContain(
      "핵심 지표는 분류 유형의 기본값을 의뢰자가 바꾸지 않고 사용하였다(Accuracy(M1)).",
    );
    expect(rule.textContent).not.toContain("의뢰자가 지정하였다");
  });

  it("의뢰자가 골랐으면(client) 종전 문장", () => {
    render(
      <KpiResultSection kpiResults={withCore} taskType="binary" meta={meta()} showVerdictRule coreMetricsSource="client" />,
    );
    expect(screen.getByText(/^판정 규칙:/).textContent).toContain("핵심 지표는 의뢰자가 지정하였다(Accuracy(M1)).");
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

/**
 * 6.1 종합 핵심 성능은 고객이 정한 핵심 지표다(재료 목록 7절). 종전에는 유형별 고정 묶음이었다 —
 * 핵심 지표 표시가 없는 옛 보관본만 그 묶음으로 그린다.
 */
describe("6.1 종합 핵심 성능", () => {
  const sixOne = () => screen.getByText("종합 핵심 성능 (Key Performance Indicators)").parentElement!;

  it("고객이 정한 핵심 지표만 6.1 에 찍는다", () => {
    const results: KpiResult[] = [
      { metricId: "M3", name: "Recall", value: 0.8, threshold: 0.7, status: "pass", isCore: true },
      { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", isCore: false },
    ];
    render(<KpiResultSection kpiResults={results} taskType="binary" meta={meta()} />);

    expect(sixOne()).toHaveTextContent("Recall");
    expect(sixOne()).not.toHaveTextContent("Accuracy");
  });

  it("핵심 지표를 정하지 않았으면 그렇다고 적는다", () => {
    const results: KpiResult[] = [
      { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.8, status: "pass", isCore: false },
    ];
    render(<KpiResultSection kpiResults={results} taskType="binary" meta={meta()} />);

    expect(sixOne()).toHaveTextContent("의뢰자가 지정한 핵심 지표가 없습니다");
  });

  it("핵심 지표 표시가 없는 옛 보관본은 유형별 묶음으로 그린다", () => {
    render(<KpiResultSection kpiResults={kpi} taskType="binary" meta={meta()} />);

    expect(sixOne()).toHaveTextContent("Accuracy");
  });
});

describe("판 2 — 파생 예측 사실은 6.0 에 찍지 않는다", () => {
  it("7.1 앞으로 옮겼다(재료 목록 4절)", () => {
    render(
      <KpiResultSection
        kpiResults={kpi}
        taskType="binary"
        meta={meta({ method: "threshold", threshold: 0.5, source_columns: ["score"], target_role: "y_pred" })}
      />,
    );
    expect(screen.queryByText(/파생한 값입니다/)).not.toBeInTheDocument();
  });
});

describe("95% 신뢰구간 (설계 D29) — 6.0 방식 한 줄, 6.1·6.2 열", () => {
  const NOTE = "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1, M2)으로 산출하였습니다.";
  const rows: KpiResult[] = [
    {
      metricId: "M1", name: "Accuracy", value: 0.8, threshold: 0.7, status: "pass", isCore: true,
      ci: { low: 0.4902, high: 0.9433, method: "wilson" },
    },
    // 핵심이고 판정 대상인데 구간이 생략된 지표
    { metricId: "M4", name: "F1 Score", value: 0.75, threshold: 0.7, status: "pass", isCore: true },
    {
      metricId: "M2", name: "Precision", value: 0.7, threshold: 0.6, status: "pass", isCore: false,
      ci: { low: 0.61, high: 0.88, method: "wilson" },
    },
    // 판정 대상이 아닌 정보성 지표
    { metricId: "M8", name: "Specificity", value: 0.9, threshold: null, status: "pass", isCore: false },
  ];

  const table = (title: string) =>
    screen.getByText(title).parentElement!.querySelector("table")!;
  const headers = (t: HTMLTableElement) => [...t.querySelectorAll("th")].map((th) => th.textContent);
  const cellsOf = (t: HTMLTableElement, metricId: string) =>
    [...[...t.querySelectorAll("tbody tr")].find((tr) => tr.textContent?.startsWith(metricId))!.querySelectorAll("td")].map(
      (td) => td.textContent,
    );

  it("6.1 종합 핵심 성능: 산출 결과 다음에 '95% 신뢰구간' 열, 구간이 없는 판정 대상은 —", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} confidenceIntervalNote={NOTE} />);
    const t = table("종합 핵심 성능 (Key Performance Indicators)");
    expect(headers(t)).toEqual(["Metric ID", "시험항목", "산출 결과", "95% 신뢰구간", "합격 기준", "판정"]);
    expect(cellsOf(t, "M1")[3]).toBe("[0.490, 0.943]");
    expect(cellsOf(t, "M4")[3]).toBe("—");
  });

  it("6.2 세부 시험항목: 같은 열, 판정 대상이 아닌 지표는 —", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} confidenceIntervalNote={NOTE} />);
    const t = table("세부 시험항목별 결과");
    expect(headers(t)).toEqual(["Metric ID", "시험항목", "산출 결과", "95% 신뢰구간", "합격 기준", "판정"]);
    expect(cellsOf(t, "M2")[3]).toBe("[0.610, 0.880]");
    expect(cellsOf(t, "M8")[3]).toBe("—");
  });

  it("6.0 에 저장된 방식 한 줄을 그대로 찍는다", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} confidenceIntervalNote={NOTE} />);
    expect(screen.getByText(NOTE).tagName).toBe("LI");
  });

  it("방식 한 줄이 없는 성적서(옛 성적서·구간 없음)는 종전 5열, 6.0 에도 없다", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} />);
    for (const title of ["종합 핵심 성능 (Key Performance Indicators)", "세부 시험항목별 결과"]) {
      const t = table(title);
      expect(headers(t)).toEqual(["Metric ID", "시험항목", "산출 결과", "합격 기준", "판정"]);
    }
    expect(screen.queryByText(/신뢰구간/)).not.toBeInTheDocument();
  });

  it("핵심 지표가 없으면 안내 줄이 열 수만큼 걸친다", () => {
    render(
      <KpiResultSection
        kpiResults={rows.map((r) => ({ ...r, isCore: false }))}
        taskType="binary"
        meta={meta()}
        confidenceIntervalNote={NOTE}
      />,
    );
    expect(screen.getByText(/핵심 지표가 없습니다/).getAttribute("colspan")).toBe("6");
  });
});

describe("합격 기준 자릿수 (B10) — 6.1·6.2 를 자리마다", () => {
  const rows: KpiResult[] = [
    { metricId: "M1", name: "Accuracy", value: 0.9, threshold: 0.856, status: "pass", higherIsBetter: true, isCore: true },
    { metricId: "M8", name: "FPR", value: 0.05, threshold: 0.105, status: "pass", higherIsBetter: false, isCore: false },
  ];
  const criteriaCell = (name: string) => screen.getByText(name).closest("tr")!.querySelectorAll("td")[3];

  it("targetDigits 3 이면 6.1(핵심)과 6.2(세부)에 셋째 자리", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} targetDigits={3} />);
    expect(criteriaCell("Accuracy")).toHaveTextContent(/^≥ 0\.856$/);
    expect(criteriaCell("FPR")).toHaveTextContent(/^≤ 0\.105$/);
  });

  // 옛 표기는 반올림조차 판정값과 어긋났다 — 0.856 은 "0.86", 0.855 는 이진 표현 때문에 "0.85".
  it("키가 없는 옛 성적서는 종전 둘째 자리", () => {
    render(<KpiResultSection kpiResults={rows} taskType="binary" meta={meta()} />);
    expect(criteriaCell("Accuracy")).toHaveTextContent(/^≥ 0\.86$/);
    expect(criteriaCell("FPR")).toHaveTextContent(/^≤ 0\.10$/);
  });
});
