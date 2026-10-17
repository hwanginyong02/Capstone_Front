/**
 * 고객 재료 → 성적서 줄과 AI 입력.
 *
 * 종전에는 성적서 구성 카드(⑤~⑨)와 지표 선택 이유가 저장만 되고 성적서에도 AI 에도 가지
 * 않았다. 여기서 고정하는 것은 재료 목록의 인쇄 규칙이다 — 2층 항목이 빠지면 "제공되지 않음",
 * 선택 항목이 비면 줄이 없음, 선택지는 재료 목록의 한국어 이름으로.
 */
import { describe, expect, it } from "vitest";

import {
  NOT_PROVIDED,
  buildClientInputs,
  buildReportMaterials,
  type ReportComposerInput,
} from "./reportMaterials";
import type { MaterialRow } from "../../types/finalReport.types";

function composer(overrides: Partial<ReportComposerInput> = {}): ReportComposerInput {
  return {
    cards: { trainingData: false, testData: false, groundTruth: false, modelEnv: false },
    metrics: {},
    perspective: {},
    trainingData: {},
    testData: {},
    groundTruth: {},
    modelEnv: {},
    ...overrides,
  };
}

const ALL_ON = { trainingData: true, testData: true, groundTruth: true, modelEnv: true };

const valueOf = (rows: MaterialRow[], label: string) => rows.find((row) => row.label === label)?.value;
const labelsOf = (rows: MaterialRow[]) => rows.map((row) => row.label);

describe("카드를 끄면", () => {
  const materials = buildReportMaterials(composer(), "binary");

  it("2층 항목은 제공되지 않음(null)으로 남는다 — 부실 여부는 성적서에 드러난다", () => {
    for (const label of ["학습 데이터셋명", "학습 데이터 출처", "학습 샘플 수", "채널 효과", "편향 감소 노력"]) {
      expect(valueOf(materials.training, label), label).toBeNull();
    }
    expect(valueOf(materials.test, "평가 데이터 출처")).toBeNull();
    expect(valueOf(materials.groundTruth, "정답 라벨 구축 방법")).toBeNull();
    expect(valueOf(materials.environment, "학습 가속")).toBeNull();
    expect(materials.hyperparameters).toEqual({ algorithm: null, rows: null });
  });

  it("선택 항목은 줄을 만들지 않는다", () => {
    expect(labelsOf(materials.training)).not.toContain("수집 기간");
    expect(labelsOf(materials.training)).not.toContain("학습·평가 전처리 일치");
    expect(labelsOf(materials.training)).not.toContain("학습 데이터 설명");
    expect(labelsOf(materials.test)).not.toContain("평가 데이터 수집 기간");
  });
});

describe("⑥ 학습 데이터", () => {
  const materials = buildReportMaterials(
    composer({
      cards: ALL_ON,
      trainingData: {
        trainingDatasetName: { text: "Customer logs 2024" },
        trainingDataSource: { text: "Internal CRM" },
        trainingVolume: {
          entries: [
            { key: "Training", value: "12000" },
            { key: "Validation", value: "3,000" },
          ],
        },
        trainingClassVolume: { entries: [{ key: "normal", value: "8400" }, { key: "churn", value: "3600" }] },
        channelEffects: { choices: ["Different equipment", "Other (free text)"], otherText: "Two clinics" },
        imbalanceHandling: { choices: ["Balanced the counts", "Widened the sources"] },
        trainingPeriod: { entries: [{ key: "From", value: "2023-01" }, { key: "To", value: "2024-12" }] },
        trainingDescription: { text: "Logs labelled by churn" },
      },
    }),
    "binary",
  );

  it("값을 재료 목록의 이름으로 적는다", () => {
    expect(valueOf(materials.training, "학습 데이터셋명")).toBe("Customer logs 2024");
    expect(valueOf(materials.training, "학습 데이터 출처")).toBe("Internal CRM");
    expect(valueOf(materials.training, "학습 샘플 수")).toBe("12,000개");
    expect(valueOf(materials.training, "검증 샘플 수")).toBe("3,000개");
    expect(valueOf(materials.training, "학습 클래스 분포")).toBe("normal 8,400 / churn 3,600");
    expect(valueOf(materials.training, "채널 효과")).toBe("수집 장치 차이, 기타(Two clinics)");
    expect(valueOf(materials.training, "편향 감소 노력")).toBe("클래스 균형 조정, 데이터 출처 다양화");
    expect(valueOf(materials.training, "수집 기간")).toBe("2023-01 ~ 2024-12");
    expect(valueOf(materials.training, "학습 데이터 설명")).toBe("Logs labelled by churn");
  });

  it('"모름"을 고른 2층 항목은 제공되지 않음이다', () => {
    const unknown = buildReportMaterials(
      composer({ cards: ALL_ON, trainingData: { trainingVolume: { unknown: true } } }),
      "binary",
    );
    expect(valueOf(unknown.training, "학습 샘플 수")).toBeNull();
    expect(valueOf(unknown.training, "검증 샘플 수")).toBeNull();
  });

  it('"알려진 것 없음"은 제공된 답이다', () => {
    const none = buildReportMaterials(
      composer({ cards: ALL_ON, trainingData: { channelEffects: { choices: ["None known"] } } }),
      "binary",
    );
    expect(valueOf(none.training, "채널 효과")).toBe("알려진 것 없음");
  });
});

