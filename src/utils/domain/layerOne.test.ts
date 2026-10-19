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

describe("계산할 수 없게 된 지표 (B8 — 단계 표시줄로 지표 화면을 건너뛴 경우)", () => {
  const mapped = (...roles: string[]) =>
    roles.map((role) => ({
      originalName: role,
      sampleValues: [],
      inferredRole: role,
      confirmedRole: role,
      modified: false,
      warnings: [],
    })) as unknown as NonNullable<LayerOneSource["columnMapping"]>;
  const withAuroc: LayerOneSource = {
    ...FILLED_LAYER_ONE,
    selectedMetricIds: ["M1", "M9"],
    metricDetails: {
      M1: { targetValue: "0.8" },
      M9: { targetValue: "0.7" },
    } as unknown as LayerOneSource["metricDetails"],
  };

  it("AUROC 를 골랐는데 확률(score) 매핑이 없으면 지표 단계 하나와 이유를 돌려준다", () => {
    const gaps = layerOneGaps({ ...withAuroc, columnMapping: mapped("y_true", "y_pred") });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].stepId).toBe("metrics");
    expect(gaps[0].details).toHaveLength(1);
    expect(gaps[0].details![0]).toMatch(/^AUROC: .*\(score\).*계산할 수 없습니다\.$/);
  });

  it("매핑을 되돌리면(score 있음) 빈칸이 없다", () => {
    expect(layerOneGaps({ ...withAuroc, columnMapping: mapped("y_true", "y_pred", "score") })).toEqual([]);
  });

  it("매핑 확정 응답(가용 지표)이 있으면 그것이 정본이다", () => {
    const columnMapping = mapped("y_true", "y_pred", "score");
    expect(layerOneGaps({ ...withAuroc, columnMapping, availableMetricIds: ["M1"] })[0]?.details).toHaveLength(1);
    expect(layerOneGaps({ ...withAuroc, columnMapping, availableMetricIds: ["M1", "M9"] })).toEqual([]);
  });

  it("빈 매핑(시연)이나 매핑이 없으면 막지 않는다", () => {
    expect(layerOneGaps({ ...withAuroc, columnMapping: [] })).toEqual([]);
    expect(layerOneGaps(withAuroc)).toEqual([]);
  });

  it("다른 이유로 막혔으면 이유 줄은 없다", () => {
    const gaps = layerOneGaps({ ...withAuroc, selectedMetricIds: [], columnMapping: mapped("y_true", "y_pred") });
    expect(gaps).toEqual([{ stepId: "metrics", label: "지표와 합격 기준" }]);
  });
});
