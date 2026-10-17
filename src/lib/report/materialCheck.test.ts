/**
 * 재료 선택 점검(입력 설계 › 재료 선택 점검, 점검 표 1.0) — 8절 "입력 조합 테스트".
 *
 * 층마다 빠진 항목을 정확히 찾는지, "모름"은 빠짐·"알려진 것 없음"·"측정 안 함"은 제공으로 세는지,
 * 표지 문구가 실제 상태에 맞게 바뀌는지, 경계값(β·IR)과 결정성을 고정한다.
 */
import { describe, expect, it } from "vitest";

import { getRecommendedMetricIds, type TaskType } from "../../data/evaluationData";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import {
  AVERAGING_METRICS,
  HIGH_IMBALANCE_RATIO,
  MATERIAL_CHECK_VERSION,
  REPORTING_ITEMS,
  checkMaterialSelection,
  type MaterialCheckInput,
} from "./materialCheck";
import { NOT_PROVIDED, buildReportMaterials, type ReportComposerInput } from "./reportMaterials";

const FULL_COMPOSER: ReportComposerInput = {
  cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
  metrics: { metricRationale: { text: "Errors weighted evenly" } },
  perspective: {},
  trainingData: {
    trainingDatasetName: { text: "사내 데이터 v3" },
    trainingDataSource: { text: "운영 로그" },
    trainingVolume: { entries: [{ key: "Training", value: "8000" }, { key: "Validation", value: "2000" }] },
    trainingClassVolume: { entries: [{ key: "0", value: "6000" }, { key: "1", value: "2000" }] },
    channelEffects: { choices: ["None known"] },
    imbalanceHandling: { choices: ["Did nothing"] },
  },
  testData: {
    testDataSource: { text: "별도 수집" },
    testSourceRelation: { text: "Different source" },
  },
  groundTruth: {
    labelAuthor: { text: "Domain experts" },
    labelReview: { text: "Several reviewers" },
    labelReviewerCount: { text: "3" },
    labelAgreementKind: { text: "Not measured" },
  },
  modelEnv: {
    algorithm: { text: "XGBoost" },
    hyperparameters: { entries: [{ key: "max_depth", value: "6" }] },
    gpuUsage: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "No" }] },
  },
};

const FULL_SPEC = { os: "Ubuntu 22.04", cpu: "Xeon", gpu: "A100", memory: "64GB", software: "Python 3.12" };

function input(
  overrides: Partial<Omit<MaterialCheckInput, "materials">> & {
    composer?: Partial<ReportComposerInput>;
  } = {},
): MaterialCheckInput {
  const { composer, ...rest } = overrides;
  const taskType: TaskType = rest.taskType ?? "binary";
  const merged = { ...FULL_COMPOSER, ...composer };
  return {
    taskType,
    materials: buildReportMaterials(merged, taskType),
    systemSpec: FULL_SPEC,
    latencyMapped: true,
    perspective: rest.perspective ?? {},
    selectedMetricIds: ["M1"],
    beta: 1,
    imbalanceRatio: 2,
    distributionSource: "validation",
    ...rest,
  };
}

const answer = (fields: Record<string, string>): ComposerValueMap =>
  Object.fromEntries(Object.entries(fields).map(([id, text]) => [id, { text }]));

describe("점검 표 1.0 — 버전과 규칙 표를 리터럴로 고정 (판정이 바뀌면 주 버전을 올린다)", () => {
  it("버전", () => {
    expect(MATERIAL_CHECK_VERSION).toBe("1.0");
    expect(HIGH_IMBALANCE_RATIO).toBe(9);
  });

  it("2층 항목 번호와 이름", () => {
    expect(REPORTING_ITEMS.map((def) => [def.item, def.name])).toEqual([
      [1, "학습 데이터의 출처·크기·구성"],
      [2, "평가 데이터 출처"],
      [3, "편향 감소 노력"],
      [4, "정답 라벨 구축 방법"],
      [5, "정답 라벨 신뢰성"],
      [6, "대표 작동 지점의 TP·FP 건수"],
      [7, "추론 환경"],
      [8, "추론 효율성(지연시간)"],
      [9, "학습 데이터의 채널 효과"],
      [10, "하이퍼파라미터"],
      [11, "가속 사용"],
      [12, "멀티레이블 지표 선택 기준"],
    ]);
  });

  it("3번 줄 평균 방식 지표 세트", () => {
    expect(AVERAGING_METRICS).toEqual({
      multiclass: {
        "All equal": ["M2", "M3", "M4", "M5", "M11", "M22"],
        "Larger classes first": ["M13", "M22"],
        "Individual samples first": ["M1", "M12", "M22"],
      },
      multilabel: {
        "All equal": ["M2", "M3", "M4", "M5", "M22"],
        "Larger classes first": ["M22"],
        "Individual samples first": ["M22"],
      },
    });
  });
});