describe("⑧ 정답 라벨", () => {
  const groundTruth = (values: Record<string, unknown>) =>
    buildReportMaterials(composer({ cards: ALL_ON, groundTruth: values as never }), "binary").groundTruth;
  const several = {
    labelAuthor: { text: "Outside workers" },
    labelReview: { text: "Several reviewers" },
    labelReviewerCount: { text: "2" },
  };

  it("구축 방법과 신뢰성을 재료 목록의 이름으로 적는다", () => {
    const rows = groundTruth(several);
    expect(valueOf(rows, "정답 라벨 구축 방법")).toBe("크라우드소싱");
    expect(valueOf(rows, "정답 라벨 신뢰성")).toBe("복수 라벨러 합의");
    expect(valueOf(rows, "라벨러 수")).toBe("2명");
  });

  it("일치도는 종류와 값을 함께 적는다 — 단순 일치율은 % 다", () => {
    expect(
      valueOf(groundTruth({ ...several, labelAgreementKind: { text: "Cohen's kappa" }, labelAgreementValue: { text: "0.71" } }), "라벨 일치도"),
    ).toBe("Cohen의 카파 0.71");
    expect(
      valueOf(groundTruth({ ...several, labelAgreementKind: { text: "Percent agreement" }, labelAgreementValue: { text: "82" } }), "라벨 일치도"),
    ).toBe("단순 일치율 0.82"); // 화면은 %, 성적서·AI 는 0~1(재료 목록 5절)
    expect(
      valueOf(groundTruth({ ...several, labelAgreementKind: { text: "Other", otherText: "Gwet's AC1" }, labelAgreementValue: { text: "0.6" } }), "라벨 일치도"),
    ).toBe("기타(Gwet's AC1) 0.6");
  });

  it('"측정 안 함"은 제공된 답이다 — 제공되지 않음으로 세지 않는다', () => {
    expect(valueOf(groundTruth({ ...several, labelAgreementKind: { text: "Not measured" } }), "라벨 일치도")).toBe(
      "측정 안 함",
    );
  });

  it("복수 라벨러 합의가 아니면 라벨러 수·일치도 줄이 없다", () => {
    const rows = groundTruth({ labelAuthor: { text: "Domain experts" }, labelReview: { text: "One reviewer" } });
    expect(labelsOf(rows)).toEqual(["정답 라벨 구축 방법", "정답 라벨 신뢰성"]);
  });
});

describe("⑨ 실행 환경", () => {
  const materials = buildReportMaterials(
    composer({
      cards: ALL_ON,
      modelEnv: {
        algorithm: { text: "XGBoost" },
        hyperparameters: { entries: [{ key: "max_depth", value: "6" }, { key: "", value: "" }] },
        gpuUsage: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "Unknown" }] },
      },
    }),
    "binary",
  );

  it("가속 사용은 예/아니오로, 모름은 제공되지 않음으로 적는다", () => {
    expect(valueOf(materials.environment, "학습 가속")).toBe("예");
    expect(valueOf(materials.environment, "추론 가속")).toBeNull();
  });

  it("하이퍼파라미터는 빈 줄을 빼고 이름 = 값으로 담는다", () => {
    expect(materials.hyperparameters).toEqual({
      algorithm: "XGBoost",
      rows: [{ name: "max_depth", value: "6" }],
    });
  });
});

