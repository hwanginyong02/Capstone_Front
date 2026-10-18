/**
 * 재료 선택 점검 1층 재확인 — 검증 화면 "다음"이 끝난 단계로 돌아가 필수 칸을 지운 경우를 막는다
 * (입력 설계 › 재료 선택 점검 4.1·6절 "1층이 빠지면 성적서를 만들 수 없다").
 */
import { describe, expect, it } from "vitest";

import { FILLED_LAYER_ONE } from "../../test/layerOneFixture";
import { layerOneGaps, type LayerOneSource } from "./layerOne";


describe("1층 빈칸", () => {
  it("모두 채우면 빈칸 없음", () => {
    expect(layerOneGaps(FILLED_LAYER_ONE)).toEqual([]);
  });

  it("의뢰자 정보·모델명을 지우면 그 단계를 단계 순서대로 알린다", () => {
    const gaps = layerOneGaps({
      ...FILLED_LAYER_ONE,
      basicInfo: { ...FILLED_LAYER_ONE.basicInfo, companyName: "", modelName: "  " },
    });
    expect(gaps).toEqual([
      { stepId: "clientInfo", label: "의뢰자 정보" },
      { stepId: "model", label: "평가 대상 모델" },
    ]);
  });

  it("선언(평가 관점)이 비면 막는다 — 3층의 기준점이다", () => {
    const gaps = layerOneGaps({ ...FILLED_LAYER_ONE, composerPerspective: { usageMode: { text: "Batch" } } });
    expect(gaps.map((gap) => gap.stepId)).toEqual(["perspective"]);
  });

  it("지표가 없거나 목표값이 틀리면 막는다 — 판정이 없으면 성적서가 성립하지 않는다", () => {
    expect(layerOneGaps({ ...FILLED_LAYER_ONE, selectedMetricIds: [] }).map((gap) => gap.stepId)).toEqual(["metrics"]);
    expect(
      layerOneGaps({
        ...FILLED_LAYER_ONE,
        metricDetails: { M1: { targetValue: "1.5" } as LayerOneSource["metricDetails"][string] },
      }).map((gap) => gap.stepId),
    ).toEqual(["metrics"]);
  });

  it("Fβ 를 골랐는데 β 가 틀리면 막는다", () => {
    const withFbeta = {
      ...FILLED_LAYER_ONE,
      selectedMetricIds: ["M1", "M5"],
      metricDetails: {
        M1: { targetValue: "0.8" },
        M5: { targetValue: "0.7", beta: "0" },
      } as unknown as LayerOneSource["metricDetails"],
    };
    expect(layerOneGaps(withFbeta).map((gap) => gap.stepId)).toEqual(["metrics"]);
    expect(
      layerOneGaps({
        ...withFbeta,
        metricDetails: { ...withFbeta.metricDetails, M5: { targetValue: "0.7", beta: "2" } } as unknown as LayerOneSource["metricDetails"],
      }),
    ).toEqual([]);
  });
});
