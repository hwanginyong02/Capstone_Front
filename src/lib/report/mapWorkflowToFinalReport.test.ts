/**
 * mapWorkflowToFinalReport — 워크플로우 상태 → 성적서 데이터 변환.
 *
 * 이 계층은 성적서 숫자를 실제로 만드는 곳인데 단위 테스트가 0이었다(ISSUES.md H-03).
 *
 * 첫 테스트는 **직렬화 왕복**을 다룬다 — 대장에 없는 결함이다.
 * `basicInfo.contractDate` 가 `Date` 타입인데, 이 상태는 워크스페이스 스냅샷으로
 * localStorage 를 왕복하는 것이 정상 동작이다(useWorkspaceStore 의 persist).
 * JSON 왕복 후에는 문자열이 되므로 `formatDate(d: Date)` 의 `d.getFullYear()` 가
 * `TypeError: d.getFullYear is not a function` 을 던진다.
 *
 * 저장된 상태를 다시 읽어 성적서를 그리는 경로(워크스페이스 run·워크플로우 persist)가
 * **타입 붕괴로** 막힌다. E-01(워크플로우 상태 persist)을 도입하면 이 경로가 전면화되므로
 * 선결 조건이다.
 */
import { describe, expect, it } from "vitest";

import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "./mapWorkflowToFinalReport";
import type { ReportComposerInput } from "./reportMaterials";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";

/** ⑥ 값과 켜짐 여부만 바꾼 성적서 구성 입력. 나머지 카드는 꺼져 있다. */
function withTraining(trainingData: ComposerValueMap, on: boolean): { composer: ReportComposerInput } {
  return {
    composer: {
      cards: { trainingData: on, testData: false, groundTruth: false, modelEnv: false },
      metrics: {},
      perspective: {},
      trainingData,
      testData: {},
      groundTruth: {},
      modelEnv: {},
    },
  };
}

function baseInput(overrides: Partial<MapWorkflowToReportInput> = {}): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "binary",
    selectedMetricIds: ["M1"],
    metricDetails: {},
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
    ...overrides,
  };
}

