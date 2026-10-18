/**
 * 95% 신뢰구간 — 응답 읽기, 판정 대상에만 붙이기, 6.0 방식 한 줄(서술 설계 D29).
 *
 * 엔진은 고른 지표 전부를 계산한다. 성적서에는 판정 대상 지표(`isJudged`)에만 붙는다 — 목표값이
 * 없는 정보성 지표나 계산 실패 지표에 구간을 찍으면, 판정과 무관한 숫자가 판정 근거처럼 보인다.
 */
import { describe, expect, it } from "vitest";

import type { KpiResult } from "../../types/finalReport.types";
import {
  attachConfidenceIntervals,
  confidenceIntervalNote,
  parseConfidenceIntervals,
} from "./confidenceIntervals";

function kpi(p: Partial<KpiResult>): KpiResult {
  return { metricId: "M1", name: "Accuracy", value: 0.8, threshold: 0.7, status: "pass", ...p };
}

const RAW = {
  M1: { low: 0.4902, high: 0.9433, method: "wilson", level: 0.95 },
  M2: { low: 0.61, high: 0.88, method: "wilson", level: 0.95 },
  M4: {
    low: 0.71,
    high: 0.83,
    method: "bootstrap_multinomial",
    level: 0.95,
    n_resamples: 2000,
    seed: 4213,
  },
  M10: { low: null, high: null, method: "skipped", level: 0.95, reason: "양성 표본이 없어 계산할 수 없다" },
  M19: { low: 0.31, high: 0.42, method: "normal", level: 0.95 },
};

describe("parseConfidenceIntervals", () => {
  it("계산한 구간과 생략 사유를 읽는다", () => {
    const parsed = parseConfidenceIntervals(RAW)!;
    expect(parsed.M1).toEqual({ low: 0.4902, high: 0.9433, method: "wilson" });
    expect(parsed.M4).toEqual({ low: 0.71, high: 0.83, method: "bootstrap_multinomial", nResamples: 2000, seed: 4213 });
    expect(parsed.M10).toEqual({ low: null, high: null, method: "skipped", reason: "양성 표본이 없어 계산할 수 없다" });
  });

  it("키가 없거나 모양이 틀리면 null", () => {
    expect(parseConfidenceIntervals(undefined)).toBeNull();
    expect(parseConfidenceIntervals([])).toBeNull();
    expect(parseConfidenceIntervals({})).toBeNull();
  });

  it("모양이 틀린 항목은 그 항목만 버린다 — 모르는 방식, 95% 가 아닌 수준, 뒤집힌 구간, 숫자 아님", () => {
    const parsed = parseConfidenceIntervals({
      M1: RAW.M1,
      M2: { low: 0.1, high: 0.2, method: "jackknife", level: 0.95 },
      M3: { low: 0.1, high: 0.2, method: "wilson", level: 0.9 },
      M4: { low: 0.3, high: 0.2, method: "wilson", level: 0.95 },
      M5: { low: "0.1", high: 0.2, method: "wilson", level: 0.95 },
    })!;
    expect(Object.keys(parsed)).toEqual(["M1"]);
  });
});

describe("attachConfidenceIntervals — 판정 대상에만", () => {
  const intervals = parseConfidenceIntervals(RAW);

  it("판정 대상 지표에 low·high·method 를 붙인다(목표값 0 도 판정 대상)", () => {
    const [m1, m19] = attachConfidenceIntervals(
      [kpi({ metricId: "M1" }), kpi({ metricId: "M19", threshold: 0, higherIsBetter: false })],
      intervals,
    );
    expect(m1.ci).toEqual({ low: 0.4902, high: 0.9433, method: "wilson" });
    expect(m19.ci).toEqual({ low: 0.31, high: 0.42, method: "normal" });
  });

  it("목표값이 없는 지표·계산 실패 지표에는 엔진이 구간을 냈어도 붙이지 않는다", () => {
    const [info, failed] = attachConfidenceIntervals(
      [kpi({ metricId: "M1", threshold: null }), kpi({ metricId: "M2", status: "unavailable" })],
      intervals,
    );
    expect(info).not.toHaveProperty("ci");
    expect(failed).not.toHaveProperty("ci");
  });

  it("계산을 생략한 지표와 응답에 없는 지표는 그대로", () => {
    const rows = [kpi({ metricId: "M10" }), kpi({ metricId: "M3" })];
    const out = attachConfidenceIntervals(rows, intervals);
    expect(out[0]).not.toHaveProperty("ci");
    expect(out[1]).not.toHaveProperty("ci");
  });

  it("구간이 없는 평가는 지표를 그대로 돌려준다", () => {
    const rows = [kpi({})];
    expect(attachConfidenceIntervals(rows, null)).toBe(rows);
  });
});

describe("confidenceIntervalNote — 6.0 방식 한 줄", () => {
  const intervals = parseConfidenceIntervals(RAW);
  const note = (rows: KpiResult[]) => confidenceIntervalNote(attachConfidenceIntervals(rows, intervals), intervals);

  it("실제로 쓴 방식만, 지표 표 순서대로 묶어 적는다", () => {
    expect(note([kpi({ metricId: "M4" }), kpi({ metricId: "M1" }), kpi({ metricId: "M2" })])).toBe(
      "판정 대상 지표의 95% 신뢰구간은 다항 재표집 부트스트랩(2,000회, 시드 4213, 백분위 구간; M4), " +
        "Wilson 점수 구간(M1, M2)으로 산출하였습니다.",
    );
  });

  it("조사는 마지막 방식 이름의 받침에 맞춘다", () => {
    expect(note([kpi({ metricId: "M19", threshold: 0.5, higherIsBetter: false })])).toBe(
      "판정 대상 지표의 95% 신뢰구간은 정규근사(M19)로 산출하였습니다.",
    );
  });

  it("판정 대상인데 계산을 생략한 지표는 사유를 덧붙인다", () => {
    expect(note([kpi({ metricId: "M1" }), kpi({ metricId: "M10" })])).toBe(
      "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1)으로 산출하였습니다. " +
        "다음 지표는 신뢰구간을 산출하지 않았습니다: M10(양성 표본이 없어 계산할 수 없다).",
    );
  });

  it("판정 대상이 아닌 지표의 구간은 방식 한 줄에도 넣지 않는다", () => {
    expect(note([kpi({ metricId: "M1" }), kpi({ metricId: "M4", threshold: null })])).toBe(
      "판정 대상 지표의 95% 신뢰구간은 Wilson 점수 구간(M1)으로 산출하였습니다.",
    );
  });

  it("판정 대상에 붙은 구간이 하나도 없으면 null — 신뢰구간 열·고정 문구 3 을 찍지 않는다", () => {
    expect(note([kpi({ metricId: "M1", threshold: null }), kpi({ metricId: "M10" })])).toBeNull();
    expect(confidenceIntervalNote([kpi({})], null)).toBeNull();
  });
});
