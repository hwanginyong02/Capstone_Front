/**
 * 판 4 종합 판정 글(S3 ⑥, 4절 표 "4.2 종합 판정 표 + 근거 문장"·"표지 시험 결과 요약 4줄") — 판정은 다시 하지 않고 판정 근거
 * (`verdictDetail` — `computeVerdict` 한 곳)와 저장된 판정 여유만 읽는다.
 *
 * 고정 문구 20 의 조건부 합격·불합격·판정 불가 글은 초안이다(판 4 를 켜기 전 확인 목록) — 시험 이름에 "초안".
 */
import { describe, expect, it } from "vitest";

import type { KpiResult } from "../../../types/finalReport.types";
import { verdictDetail } from "../narrativeFacts";
import { buildCoverResultRows, buildVerdictEd4 } from "./verdictEd4";

function kpi(over: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.98, threshold: 0.95, status: "pass", higherIsBetter: true, ...over };
}

/** RPT-2026-0001(bc_strong) 판 4 run 의 지표 결과 — 판정 대상 5개(핵심 Recall), 참고 지표 3개. */
const BC_STRONG: KpiResult[] = [
  kpi({ metricId: "M1", value: 0.9824561403508771, threshold: 0.95, judgmentMargin: "small" }),
  kpi({ metricId: "M2", name: "Precision", value: 0.9692307692307692, threshold: null }),
  kpi({ metricId: "M3", name: "Recall", value: 0.984375, threshold: 0.97, isCore: true, judgmentMargin: "small" }),
  kpi({ metricId: "M4", name: "F1 Score", value: 0.9767441860465116, threshold: 0.95, judgmentMargin: "small" }),
  kpi({ metricId: "M9", name: "AUROC", value: 0.999269859813084, threshold: 0.98, judgmentMargin: "ample" }),
  kpi({ metricId: "M10", name: "AUPRC", value: 0.9988367417279411, threshold: null }),
  kpi({ metricId: "M19", name: "Log Loss", value: 0.05349956773981483, threshold: 0.1, higherIsBetter: false, judgmentMargin: "ample" }),
  kpi({ metricId: "M23", name: "Imbalance Ratio", value: 1.671875, threshold: null, higherIsBetter: false }),
];

function verdictOf(results: KpiResult[], core: string[]) {
  return buildVerdictEd4(verdictDetail(results, "binary", core), results);
}