describe("2층 — 최소선 (분모: 이진·다중 11, 멀티레이블 12)", () => {
  it("모두 넣으면 11개 중 11개, 경고 없음, 표지는 '기준 표준'", () => {
    const result = checkMaterialSelection(input());
    expect(result.reporting.total).toBe(11);
    expect(result.reporting.provided).toBe(11);
    expect(result.warningIds).toEqual([]);
    expect(result.printed.cover).toBe("기준 표준: ISO/IEC TS 4213:2022");
    expect(result.printed.notProvided).toBeUndefined();
    expect(result.printed.impacts).toEqual([]);
  });

  it("다중 클래스도 분모 11, 멀티레이블은 12(지표 선택 기준)", () => {
    expect(checkMaterialSelection(input({ taskType: "multiclass" })).reporting.total).toBe(11);
    const multilabel = checkMaterialSelection(input({ taskType: "multilabel" }));
    expect(multilabel.reporting.total).toBe(12);
    expect(multilabel.reporting.provided).toBe(12);
  });

  it("카드를 모두 끄면 1·2·3·4·5·9·10·11 이 빠진다(6 은 시스템이 채움, 7·8 은 다른 출처)", () => {
    const result = checkMaterialSelection(
      input({ composer: { cards: { trainingData: false, testData: false, groundTruth: false, modelEnv: false } } }),
    );
    expect(result.reporting.items.filter((item) => !item.provided).map((item) => item.item)).toEqual([
      1, 2, 3, 4, 5, 9, 10, 11,
    ]);
    expect(result.reporting.provided).toBe(3);
    expect(result.printed.cover).toBe("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.4 참조)");
  });

  it("'모름'은 제공되지 않음으로 센다", () => {
    const result = checkMaterialSelection(
      input({
        composer: { groundTruth: { ...FULL_COMPOSER.groundTruth, labelAuthor: { text: "Domain experts", unknown: true } } },
      }),
    );
    expect(result.warningIds).toEqual(["reporting:4"]);
    expect(result.reporting.items.find((item) => item.item === 4)?.missing).toEqual(["정답 라벨 구축 방법"]);
  });

  it("채널 효과 '알려진 것 없음'·라벨 일치도 '측정 안 함'·편향 '수행 안 함'은 제공이다", () => {
    const result = checkMaterialSelection(input());
    for (const item of [3, 5, 9]) {
      expect(result.reporting.items.find((it) => it.item === item)?.provided).toBe(true);
    }
  });

  it("여러 칸 항목은 모든 칸이 있어야 제공 — 검증 샘플 수만 비어도 1번은 빠짐", () => {
    const result = checkMaterialSelection(
      input({
        composer: {
          trainingData: { ...FULL_COMPOSER.trainingData, trainingVolume: { entries: [{ key: "Training", value: "8000" }] } },
        },
      }),
    );
    expect(result.warningIds).toEqual(["reporting:1"]);
    expect(result.reporting.items[0].missing).toEqual(["검증 샘플 수"]);
  });

  it("목록 밖 권장 필드: 학습 데이터와의 관계는 2번, 알고리즘은 10번에 합친다", () => {
    const relation = checkMaterialSelection(
      input({ composer: { testData: { testDataSource: { text: "별도 수집" } } } }),
    );
    expect(relation.warningIds).toEqual(["reporting:2"]);
    const algorithm = checkMaterialSelection(
      input({ composer: { modelEnv: { ...FULL_COMPOSER.modelEnv, algorithm: { text: "", unknown: true } } } }),
    );
    expect(algorithm.warningIds).toEqual(["reporting:10"]);
    expect(algorithm.reporting.items.find((item) => item.item === 10)?.missing).toEqual(["알고리즘"]);
  });

  it("실행 환경(7번)은 다섯 칸이 모두 있어야 제공 — '제공되지 않음' 문자열을 빠짐으로 센다", () => {
    const result = checkMaterialSelection(input({ systemSpec: { ...FULL_SPEC, gpu: NOT_PROVIDED } }));
    expect(result.warningIds).toEqual(["reporting:7"]);
    expect(result.reporting.items.find((item) => item.item === 7)?.missing).toEqual(["GPU"]);
  });

  it("가속 칸이 '모름(Unknown)'이면 11번 빠짐", () => {
    const result = checkMaterialSelection(
      input({
        composer: {
          modelEnv: {
            ...FULL_COMPOSER.modelEnv,
            gpuUsage: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "Unknown" }] },
          },
        },
      }),
    );
    expect(result.warningIds).toEqual(["reporting:11"]);
  });

  it("지연시간(8번)은 사용 방식과 무관하게 센다 — 배치여도 빠짐", () => {
    const result = checkMaterialSelection(
      input({ latencyMapped: false, perspective: answer({ usageMode: "Batch" }) }),
    );
    expect(result.warningIds).toEqual(["reporting:8"]);
    expect(result.purpose.applicable).toBe(0);
  });

  it("멀티레이블 지표 선택 이유가 비면 12번 빠짐", () => {
    const result = checkMaterialSelection(input({ taskType: "multilabel", composer: { metrics: {} } }));
    expect(result.warningIds).toEqual(["reporting:12"]);
  });

  it("1.4 문장 — 빠진 항목 이름을 모아 적고, 영향 문장은 항목마다 한 줄", () => {
    const result = checkMaterialSelection(
      input({ latencyMapped: false, systemSpec: { ...FULL_SPEC, os: NOT_PROVIDED } }),
    );
    expect(result.printed.notProvided).toBe(
      "ISO/IEC TS 4213이 보고를 요구하는 항목 중 추론 환경, 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해 " +
        "기재하지 않았다. 따라서 본 결과서는 이 항목들에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
    );
    expect(result.printed.impacts).toEqual([
      "추론 환경: 결과가 어떤 하드웨어·소프트웨어에서 나왔는지 판단할 수 없다.",
      "추론 효율성(지연시간): 응답 속도가 용도에 맞는지 판단할 수 없다.",
    ]);
  });

  it("받침 없는 이름으로 끝나면 '는'", () => {
    const result = checkMaterialSelection(
      input({ composer: { modelEnv: { ...FULL_COMPOSER.modelEnv, hyperparameters: { entries: [] } } } }),
    );
    expect(result.printed.notProvided).toContain("하이퍼파라미터는 의뢰자로부터");
  });
});

