/**
 * 판 4 4.1~4.3(Ed4ResultsCore, 갈래 b3) — 화면·인쇄 두 경로로 그린 글.
 * - bc_strong 발급본·완성본: "4. 시험 결과" 머리부터 4.4 앞까지의 줄이 예시본 4.1·4.2·4.3 블록의 줄과 **정확히 같다**(순서·개수까지,
 *   사이에 다른 줄 없음). 이 세 블록에는 서술 문단·○ 칸이 없어 가림은 0개다.
 * - 다중(digits_strong)·멀티(yeast_strong): 같은 범위를 줄마다 정확값으로.
 * - 픽스처에 없는 갈래(경고·오류 B9~B11, 판정 미달·불가 B12·B14, M21·M22 B5, M22 클래스별 표)는 픽스처 복사본으로.
 */
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildClassReportTable } from "../../../lib/report/classReportTable";
import { loadEd4, type Ed4Tag } from "../../../test/edition4/render/ed4Fixtures";
import { blockText, exampleBlock, exampleLines, printText, screenText } from "../../../test/edition4/render/renderEd4";
import type { FinalReportData, KpiResult } from "../../../types/finalReport.types";
import { Ed4ResultsCore } from "./Ed4ResultsCore";

/** 그린 글에서 "4. 시험 결과" 줄부터 "4.4 오분류" 줄 앞까지(이 부품의 범위). */
function coreLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const start = lines.indexOf("4. 시험 결과");
  const end = lines.indexOf("4.4 오분류");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end).filter((l) => l !== "");
}

/** 예시본 블록 → 그린 글과 같은 꼴의 줄("| 칸1 | 칸2"). */
function exampleAsRendered(heading: string): string[] {
  return exampleLines(exampleBlock(heading)).map((l) => (l.kind === "row" ? `| ${l.cells.join(" | ")}` : l.text));
}

const EXAMPLE_CORE = ["4. 시험 결과", ...["### 4.1 데이터 점검", "### 4.2 종합 판정", "### 4.3 지표별 결과"].flatMap(exampleAsRendered)];

const paths: Array<[name: string, draw: (d: FinalReportData) => Promise<string> | string]> = [
  ["화면", (d) => screenText(d)],
  ["인쇄", (d) => printText(d)],
];

describe("bc_strong — 예시본 4.1~4.3 과 글자 대조(가림 0개)", () => {
  it("예시본 블록 줄 수(대조 대상이 비지 않음)", () => {
    // 절 제목 1 + 4.1(제목·요약 5줄·공통 머리·8줄·이진 머리·3줄 = 19) + 4.2(4) + 4.3(제목·표 9줄·19번 = 11)
    expect(EXAMPLE_CORE.length).toBe(1 + 19 + 4 + 11);
    expect(EXAMPLE_CORE).toContain("| M1 | Accuracy | 0.982 | [0.9497, 0.994] | ≥ 0.950 | 합격 | 작음");
  });
  for (const kind of ["final", "issued"] as const) {
    for (const [name, draw] of paths) {
      it(`${kind} · ${name}`, async () => {
        expect(coreLines(await draw(loadEd4("bc_strong", kind)))).toEqual(EXAMPLE_CORE);
      });
    }
  }
});

