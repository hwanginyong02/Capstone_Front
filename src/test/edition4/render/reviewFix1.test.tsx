/**
 * 판 4 렌더러 검토 지적 고침(fix1) — 검토자(rv1·rv3) 재현을 옮긴 시험. 평가 전 초안은 실제 매퍼 결과(`draftEd4.ts`)로 그린다.
 */
import { describe, expect, it } from "vitest";

import { buildThresholdTableEd4, f1ThresholdGainTextsEd4, type F1ThresholdGainRawEd4 } from "../../../lib/report/edition4/thresholdGainEd4";
import { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import type { FinalReportData } from "../../../types/finalReport.types";
import { draftReport } from "./draftEd4";
import { loadEd4 } from "./ed4Fixtures";
import { screenText } from "./renderEd4";

const after = (text: string, head: string) => text.slice(text.indexOf(`\n${head}\n`) + 1);
const between = (text: string, head: string, next: string) => {
  const start = text.indexOf(`\n${head}\n`);
  const end = text.indexOf(`\n${next}\n`, start + 1);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start + 1, end).split("\n");
};

describe("지적 1 — 평가 전 초안(문제 목록 없음)의 6절은 판 3 초안 자리표시(문제 0개 글 아님)", () => {
  for (const tag of ["bc_strong", "digits_strong", "yeast_strong"]) {
    it(tag, () => {
      const draft = draftReport(tag);
      expect(draft.problems).toBeUndefined();
      const lines = after(screenText(draft), "6. 개선 권고").split("\n");
      expect(lines.slice(0, 7)).toEqual([
        "6. 개선 권고",
        "6.1 데이터",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "6.2 모델과 운영",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "권고 항목은 자동 서술 생성 연동 시 표시됩니다.",
        "— 끝 —",
      ]);
      expect(screenText(draft)).not.toContain(NO_PROBLEM_SENTENCE);
    });
  }

  it("판 3 같은 입력 초안도 같은 자리표시 글(글자 출처 확인)", () => {
    const text = screenText(draftReport("bc_strong", "3"));
    expect(text).toContain("\n자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.\n");
    expect(text).toContain("\n권고 항목은 자동 서술 생성 연동 시 표시됩니다.\n");
  });
});

describe("지적 2 — 평가 전 초안 3.1 합격 기준 방향은 지표 정의(낮을수록 좋음)에서", () => {
  it("bc_strong 초안: Log Loss(M19) 는 '≤ 0.100'(저장된 metricList passCriteria·판 3 초안과 같음)", () => {
    const draft = draftReport("bc_strong");
    expect(draft.kpiResults).toHaveLength(0);
    expect(draft.metricList.find((m) => m.metricId === "M19")?.passCriteria).toBe("≤ 0.100");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식");
    expect(lines).toContain("| M19 | Log Loss | ≤ 0.100 | —");
    expect(lines).toContain("| M1 | Accuracy | ≥ 0.950 | —");
    expect(lines.filter((l) => /^\| M\d/.test(l))).toHaveLength(8);
  });

  it("yeast_strong 초안: 낮을수록 좋은 지표는 모두 ≤", () => {
    const draft = draftReport("yeast_strong");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식").filter((l) => /^\| M\d/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const metric of draft.metricList.filter((m) => m.threshold !== null && !["M21", "M22"].includes(m.metricId))) {
      const row = lines.find((l) => l.startsWith(`| ${metric.metricId} |`));
      expect(row?.split(" | ")[2]).toBe(metric.passCriteria);
    }
  });
});

/**
 * rv1 갈래 bc_p_eq_r_extend — Recall 목표 0.9842(넷째 자리 목표, 정해진 것 7), Precision 원값 = Recall 원값 0.984375(이진에서 FP = FN).
 * Recall 은 판정 대상이라 늘린 표기 0.9844, Precision(참고 지표)은 같은 원값이니 같은 글자 0.9844 여야 한다(D2).
 */