describe("3층 — 목적별 점검 줄", () => {
  it("① 대화형인데 지연시간이 없으면 미충족 — 2층 8번과 같은 판정값", () => {
    const result = checkMaterialSelection(
      input({ latencyMapped: false, perspective: answer({ usageMode: "Real-time" }) }),
    );
    expect(result.warningIds).toEqual(["reporting:8", "purpose:latency"]);
    expect(result.purpose).toMatchObject({ applicable: 1, met: 0 });
    expect(result.printed.purposeShortfalls[0]).toContain('사용 방식을 "대화형(실시간)"으로 밝혔으나');
  });

  it("① 대화형이고 지연시간이 있으면 충족", () => {
    const result = checkMaterialSelection(input({ perspective: answer({ usageMode: "Real-time" }) }));
    expect(result.purpose).toMatchObject({ applicable: 1, met: 1 });
  });

  describe("② 이진 위험 방향", () => {
    const fn = answer({ criticalErrorType: "Missed (FN)" });
    const fp = answer({ criticalErrorType: "False alarm (FP)" });
    const met = (perspective: ComposerValueMap, ids: string[], beta = 1) =>
      checkMaterialSelection(input({ perspective, selectedMetricIds: ids, beta })).purpose.lines[0].met;

    it("FN → 재현율(M3) 또는 β > 1 인 Fβ", () => {
      expect(met(fn, ["M1"])).toBe(false);
      expect(met(fn, ["M3"])).toBe(true);
      expect(met(fn, ["M5"], 2)).toBe(true);
      expect(met(fn, ["M5"], 1)).toBe(false);
      expect(met(fn, ["M5"], 0.5)).toBe(false);
    });

    it("FP → 정밀도(M2) 또는 β < 1 인 Fβ", () => {
      expect(met(fp, ["M3"])).toBe(false);
      expect(met(fp, ["M2"])).toBe(true);
      expect(met(fp, ["M5"], 0.5)).toBe(true);
      expect(met(fp, ["M5"], 1)).toBe(false);
      expect(met(fp, ["M5"], 2)).toBe(false);
    });

    it("비슷함이면 적용되지 않는다(분모 0 → 해당 없음)", () => {
      const result = checkMaterialSelection(input({ perspective: answer({ criticalErrorType: "Similar" }) }));
      expect(result.purpose.applicable).toBe(0);
      expect(result.printed.summary[1]).toMatchObject({ label: "목적별 점검", value: "해당 없음" });
    });

    it("다중 클래스에는 위험 방향 줄이 없다(남은 선언 값이 있어도)", () => {
      const result = checkMaterialSelection(input({ taskType: "multiclass", perspective: fn }));
      expect(result.purpose.lines.map((line) => line.id)).toEqual([]);
    });
  });

  describe("③ 클래스 중요도 → 평균 방식", () => {
    const check = (taskType: TaskType, priority: string, ids: string[]) =>
      checkMaterialSelection(input({ taskType, perspective: answer({ classPriority: priority }), selectedMetricIds: ids }));

    it("다중: 동등은 매크로(M11)·클래스 평균 지표, 다수 우선은 가중(M13), 샘플 단위는 마이크로(M12·Accuracy)", () => {
      expect(check("multiclass", "All equal", ["M1"]).purpose.lines[0].met).toBe(false);
      expect(check("multiclass", "All equal", ["M11"]).purpose.lines[0].met).toBe(true);
      expect(check("multiclass", "Larger classes first", ["M11"]).purpose.lines[0].met).toBe(false);
      expect(check("multiclass", "Larger classes first", ["M13"]).purpose.lines[0].met).toBe(true);
      expect(check("multiclass", "Individual samples first", ["M1"]).purpose.lines[0].met).toBe(true);
    });

    it("M22 를 고르면 어느 답이든 충족(세 평균이 모두 있음)", () => {
      for (const priority of ["All equal", "Larger classes first", "Individual samples first"]) {
        expect(check("multiclass", priority, ["M22"]).purpose.lines[0].met).toBe(true);
        expect(check("multilabel", priority, ["M22"]).purpose.lines[0].met).toBe(true);
      }
    });

    it("멀티레이블: 다수 우선·샘플 단위는 M22 만 인정", () => {
      expect(check("multilabel", "Larger classes first", ["M2", "M3", "M4"]).purpose.lines[0].met).toBe(false);
      expect(check("multilabel", "All equal", ["M4"]).purpose.lines[0].met).toBe(true);
    });

    it("다중 클래스 미충족이면 5절 평균 방식 문장을 바꿔 찍는다", () => {
      const result = check("multiclass", "Larger classes first", ["M1"]);
      expect(result.printed.averagingSentence).toBe(
        '의뢰자가 클래스 중요도를 "다수 클래스 우선"으로 밝혔으나, 이에 맞는 가중 평균 지표는 시험 항목에 없다(1.4 참조).',
      );
      expect(result.printed.purposeShortfalls).toEqual([
        '의뢰자가 클래스 중요도를 "다수 클래스 우선"으로 밝혔으나, 이에 맞는 가중 평균 지표가 시험 항목에 없다.',
      ]);
      expect(check("multiclass", "Larger classes first", ["M13"]).printed.averagingSentence).toBeUndefined();
      // 멀티레이블에는 5절 평균 방식 문장이 없다(고정 문구 4 는 다중 클래스만).
      expect(check("multilabel", "Larger classes first", ["M4"]).printed.averagingSentence).toBeUndefined();
    });

    it("'모름'으로 답했으면 적용되지 않는다", () => {
      const result = checkMaterialSelection(
        input({ taskType: "multiclass", perspective: { classPriority: { text: "All equal", unknown: true } } }),
      );
      expect(result.purpose.applicable).toBe(0);
    });
  });

  describe("④ 큰 불균형(IR > 9) + 곡선 지표 → AUPRC", () => {
    const check = (ids: string[], ratio: number | null) =>
      checkMaterialSelection(input({ selectedMetricIds: ids, imbalanceRatio: ratio }));

    it("IR 은 3절과 같은 자릿수로 비교한다 — 9.004 는 적용 안 됨, 9.006 은 적용", () => {
      expect(check(["M9"], 9.004).purpose.applicable).toBe(0);
      expect(check(["M9"], 9.006).purpose.lines[0]).toMatchObject({ id: "curveImbalance", met: false });
    });

    it("AUPRC(M10)를 고르면 충족, 곡선 지표를 안 골랐으면 적용 안 됨, IR 을 모르면 적용 안 됨", () => {
      expect(check(["M9", "M10"], 12).purpose.lines[0].met).toBe(true);
      // AUPRC 만 골라도 곡선 지표를 고른 것이라 줄이 적용되고, 충족이다.
      expect(check(["M10"], 12).purpose).toMatchObject({ applicable: 1, met: 1 });
      expect(check(["M1"], 12).purpose.applicable).toBe(0);
      expect(check(["M9"], null).purpose.applicable).toBe(0);
    });

    it("미충족 문장에 IR 을 3절 자릿수로 적는다", () => {
      expect(check(["M9"], 12.345).printed.purposeShortfalls[0]).toContain("불균형 비율(IR)이 12.35로 9를 넘고");
    });
  });
});

