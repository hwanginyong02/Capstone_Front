/**
 * 판 4 3.2 산정식 덮어쓰기 표(S3 ⑥, 대응표 11) — 글자 출처와, 판 4 run 의 저장값에만 들어가는지(매퍼 배선).
 *
 * - M2·M3·M4·M19 는 예시본 3.2 글자(아래 표에 옮겨 적음), M10 은 고정 문구 사본, M11~M13 은 부록 B6, M5 는 판 3 글에 부록 A9
 *   치환을 하고 "Fβ의" 로 붙여 쓴 글이다(치환을 시험 안에서 다시 해 본다).
 * - 판 3 run 은 지금 글(`METRICS.formula`) 그대로다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { METRICS, type TaskType } from "../../../data/evaluationData";
import { DEFAULT_BASIC_INFO } from "../../../types/workflow.types";
import { mapWorkflowToFinalReport } from "../mapWorkflowToFinalReport";
import { EDITION4_FORMULA_OVERRIDES, formulaEd4 } from "./metricFormulasEd4";

type Json = any;
const WORDING: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/fixedWording.ed4.json"), "utf8"));

/** 예시본(RPT-2026-0001 판 4 모양) 3.2 "시험방법 및 산정식" 칸 — 옮겨 적은 글. */
const EXAMPLE_3_2: Record<string, string> = {
  M1: "(TP + TN) / Total",
  M2: "이진: TP/(TP+FP) · 다중·멀티: 클래스별 TP/(TP+FP)의 매크로 평균",
  M3: "이진: TP/(TP+FN) · 다중·멀티: 클래스별 TP/(TP+FN)의 매크로 평균",
  M4: "이진: 2PR/(P+R) · 다중·멀티: 클래스별 F1의 매크로 평균(매크로 정밀도와 매크로 재현율의 조화평균이 아님)",
  M23: "max(class count) / min(class count)",
  M9: "Area under ROC Curve",
  M10: "평균 정밀도(Average Precision): Σ (Rₙ − Rₙ₋₁) · Pₙ",
  M19: "−(1/N) Σ [y·log(p) + (1−y)·log(1−p)]",
};

/** 부록 B6 — 세 지표를 " · " 로 이은 한 칸. "M1n 글" 로 나눈다. */
function appendixB6(): Record<string, string> {
  const text: string = WORDING.appendixB_raw.B6.candidate;
  return Object.fromEntries(text.split(" · M").map((part, i) => {
    const body = i === 0 ? part : `M${part}`;
    const [id, ...rest] = body.split(" ");
    return [id, rest.join(" ")];
  }));
}

/** 부록 A9 — binary → 이진, 그 외 → 다중·멀티, macro → 매크로(판 3 글에 이 치환만). */
function a9(text: string): string {
  return text.replace(/binary/g, "이진").replace(/그 외/g, "다중·멀티").replace(/macro/g, "매크로");
}

const formulaOf = (id: string) => METRICS.find((m) => m.id === id)!.formula!;

describe("판 4 산정식 — 글자 출처", () => {
  it("예시본 3.2 의 여덟 지표(M1·M9·M23 은 판 3 글과 같아 표에 없다)", () => {
    const ids = Object.keys(EXAMPLE_3_2);
    expect(ids.length).toBe(8);
    for (const id of ids) expect([id, formulaEd4(id, formulaOf(id))]).toEqual([id, EXAMPLE_3_2[id]]);
    for (const id of ["M1", "M9", "M23"]) expect(EDITION4_FORMULA_OVERRIDES).not.toHaveProperty(id);
  });

  it("M10 = 고정 문구 사본(2026-10-24 새 글자)", () => {
    expect(EDITION4_FORMULA_OVERRIDES.M10).toBe(WORDING.fixed["3_2_M10_formula"]);
  });

  it("M11~M13 = 부록 B6", () => {
    const b6 = appendixB6();
    expect(Object.keys(b6)).toEqual(["M11", "M12", "M13"]);
    for (const id of ["M11", "M12", "M13"]) expect([id, EDITION4_FORMULA_OVERRIDES[id]]).toEqual([id, b6[id]]);
  });

  it("M5 = 판 3 글에 부록 A9 치환 + 'Fβ의' 붙여 쓰기(2026-10-24 사용자 승인)", () => {
    expect(formulaOf("M5")).toMatch(/binary/);
    // 판 3 글은 "Fβ 의"(띄어 씀) — 판 4 는 예시본 M2~M4 의 "F1의" 처럼 붙여 쓴다. 그 밖은 A9 치환 그대로.
    expect(formulaOf("M5")).toContain("Fβ 의");
    expect(EDITION4_FORMULA_OVERRIDES.M5).toBe(a9(formulaOf("M5")).replace("Fβ 의", "Fβ의"));
    expect(EDITION4_FORMULA_OVERRIDES.M5).toBe("이진: (1+β²)PR/(β²P+R) · 다중·멀티: 클래스별 Fβ의 매크로 평균");
  });

  it("덮어쓰는 지표는 정해진 열 개뿐이다", () => {
    expect(Object.keys(EDITION4_FORMULA_OVERRIDES).sort()).toEqual(
      ["M10", "M11", "M12", "M13", "M19", "M2", "M3", "M4", "M5"].sort(),
    );
  });

  it("표에 없는 지표는 판 3 글", () => {
    expect(formulaEd4("M7", formulaOf("M7"))).toBe(formulaOf("M7"));
  });
});

function mapped(taskType: TaskType, selectedMetricIds: string[], contentSchema: 3 | 4) {
  return mapWorkflowToFinalReport(
    {
      basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "산정식 주식회사", modelName: "FormulaModel" },
      taskType,
      selectedMetricIds,
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

describe("매퍼 배선 — 판 4 run 의 저장값만 판 4 산정식", () => {
  const binary = ["M1", "M2", "M3", "M4", "M5", "M9", "M10", "M19", "M23"];
  const multiclass = ["M2", "M11", "M12", "M13"];

  it("판 4 run: 고른 지표마다 판 4 글(시험목표 열은 판 3 과 같음)", () => {
    const four = mapped("binary", binary, 4).metricFormulas;
    expect(four.map((f) => f.metricId)).toEqual(binary);
    for (const f of four) expect([f.metricId, f.formula]).toEqual([f.metricId, formulaEd4(f.metricId, formulaOf(f.metricId))]);
    expect(four.find((f) => f.metricId === "M19")!.formula).toBe(EXAMPLE_3_2.M19);
    const three = mapped("binary", binary, 3).metricFormulas;
    expect(four.map((f) => f.description)).toEqual(three.map((f) => f.description));
    const mc = mapped("multiclass", multiclass, 4).metricFormulas;
    expect(mc.length).toBe(4);
    for (const f of mc) expect([f.metricId, f.formula]).toEqual([f.metricId, EDITION4_FORMULA_OVERRIDES[f.metricId]]);
  });

  it("판 3 run: 지금 글 그대로(덮어쓰기 표의 글이 하나도 없다)", () => {
    const three = [...mapped("binary", binary, 3).metricFormulas, ...mapped("multiclass", multiclass, 3).metricFormulas];
    expect(three.length).toBe(13);
    for (const f of three) expect([f.metricId, f.formula]).toEqual([f.metricId, formulaOf(f.metricId)]);
  });
});