/** localStorage persist 왕복을 흉내낸다. */
function throughStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe("직렬화 왕복", () => {
  it("[E-09] localStorage 를 왕복한 상태로도 성적서를 만들 수 있다", () => {
    const restored = throughStorage(baseInput());

    expect(() => mapWorkflowToFinalReport(restored)).not.toThrow();
  });

  it("[E-09] 왕복 후에도 계약일이 성적서에 올바로 실린다", () => {
    const input = baseInput({
      basicInfo: { ...DEFAULT_BASIC_INFO, contractDate: "2026-09-05" },
    });

    const direct = mapWorkflowToFinalReport(input);
    const restored = mapWorkflowToFinalReport(throughStorage(input));

    expect(restored.meta.contractDate).toBe(direct.meta.contractDate);
    expect(restored.meta.contractDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("[E-09] 이 변경 이전에 저장된 스냅샷(Date 의 toJSON 결과)도 받아준다", () => {
    // 구 형식: contractDate 가 Date 였으므로 persist 에는 "2026-09-05T00:00:00.000Z" 로 남아 있다.
    const legacy = baseInput();
    (legacy.basicInfo as { contractDate?: string }).contractDate = "2026-09-05T00:00:00.000Z";

    const report = mapWorkflowToFinalReport(throughStorage(legacy));
    expect(report.meta.contractDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("[E-09] 계약일이 없어도 변환이 깨지지 않는다", () => {
    const input = baseInput({
      basicInfo: { ...DEFAULT_BASIC_INFO, contractDate: undefined },
    });

    expect(() => mapWorkflowToFinalReport(throughStorage(input))).not.toThrow();
  });
});

describe("기본 변환", () => {
  it("의뢰자·모델 정보가 성적서로 옮겨진다", () => {
    const report = mapWorkflowToFinalReport(baseInput());

    expect(report.applicant.companyName).toBe("테스트 주식회사");
    expect(report.evalScope.targetModel).toBe("MyModel");
  });

  it("검증 결과가 없으면 dataValidation 은 빈 배열이다 — 가짜 항목을 만들지 않는다", () => {
    const report = mapWorkflowToFinalReport(baseInput());

    expect(report.dataValidation).toEqual([]);
    expect(report.validationSummary).toBeUndefined();
  });

  it("taskType 이 비면 binary 로 폴백한다(현행 동작 고정)", () => {
    const report = mapWorkflowToFinalReport(baseInput({ taskType: "" }));

    expect(report.meta.taskType).toBe("binary");
  });
});

/**
 * 학습 데이터 설명·비고는 ⑥ 카드에서 온다.
 *
 * 종전에는 Details 합격 기준 카드의 "Report notes"(평가에 대한 메모)가 "학습 데이터 설명"으로
 * 인쇄됐다. 학습 데이터와 무관한 글이 그 자리에 찍힌 것이다.
 */
describe("학습 데이터 설명·비고", () => {
  const card = {
    trainingDescription: { text: "Customer logs from 2024." },
    trainingNotes: { text: "Two outlier days were removed." },
  };

  it("⑥ 을 켰으면 설명과 비고를 싣는다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput(withTraining(card, true)),
    );

    expect(report.trainingDatasetInfo?.description).toBe("Customer logs from 2024.");
    expect(report.trainingDatasetInfo?.notes).toBe("Two outlier days were removed.");
  });

  it("⑥ 을 껐으면 싣지 않는다 — 끈 카드의 값은 성적서에 들어가지 않는다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput(withTraining(card, false)),
    );

    expect(report.trainingDatasetInfo).toBeUndefined();
  });

  it("이 키가 없는 옛 스냅샷도 그대로 그린다", () => {
    expect(() => mapWorkflowToFinalReport(baseInput())).not.toThrow();
    expect(mapWorkflowToFinalReport(baseInput()).trainingDatasetInfo).toBeUndefined();
  });
});

describe("buildReportInput", () => {
  it("성적서 구성 카드의 켜짐 여부와 값을 함께 담는다", async () => {
    const { buildReportInput } = await import("./mapWorkflowToFinalReport");
    const base = baseInput();

    const input = buildReportInput({
      ...base,
      composerCards: { trainingData: true, testData: false, groundTruth: false, modelEnv: false },
      composerMetrics: {},
      composerPerspective: { usageMode: { text: "Batch" } },
      composerTrainingData: { trainingNotes: { text: "n" } },
      composerTestData: {},
      composerGroundTruth: {},
      composerModelEnv: {},
    });

    expect(input.composer?.cards.trainingData).toBe(true);
    expect(input.composer?.trainingData).toEqual({ trainingNotes: { text: "n" } });
    expect(input.composer?.perspective).toEqual({ usageMode: { text: "Batch" } });
  });
});

/**
 * 학습 데이터 절 — ⑥ 카드에서만 온다.
 *
 * 종전에는 Details 의 학습 데이터 폼과 ⑥ 이 같은 이름·건수·클래스 분포를 따로 받았다. 두 곳을
 * ⑥ 하나로 합쳤다(persist v10).
 */
describe("학습 데이터 절은 ⑥ 에서 온다", () => {
  const card = {
    trainingDatasetName: { text: "Customer logs 2024" },
    trainingVolume: {
      entries: [
        { key: "Training", value: "12,000" },
        { key: "Validation", value: "3000" },
      ],
    },
    trainingClassVolume: {
      entries: [
        { key: "normal", value: "8400" },
        { key: "churn", value: "3600" },
      ],
    },
    trainingDataFormat: { text: "CSV" },
  };

  it("이름·건수·클래스별 양·형식을 싣는다", () => {
    const info = mapWorkflowToFinalReport(
      baseInput(withTraining(card, true)),
    ).trainingDatasetInfo;

    expect(info?.name).toBe("Customer logs 2024");
    expect(info?.trainingSampleCount).toBe(12000);
    expect(info?.validationSampleCount).toBe(3000);
    expect(info?.classDistribution).toBe("normal 8400 / churn 3600");
    expect(info?.format).toBe("CSV");
  });

  it('"모름"을 고른 칸은 싣지 않는다', () => {
    const info = mapWorkflowToFinalReport(
      baseInput(withTraining({ ...card, trainingVolume: { unknown: true } }, true)),
    ).trainingDatasetInfo;

    expect(info?.trainingSampleCount).toBe(0);
    expect(info?.validationSampleCount).toBe(0);
    expect(info?.name).toBe("Customer logs 2024");
  });
});

describe("평가 데이터 표본 수", () => {
  it("학습 데이터의 검증 건수를 빌려 쓰지 않는다 — 모델 학습용 검증 세트는 평가 파일과 무관하다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput(
        withTraining({ trainingVolume: { entries: [{ key: "Validation", value: "3000" }] } }, true),
      ),
    );

    expect(report.datasetInfo.sampleCount).toBe(0);
  });
});

/** 4절 실행 환경은 2층 — 비었거나 "모름"이면 "제공되지 않음"이다(재료 선택 점검 4.2). "—"가 아니다. */
describe("4절 실행 환경의 빈 칸", () => {
  it("제공되지 않음으로 적는다", () => {
    const report = mapWorkflowToFinalReport(baseInput());
    expect(Object.values(report.evalEnv.systemSpec)).toEqual(Array(5).fill("제공되지 않음"));
  });
});

describe("1절 과제 번호 — 용도와 무관한 선택 항목(재료 목록 1절)", () => {
  it("외부 제출이어도 과제 번호를 싣고, 과제명·과제 기관은 없다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput({
        basicInfo: { ...DEFAULT_BASIC_INFO, reportPurpose: "external", projectNumber: " ML-1 " },
      }),
    );

    expect(report.evalScope.projectNumber).toBe("ML-1");
    expect(report.evalScope.projectInfo).toBeUndefined();
  });

  it("과제 산출물이면 과제명·과제 기관과 과제 번호를 함께 싣는다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput({
        basicInfo: {
          ...DEFAULT_BASIC_INFO,
          reportPurpose: "project",
          projectName: "AI 과제",
          projectAgency: "기관",
          projectNumber: "P-1",
        },
      }),
    );

    expect(report.evalScope.projectInfo).toEqual({ name: "AI 과제", agency: "기관" });
    expect(report.evalScope.projectNumber).toBe("P-1");
  });
});