describe("추천대로 고르면 점검은 통과한다 (6절 '추천 세트')", () => {
  it.each([
    ["binary", answer({ criticalErrorType: "Missed (FN)", usageMode: "Batch" })],
    ["binary", answer({ criticalErrorType: "False alarm (FP)", usageMode: "Batch" })],
    ["multiclass", answer({ classPriority: "Larger classes first", usageMode: "Batch" })],
    ["multiclass", answer({ classPriority: "Individual samples first", usageMode: "Batch" })],
    ["multilabel", answer({ classPriority: "Larger classes first", usageMode: "Batch" })],
  ] as const)("%s 추천 세트", (taskType, perspective) => {
    const result = checkMaterialSelection(
      input({ taskType, perspective, selectedMetricIds: getRecommendedMetricIds(taskType) }),
    );
    expect(result.purpose.lines.length).toBeGreaterThan(0);
    expect(result.purpose.lines.every((line) => line.met)).toBe(true);
  });

  it("미충족 줄의 추천 지표를 넣으면 그 줄이 충족된다", () => {
    const cases: Array<[TaskType, ComposerValueMap, number]> = [
      ["binary", answer({ criticalErrorType: "Missed (FN)" }), 2],
      ["binary", answer({ criticalErrorType: "False alarm (FP)" }), 2],
      ["binary", {}, 12],
      ["multiclass", answer({ classPriority: "All equal" }), 2],
      ["multiclass", answer({ classPriority: "Larger classes first" }), 2],
      ["multiclass", answer({ classPriority: "Individual samples first" }), 2],
      ["multilabel", answer({ classPriority: "Individual samples first" }), 2],
    ];
    for (const [taskType, perspective, ratio] of cases) {
      const before = checkMaterialSelection(
        input({ taskType, perspective, selectedMetricIds: ["M9"], imbalanceRatio: ratio }),
      );
      const unmet = before.purpose.lines.filter((line) => !line.met);
      expect(unmet.length).toBe(1);
      const after = checkMaterialSelection(
        input({ taskType, perspective, selectedMetricIds: ["M9", ...unmet[0].recommended], imbalanceRatio: ratio }),
      );
      expect(after.purpose.lines.every((line) => line.met)).toBe(true);
    }
  });
});