const DIGITS_CORE = [
  "4. 시험 결과",
  "4.1 데이터 점검",
  "| 항목 | 값 | 비고",
  "| 총 평가 건수 | 540건 | 업로드 데이터 전체 행(row) 수 = 고유 ID 수",
  "| 유효 예측 건수 | 540건 | 누락값·오류 제외 후 실제 metric 산출에 사용된 건수",
  "| 제외된 샘플 수 | 0건 | 누락값/오류로 인해 평가에서 제외된 건수",
  "| 데이터 검증 결과 | 오류 0건 / 경고 0건 | 항목별 결과는 아래 표",
  "공통 검증 항목 — 모든 분류 유형에 공통 적용 (7건 통과)",
  "| 검증 항목 | 결과 | 상세 내역",
  "| 빈 데이터(행 없음) | 통과 | 540건",
  "| 필수 컬럼 누락 | 통과 | 없음",
  "| 누락값(NaN) | 통과 | 없음",
  "| 중복 ID | 통과 | 없음",
  "| 클래스 불일치 | 통과 | 없음",
  "| 라벨 표기 맞춤 | 통과 | 없음",
  "| 제외된 샘플 수 | 통과 | 0건",
  "다중 클래스 분류 검증 항목 — 분류 유형이 다중 클래스 분류인 경우 적용 (4건 통과)",
  "| 검증 항목 | 결과 | 상세 내역",
  "| 확률값 범위 오류 | 통과 | 0건",
  "| 확률합 오류 | 통과 | 0건",
  "| Argmax–y_pred 불일치 | 통과 | 0건",
  "| 미확인 클래스 감지 | 통과 | 없음",
  "4.2 종합 판정",
  "| 종합 판정 | 판정 대상 지표 중 충족",
  "| 최종 합격 | 3개 중 3개",
  "핵심 지표 Accuracy(M1), F1 Score(M4)와 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
  "4.3 지표별 결과",
  "| Metric ID | 시험항목 | 산출 결과 | 95% 신뢰구간 | 합격 기준 | 판정 | 판정 여유",
  "| M1 | Accuracy (핵심) | 0.989 | [0.976, 0.995] | ≥ 0.980 | 합격 | 작음",
  "| M2 | Precision | 0.989 | — | — | 참고 지표 | —",
  "| M3 | Recall | 0.989 | — | — | 참고 지표 | —",
  "| M4 | F1 Score (핵심) | 0.989 | [0.9796, 0.996] | ≥ 0.980 | 합격 | 작음",
  "| M6 | KL Divergence | 0.000 | [0.000, 0.001] | ≤ 0.050 | 합격 | 충분",
  "| M11 | Macro Average | 0.989 | — | — | 참고 지표 | —",
  "| M12 | Micro Average | 0.989 | — | — | 참고 지표 | —",
  "| M23 | Imbalance Ratio | 1.058 | — | — | 참고 지표 | —",
  '판정 여유 "작음"은 95% 신뢰구간이 합격 기준을 포함하거나, 신뢰구간이 없는 지표에서는 목표값과의 차이가 목표값의 3% 미만이라는 뜻입니다(3.4).',
  "Average 지표 세부 결과 (M11 / M12 / M13)",
  "M11 — Macro Average",
  "| Metric | 값",
  "| Precision | 0.989",
  "| Recall | 0.989",
  "| F1 Score | 0.989",
  "M12 — Micro Average",
  "| Metric | 값",
  "| Precision | 0.989",
  "| Recall | 0.989",
  "| F1 Score | 0.989",
];

