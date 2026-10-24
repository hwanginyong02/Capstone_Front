/**
 * 판 4 F1 최대 임계값(S3 ⑥⑦, 대응표 26) — 판 4 전용 파서, 4.4 임계값 표, 사실 시트 판 4 칸(`*_text`·`risk_side`).
 *
 * - 지금 값은 지표 결과(KPI) 값(4.3 과 같은 글자), 그 점의 값은 응답의 반올림 전 값.
 * - 판정 대상 지표면 그 목표로 늘린 표기, 아니면 셋째 자리. 위험 쪽 지표의 충족은 반올림 전 값으로.
 * - 판 3 파서(`parseF1ThresholdGain`)는 새 칸을 읽지 않는다(그대로).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { F1ThresholdGain, KpiResult } from "../../../types/finalReport.types";
import { parseF1ThresholdGain } from "../problemList";
import {
  buildThresholdTableEd4,
  f1ThresholdGainTextsEd4,
  gainTextEd4,
  parseF1ThresholdGainEd4,
} from "./thresholdGainEd4";

const NEW_RESPONSE = JSON.parse(
  readFileSync(resolve(__dirname, "../../../test/edition4/evaluateNewKeys/bc_strong.evaluate.json"), "utf8"),
);
const RAW_GAIN = NEW_RESPONSE.results.success_metrics.f1_threshold_gain;

function kpi(over: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.98, threshold: 0.95, status: "pass", higherIsBetter: true, ...over };
}

/** bc_strong 지표 결과 — M3·M4 판정 대상, M2 참고 지표. */
const BC_KPIS: KpiResult[] = [
  kpi({ metricId: "M2", name: "Precision", value: 0.9692307692307692, threshold: null }),
  kpi({ metricId: "M3", name: "Recall", value: 0.984375, threshold: 0.97, isCore: true }),
  kpi({ metricId: "M4", name: "F1 Score", value: 0.9767441860465116, threshold: 0.95 }),
];

const ed3 = parseF1ThresholdGain(RAW_GAIN)!;
const raw = parseF1ThresholdGainEd4(RAW_GAIN, ed3)!;

describe("판 4 전용 파서", () => {
  it("bc_strong 새 응답 — 반올림 전 값과 엔진 임계값 표기", () => {
    expect(raw).toEqual({
      bestThresholdText: "0.6166",
      maxF1: 0.984375,
      currentF1: 0.9767441860465116,
      gain: 0.007630813953488413,
      bestRecall: 0.984375,
      bestPrecision: 0.984375,
      currentRecall: 0.984375,
      currentPrecision: 0.9692307692307692,
    });
  });

  it("판 3 파서는 새 칸을 읽지 않는다(판 3 데이터에 새지 않게)", () => {
    expect(Object.keys(ed3).sort()).toEqual(["best_threshold", "current_f1", "gain", "gain_text", "max_f1", "notable"]);
  });

  it("판 3 쪽이 null 이면 null, 옛 응답(새 칸 없음)이면 넷째 자리 칸으로 대신하고 표기·R·P 는 null", () => {
    expect(parseF1ThresholdGainEd4(RAW_GAIN, null)).toBeNull();
    const old = { max_f1: 0.9844, current_f1: 0.9767, gain: 0.0076, best_threshold: 0.6166, notable: false, gain_text: "0.0076" };
    expect(parseF1ThresholdGainEd4(old, parseF1ThresholdGain(old))).toEqual({
      bestThresholdText: null,
      maxF1: 0.9844,
      currentF1: 0.9767,
      gain: 0.0076,
      bestRecall: null,
      bestPrecision: null,
      currentRecall: null,
      currentPrecision: null,
    });
  });

  it("임계값 표기가 숫자 꼴이 아니면(지수 꼴 repr 등) 싣지 않는다", () => {
    expect(parseF1ThresholdGainEd4({ ...RAW_GAIN, best_threshold_text: "1e-05" }, ed3)!.bestThresholdText).toBeNull();
  });
});