describe("선언과 지표 선택 이유", () => {
  const perspective = {
    criticalErrorType: { text: "Missed (FN)" },
    classPriority: { text: "All equal" },
    usageMode: { text: "Real-time" },
  };

  it("이 작업 유형에 해당하는 선언만 적는다", () => {
    expect(buildReportMaterials(composer({ perspective }), "binary").declarations).toEqual([
      { label: "위험 방향", value: "FN이 더 위험" },
      { label: "사용 방식", value: "대화형(실시간)" },
    ]);
    expect(buildReportMaterials(composer({ perspective }), "multiclass").declarations).toEqual([
      { label: "클래스 중요도", value: "모든 클래스가 동등" },
      { label: "사용 방식", value: "대화형(실시간)" },
    ]);
  });

  it("지표 선택 이유는 멀티레이블에서만 있다 — 그 밖은 해당 없음", () => {
    const metrics = { metricRationale: { text: "Degree of overlap" } };
    expect(buildReportMaterials(composer({ metrics }), "multilabel").metricRationale).toBe("겹치는 정도를 봄");
    expect(buildReportMaterials(composer({ metrics }), "binary").metricRationale).toBeUndefined();
    expect(buildReportMaterials(composer(), "multilabel").metricRationale).toBeNull();
  });
});

describe("AI 에 넘기는 고객 입력 (서술 설계 D25, D34)", () => {
  const input = composer({
    cards: ALL_ON,
    perspective: { usageMode: { text: "Batch" }, criticalErrorType: { text: "Similar" } },
    testData: { testDataSource: { text: "Q1 logs" } },
    trainingData: { preprocessingMatch: { text: "Different", note: "Extra outlier filtering" } },
  });
  const inputs = buildClientInputs({
    composer: input,
    materials: buildReportMaterials(input, "binary"),
    model: { name: "ChurnPredictor", version: "v1.0.0", purpose: "Churn", category: "" },
    reportPurposeNote: "For the Q3 audit",
    coreMetrics: ["Accuracy(M1)"],
    classLabelDescriptions: { "0": "stays", "1": "" },
    runtime: { 운영체제: "Ubuntu 22.04", GPU: "" },
  });

  it("모델명·버전과 용도는 넘기고, 회사·과제 정보는 넘기지 않는다", () => {
    expect(inputs.model).toEqual({ 모델명: "ChurnPredictor", 버전: "v1.0.0", "모델 용도": "Churn" });
    const text = JSON.stringify(inputs);
    for (const key of ["companyName", "회사", "사업자", "주소", "project"]) expect(text).not.toContain(key);
  });

  it("빠진 2층 항목은 제공되지 않음으로 넘긴다 — AI 가 지어내지 않게", () => {
    expect((inputs.training_data as Record<string, string>)["학습 데이터셋명"]).toBe(NOT_PROVIDED);
  });

  it("3절에 찍는 전처리 일치 줄을 그대로 넘기고, 덧붙인 글은 의뢰자 덧붙임으로 표시한다", () => {
    // ⑥ 학습 데이터가 받는다(persist v13) — ⑦ 을 넣지 않아도 학습 데이터와 함께 간다.
    expect((inputs.training_data as Record<string, string>)["학습·평가 전처리 일치"]).toBe(
      "다름 (의뢰자 덧붙임: Extra outlier filtering)",
    );
  });

  it("실행 환경을 넘기고, 빈 칸은 제공되지 않음으로 적는다", () => {
    const environment = inputs.environment as Record<string, unknown>;
    expect(environment["운영체제"]).toBe("Ubuntu 22.04");
    expect(environment["GPU"]).toBe(NOT_PROVIDED);
  });

  it("성적서 용도 덧붙임·핵심 지표·클래스 설명을 함께 넘긴다", () => {
    expect(inputs.report_purpose_note).toBe("For the Q3 audit");
    expect(inputs.core_metrics).toEqual(["Accuracy(M1)"]);
    expect(inputs.class_label_descriptions).toEqual({ "0": "stays" });
    expect(inputs.declarations).toEqual({ "위험 방향": "비슷함", "사용 방식": "배치" });
  });
});

