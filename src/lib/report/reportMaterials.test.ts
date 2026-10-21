/**
 * 고객 재료 → 성적서 줄과 AI 입력.
 *
 * 종전에는 성적서 구성 카드(⑤~⑨)와 지표 선택 이유가 저장만 되고 성적서에도 AI 에도 가지
 * 않았다. 여기서 고정하는 것은 재료 목록의 인쇄 규칙이다 — 2층 항목이 빠지면 "제공되지 않음",
 * 선택 항목이 비면 줄이 없음, 선택지는 재료 목록의 한국어 이름으로.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CLIENT_INPUTS_MAX_CHARS,
  CLIENT_INPUTS_TARGET_CHARS,
  NOT_PROVIDED,
  TRUNCATED_MARK,
  buildClientInputs,
  buildReportMaterials,
  fitClientInputs,
  materialRowText,
  type ReportComposerInput,
} from "./reportMaterials";
import type { MaterialRow } from "../../types/finalReport.types";
import { getCard } from "../../data/reportComposer";
import type { ComposerValueMap } from "../../types/reportComposer.types";

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

  it("복수 라벨러 합의가 아니면 라벨러 수·일치도 줄은 '해당 없음'이다(서술 설계 D15 — 줄을 지우지 않는다)", () => {
    for (const review of ["One reviewer", "No review"]) {
      const rows = groundTruth({ labelAuthor: { text: "Domain experts" }, labelReview: { text: review } });
      expect(rows.slice(2)).toEqual([
        { label: "라벨러 수", value: "해당 없음", item: 5, notApplicable: true },
        { label: "라벨 일치도", value: "해당 없음", item: 5, notApplicable: true },
      ]);
    }
  });

  it("신뢰성이 모름·글만·빈칸이거나 카드를 껐으면 두 줄을 만들지 않는다 — 필요한지 알 수 없다", () => {
    const base = { labelAuthor: { text: "Domain experts" } };
    for (const labelReview of [{ text: "One reviewer", unknown: true }, { note: "외주라 모름" }, {}]) {
      expect(labelsOf(groundTruth({ ...base, labelReview }))).toEqual(["정답 라벨 구축 방법", "정답 라벨 신뢰성"]);
    }
    const off = buildReportMaterials(
      composer({ cards: { ...ALL_ON, groundTruth: false }, groundTruth: { labelReview: { text: "One reviewer" } } }),
      "binary",
    ).groundTruth;
    expect(labelsOf(off)).toEqual(["정답 라벨 구축 방법", "정답 라벨 신뢰성"]);
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

/**
 * B6② — 이름과 값 중 하나만 적은 줄은 4절에도 AI 에도 싣지 않는다. 두 곳의 줄 수가 같다(`completeEntryRows` 한 곳).
 */