const YEAST_CORE = [
  "4. 시험 결과",
  "4.1 데이터 점검",
  "| 항목 | 값 | 비고",
  "| 총 평가 건수 | 917건 | 업로드 데이터 전체 행(row) 수 = 고유 ID 수",
  "| 유효 예측 건수 | 917건 | 누락값·오류 제외 후 실제 metric 산출에 사용된 건수",
  "| 제외된 샘플 수 | 0건 | 누락값/오류로 인해 평가에서 제외된 건수",
  "| 데이터 검증 결과 | 오류 0건 / 경고 0건 | 항목별 결과는 아래 표",
  "공통 검증 항목 — 모든 분류 유형에 공통 적용 (6건 통과)",
  "| 검증 항목 | 결과 | 상세 내역",
  "| 빈 데이터(행 없음) | 통과 | 917건",
  "| 필수 컬럼 누락 | 통과 | 없음",
  "| 누락값(NaN) | 통과 | 없음",
  "| 중복 ID | 통과 | 없음",
  "| 클래스 불일치 | 통과 | 해당 없음",
  "| 제외된 샘플 수 | 통과 | 0건",
  "다중 레이블 분류 검증 항목 — 분류 유형이 다중 레이블 분류인 경우 적용 (2건 통과)",
  "| 검증 항목 | 결과 | 상세 내역",
  "| score 범위 오류 | 통과 | 0건",
  "| 레이블 형식 오류 | 통과 | 없음",
  "4.2 종합 판정",
  "| 종합 판정 | 판정 대상 지표 중 충족",
  "| 조건부 합격 | 3개 중 2개",
  "핵심 지표 Hamming Loss(M15), Jaccard Index(M17)는 목표를 충족하였으나 F1 Score(M4)가 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.",
  "4.3 지표별 결과",
  "| Metric ID | 시험항목 | 산출 결과 | 95% 신뢰구간 | 합격 기준 | 판정 | 판정 여유",
  "| M2 | Precision | 0.535 | — | — | 참고 지표 | —",
  "| M3 | Recall | 0.368 | — | — | 참고 지표 | —",
  "| M4 | F1 Score | 0.399 | [0.376, 0.425] | ≥ 0.450 | 미달 | 충분",
  "| M15 | Hamming Loss (핵심) | 0.209 | [0.200, 0.218] | ≤ 0.220 | 합격 | 충분",
  "| M16 | Exact Match Ratio | 0.153 | — | — | 참고 지표 | —",
  "| M17 | Jaccard Index (핵심) | 0.495 | [0.475, 0.515] | ≥ 0.450 | 합격 | 충분",
  "| M18 | Distribution Diff (ML) | 0.036 | — | — | 참고 지표 | —",
  "| M23 | Imbalance Ratio | 52.923 | — | — | 참고 지표 | —",
  '판정 여유 "작음"은 95% 신뢰구간이 합격 기준을 포함하거나, 신뢰구간이 없는 지표에서는 목표값과의 차이가 목표값의 3% 미만이라는 뜻입니다(3.4).',
];

describe("다중·멀티 — 4.1~4.3 정확값", () => {
  const cases: Array<[Ed4Tag, string[]]> = [
    ["digits_strong", DIGITS_CORE],
    ["yeast_strong", YEAST_CORE],
  ];
  for (const [tag, want] of cases) {
    for (const kind of ["final", "issued"] as const) {
      for (const [name, draw] of paths) {
        it(`${tag} ${kind} · ${name}`, async () => {
          expect(coreLines(await draw(loadEd4(tag, kind)))).toEqual(want);
        });
      }
    }
  }
});

/* ---------------- 픽스처 복사본 ---------------- */

const clone = <T,>(v: T): T => structuredClone(v);
const setKpi = (data: FinalReportData, id: string, patch: Partial<KpiResult>) => {
  const i = data.kpiResults.findIndex((r) => r.metricId === id);
  expect(i).toBeGreaterThanOrEqual(0);
  data.kpiResults[i] = { ...data.kpiResults[i], ...patch };
};

