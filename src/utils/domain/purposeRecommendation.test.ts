/**
 * 지표 화면의 추천 세트와 목적별 점검 미리보기 — 재료 선택 점검 결과를 읽는다(6절 "추천 세트").
 * 추천대로 고르면 점검은 통과해야 한다.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { getRecommendedMetricIds } from "../../data/evaluationData";
import { useWorkflowStore } from "../stores/useWorkflowStore";
import { materialCheckFor, recommendedMetricIdsFor } from "./purposeRecommendation";

const state = () => useWorkflowStore.getState();

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
});

function binary(distribution: Record<string, number>, criticalErrorType = "Missed (FN)") {
  useWorkflowStore.setState({
    taskType: "binary",
    metadata: { class_distribution: distribution },
    composerPerspective: { criticalErrorType: { text: criticalErrorType }, usageMode: { text: "Batch" } },
  });
}

describe("추천 지표", () => {
  it("이진이고 불균형 비율이 9 를 넘으면 기본 세트에 AUPRC(M10)를 더한다", () => {
    binary({ "0": 950, "1": 50 });
    expect(recommendedMetricIdsFor(state())).toEqual([...getRecommendedMetricIds("binary"), "M10"]);
  });

  it("불균형이 작으면 기본 세트 그대로", () => {
    binary({ "0": 60, "1": 40 });
    expect(recommendedMetricIdsFor(state())).toEqual(getRecommendedMetricIds("binary"));
  });

  it.each([
    ["binary", { criticalErrorType: { text: "False alarm (FP)" }, usageMode: { text: "Batch" } }, { "0": 990, "1": 10 }],
    ["multiclass", { classPriority: { text: "Larger classes first" }, usageMode: { text: "Batch" } }, { a: 5, b: 5, c: 90 }],
    ["multilabel", { classPriority: { text: "Individual samples first" }, usageMode: { text: "Batch" } }, { a: 5, b: 50 }],
  ] as const)("%s: 추천대로 고르면 목적별 점검이 모두 맞는다", (taskType, perspective, distribution) => {
    useWorkflowStore.setState({ taskType, composerPerspective: perspective, metadata: { class_distribution: distribution } });
    const check = materialCheckFor(state(), recommendedMetricIdsFor(state()));
    expect(check!.purpose.lines.length).toBeGreaterThan(0);
    expect(check!.purpose.lines.every((line) => line.met)).toBe(true);
  });
});

describe("미리보기", () => {
  it("지금 고른 지표로 본 줄을 돌려준다 — AUROC 만 고르면 AUPRC 줄이 맞지 않음", () => {
    binary({ "0": 950, "1": 50 }, "Similar");
    useWorkflowStore.setState({ selectedMetricIds: ["M9"] });
    expect(materialCheckFor(state())!.purpose.lines).toMatchObject([
      { id: "curveImbalance", met: false, recommended: ["M10"] },
    ]);
  });
});

describe("지난 파일의 검증 결과를 쓰지 않는다 (검토 반영)", () => {
  it("스토어에 남은 검증 분포(IR 19)가 아니라 지금 파일의 업로드 분포(IR 1)로 본다", () => {
    binary({ "0": 50, "1": 50 }, "Similar");
    useWorkflowStore.setState({
      selectedMetricIds: ["M9"],
      validationResult: {
        task_type: "binary",
        selected_metric_ids: ["M9"],
        execution_summary: [],
        validation_details: [],
        error_count: 0,
        warning_count: 0,
        class_distribution: { "0": 950, "1": 50 },
      },
    });
    expect(materialCheckFor(state())!.purpose.lines).toEqual([]);
    expect(recommendedMetricIdsFor(state())).not.toContain("M10");
  });
});