describe("진행 기록 (6절) — 버전이 같고 지금 경고를 모두 담은 기록만 인정", () => {
  const warned = input({ latencyMapped: false, perspective: answer({ usageMode: "Real-time" }) });
  const at = "2026-10-17T05:03:00.000Z";

  it("경고가 없으면 기록이 없어도 '안내할 부족 없음'", () => {
    expect(checkMaterialSelection(input()).printed.summary[2]).toEqual({
      label: "생성 전 안내 확인",
      value: "안내할 부족 없음",
      note: "점검 표 1.0",
    });
  });

  it("경고가 있고 기록이 없으면 '확인 기록 없음'", () => {
    const result = checkMaterialSelection(warned);
    expect(result.acknowledgement).toBeNull();
    expect(result.printed.summary[2].value).toBe("확인 기록 없음");
  });

  it("지금 경고를 모두 담은 같은 버전 기록이면 인정하고 시각(KST)을 찍는다", () => {
    const result = checkMaterialSelection({
      ...warned,
      ack: { at, version: "1.0", warningIds: ["reporting:8", "purpose:latency"] },
    });
    expect(result.acknowledgement).toEqual({ at, version: "1.0" });
    expect(result.printed.summary[2].value).toBe("확인 후 진행 (2026-10-17 14:03)");
  });

  it("기록에 없는 경고가 생겼거나 버전이 다르면 인정하지 않는다", () => {
    expect(
      checkMaterialSelection({ ...warned, ack: { at, version: "1.0", warningIds: ["reporting:8"] } }).acknowledgement,
    ).toBeNull();
    expect(
      checkMaterialSelection({
        ...warned,
        ack: { at, version: "0.9", warningIds: ["reporting:8", "purpose:latency"] },
      }).acknowledgement,
    ).toBeNull();
  });
});