describe("픽스처에 없는 갈래(복사본)", () => {
  it("경고·오류가 있는 검증(B9·B10·B11) — 요약 칸, 묶음 머리, 상세 칸", async () => {
    const data = clone(loadEd4("bc_strong", "final"));
    data.dataValidation = data.dataValidation.map((r) =>
      r.checkName === "중복 ID" ? { ...r, status: "fail" as const, detail: "N/A (no sample_id mapped)" } : r,
    );
    data.dataValidation.push(
      { checkName: "지연시간 통계 (ms)", status: "pass", detail: "mean=12.34, p95=20.00, max=25.10 (n=171)", group: "latency" },
      { checkName: "지연시간 단위", status: "warning", detail: "All 171 values < 1 (max=0.95)", group: "latency" },
    );
    for (const [name, draw] of paths) {
      const lines = coreLines(await draw(data));
      expect(lines, name).toContain("| 데이터 검증 결과 | 오류 1건 / 경고 1건 | 항목별 결과는 아래 표");
      expect(lines, name).toContain("공통 검증 항목 — 모든 분류 유형에 공통 적용 (1건 오류, 6건 통과)");
      expect(lines, name).toContain("| 중복 ID | 오류 | 해당 없음 (샘플 ID 컬럼을 지정하지 않음)");
      const latencyAt = lines.indexOf("응답시간 검증 항목 — 응답시간(latency) 컬럼이 있는 경우 적용 (1건 경고, 1건 통과)");
      expect(latencyAt, name).toBeGreaterThan(lines.indexOf("이진 분류 검증 항목 — 분류 유형이 이진 분류인 경우 적용 (2건 통과)"));
      expect(lines.slice(latencyAt + 1, latencyAt + 4), name).toEqual([
        "| 검증 항목 | 결과 | 상세 내역",
        "| 지연시간 통계 (ms) | 통과 | 평균 12.34, p95 20.00, 최대 25.10 (171건)",
        "| 지연시간 단위 | 경고 | 모든 값 171건이 1 미만 (최대 0.95)",
      ]);
      expect(lines.join("\n"), name).not.toMatch(/N\/A|mean=|\d 건/);
    }
  });

  it("검증 결과가 없으면 요약 표 아래 판 3 안내 글, 묶음 표 없음", () => {
    const data = clone(loadEd4("bc_strong", "final"));
    data.dataValidation = [];
    const lines = coreLines(screenText(data));
    // '항목별 결과는 아래 표' 줄은 아래에 표가 없으니 뺀다(fix1 지적 4).
    expect(lines.filter((l) => l.startsWith("| 데이터 검증 결과"))).toEqual([]);
    expect(lines).toContain("| 제외된 샘플 수 | 0건 | 누락값/오류로 인해 평가에서 제외된 건수");
    expect(lines).toContain("데이터 검증 결과가 없습니다. (검증 단계를 수행한 평가에서만 표시됩니다.)");
    expect(lines.filter((l) => l.startsWith("| 검증 항목"))).toEqual([]);
  });

  it("판정 미달·불합격 — 늘린 값, '미달', 저장된 4.2 판정·근거(초안 20번 글)", async () => {
    const data = clone(loadEd4("bc_strong", "final"));
    setKpi(data, "M3", { value: 0.9696, status: "fail" });
    data.edition4Values!.verdict = {
      ...data.edition4Values!.verdict,
      verdict: "FAIL",
      label: "최종 불합격",
      passedCount: 4,
      countText: "5개 중 4개",
      basis: "핵심 지표 Recall(M3)이 목표에 미달하여, 3.4의 판정 규칙에 따라 불합격으로 판정하였다.",
    };
    for (const [name, draw] of paths) {
      const lines = coreLines(await draw(data));
      expect(lines, name).toContain("| M3 | Recall (핵심) | 0.9696 | [0.917, 0.997] | ≥ 0.970 | 미달 | 작음");
      const at = lines.indexOf("| 종합 판정 | 판정 대상 지표 중 충족");
      expect(lines.slice(at + 1, at + 3), name).toEqual([
        "| 최종 불합격 | 5개 중 4개",
        "핵심 지표 Recall(M3)이 목표에 미달하여, 3.4의 판정 규칙에 따라 불합격으로 판정하였다.",
      ]);
    }
  });

  it("판정 불가(B12)·측정 불가(B14) — 4.2 '판정 불가 | —', 측정 불가 행", async () => {
    const data = clone(loadEd4("bc_strong", "final"));
    for (const id of ["M1", "M3", "M4", "M9", "M19"]) setKpi(data, id, { status: "unavailable" });
    data.edition4Values!.verdict = {
      verdict: "INCONCLUSIVE",
      label: "판정 불가",
      judgedCount: 0,
      passedCount: 0,
      countText: "—",
      basis: "핵심 지표 Recall의 산출 실패로 3.4의 판정 규칙에 따라 판정할 수 없었다.",
    };
    for (const [name, draw] of paths) {
      const lines = coreLines(await draw(data));
      const at = lines.indexOf("| 종합 판정 | 판정 대상 지표 중 충족");
      expect(lines[at + 1], name).toBe("| 판정 불가 | —");
      expect(lines[at + 2], name).toBe("핵심 지표 Recall의 산출 실패로 3.4의 판정 규칙에 따라 판정할 수 없었다.");
      expect(lines, name).toContain("| M3 | Recall (핵심) | — | — | ≥ 0.970 | 측정 불가 | —");
      expect(lines, name).toContain("| M19 | Log Loss | — | — | ≤ 0.100 | 측정 불가 | —");
    }
  });

  it("M21·M22 행(B5)과 M22 클래스별 표(판 3 표 제목, 판 4 표기) — 다중", async () => {
    const data = clone(loadEd4("digits_strong", "final"));
    data.kpiResults.push(
      { metricId: "M21", name: "Confusion Matrix", value: 0, threshold: null, status: "pass", higherIsBetter: true, isCore: false },
      { metricId: "M22", name: "Class-wise Metric", value: 0, threshold: null, status: "pass", higherIsBetter: true, isCore: false },
    );
    const raw = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/digits_strong.evaluate.json"), "utf8"));
    data.classReport = buildClassReportTable(raw.results.success_metrics.class_report, [..."0123456789"], "multiclass");
    for (const [name, draw] of paths) {
      const lines = coreLines(await draw(data));
      expect(lines, name).toContain("| M21 | Confusion Matrix | — | — | — | 참고 지표 | —");
      expect(lines, name).toContain("| M22 | Class-wise Metric | — | — | — | 참고 지표 | —");
      const note = lines.findIndex((l) => l.startsWith('판정 여유 "작음"은'));
      const title = lines.indexOf("M22 — Class-wise Metric (클래스별 세부 성능)");
      expect(title, name).toBe(note + 1);
      expect(lines.slice(title + 1, title + 15), name).toEqual([
        "| 클래스 | Precision | Recall | F1 | 표본 수",
        "| 0 | 1.000 | 1.000 | 1.000 | 54",
        "| 1 | 0.982 | 1.000 | 0.991 | 55",
        "| 2 | 0.981 | 1.000 | 0.991 | 53",
        "| 3 | 1.000 | 1.000 | 1.000 | 55",
        "| 4 | 1.000 | 1.000 | 1.000 | 54",
        "| 5 | 0.981 | 0.964 | 0.9725 | 55",
        "| 6 | 0.981 | 0.981 | 0.981 | 54",
        "| 7 | 1.000 | 0.981 | 0.991 | 54",
        "| 8 | 0.981 | 1.000 | 0.990 | 52",
        "| 9 | 0.981 | 0.963 | 0.9720 | 54",
        "| 매크로 평균 | 0.989 | 0.989 | 0.989 | 540",
        "| 가중 평균 | 0.989 | 0.989 | 0.989 | 540",
        "| 마이크로 평균 | 0.989 | 0.989 | 0.989 | 540",
      ]);
      // M11·M12 세부 표는 클래스별 표 다음.
      expect(lines.indexOf("Average 지표 세부 결과 (M11 / M12 / M13)"), name).toBe(title + 15);
    }
  });

  it("classReport 가 없으면 클래스별 표 제목도 없다(bc·yeast)", () => {
    for (const tag of ["bc_strong", "yeast_strong"] as const) {
      expect(screenText(loadEd4(tag, "final"))).not.toContain("M22 — Class-wise Metric");
    }
  });

  it("판 4 생성값(edition4Values)이 없어도 깨지지 않는다 — 4.2 표·근거만 빠짐(부품만 그림: 다른 장 부품과 무관하게)", () => {
    const data = clone(loadEd4("bc_strong", "final"));
    delete data.edition4Values;
    const view = render(<Ed4ResultsCore data={data} mode="screen" />);
    const lines = coreLines(`${blockText([view.container])}4.4 오분류\n`);
    view.unmount();
    expect(lines).not.toContain("| 종합 판정 | 판정 대상 지표 중 충족");
    expect(lines[lines.indexOf("4.2 종합 판정") + 1]).toBe("4.3 지표별 결과");
  });
});
