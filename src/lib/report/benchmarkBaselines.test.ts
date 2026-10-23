/**
 * 고정 문구 16(8.1 표 아래, 사용자 결정 5) — 집합 규칙은 백엔드 `_no_benchmark` 와 같다.
 */
import { describe, expect, it } from "vitest";

import type { KpiResult } from "../../types/finalReport.types";
import {
  ALL_NO_BENCHMARK_SENTENCE,
  BENCHMARK_METRIC_NAMES,
  metricsWithoutBenchmark,
  noBenchmarkSentence,
  partialNoBenchmarkSentence,
} from "./benchmarkBaselines";

const kpi = (metricId: string, name: string, status: KpiResult["status"] = "pass"): KpiResult =>
  ({ metricId, name, value: status === "unavailable" ? null : 0.5, threshold: null, status }) as unknown as KpiResult;

describe("고정 문구 16 문장", () => {
  it("승인 문안 그대로 — 일부·전부", () => {
    expect(partialNoBenchmarkSentence(["F-beta Score", "Specificity"])).toBe(
      "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: F-beta Score, Specificity.",
    );
    expect(ALL_NO_BENCHMARK_SENTENCE).toBe("선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다.");
  });

  it("일부 지표에 기준치가 없으면 그 이름을 고른 순서대로", () => {
    const results = [kpi("M1", "Accuracy"), kpi("M7", "Specificity"), kpi("M4", "F1 Score"), kpi("M5", "F-beta Score")];
    expect(noBenchmarkSentence(results, "binary")).toBe(partialNoBenchmarkSentence(["Specificity", "F-beta Score"]));
  });

  it("서술 지표 모두에 기준치가 없으면 '전부' 문장", () => {
    expect(noBenchmarkSentence([kpi("M5", "F-beta Score"), kpi("M19", "Log Loss"), kpi("M21", "Confusion Matrix")], "binary")).toBe(
      ALL_NO_BENCHMARK_SENTENCE,
    );
  });

  it("모두 기준치가 있으면 찍지 않는다", () => {
    expect(noBenchmarkSentence([kpi("M1", "Accuracy"), kpi("M9", "AUROC")], "binary")).toBeNull();
  });

  it("서술 지표가 없으면(표 지표만·아무것도 없음) 찍지 않는다", () => {
    expect(noBenchmarkSentence([kpi("M21", "Confusion Matrix"), kpi("M22", "Class-wise Metric")], "binary")).toBeNull();
    expect(noBenchmarkSentence([], "binary")).toBeNull();
  });

  it("표 지표(M21·M22)는 기준표에 없어도 목록에 넣지 않는다", () => {
    const results = [kpi("M1", "Accuracy"), kpi("M5", "F-beta Score"), kpi("M21", "Confusion Matrix"), kpi("M22", "Class-wise Metric")];
    expect(metricsWithoutBenchmark(results, "binary")).toEqual(["F-beta Score"]);
  });

  it("산출 실패 지표는 목록에서도, '전부' 판단에서도 뺀다", () => {
    // 기준치가 있는 Accuracy 가 산출 실패면 남은 서술 지표(F-beta) 전부에 기준치가 없다.
    expect(noBenchmarkSentence([kpi("M1", "Accuracy", "unavailable"), kpi("M5", "F-beta Score")], "binary")).toBe(
      ALL_NO_BENCHMARK_SENTENCE,
    );
    // 기준치가 없는 지표가 산출 실패면 목록에 넣지 않는다 — '기준치가 없어'는 그 지표에 맞지 않는 말이다.
    expect(noBenchmarkSentence([kpi("M1", "Accuracy"), kpi("M5", "F-beta Score", "unavailable")], "binary")).toBeNull();
  });

  it("유형마다 기준표가 다르다 — 같은 이름도 유형에 따라 갈린다", () => {
    expect(noBenchmarkSentence([kpi("M1", "Accuracy"), kpi("M9", "AUROC")], "binary")).toBeNull();
    expect(noBenchmarkSentence([kpi("M1", "Accuracy"), kpi("M11", "Macro Average")], "multiclass")).toBe(
      partialNoBenchmarkSentence(["Macro Average"]),
    );
    expect(noBenchmarkSentence([kpi("M4", "F1 Score"), kpi("M15", "Hamming Loss"), kpi("M17", "Jaccard Index")], "multilabel")).toBeNull();
    expect(noBenchmarkSentence([kpi("M2", "Precision"), kpi("M4", "F1 Score")], "multilabel")).toBe(
      partialNoBenchmarkSentence(["Precision"]),
    );
  });

  it("기준표 이름 사본(백엔드 BASELINES 의 키) — 계약 JSON 과의 대조는 factSheetContract.test", () => {
    expect(BENCHMARK_METRIC_NAMES).toEqual({
      binary: ["Accuracy", "Precision", "Recall", "F1 Score", "AUROC", "AUPRC", "MCC"],
      multiclass: ["Accuracy", "Precision", "Recall", "F1 Score"],
      multilabel: ["F1 Score", "Jaccard Index", "Hamming Loss"],
    });
  });
});
