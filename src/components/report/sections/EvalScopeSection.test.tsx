/** 2절 — 시험 대상 모델명·버전을 찍는다(재료 목록 2절 "모델명, 버전 — 1절, 2절, 4절"). */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { EvalScopeSection } from "./EvalScopeSection";
import type { EvalScope, FinalReportMeta } from "../../../types/finalReport.types";

const meta = {
  reportId: "r1",
  title: "t",
  issuedAt: "",
  evaluationPeriod: { from: "2026-10-01", to: "2026-10-02" },
  taskType: "binary",
  taskTypeLabel: "이진 분류",
} as FinalReportMeta;

const scope = {
  purpose: "p",
  targetModel: "ChurnPredictor",
  version: "v2.1.0",
  scope: "s",
  reportPurposeKey: "external",
} as EvalScope;

describe("2절 시험 대상 모델", () => {
  it("모델명과 버전을 찍는다", () => {
    render(<EvalScopeSection meta={meta} evalScope={scope} />);
    const table = screen.getByRole("table", { name: "시험 대상 모델" });
    expect(table).toHaveTextContent("ChurnPredictor");
    expect(table).toHaveTextContent("v2.1.0");
  });
});