describe("6.0 세 줄과 결정성", () => {
  it("보고 항목·목적별 점검 줄의 값과 비고", () => {
    const result = checkMaterialSelection(
      input({
        latencyMapped: false,
        perspective: answer({ usageMode: "Real-time", criticalErrorType: "Missed (FN)" }),
        selectedMetricIds: ["M3"],
      }),
    );
    expect(result.printed.summary.slice(0, 2)).toEqual([
      { label: "보고 항목 제공", value: "11개 중 10개", note: "빠진 항목: 추론 효율성(지연시간) (1.4 참조)" },
      { label: "목적별 점검", value: "2줄 중 1줄 충족", note: "미충족: 사용 방식 → 지연시간 (1.4 참조)" },
    ]);
  });

  it("같은 입력에는 늘 같은 결과", () => {
    const one = input({ taskType: "multiclass", perspective: answer({ classPriority: "All equal" }) });
    expect(checkMaterialSelection(one)).toEqual(checkMaterialSelection(structuredClone(one)));
  });
});

describe("문구 다듬기 (검토 반영)", () => {
  it("선언 이름의 받침에 맞춰 '으로/로' — 샘플 단위로 중요\"로", () => {
    const result = checkMaterialSelection(
      input({ taskType: "multiclass", perspective: answer({ classPriority: "Individual samples first" }), selectedMetricIds: ["M11"] }),
    );
    expect(result.printed.purposeShortfalls[0]).toContain('"샘플 단위로 중요"로 밝혔으나');
    expect(result.printed.averagingSentence).toContain('"샘플 단위로 중요"로 밝혔으나');
  });

  it("IR 숫자의 끝자리에 맞춰 — 12.30으로", () => {
    const result = checkMaterialSelection(input({ selectedMetricIds: ["M9"], imbalanceRatio: 12.3 }));
    expect(result.printed.purposeShortfalls[0]).toContain("불균형 비율(IR)이 12.30으로 9를 넘고");
  });

  it("9번 영향 문장이 문장이 된다", () => {
    const result = checkMaterialSelection(
      input({ composer: { trainingData: { ...FULL_COMPOSER.trainingData, channelEffects: { choices: [] } } } }),
    );
    expect(result.printed.impacts).toEqual([
      "학습 데이터의 채널 효과: 모델이 내용 대신 수집 방식을 배웠는지 판단할 수 없다.",
    ]);
  });

  it("멀티레이블 지표 선택 이유를 '기타'로 고르고 글을 비우면 12번 빠짐", () => {
    const result = checkMaterialSelection(
      input({ taskType: "multilabel", composer: { metrics: { metricRationale: { text: "Other (own words)" } } } }),
    );
    expect(result.warningIds).toEqual(["reporting:12"]);
  });
});
