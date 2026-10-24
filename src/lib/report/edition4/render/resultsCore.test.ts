/**
 * 판 4 4.1~4.3 순수 함수(갈래 b3) — 저장값을 읽어 칸 글자로. 픽스처에 없는 갈래(B9~B11·B14·B5·B12, 판정 미달, 원값 없는
 * 신뢰구간, M22 클래스별 표)는 픽스처를 복사해 필요한 칸만 바꾼 데이터로 본다(픽스처 파일은 고치지 않는다).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { loadEd4 } from "../../../../test/edition4/render/ed4Fixtures";
import type { FinalReportData, KpiResult, ValidationResult } from "../../../../types/finalReport.types";
import { buildClassReportTable } from "../../classReportTable";
import {
  ciCellEd4,
  classReportRowsEd4,
  countCellEd4,
  metricRowEd4,
  metricRowsEd4,
  showsClassReportEd4,
  subMetricTablesEd4,
  validationDetailEd4,
  validationGroupHeadEd4,
  validationGroupsEd4,
  validationSummaryRowsEd4,
  verdictBasisEd4,
  verdictRowEd4,
} from "./resultsCore";

const kpi = (data: FinalReportData, id: string) => {
  const r = data.kpiResults.find((k) => k.metricId === id);
  if (!r) throw new Error(`지표 ${id} 없음`);
  return r;
};

describe("4.1 상세 칸 — 대응표 13(A7·B10·B11)", () => {
  it.each([
    ["171 건", "171건"],
    // 표 칸 건수는 천 단위 쉼표(S6 질문 8)
    ["1234 건", "1,234건"],
    ["1,234 건", "1,234건"],
    ["12 건 — 허용 범위 벗어남: [0, 1] (score_a), 1000 건 누락", "12건 — 허용 범위 벗어남: [0, 1] (score_a), 1,000건 누락"],
    ["mean=12.34, p95=20.00, max=25.10 (n=12345)", "평균 12.34, p95 20.00, 최대 25.10 (12,345건)"],
    ["All 1500 values < 1 (max=0.95)", "모든 값 1,500건이 1 미만 (최대 0.95)"],
    ["0 건", "0건"],
    ["3 건 — 허용 범위 벗어남: [0, 1] (score_malignant)", "3건 — 허용 범위 벗어남: [0, 1] (score_malignant)"],
    ["5 건 (표본 상위 100)", "5건 (표본 상위 100)"],
    ["N/A", "해당 없음"],
    ["N/A (no sample_id mapped)", "해당 없음 (샘플 ID 컬럼을 지정하지 않음)"],
    ["N/A (no score_positive mapped)", "해당 없음 (확률(score) 컬럼을 지정하지 않음)"],
    ["N/A (no score_per_label mapped)", "해당 없음 (확률(score) 컬럼을 지정하지 않음)"],
    // 역할 이름은 매핑 화면의 한국어 이름표(S6 질문 5)
    ["N/A (no y_true mapped)", "해당 없음 (정답 레이블 컬럼을 지정하지 않음)"],
    ["N/A (no true_labels mapped)", "해당 없음 (정답 레이블 컬럼을 지정하지 않음)"],
    ["N/A (no y_pred mapped)", "해당 없음 (예측 레이블 컬럼을 지정하지 않음)"],
    ["N/A (no pred_labels mapped)", "해당 없음 (예측 레이블 컬럼을 지정하지 않음)"],
    ["N/A (no prob_per_class mapped)", "해당 없음 (클래스별 확률 컬럼을 지정하지 않음)"],
    ["N/A (no latency mapped)", "해당 없음 (지연시간(ms) 컬럼을 지정하지 않음)"],
    ["N/A (no mystery_role mapped)", "해당 없음 (mystery_role 컬럼을 지정하지 않음)"],
    ["mean=12.34, p95=20.00, max=25.10 (n=171)", "평균 12.34, p95 20.00, 최대 25.10 (171건)"],
    ["All 171 values < 1 (max=0.95)", "모든 값 171건이 1 미만 (최대 0.95)"],
    ["Could not verify", "확인하지 못함"],
    ["Non-numeric values in score column", "숫자가 아닌 값이 있는 컬럼: 양성 클래스 점수"],
    ["Non-numeric values in probability columns", "숫자가 아닌 값이 있는 컬럼: 클래스별 확률"],
    ["Non-numeric values in score_per_label columns", "숫자가 아닌 값이 있는 컬럼: 레이블별 확률"],
    ["Non-numeric values in toString columns", "숫자가 아닌 값이 있는 컬럼: toString"],
    ["없음", "없음"],
    ["해당 없음", "해당 없음"],
    ["정답 ' cat' → 'cat'", "정답 ' cat' → 'cat'"],
  ])("%s → %s", (raw, want) => {
    expect(validationDetailEd4(raw)).toBe(want);
  });

  it("건수 칸은 천 단위 쉼표 + 붙여 쓴 '건'", () => {
    expect(countCellEd4(171)).toBe("171건");
    expect(countCellEd4(12345)).toBe("12,345건");
    expect(countCellEd4(0)).toBe("0건");
  });
});

describe("4.1 요약 표·묶음 머리", () => {
  it("bc_strong 요약 네 줄(예시본 글자)", () => {
    expect(validationSummaryRowsEd4(loadEd4("bc_strong", "final"))).toEqual([
      ["총 평가 건수", "171건", "업로드 데이터 전체 행(row) 수 = 고유 ID 수"],
      ["유효 예측 건수", "171건", "누락값·오류 제외 후 실제 metric 산출에 사용된 건수"],
      ["제외된 샘플 수", "0건", "누락값/오류로 인해 평가에서 제외된 건수"],
      ["데이터 검증 결과", "오류 0건 / 경고 0건", "항목별 결과는 아래 표"],
    ]);
  });

  it("요약 수치는 validationSummary 칸마다 읽고, 없으면 datasetInfo.sampleCount·제외 0", () => {
    const base = loadEd4("bc_strong", "final");
    const shifted = { ...base, validationSummary: { totalRows: 1200, validRows: 1180, excludedRows: 20 } };
    expect(validationSummaryRowsEd4(shifted).map((r) => r[1]).slice(0, 3)).toEqual(["1,200건", "1,180건", "20건"]);
    const none = { ...base, validationSummary: undefined, datasetInfo: { ...base.datasetInfo, sampleCount: 333 } };
    expect(validationSummaryRowsEd4(none).map((r) => r[1]).slice(0, 3)).toEqual(["333건", "333건", "0건"]);
  });

  it("오류·경고 수는 dataValidation 의 status 로 센다(fail = 오류)", () => {
    const base = loadEd4("bc_strong", "final");
    const dv: ValidationResult[] = [
      ...base.dataValidation,
      { checkName: "a", status: "fail", detail: "1 건", group: "common" },
      { checkName: "b", status: "warning", detail: "1 건", group: "latency" },
      { checkName: "c", status: "warning", detail: "1 건", group: "latency" },
    ];
    expect(validationSummaryRowsEd4({ ...base, dataValidation: dv })[3][1]).toBe("오류 1건 / 경고 2건");
    // 표의 수는 천 단위 쉼표(S6 질문 8)
    const many: ValidationResult[] = Array.from({ length: 1000 }, (_, i) => ({ checkName: `w${i}`, status: "warning" as const, detail: "1 건", group: "latency" as const }));
    expect(validationSummaryRowsEd4({ ...base, dataValidation: many })[3][1]).toBe("오류 0건 / 경고 1,000건");
  });

  it("묶음 머리: 모두 통과는 예시본 꼴, 경고·오류가 있으면 B9(오류·경고·통과 순, 0건은 뺌)", () => {
    const pass = { status: "pass" as const };
    const warn = { status: "warning" as const };
    const fail = { status: "fail" as const };
    expect(validationGroupHeadEd4("common", Array(7).fill(pass))).toBe("공통 검증 항목 — 모든 분류 유형에 공통 적용 (7건 통과)");
    expect(validationGroupHeadEd4("binary", [pass, pass])).toBe("이진 분류 검증 항목 — 분류 유형이 이진 분류인 경우 적용 (2건 통과)");
    expect(validationGroupHeadEd4("latency", [warn, pass])).toBe(
      "응답시간 검증 항목 — 응답시간(latency) 컬럼이 있는 경우 적용 (1건 경고, 1건 통과)",
    );
    expect(validationGroupHeadEd4("multiclass", [fail, warn, warn, pass])).toBe(
      "다중 클래스 분류 검증 항목 — 분류 유형이 다중 클래스 분류인 경우 적용 (1건 오류, 2건 경고, 1건 통과)",
    );
    expect(validationGroupHeadEd4("multilabel", [fail])).toBe("다중 레이블 분류 검증 항목 — 분류 유형이 다중 레이블 분류인 경우 적용 (1건 오류)");
    // 천 단위 쉼표(S6 질문 8)
    expect(validationGroupHeadEd4("common", [...Array(1000).fill(fail), ...Array(1200).fill(warn), ...Array(1001).fill(pass)])).toBe(
      "공통 검증 항목 — 모든 분류 유형에 공통 적용 (1,000건 오류, 1,200건 경고, 1,001건 통과)",
    );
  });

  it("묶음 순서는 공통·다중·이진·멀티·응답시간, 빈 묶음은 뺌, 칸은 [이름, 결과 글자, 판 4 상세]", () => {
    const dv: ValidationResult[] = [
      { checkName: "지연시간 통계 (ms)", status: "pass", detail: "mean=1.00, p95=2.00, max=3.00 (n=9)", group: "latency" },
      { checkName: "score 범위 오류", status: "warning", detail: "2 건", group: "binary" },
      { checkName: "중복 ID", status: "fail", detail: "N/A (no sample_id mapped)", group: "common" },
    ];
    const groups = validationGroupsEd4(dv);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.map((g) => g.group)).toEqual(["common", "binary", "latency"]);
    expect(groups.map((g) => g.rows)).toEqual([
      [["중복 ID", "오류", "해당 없음 (샘플 ID 컬럼을 지정하지 않음)"]],
      [["score 범위 오류", "경고", "2건"]],
      [["지연시간 통계 (ms)", "통과", "평균 1.00, p95 2.00, 최대 3.00 (9건)"]],
    ]);
    expect(validationGroupsEd4([])).toEqual([]);
  });
});

describe("4.2 종합 판정 — 저장된 edition4Values.verdict 를 읽기만", () => {
  it("bc_strong", () => {
    const data = loadEd4("bc_strong", "final");
    expect(verdictRowEd4(data)).toEqual(["최종 합격", "5개 중 5개"]);
    expect(verdictBasisEd4(data)).toBe(
      "핵심 지표 Recall(M3)과 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    );
  });

  it("저장 칸을 그대로 옮긴다(label·countText·basis — 다시 셈하지 않음): 바꾼 값이 그대로 나온다", () => {
    const data = loadEd4("bc_strong", "final");
    const v = { ...data.edition4Values!.verdict, label: "판정 불가", countText: "—", basis: "가짜 근거." };
    const copy = { ...data, edition4Values: { ...data.edition4Values!, verdict: v } };
    expect(verdictRowEd4(copy)).toEqual(["판정 불가", "—"]);
    expect(verdictBasisEd4(copy)).toBe("가짜 근거.");
  });

  it("판 4 생성값이 없거나 근거가 null 이면 null", () => {
    const data = loadEd4("bc_strong", "final");
    expect(verdictRowEd4({ edition4Values: undefined })).toBeNull();
    expect(verdictBasisEd4({ edition4Values: undefined })).toBeNull();
    const copy = { edition4Values: { ...data.edition4Values!, verdict: { ...data.edition4Values!.verdict, basis: null } } };
    expect(verdictBasisEd4(copy)).toBeNull();
  });
});

describe("4.3 지표별 결과 한 줄", () => {
  it("bc_strong 여덟 줄(예시본 4.3 표 그대로)", () => {
    expect(metricRowsEd4(loadEd4("bc_strong", "final").kpiResults)).toEqual([
      ["M1", "Accuracy", "0.982", "[0.9497, 0.994]", "≥ 0.950", "합격", "작음"],
      ["M2", "Precision", "0.969", "—", "—", "참고 지표", "—"],
      ["M3", "Recall (핵심)", "0.984", "[0.917, 0.997]", "≥ 0.970", "합격", "작음"],
      ["M4", "F1 Score", "0.977", "[0.946, 1.000]", "≥ 0.950", "합격", "작음"],
      ["M9", "AUROC", "0.999", "[0.997, 1.000]", "≥ 0.980", "합격", "충분"],
      ["M10", "AUPRC", "0.999", "—", "—", "참고 지표", "—"],
      ["M19", "Log Loss", "0.053", "[0.033, 0.079]", "≤ 0.100", "합격", "충분"],
      ["M23", "Imbalance Ratio", "1.672", "—", "—", "참고 지표", "—"],
    ]);
  });

  it("판정 미달 — 값은 판정과 어긋나 보이지 않게 늘린 판 4 표기, 판정 칸 '불합격'(판 3 같은 칸 글자)", () => {
    const data = loadEd4("bc_strong", "final");
    const r: KpiResult = { ...kpi(data, "M3"), value: 0.9696, status: "fail", judgmentMargin: "small" };
    expect(metricRowEd4(r, [r])).toEqual(["M3", "Recall (핵심)", "0.9696", "[0.917, 0.997]", "≥ 0.970", "불합격", "작음"]);
  });

  it("방향 칸이 없으면(higherIsBetter undefined) 높을수록 좋음으로 — 경계 미달 값 0.8496 / 목표 0.85(rv2 지적 4)", () => {
    const data = loadEd4("bc_strong", "final");
    const r: KpiResult = { ...kpi(data, "M3"), value: 0.8496, threshold: 0.85, status: "fail", judgmentMargin: "small" };
    delete r.higherIsBetter;
    expect(metricRowEd4(r, [r]).slice(2, 6)).toEqual(["0.8496", "[0.917, 0.997]", "≥ 0.850", "불합격"]);
  });

  it("낮을수록 좋은 지표 미달 — '≤' 와 늘린 값", () => {
    const data = loadEd4("bc_strong", "final");
    const r: KpiResult = { ...kpi(data, "M19"), value: 0.1004, status: "fail" };
    expect(metricRowEd4(r, [r]).slice(2, 6)).toEqual(["0.1004", "[0.033, 0.079]", "≤ 0.100", "불합격"]);
  });

  it("측정 불가(B14) — 산출 결과·신뢰구간·판정 여유 '—', 합격 기준은 목표가 있으면 그 글자", () => {
    const data = loadEd4("bc_strong", "final");
    const r: KpiResult = { ...kpi(data, "M9"), status: "unavailable" };
    expect(metricRowEd4(r, [r])).toEqual(["M9", "AUROC", "—", "—", "≥ 0.980", "측정 불가", "—"]);
    const noTarget: KpiResult = { ...kpi(data, "M10"), status: "unavailable" };
    expect(metricRowEd4(noTarget, [noTarget])).toEqual(["M10", "AUPRC", "—", "—", "—", "측정 불가", "—"]);
    const core: KpiResult = { ...kpi(data, "M3"), status: "unavailable" };
    expect(metricRowEd4(core, [core])[1]).toBe("Recall (핵심)");
  });

  it("M21·M22(B5) — 값·신뢰구간·합격 기준·판정 여유 '—', 판정 '참고 지표'", () => {
    const m21: KpiResult = { metricId: "M21", name: "Confusion Matrix", value: 0, threshold: null, status: "pass" };
    const m22: KpiResult = { metricId: "M22", name: "Class-wise Metric", value: 0, threshold: null, status: "pass" };
    expect(metricRowEd4(m21, [m21])).toEqual(["M21", "Confusion Matrix", "—", "—", "—", "참고 지표", "—"]);
    expect(metricRowEd4(m22, [m22])).toEqual(["M22", "Class-wise Metric", "—", "—", "—", "참고 지표", "—"]);
  });

  it("판정 여유는 저장 칸만 읽는다 — 칸이 없으면 '—'(3% 를 다시 셈하지 않음)", () => {
    const data = loadEd4("bc_strong", "final");
    const { judgmentMargin: _m, ...noMargin } = kpi(data, "M1");
    expect(metricRowEd4(noMargin as KpiResult, data.kpiResults)[6]).toBe("—");
    const flipped: KpiResult = { ...kpi(data, "M9"), judgmentMargin: "small" };
    expect(metricRowEd4(flipped, data.kpiResults)[6]).toBe("작음");
  });

  it("목표 없는 지표 값은 같은 수 같은 글자(D2) — 판정 대상 지표와 같은 원값이면 그 judged 글자", () => {
    const data = loadEd4("bc_strong", "final");
    const m3 = { ...kpi(data, "M3"), value: 0.9696, status: "fail" as const };
    const twin: KpiResult = { ...kpi(data, "M2"), value: 0.9696 };
    expect(metricRowEd4(twin, [m3, twin])[2]).toBe("0.9696");
    expect(metricRowEd4(twin, [twin])[2]).toBe("0.970");
  });

  it("신뢰구간 경계는 반올림 전 경계(ciRaw)로 늘리고, 없으면 넷째 자리 ci 로", () => {
    const data = loadEd4("bc_strong", "final");
    const base = kpi(data, "M1");
    const withRaw: KpiResult = { ...base, ci: { low: 0.95, high: 0.994, method: "wilson" }, ciRaw: { low: 0.94996, high: 0.99402 } };
    expect(ciCellEd4(withRaw)).toBe("[0.94996, 0.994]");
    const { ciRaw: _r, ...noRaw } = withRaw;
    expect(ciCellEd4(noRaw as KpiResult)).toBe("[0.950, 0.994]");
    const highSide: KpiResult = { ...base, threshold: 0.99, ci: { low: 0.9497, high: 0.99 }, ciRaw: { low: 0.9497, high: 0.990004 } } as KpiResult;
    expect(ciCellEd4(highSide)).toBe("[0.950, 0.990004]");
    expect(ciCellEd4({ ...base, ci: undefined, ciRaw: undefined })).toBe("—");
    expect(ciCellEd4({ ...kpi(data, "M2"), ci: { low: 0.9, high: 0.99, method: "wilson" } })).toBe("—");
  });
});

describe("다중(digits_strong)·멀티(yeast_strong) 4.3", () => {
  it("digits_strong — 핵심 둘, M6, M11·M12 참고 지표", () => {
    expect(metricRowsEd4(loadEd4("digits_strong", "final").kpiResults)).toEqual([
      ["M1", "Accuracy (핵심)", "0.989", "[0.976, 0.995]", "≥ 0.980", "합격", "작음"],
      ["M2", "Precision", "0.989", "—", "—", "참고 지표", "—"],
      ["M3", "Recall", "0.989", "—", "—", "참고 지표", "—"],
      ["M4", "F1 Score (핵심)", "0.989", "[0.9796, 0.996]", "≥ 0.980", "합격", "작음"],
      ["M6", "KL Divergence", "0.000", "[0.000, 0.001]", "≤ 0.050", "합격", "충분"],
      ["M11", "Macro Average", "0.989", "—", "—", "참고 지표", "—"],
      ["M12", "Micro Average", "0.989", "—", "—", "참고 지표", "—"],
      ["M23", "Imbalance Ratio", "1.058", "—", "—", "참고 지표", "—"],
    ]);
  });

  it("digits_strong M11·M12 세부 표", () => {
    const tables = subMetricTablesEd4(loadEd4("digits_strong", "final").kpiResults);
    expect(tables.length).toBe(2);
    expect(tables).toEqual([
      { metricId: "M11", head: "M11 — Macro Average", rows: [["Precision", "0.989"], ["Recall", "0.989"], ["F1 Score", "0.989"]] },
      { metricId: "M12", head: "M12 — Micro Average", rows: [["Precision", "0.989"], ["Recall", "0.989"], ["F1 Score", "0.989"]] },
    ]);
  });

  it("세부 표 값은 칸마다 제 값(Precision·Recall·F1 순)", () => {
    const r: KpiResult = {
      metricId: "M13",
      name: "Weighted Average",
      value: 0.5,
      threshold: null,
      status: "pass",
      subMetrics: { precision: 0.1234, recall: 0.5678, f1Score: 0.9012 },
    };
    expect(subMetricTablesEd4([r])[0].rows).toEqual([["Precision", "0.123"], ["Recall", "0.568"], ["F1 Score", "0.901"]]);
  });

  it("yeast_strong — 조건부 합격(F1 미달), 낮을수록 좋은 핵심 지표 Hamming Loss", () => {
    expect(metricRowsEd4(loadEd4("yeast_strong", "final").kpiResults)).toEqual([
      ["M2", "Precision", "0.535", "—", "—", "참고 지표", "—"],
      ["M3", "Recall", "0.368", "—", "—", "참고 지표", "—"],
      ["M4", "F1 Score", "0.399", "[0.376, 0.425]", "≥ 0.450", "불합격", "충분"],
      ["M15", "Hamming Loss (핵심)", "0.209", "[0.200, 0.218]", "≤ 0.220", "합격", "충분"],
      ["M16", "Exact Match Ratio", "0.153", "—", "—", "참고 지표", "—"],
      ["M17", "Jaccard Index (핵심)", "0.495", "[0.475, 0.515]", "≥ 0.450", "합격", "충분"],
      ["M18", "Distribution Diff (ML)", "0.036", "—", "—", "참고 지표", "—"],
      ["M23", "Imbalance Ratio", "52.923", "—", "—", "참고 지표", "—"],
    ]);
    expect(subMetricTablesEd4(loadEd4("yeast_strong", "final").kpiResults)).toEqual([]);
  });
});

/** digits_strong 평가 응답의 실제 class_report(M22 를 골랐다면 저장됐을 표). */
function digitsClassReport() {
  const raw = JSON.parse(
    readFileSync(resolve(__dirname, "../../../../test/edition4/evaluateNewKeys/digits_strong.evaluate.json"), "utf8"),
  );
  const labels = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return buildClassReportTable(raw.results.success_metrics.class_report, labels, "multiclass")!;
}