describe("[B6②] 하이퍼파라미터는 이름과 값을 다 적은 줄만", () => {
  const input = composer({
    cards: ALL_ON,
    modelEnv: {
      algorithm: { text: "XGBoost" },
      hyperparameters: {
        entries: [
          { key: "max_depth", value: "6" },
          { key: "", value: "300" },
          { key: "eta", value: " " },
          { key: " n_estimators ", value: " 300 " },
        ],
      },
    },
  });
  const materials = buildReportMaterials(input, "binary");

  it("4절 표에는 이름·값 둘 다 있는 두 줄만, 앞뒤 공백을 걷어 낸다", () => {
    expect(materials.hyperparameters.rows).toEqual([
      { name: "max_depth", value: "6" },
      { name: "n_estimators", value: "300" },
    ]);
  });

  it("AI 에 넘기는 줄 수도 같다", () => {
    const inputs = buildClientInputs({
      composer: input,
      materials,
      model: { name: "m", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: [],
      classLabelDescriptions: {},
      runtime: {},
    });
    const env = inputs.environment as Record<string, unknown>;
    expect(env["하이퍼파라미터"]).toEqual({ max_depth: "6", n_estimators: "300" });
    expect(Object.keys(env["하이퍼파라미터"] as object)).toHaveLength(materials.hyperparameters.rows!.length);
  });

  it("다 적은 줄이 없으면 '제공되지 않음'(null)", () => {
    const only = composer({ cards: ALL_ON, modelEnv: { hyperparameters: { entries: [{ key: "", value: "6" }] } } });
    expect(buildReportMaterials(only, "binary").hyperparameters.rows).toBeNull();
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

  it("3절에 찍는 전처리 일치 줄을 그대로 넘기고, 덧붙인 글은 의뢰자 제공으로 표시한다", () => {
    // ⑥ 학습 데이터가 받는다(persist v13) — ⑦ 을 넣지 않아도 학습 데이터와 함께 간다.
    expect((inputs.training_data as Record<string, string>)["학습·평가 전처리 일치"]).toBe(
      "다름 (의뢰자 제공: Extra outlier filtering)",
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

/**
 * 레지스트리의 sentToAi 표시가 실제와 같은지(W4). 글 칸마다 다른 표식을 넣고, AI 에 넘기는 고객 입력에
 * 그 표식이 실리는지 본다. 종전에는 학습 데이터 형식·설명·비고가 실리는데도 표시가 없었다.
 */
describe("AI 전달 표시(sentToAi)는 실제로 실리는 것과 같다 (W4)", () => {
  const cards = ["trainingData", "testData", "modelEnv"] as const;
  const marked = cards.flatMap((cardId) =>
    getCard(cardId)
      .fields.filter((field) => field.input === "text" || field.input === "textarea")
      .map((field) => ({ cardId, field, mark: `표식-${field.id}` })),
  );

  it("⑥⑦⑨ 의 글 칸마다 표식이 실리는 것 ⇔ sentToAi", () => {
    expect(marked.length).toBeGreaterThan(5);
    const values: Record<string, ComposerValueMap> = { trainingData: {}, testData: {}, modelEnv: {} };
    for (const { cardId, field, mark } of marked) values[cardId][field.id] = { text: mark };
    const input = composer({ cards: ALL_ON, ...values });
    const text = JSON.stringify(
      buildClientInputs({
        composer: input,
        materials: buildReportMaterials(input, "binary"),
        model: { name: "A", version: "v1", purpose: "", category: "" },
        reportPurposeNote: "",
        coreMetrics: [],
        classLabelDescriptions: {},
        runtime: {},
      }),
    );
    for (const { field, mark } of marked) {
      expect(text.includes(mark), field.id).toBe(field.sentToAi === true);
    }
  });
});

/**
 * 고객 입력 길이 맞추기(B7). 백엔드는 직렬화 길이가 2만 자를 넘는 서술 요청을 422 로 거절하고, 그러면
 * 성적서에 AI 서술이 하나도 실리지 않는다. 프론트가 상한의 90% 안으로 맞춰 보낸다.
 */
describe("고객 입력 길이 맞추기 (fitClientInputs)", () => {
  const size = (value: unknown) => JSON.stringify(value).length;

  it("상한 안이면 그대로 돌려준다", () => {
    const inputs = { model: { 모델명: "A" }, core_metrics: ["F1"] };
    expect(fitClientInputs(inputs)).toBe(inputs);
  });

  it("가장 긴 글부터 자르고, 짧은 글은 건드리지 않는다", () => {
    const inputs = {
      training_data: { "학습 데이터 설명": "가".repeat(30_000), "학습 데이터셋명": "고객 로그" },
      core_metrics: ["Accuracy(M1)"],
    };
    const fitted = fitClientInputs(inputs) as typeof inputs;

    expect(size(fitted)).toBeLessThanOrEqual(CLIENT_INPUTS_TARGET_CHARS);
    expect(fitted.training_data["학습 데이터 설명"].endsWith(TRUNCATED_MARK)).toBe(true);
    expect(fitted.training_data["학습 데이터셋명"]).toBe("고객 로그");
    expect(fitted.core_metrics).toEqual(["Accuracy(M1)"]);
    // 원본은 그대로다.
    expect(inputs.training_data["학습 데이터 설명"]).toHaveLength(30_000);
  });

  it("클래스 256개에 긴 설명이 붙어도 상한 안으로 들어가고, 같은 입력에는 같은 결과다", () => {
    const descriptions = Object.fromEntries(
      Array.from({ length: 256 }, (_, i) => [`class_${i}`, "설명".repeat(100)]),
    );
    const inputs = { class_label_descriptions: descriptions, model: { 모델명: "A" } };
    expect(size(inputs)).toBeGreaterThan(CLIENT_INPUTS_MAX_CHARS);

    const fitted = fitClientInputs(inputs);
    expect(size(fitted)).toBeLessThanOrEqual(CLIENT_INPUTS_TARGET_CHARS);
    expect(fitted).toEqual(fitClientInputs(inputs));
    expect(fitted.model).toEqual({ 모델명: "A" });
  });

  it("글을 다 줄여도 넘으면 클래스 설명을 뺀다", () => {
    // 클래스 이름(키)은 자를 수 없다.
    const descriptions = Object.fromEntries(
      Array.from({ length: 400 }, (_, i) => [`${"k".repeat(60)}_${i}`, "짧은 설명"]),
    );
    const fitted = fitClientInputs({ class_label_descriptions: descriptions, model: { 모델명: "A" } });
    expect(fitted).toEqual({ model: { 모델명: "A" } });
  });

  it("buildClientInputs 가 끝에서 맞춘다", () => {
    const input = composer({
      cards: ALL_ON,
      trainingData: { trainingDescription: { text: "긴 설명 ".repeat(5_000) } },
    });
    const inputs = buildClientInputs({
      composer: input,
      materials: buildReportMaterials(input, "binary"),
      model: { name: "A", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: [],
      classLabelDescriptions: {},
      runtime: {},
    });
    expect(size(inputs)).toBeLessThanOrEqual(CLIENT_INPUTS_TARGET_CHARS);
    expect((inputs.training_data as Record<string, string>)["학습 데이터 설명"].endsWith(TRUNCATED_MARK)).toBe(true);
  });

  it("맞추는 길이는 상한의 90% 다", () => {
    expect(CLIENT_INPUTS_TARGET_CHARS).toBe(18_000);
  });

  // CI 는 프론트 저장소만 받는다 — 파일이 있을 때만 대조한다.
  const backendSchemas = resolve(__dirname, "../../../../Capstone_Back/app/narrative/schemas.py");
  it.skipIf(!existsSync(backendSchemas))("상한은 백엔드 MAX_CLIENT_INPUTS_CHARS 와 같다", () => {
    const match = readFileSync(backendSchemas, "utf-8").match(/MAX_CLIENT_INPUTS_CHARS\s*=\s*([\d_]+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1].replaceAll("_", ""))).toBe(CLIENT_INPUTS_MAX_CHARS);
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

    expect(valueOf(rows, "학습·평가 전처리 일치")).toBe("다름 (의뢰자 제공: 정규화 다름)");
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

describe("'기타'를 고르고 글을 비우면 답이 아니다 (검토 반영)", () => {
  it("한 개 고르기는 제공되지 않음, 여러 개 고르기는 그 선택지만 뺀다", () => {
    const materials = buildReportMaterials(
      composer({
        cards: ALL_ON,
        metrics: { metricRationale: { text: "Other (own words)" } },
        trainingData: { imbalanceHandling: { choices: ["Did nothing", "Other (free text)"] } },
      }),
      "multilabel",
    );
    expect(materials.metricRationale).toBeNull();
    expect(valueOf(materials.training, "편향 감소 노력")).toBe("수행 안 함");
  });
});

describe("materialRowText — 줄 하나의 인쇄·AI 글", () => {
  it.each([
    [{ value: "X" }, "X"],
    [{ value: "X", note: "n" }, "X (의뢰자 제공: n)"],
    [{ value: null, note: "n" }, `${NOT_PROVIDED} (의뢰자 제공: n)`],
    [{ value: null }, NOT_PROVIDED],
  ])("%j → %s", (row, expected) => {
    expect(materialRowText(row)).toBe(expected);
  });
});

