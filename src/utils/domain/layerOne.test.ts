/**
 * 재료 선택 점검 1층 재확인 — 검증 화면 "다음"이 끝난 단계로 돌아가 필수 칸을 지운 경우를 막는다
 * (입력 설계 › 재료 선택 점검 4.1·6절 "1층이 빠지면 성적서를 만들 수 없다").
 */
import { describe, expect, it } from "vitest";

import { FILLED_LAYER_ONE } from "../../test/layerOneFixture";
import { layerOneGaps, screenRuleGaps, type LayerOneSource, type ScreenRuleSource } from "./layerOne";


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

describe("1층 선언 — 글만으로는 답이 아니다(셈 규칙)", () => {
  it("중요 오류 유형에 글만 쓰면 평가 관점으로 막는다", () => {
    const gaps = layerOneGaps({
      ...FILLED_LAYER_ONE,
      composerPerspective: { criticalErrorType: { note: "놓치면 큰일" }, usageMode: { text: "Batch" } },
    });
    expect(gaps.map((gap) => gap.stepId)).toEqual(["perspective"]);
  });
});

/**
 * ⑥~⑨ 화면 규칙 재확인(서술 라운드 B, 점검 나-16) — 빈칸이 아닌 규칙만 막는다. 각 규칙을 따로 걸어 본다(한 규칙이
 * 다른 규칙을 가리지 않게). 빈칸(2층)은 막지 않는다.
 */
describe("⑥~⑨ 화면 규칙 재확인 — screenRuleGaps", () => {
  const OFF = { trainingData: false, testData: false, groundTruth: false, modelEnv: false };
  const base: ScreenRuleSource = {
    taskType: "binary",
    composerCards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
    composerTrainingData: {},
    composerTestData: {},
    composerGroundTruth: {},
    composerModelEnv: {},
  };
  const detailsOf = (patch: Partial<ScreenRuleSource>) => screenRuleGaps({ ...base, ...patch });

  it("모두 비어 있으면(2층 빈칸) 막지 않는다", () => {
    expect(screenRuleGaps(base)).toEqual([]);
  });

  it("⑥ 표본 수가 정수가 아니면 학습 데이터에서 고치게 한다", () => {
    expect(detailsOf({ composerTrainingData: { trainingVolume: { entries: [{ key: "Training", value: "12.5" }] } } })).toEqual([
      { stepId: "trainingData", label: "학습 데이터", details: ["데이터 양: 0 이상의 정수로 적어 주세요."], invalid: true },
    ]);
  });

  it("⑥ 배타 선택지(알려진 것 없음 + 다른 것)", () => {
    const gaps = detailsOf({ composerTrainingData: { channelEffects: { choices: ["None known", "Different equipment"] } } });
    expect(gaps[0].details).toEqual(["수집 방식 차이(채널 효과): 다른 선택지와 함께 고를 수 없는 답을 함께 골랐습니다."]);
  });

  it("⑥ 클래스별 데이터 양을 일부만 적으면 막고, 하나도 안 적으면 막지 않는다", () => {
    const withClasses = {
      columnMapping: [
        { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
      ] as never,
      metadata: { column_unique_values: { label: ["0", "1"] } } as never,
    };
    const partial = detailsOf({ ...withClasses, composerTrainingData: { trainingClassVolume: { entries: [{ key: "0", value: "10" }] } } });
    expect(partial[0].details).toEqual(["클래스별 데이터 양: 클래스마다 모두 적어 주세요(일부만 적었습니다)."]);
    expect(detailsOf({ ...withClasses, composerTrainingData: { trainingClassVolume: { entries: [] } } })).toEqual([]);
  });

  it("⑦ 수집 기간 역전", () => {
    const gaps = detailsOf({
      composerTestData: { testPeriod: { entries: [{ key: "From", value: "2025-05" }, { key: "To", value: "2025-01" }] } },
    });
    expect(gaps.map((gap) => gap.stepId)).toEqual(["testData"]);
    expect(gaps[0].details).toEqual(["수집 기간: 시작 월과 끝 월을 모두 넣고, 시작 월이 끝 월보다 늦지 않게 하세요."]);
  });

  it("⑧ 라벨러 수 범위·맞지 않는 일치도 종류", () => {
    const gaps = detailsOf({
      composerGroundTruth: {
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "1" },
      },
    });
    expect(gaps[0].details).toEqual(["라벨러 수: 허용 범위를 벗어난 값입니다."]);
    const kappa = detailsOf({
      composerGroundTruth: {
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "3" },
        labelAgreementKind: { text: "Cohen's kappa" },
      },
    });
    expect(kappa[0].details).toEqual(["일치도 종류: Cohen의 카파는 두 사람을 비교합니다. 세 명 이상이면 Fleiss의 카파를 고르세요."]);
  });

  it("⑨ 같은 이름 하이퍼파라미터·이름과 값 한쪽만", () => {
    const dup = detailsOf({
      composerModelEnv: { hyperparameters: { entries: [{ key: "lr", value: "0.1" }, { key: "lr", value: "0.2" }] } },
    });
    expect(dup).toEqual([
      { stepId: "modelEnv", label: "모델 설정과 실행 환경", details: ["하이퍼파라미터: 같은 이름이 두 번 있어요: lr"], invalid: true },
    ]);
    const half = detailsOf({ composerModelEnv: { hyperparameters: { entries: [{ key: "lr", value: "" }] } } });
    expect(half[0].details).toEqual(["하이퍼파라미터: 이름과 값을 모두 적어 주세요."]);
  });

  it("넣지 않은 카드는 보지 않는다", () => {
    expect(
      screenRuleGaps({
        ...base,
        composerCards: OFF,
        composerModelEnv: { hyperparameters: { entries: [{ key: "lr", value: "0.1" }, { key: "lr", value: "0.2" }] } },
      }),
    ).toEqual([]);
  });
});