describe("M22 클래스별 표(판 4 표기)", () => {
  it("digits_strong 표 — 최약 클래스 9 는 사실 시트 f1_text, 셋째 자리로 최약과 같아 보이는 클래스 5 는 늘림, 평균 줄은 D2", () => {
    const data = loadEd4("digits_strong", "final");
    const table = digitsClassReport();
    const rows = classReportRowsEd4(table, data.kpiResults, data.narrativeFacts!.weakest_class);
    expect(rows.length).toBe(13);
    expect(rows).toEqual([
      ["0", "1.000", "1.000", "1.000", "54"],
      ["1", "0.982", "1.000", "0.991", "55"],
      ["2", "0.981", "1.000", "0.991", "53"],
      ["3", "1.000", "1.000", "1.000", "55"],
      ["4", "1.000", "1.000", "1.000", "54"],
      ["5", "0.981", "0.964", "0.9725", "55"],
      ["6", "0.981", "0.981", "0.981", "54"],
      ["7", "1.000", "0.981", "0.991", "54"],
      ["8", "0.981", "1.000", "0.990", "52"],
      ["9", "0.981", "0.963", "0.9720", "54"],
      ["매크로 평균", "0.989", "0.989", "0.989", "540"],
      ["가중 평균", "0.989", "0.989", "0.989", "540"],
      ["마이크로 평균", "0.989", "0.989", "0.989", "540"],
    ]);
  });

  it("최약 클래스 F1 은 저장된 f1_text 를 읽는다(바꾸면 그대로) — 다른 칸은 영향 없음", () => {
    const data = loadEd4("digits_strong", "final");
    const weakest = { ...data.narrativeFacts!.weakest_class!, f1_text: "0.97196" };
    const rows = classReportRowsEd4(digitsClassReport(), data.kpiResults, weakest);
    expect(rows[9]).toEqual(["9", "0.981", "0.963", "0.97196", "54"]);
    expect(rows[5][3]).toBe("0.9725");
  });

  it("평균 줄 F1 이 판정 대상 지표와 같은 원값이면 그 judged 글자(D2) — M4 를 미달로 늘리면 매크로 평균 F1 도 같은 글자", () => {
    const data = loadEd4("digits_strong", "final");
    const m4 = { ...kpi(data, "M4"), threshold: 0.98887, status: "fail" as const };
    const kpis = data.kpiResults.map((r) => (r.metricId === "M4" ? m4 : r));
    const rows = classReportRowsEd4(digitsClassReport(), kpis, data.narrativeFacts!.weakest_class);
    expect(rows[10]).toEqual(["매크로 평균", "0.989", "0.989", "0.988869", "540"]);
    expect(metricRowEd4(m4, kpis)[2]).toBe("0.988869");
  });

  it("값이 없는 칸·표본 수는 '—', 최약 클래스가 없으면 F1 은 D2 → 셋째 자리", () => {
    const table = { rows: [{ label: "a", precision: null, recall: 0.5, f1: null, support: null }], averages: [] };
    expect(classReportRowsEd4(table, [], null)).toEqual([["a", "—", "0.500", "—", "—"]]);
    const t2 = { rows: [{ label: "a", precision: 0.25, recall: 0.5, f1: 0.97249, support: 3 }], averages: [] };
    expect(classReportRowsEd4(t2, [], null)).toEqual([["a", "0.250", "0.500", "0.972", "3"]]);
    // 표본 수는 천 단위 쉼표(S6 질문 8)
    const t3 = { rows: [{ label: "a", precision: 0.25, recall: 0.5, f1: 0.5, support: 3899 }], averages: [{ label: "매크로 평균", precision: 0.25, recall: 0.5, f1: 0.5, support: 12345 }] };
    expect(classReportRowsEd4(t3, [], null).map((r) => r[4])).toEqual(["3,899", "12,345"]);
  });

  it("showsClassReportEd4 — classReport 가 있고 줄이 있을 때만", () => {
    expect(showsClassReportEd4({ classReport: null })).toBe(false);
    expect(showsClassReportEd4({ classReport: undefined })).toBe(false);
    expect(showsClassReportEd4({ classReport: { rows: [], averages: [] } })).toBe(false);
    expect(showsClassReportEd4({ classReport: digitsClassReport() })).toBe(true);
  });
});