describe("4.4 임계값 표 — RPT-2026-0001 예시본 그대로", () => {
  it("머리·세 줄·상승폭", () => {
    expect(buildThresholdTableEd4(raw, ed3, BC_KPIS, { method: "threshold", threshold: 0.5, source_columns: ["s"], target_role: "y_pred" })).toEqual({
      current: { kind: "threshold", thresholdText: "0.5" },
      bestThresholdText: "0.6166",
      rows: [
        { metricId: "M4", name: "F1 Score", current: "0.977", best: "0.984" },
        { metricId: "M3", name: "Recall", current: "0.984", best: "0.984" },
        { metricId: "M2", name: "Precision", current: "0.969", best: "0.984" },
      ],
      gainText: "0.008",
    });
  });

  it("예측값을 직접 냈으면 지금 칸 머리는 부록 B15 표지", () => {
    expect(buildThresholdTableEd4(raw, ed3, BC_KPIS, undefined).current).toEqual({ kind: "submitted" });
  });

  it("지금 값은 KPI 값 — 응답의 current_*_raw 와 달라도 KPI 를 따른다(같은 값 두 자리가 같은 글자)", () => {
    const kpis = BC_KPIS.map((r) => (r.metricId === "M3" ? { ...r, value: 0.9711 } : r));
    expect(buildThresholdTableEd4(raw, ed3, kpis, undefined).rows[1].current).toBe("0.971");
  });

  it("지표를 고르지 않았거나 산출 실패면 응답의 지금 값(셋째 자리)", () => {
    const kpis = [kpi({ metricId: "M3", name: "Recall", status: "unavailable", value: 0, threshold: 0.97 })];
    const rows = buildThresholdTableEd4(raw, ed3, kpis, undefined).rows;
    expect(rows.map((r) => r.current)).toEqual(["0.977", "0.984", "0.969"]);
  });

  it("판정 대상 지표면 그 목표로 늘린 표기 — 그 점의 Recall 0.9696 · 목표 0.97 미달 → '0.9696'", () => {
    const r = { ...raw, bestRecall: 0.9696 };
    expect(buildThresholdTableEd4(r, ed3, BC_KPIS, undefined).rows[1].best).toBe("0.9696");
    // 판정 대상이 아니면(목표 없음) 같은 값도 셋째 자리.
    const noTarget = BC_KPIS.map((k) => (k.metricId === "M3" ? { ...k, threshold: null } : k));
    expect(buildThresholdTableEd4(r, ed3, noTarget, undefined).rows[1].best).toBe("0.970");
  });

  it("상승폭은 반올림 전 값으로 judged(0.1) — 기준 쪽은 엔진 판정(notable) 하나를 따른다", () => {
    const notable: F1ThresholdGain = { ...ed3, notable: true };
    // 0.09996 은 셋째 자리로 0.100 이라 '0.1 이상'으로 읽힌다 — 부적합 아님이면 늘린다.
    expect(gainTextEd4({ ...raw, gain: 0.09996 }, { ...ed3, notable: false })).toBe("0.09996");
    // 엔진이 부적합이라 했으면(판정 지점 하나) 그 쪽으로 읽히는 셋째 자리 그대로.
    expect(gainTextEd4({ ...raw, gain: 0.09996 }, notable)).toBe("0.100");
    // notable 이 없는 옛 응답은 넷째 자리 gain ≥ 0.1.
    const { notable: _n, ...oldEd3 } = ed3;
    expect(gainTextEd4({ ...raw, gain: 0.09996 }, { ...oldEd3, gain: 0.1 })).toBe("0.100");
    expect(gainTextEd4({ ...raw, gain: 0.10004 }, notable)).toBe("0.100");
    expect(gainTextEd4({ ...raw, gain: 0.0076 }, ed3)).toBe("0.008");
  });
});

describe("사실 시트 판 4 칸 — 계약 bc_strong 값", () => {
  it("값 글자와 위험 쪽 지표(FN → Recall)", () => {
    expect(f1ThresholdGainTextsEd4(raw, BC_KPIS, "fn")).toEqual({
      best_threshold_text: "0.6166",
      max_f1_text: "0.984",
      current_f1_text: "0.977",
      best_recall_text: "0.984",
      best_precision_text: "0.984",
      current_recall_text: "0.984",
      current_precision_text: "0.969",
      risk_side: { side: "fn", metric_id: "M3", display_name: "Recall", meets_target_now: true, meets_target_at_best: true },
    });
  });

  it("FP → Precision, 판정 대상이 아니면 충족 둘 다 null", () => {
    expect(f1ThresholdGainTextsEd4(raw, BC_KPIS, "fp").risk_side).toEqual({
      side: "fp",
      metric_id: "M2",
      display_name: "Precision",
      meets_target_now: null,
      meets_target_at_best: null,
    });
  });

  it("비슷함·선언 없음이면 null", () => {
    expect(f1ThresholdGainTextsEd4(raw, BC_KPIS, "similar").risk_side).toBeNull();
    expect(f1ThresholdGainTextsEd4(raw, BC_KPIS, null).risk_side).toBeNull();
  });

  it("그 점에서 위험 쪽 지표가 목표 아래로 내려가면 meets_target_at_best = false(반올림 전 값 — 0.96999999 는 미달)", () => {
    const side = f1ThresholdGainTextsEd4({ ...raw, bestRecall: 0.96999999 }, BC_KPIS, "fn");
    expect(side.risk_side).toMatchObject({ meets_target_now: true, meets_target_at_best: false });
    expect(side.best_recall_text).toBe("0.969999");
  });

  it("지금 충족은 지표 판정 그대로 — 미달 지표면 false", () => {
    const kpis = BC_KPIS.map((r) => (r.metricId === "M3" ? { ...r, value: 0.96, status: "fail" as const } : r));
    expect(f1ThresholdGainTextsEd4(raw, kpis, "fn").risk_side).toMatchObject({ meets_target_now: false, meets_target_at_best: true });
  });

  it("값이 없는 칸은 null(옛 응답)", () => {
    const old = { ...raw, bestRecall: null, bestPrecision: null, bestThresholdText: null };
    const t = f1ThresholdGainTextsEd4(old, [], "fn");
    expect([t.best_threshold_text, t.best_recall_text, t.best_precision_text, t.current_recall_text]).toEqual([null, null, null, "0.984"]);
    expect(t.risk_side).toEqual({ side: "fn", metric_id: "M3", display_name: "Recall", meets_target_now: null, meets_target_at_best: null });
  });
});
