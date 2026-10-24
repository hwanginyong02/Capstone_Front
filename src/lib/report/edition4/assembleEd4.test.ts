/**
 * 조립 배선(S3 ⑥⑦) — `assembleEvaluatedReport` 가 판 4 run 에서 판 4 생성값·판 4 사실 시트 칸을 어느 재료로 만드는지. bc_strong
 * 실값으로는 갈리지 않는 자리(반올림 전 값 대신 넷째 자리 값을 읽는 배선 실수)를 일부러 갈리게 만든 응답으로 본다.
 *
 * - 신뢰구간 경계 표기·포함은 반올림 전 경계(0.95004 — 넷째 자리 0.9500 은 목표 0.95 를 포함하는 것처럼 보인다).
 * - 4.5 불균형 비율은 M23 원값(1.49996, 경미 → "1.49996"; 넷째 자리 1.5 로 찍으면 "1.500…").
 * - 옛 백엔드 응답(해시·엔진 버전 없음)이면 판 4 run 의 그 칸은 null(키는 있음), 판 3 run 에는 키가 없다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_BASIC_INFO } from "../../../types/workflow.types";
import { assembleEvaluatedReport, type EvaluatedReportInputs } from "../assembleEvaluatedReport";
import { mapWorkflowToFinalReport } from "../mapWorkflowToFinalReport";

type Json = any;
const NEW: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/bc_strong.evaluate.json"), "utf8"));
const SELECTED = ["M1", "M2", "M3", "M4", "M9", "M10", "M19", "M23"];
const TARGETS: Record<string, string> = { M1: "0.95", M3: "0.97", M4: "0.95", M9: "0.98", M19: "0.1" };

function inputs(): EvaluatedReportInputs {
  const details = (target: string) => ({ targetValue: target, beta: "", positiveClass: "", completed: true }) as never;
  return {
    taskType: "binary",
    selectedMetricIds: SELECTED,
    metricDetails: Object.fromEntries(SELECTED.map((id) => [id, details(TARGETS[id] ?? "")])),
    composerMetrics: { coreMetrics: { choices: ["M3"] } },
    columnMapping: [],
    metadata: { positive_class: "malignant", detected_classes: ["benign", "malignant"], class_distribution: { benign: 107, malignant: 64 } },
    composer: undefined,
  };
}

function base(contentSchema: 3 | 4) {
  return mapWorkflowToFinalReport(
    {
      basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "배선 주식회사", modelName: "WireModel" },
      taskType: "binary",
      selectedMetricIds: SELECTED,
      metricDetails: {},
      uploadedFile: null,
      trainingExampleFiles: [],
      trainingUnsuitableExampleFiles: [],
      columnMapping: [],
      classLabelDescriptions: {},
      metadata: null,
    },
    null,
    { contentSchema },
  );
}

/** 반올림 전 값과 넷째 자리 값이 다른 쪽으로 읽히게 고친 응답. */
function edgeResponse(): Json {
  const r = structuredClone(NEW);
  const sm = r.results.success_metrics;
  sm.confidence_intervals.M1 = { ...sm.confidence_intervals.M1, low: 0.95, low_raw: 0.95004 };
  sm.M23 = 1.49996;
  sm.imbalance_effect = {
    ...sm.imbalance_effect,
    level: "mild",
    imbalance_ratio: 1.5,
    imbalance_ratio_raw: 1.49996,
    display: { ...sm.imbalance_effect.display, imbalance_ratio: "1.49996" },
  };
  return r;
}

describe("판 4 run 조립 — 반올림 전 값을 읽는 배선", () => {
  const { stage1Report, factSheet } = assembleEvaluatedReport(base(4), edgeResponse(), inputs());
  const m1 = factSheet.metrics.find((m) => m.metric_id === "M1")!;

  it("M1 신뢰구간 하한은 원값 0.95004 — 경계 표기 '0.95004', 목표 포함 아님, 판정 여유 충분", () => {
    expect([m1.ci_low_text, m1.ci_contains_target, m1.near_target]).toEqual(["0.95004", false, false]);
    expect(stage1Report.kpiResults.find((r) => r.metricId === "M1")!.judgmentMargin).toBe("ample");
    // 판 3 사실 칸(넷째 자리)은 엔진 숫자 그대로.
    expect(m1.ci_low).toBe(0.95);
  });

  it("4.5 불균형 비율은 M23 원값 — 1.49996(경미)은 '1.49996', 사실 시트 표시값도 같은 글자", () => {
    expect(stage1Report.edition4Values!.distribution.imbalanceRatioText).toBe("1.49996");
    expect(stage1Report.edition4Values!.distribution.imbalanceSentence).toBe("클래스 불균형 비율(Imbalance Ratio)은 1.49996이다.");
    expect(factSheet.imbalance_effect!.display!.imbalance_ratio).toBe("1.49996");
  });

  it("해시·크기·엔진 버전은 응답 최상위 칸에서", () => {
    expect(stage1Report.datasetInfo.sourceFile).toEqual({ sha256: NEW.source_file.sha256, sizeBytes: 3727 });
    expect(stage1Report.evalEnv.engineVersion).toBe("1.0.0");
  });
});

describe("옛 백엔드 응답(새 칸 없음)", () => {
  function oldResponse(): Json {
    const r = structuredClone(NEW);
    delete r.source_file;
    delete r.engine_version;
    return r;
  }

  it("판 4 run: 해시·크기·엔진 버전 칸은 null(그릴 때 —), 키는 있다", () => {
    const { stage1Report } = assembleEvaluatedReport(base(4), oldResponse(), inputs());
    expect(stage1Report.datasetInfo).toHaveProperty("sourceFile", null);
    expect(stage1Report.evalEnv).toHaveProperty("engineVersion", null);
  });

  it("판 3 run: 새 응답이어도 판 4 생성값 키가 하나도 없다", () => {
    const { stage1Report, factSheet } = assembleEvaluatedReport(base(3), structuredClone(NEW), inputs());
    expect(stage1Report).not.toHaveProperty("edition4Values");
    expect(stage1Report.datasetInfo).not.toHaveProperty("sourceFile");
    expect(stage1Report.evalEnv).not.toHaveProperty("engineVersion");
    const text = JSON.stringify(factSheet);
    for (const key of ["ci_low_text", "ci_high_text", "best_threshold_text", "max_f1_text", "risk_side", "evaluation_minus_training_text"]) {
      expect([key, text.includes(key)]).toEqual([key, false]);
    }
    // 판 3 은 고정 문구 18 을 싣는다(판 4 는 싣지 않음 — 대조).
    expect(factSheet.facts!.fixed_sentences.map((s) => s.id)).toContain("18");
    const four = assembleEvaluatedReport(base(4), structuredClone(NEW), inputs());
    expect(four.factSheet.facts!.fixed_sentences.length).toBeGreaterThan(0);
    expect(four.factSheet.facts!.fixed_sentences.map((s) => s.id)).not.toContain("18");
    expect(four.stage1Report).not.toHaveProperty("nearTargetNote");
  });
});