function pEqRExtend(): { data: FinalReportData; raw: F1ThresholdGainRawEd4 } {
  const data = structuredClone(loadEd4("bc_strong", "final"));
  const recall = data.kpiResults.find((r) => r.metricId === "M3")!;
  const precision = data.kpiResults.find((r) => r.metricId === "M2")!;
  recall.threshold = 0.9842;
  data.metricList.find((m) => m.metricId === "M3")!.threshold = 0.9842;
  precision.value = recall.value;
  expect(precision.threshold).toBeNull();
  const raw: F1ThresholdGainRawEd4 = {
    bestThresholdText: "0.6166",
    maxF1: 0.984375,
    currentF1: data.kpiResults.find((r) => r.metricId === "M4")!.value,
    gain: 0.0076,
    bestRecall: 0.984375,
    bestPrecision: 0.984375,
    currentRecall: recall.value,
    currentPrecision: precision.value,
  };
  const ed3 = { max_f1: 0.9844, current_f1: 0.9767, gain: 0.0076, best_threshold: 0.6166, notable: false };
  data.edition4Values!.thresholdTable = buildThresholdTableEd4(raw, ed3, data.kpiResults, data.meta.derivedPrediction);
  return { data, raw };
}

describe("지적 3 — 같은 수는 같은 글자(4.3·4.4·4.6, 사실 시트)", () => {
  it("bc_p_eq_r_extend: Precision 원값 0.984375 가 4.3·4.4(지금·F1 최대 칸)·4.6 에서 모두 0.9844", () => {
    const { data } = pEqRExtend();
    const text = screenText(data);
    const at43 = between(text, "4.3 지표별 결과", "4.4 오분류");
    expect(at43).toContain("| M3 | Recall (핵심) | 0.9844 | [0.917, 0.997] | ≥ 0.9842 | 합격 | 작음");
    expect(at43).toContain("| M2 | Precision | 0.9844 | — | — | 참고 지표 | —");
    const at44 = between(text, "4.4 오분류", "4.5 데이터 분포");
    const precision44 = at44.filter((l) => l.startsWith("| Precision |"));
    expect(precision44).toEqual(["| Precision | 0.9844 | 0.9844"]);
    expect(at44.filter((l) => l.startsWith("| Recall |"))).toEqual(["| Recall | 0.9844 | 0.9844"]);
    const at46 = between(text, "4.6 참조 범위 비교", "4.7 곡선");
    const precision46 = at46.filter((l) => l.startsWith("| Precision |"));
    expect(precision46).toHaveLength(1);
    expect(precision46[0].split(" | ")[1]).toBe("0.9844");
  });

  it("사실 시트 *_text 가 4.4 표와 같은 글자(같은 cells)", () => {
    const { data, raw } = pEqRExtend();
    const sheet = f1ThresholdGainTextsEd4(raw, data.kpiResults, "fn");
    const rows = data.edition4Values!.thresholdTable!.rows;
    expect(sheet.current_precision_text).toBe("0.9844");
    expect(sheet.best_precision_text).toBe("0.9844");
    expect(rows.find((r) => r.metricId === "M2")).toMatchObject({ current: sheet.current_precision_text, best: sheet.best_precision_text });
    expect(rows.find((r) => r.metricId === "M3")).toMatchObject({ current: sheet.current_recall_text, best: sheet.best_recall_text });
    expect(rows.find((r) => r.metricId === "M4")).toMatchObject({ current: sheet.current_f1_text, best: sheet.max_f1_text });
  });

  it("같은 원값이 아니면 셋째 자리 그대로(bc_strong 4.6 Precision 0.969)", () => {
    const at46 = between(screenText(loadEd4("bc_strong", "final")), "4.6 참조 범위 비교", "4.7 곡선");
    expect(at46.find((l) => l.startsWith("| Precision |"))?.split(" | ")[1]).toBe("0.969");
  });
});