describe("4.2 종합 판정 — RPT-2026-0001 예시본 그대로", () => {
  it("표 한 줄과 근거 문장", () => {
    expect(verdictOf(BC_STRONG, ["M3"])).toEqual({
      verdict: "PASS",
      label: "최종 합격",
      judgedCount: 5,
      passedCount: 5,
      countText: "5개 중 5개",
      basis: "핵심 지표 Recall(M3)과 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    });
  });

  it("표지 종합 판정·핵심 지표 줄", () => {
    expect(buildCoverResultRows(verdictOf(BC_STRONG, ["M3"]), BC_STRONG)).toEqual([
      { label: "종합 판정", value: "최종 합격 (판정 대상 지표 5개 중 5개 충족, 4.2)" },
      { label: "핵심 지표", value: "Recall 0.984 (합격 기준 ≥ 0.970, 충족, 판정 여유 작음, 4.3)" },
    ]);
  });
});

describe("4.2 근거 문장 — 갈래", () => {
  it("핵심 지표만 판정 대상인 합격(부록 B13) — '그 밖의' 없이, 조사는 이/가", () => {
    const results = [kpi({ metricId: "M3", name: "Recall", value: 0.99, threshold: 0.97, isCore: true }), kpi({ metricId: "M2", name: "Precision", threshold: null })];
    expect(verdictOf(results, ["M3"]).basis).toBe("핵심 지표 Recall(M3)이 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.");
  });

  it("핵심 지표가 여럿이면 쉼표로 잇고 조사는 마지막 이름으로(부록 B13)", () => {
    const results = [
      kpi({ metricId: "M1", value: 0.99, isCore: true }),
      kpi({ metricId: "M4", name: "F1 Score", value: 0.99, isCore: true }),
      kpi({ metricId: "M9", name: "AUROC", value: 0.99 }),
    ];
    expect(verdictOf(results, ["M1", "M4"]).basis).toBe(
      "핵심 지표 Accuracy(M1), F1 Score(M4)와 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    );
  });

  it("조건부 합격(초안) — 충족한 핵심 지표와 미달한 지표", () => {
    const results = [
      kpi({ metricId: "M3", name: "Recall", value: 0.99, threshold: 0.97, isCore: true }),
      kpi({ metricId: "M9", name: "AUROC", value: 0.9, threshold: 0.98, status: "fail" }),
      kpi({ metricId: "M1", value: 0.9, threshold: 0.95, status: "fail" }),
    ];
    const v = verdictOf(results, ["M3"]);
    expect([v.verdict, v.label, v.countText]).toEqual(["CONDITIONAL_PASS", "조건부 합격", "3개 중 1개"]);
    expect(v.basis).toBe(
      "핵심 지표 Recall(M3)은 목표를 충족하였으나 AUROC(M9), Accuracy(M1)가 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.",
    );
  });

  it("불합격(초안) — 미달한 핵심 지표", () => {
    const results = [
      kpi({ metricId: "M3", name: "Recall", value: 0.9, threshold: 0.97, isCore: true, status: "fail" }),
      kpi({ metricId: "M1", value: 0.99 }),
    ];
    const v = verdictOf(results, ["M3"]);
    expect([v.verdict, v.label]).toEqual(["FAIL", "최종 불합격"]);
    expect(v.basis).toBe("핵심 지표 Recall(M3)이 목표에 미달하여, 3.4의 판정 규칙에 따라 불합격으로 판정하였다.");
  });

  it("판정 불가(초안) — 원인 셋(부록 B13)", () => {
    const notComputed = [kpi({ metricId: "M3", name: "Recall", status: "unavailable", value: 0, isCore: true }), kpi({ metricId: "M1" })];
    expect(verdictOf(notComputed, ["M3"]).basis).toBe("핵심 지표 Recall(M3)의 산출 실패로 3.4의 판정 규칙에 따라 판정할 수 없었다.");
    const noTarget = [kpi({ metricId: "M3", name: "Recall", threshold: null, isCore: true }), kpi({ metricId: "M1" })];
    expect(verdictOf(noTarget, ["M3"]).basis).toBe("핵심 지표 Recall(M3)의 목표값 부재로 3.4의 판정 규칙에 따라 판정할 수 없었다.");
    const none = [kpi({ metricId: "M2", name: "Precision", threshold: null })];
    const v = verdictOf(none, []);
    expect([v.verdict, v.label, v.judgedCount, v.countText]).toEqual(["INCONCLUSIVE", "판정 불가", 0, "—"]);
    expect(v.basis).toBe("판정 대상 지표 부재로 3.4의 판정 규칙에 따라 판정할 수 없었다.");
  });

  it("핵심 지표가 없는 합격은 채울 이름이 없어 근거 문장을 두지 않는다(승인 글 없음)", () => {
    const results = [kpi({ metricId: "M1", value: 0.99 })];
    const v = verdictOf(results, []);
    expect(v.verdict).toBe("PASS");
    expect(v.basis).toBeNull();
  });
});

describe("표지 요약 줄 — 갈래", () => {
  it("판정 대상 0개면 종합 판정 줄은 부록 B2", () => {
    const results = [kpi({ metricId: "M2", name: "Precision", threshold: null })];
    expect(buildCoverResultRows(verdictOf(results, []), results)).toEqual([
      { label: "종합 판정", value: "판정 불가 (판정 대상 지표 없음, 4.2)" },
    ]);
  });

  it("핵심 지표 측정 불가는 부록 B3, 미달·충분·낮을수록 좋은 지표의 기준 ≤", () => {
    const results = [
      kpi({ metricId: "M3", name: "Recall", value: 0, threshold: 0.97, status: "unavailable", isCore: true }),
      kpi({ metricId: "M19", name: "Log Loss", value: 0.1204, threshold: 0.1, higherIsBetter: false, status: "fail", isCore: true, judgmentMargin: "ample" }),
      kpi({ metricId: "M1", value: 0.96, judgmentMargin: "ample" }),
    ];
    const rows = buildCoverResultRows(verdictOf(results, ["M3", "M19"]), results);
    expect(rows).toEqual([
      { label: "종합 판정", value: "최종 불합격 (판정 대상 지표 2개 중 1개 충족, 4.2)" },
      { label: "핵심 지표", value: "Recall 측정 불가 (합격 기준 ≥ 0.970, 4.3)" },
      { label: "핵심 지표", value: "Log Loss 0.120 (합격 기준 ≤ 0.100, 미달, 판정 여유 충분, 4.3)" },
    ]);
  });

  it("핵심 지표 값은 판정과 어긋나 보이면 늘린다(4.3 과 같은 표기) — 0.9696 · ≥ 0.970 미달", () => {
    const results = [kpi({ metricId: "M3", name: "Recall", value: 0.9696, threshold: 0.97, status: "fail", isCore: true, judgmentMargin: "small" })];
    expect(buildCoverResultRows(verdictOf(results, ["M3"]), results)[1]).toEqual({
      label: "핵심 지표",
      value: "Recall 0.9696 (합격 기준 ≥ 0.970, 미달, 판정 여유 작음, 4.3)",
    });
  });

  it("판정 여유는 저장된 값만 읽는다 — 같은 값이라도 저장값이 '충분'이면 '충분'", () => {
    const results = [kpi({ metricId: "M3", name: "Recall", value: 0.971, threshold: 0.97, isCore: true, judgmentMargin: "ample" })];
    expect(buildCoverResultRows(verdictOf(results, ["M3"]), results)[1].value).toContain("판정 여유 충분");
  });
});
