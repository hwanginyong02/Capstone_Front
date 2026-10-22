/** 6.3 시각화 자료 — 차트가 없을 때의 안내. 판 1 보관본(운영 main 발급)은 발급 당시 문장 그대로. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ChartSection } from "./ChartSection";

const noCharts = { confusionMatrix: null, rocCurve: null, prCurve: null };

describe("6.3 차트 없음 안내 — 판 1 보관본은 운영 main 문장, 판 3 은 새 문장", () => {
  it("판 1(legacyLayout) — 'M21, ROC/PR 곡선은 binary 평가에서 AUROC/AUPRC 선택 시'", () => {
    render(<ChartSection charts={noCharts} legacyLayout />);
    expect(
      screen.getByText(
        "시각화할 차트가 없습니다. (혼동 행렬은 M21, ROC/PR 곡선은 binary 평가에서 AUROC/AUPRC 선택 시 표시됩니다.)",
      ),
    ).toBeInTheDocument();
  });

  it("판 3 — 'M21 을 골랐을 때, … 확률(score) 컬럼이 있을 때'", () => {
    render(<ChartSection charts={noCharts} schema3 legacyLayout={false} />);
    expect(
      screen.getByText(
        "시각화할 차트가 없습니다. (혼동 행렬은 M21 을 골랐을 때, ROC/PR 곡선은 이진 분류에서 확률(score) 컬럼이 있을 때 표시됩니다.)",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/AUROC\/AUPRC 선택 시/)).not.toBeInTheDocument();
  });
});