/** 5절 평균 방식 문장 — 고정 문구 4(서술 설계 D28). 다중 클래스에서 클래스 중요도로 정한다. */
describe("5절 평균 방식 문장", () => {
  const sentence = (classPriority: { text?: string; unknown?: boolean; note?: string }, taskType: "multiclass" | "multilabel" | "binary" = "multiclass") =>
    buildReportMaterials(composer({ perspective: { classPriority } }), taskType).averagingSentence;

  it("클래스 중요도에 맞는 평균 방식을 선언 값과 함께 적는다", () => {
    expect(sentence({ text: "All equal" })).toBe(
      '다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 한다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문이다.',
    );
    expect(sentence({ text: "Larger classes first" })).toContain("가중 평균");
    expect(sentence({ text: "Individual samples first" })).toContain("마이크로 평균");
  });

  it("덧붙인 글은 따옴표 안에 넣지 않는다 — 선언 표에 있다", () => {
    expect(sentence({ text: "All equal", note: "희귀 클래스도 중요" })).toContain('"모든 클래스가 동등"');
  });

  it("다중 클래스가 아니거나 답하지 않았으면 문장이 없다", () => {
    expect(sentence({ text: "All equal" }, "multilabel")).toBeUndefined();
    expect(sentence({ unknown: true })).toBeUndefined();
  });
});

describe("⑥ 학습·평가 전처리 일치 — 3절 학습 데이터 표에 찍는다(DESIGN_GAPS R1)", () => {
  const rowsWith = (value: Record<string, unknown>, on = true) =>
    buildReportMaterials(
      composer({
        cards: { ...ALL_ON, trainingData: on },
        trainingData: { trainingPeriod: { entries: [{ key: "From", value: "2023-01" }, { key: "To", value: "2024-12" }] }, preprocessingMatch: value },
      }),
      "binary",
    ).training;

  it("값이 있으면 수집 기간 다음 줄에 찍는다", () => {
    const rows = rowsWith({ text: "Different", note: "정규화 다름" });
    const labels = labelsOf(rows);

    expect(valueOf(rows, "학습·평가 전처리 일치")).toBe("다름 (의뢰자 덧붙임: 정규화 다름)");
    expect(labels.indexOf("학습·평가 전처리 일치")).toBe(labels.indexOf("수집 기간") + 1);
  });

  it('"모름"을 고르면 그 답을 그대로 찍는다(점검 밖 선택 항목이라 제공되지 않음 대상이 아니다)', () => {
    expect(valueOf(rowsWith({ text: "Unknown" }), "학습·평가 전처리 일치")).toBe("모름");
  });

  it("⑥ 을 껐으면 줄이 없다", () => {
    expect(labelsOf(rowsWith({ text: "Same" }, false))).not.toContain("학습·평가 전처리 일치");
  });
});

describe("2층 보고 항목 번호 (재료 선택 점검 4.2 — MaterialRow.item)", () => {
  const filled = buildReportMaterials(
    composer({
      cards: ALL_ON,
      groundTruth: { labelReview: { text: "Several reviewers" } },
    }),
    "binary",
  );
  const itemsByLabel = (rows: MaterialRow[]) => Object.fromEntries(rows.map((row) => [row.label, row.item]));

  it("학습 데이터 줄: 1번 다섯 줄, 채널 효과 9번, 편향 감소 노력 3번", () => {
    expect(itemsByLabel(filled.training)).toMatchObject({
      "학습 데이터셋명": 1,
      "학습 데이터 출처": 1,
      "학습 샘플 수": 1,
      "검증 샘플 수": 1,
      "학습 클래스 분포": 1,
      "채널 효과": 9,
      "편향 감소 노력": 3,
    });
  });

  it("평가 데이터 출처와 학습 데이터와의 관계는 2번(목록 밖 권장 필드를 합침)", () => {
    expect(itemsByLabel(filled.test)).toEqual({ "평가 데이터 출처": 2, "학습 데이터와의 관계": 2 });
  });

  it("정답 라벨: 구축 방법 4번, 신뢰성·라벨러 수·일치도 5번", () => {
    expect(itemsByLabel(filled.groundTruth)).toEqual({
      "정답 라벨 구축 방법": 4,
      "정답 라벨 신뢰성": 5,
      "라벨러 수": 5,
      "라벨 일치도": 5,
    });
  });

  it("가속 두 줄은 11번, 선언 줄에는 번호가 없다", () => {
    expect(itemsByLabel(filled.environment)).toEqual({ "학습 가속": 11, "추론 가속": 11 });
    expect(filled.declarations.length).toBeGreaterThan(0);
    expect(filled.declarations.every((row) => row.item === undefined)).toBe(true);
  });
});
