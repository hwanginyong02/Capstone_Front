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

describe("1절 팩스·홈페이지 — 비면 빈 값(줄을 만들지 않음)", () => {
  it("비었거나 공백뿐이면 빈 문자열, 값이 있으면 그대로", () => {
    const empty = mapWorkflowToFinalReport(baseInput({ basicInfo: { ...DEFAULT_BASIC_INFO, fax: "  ", website: "" } }));
    expect(empty.applicant.fax).toBe("");
    expect(empty.applicant.homepage).toBe("");

    const filled = mapWorkflowToFinalReport(
      baseInput({ basicInfo: { ...DEFAULT_BASIC_INFO, fax: "02-1", website: "https://a.example" } }),
    );
    expect(filled.applicant.fax).toBe("02-1");
    expect(filled.applicant.homepage).toBe("https://a.example");
  });
});

describe("[B11] 1.2 신청인 칸은 다듬어 싣고, 공백뿐이면 '—'", () => {
  it("각 칸 — 앞뒤 공백을 걷어 내고, 공백만 있으면 '—'", () => {
    const report = mapWorkflowToFinalReport(
      baseInput({
        basicInfo: {
          ...DEFAULT_BASIC_INFO,
          companyName: "  테스트 주식회사 ",
          representative: "   ",
          businessNumber: " 123-45-67890 ",
          phone: "\t",
          address: " 서울 ",
        },
      }),
    );
    expect(report.applicant).toMatchObject({
      companyName: "테스트 주식회사",
      representative: "—",
      businessNumber: "123-45-67890",
      contact: "—",
      address: "서울",
    });
  });

  it("과제 이름이 공백뿐이면 과제 정보를 싣지 않고, 기관이 공백뿐이면 '—'", () => {
    const blank = mapWorkflowToFinalReport(
      baseInput({ basicInfo: { ...DEFAULT_BASIC_INFO, reportPurpose: "project", projectName: "  ", projectAgency: "기관" } }),
    );
    expect(blank.evalScope.projectInfo).toBeUndefined();
    const agency = mapWorkflowToFinalReport(
      baseInput({ basicInfo: { ...DEFAULT_BASIC_INFO, reportPurpose: "project", projectName: " AI 과제 ", projectAgency: " " } }),
    );
    expect(agency.evalScope.projectInfo).toEqual({ name: "AI 과제", agency: "—" });
  });
});

describe("2절 버전 — 기본값은 한 곳에서 정한다(DESIGN_GAPS R5)", () => {
  it.each([
    ["", "v1.0.0"],
    ["   ", "v1.0.0"],
    [" v2.0 ", "v2.0"],
  ])("입력 '%s' → '%s'", (input, expected) => {
    const report = mapWorkflowToFinalReport(baseInput({ basicInfo: { ...DEFAULT_BASIC_INFO, versionName: input } }));

    expect(report.evalScope.version).toBe(expected);
  });
});

describe("재료 선택 점검 연결 (판정은 checkMaterialSelection 한 곳)", () => {
  const composer = (perspective: ComposerValueMap = {}): ReportComposerInput => ({
    ...withTraining({}, false).composer,
    perspective,
  });
  const validation = (distribution?: Record<string, number>) => ({
    task_type: "binary",
    selected_metric_ids: ["M1"],
    execution_summary: [],
    validation_details: [],
    error_count: 0,
    warning_count: 0,
    ...(distribution ? { class_distribution: distribution } : {}),
  });

  it("카드 값이 있으면 결과를 싣고, 옛 스냅샷(카드 값 없음)에는 싣지 않는다", () => {
    expect(mapWorkflowToFinalReport(baseInput({ composer: composer() })).materialCheck?.version).toBe("1.0");
    expect(mapWorkflowToFinalReport(baseInput()).materialCheck).toBeUndefined();
  });

  it("2층은 성적서가 실제로 찍는 값을 센다 — 카드를 끄고 환경을 비우면 1·2·3·4·5·7·8·9·10·11 빠짐", () => {
    const report = mapWorkflowToFinalReport(baseInput({ composer: composer() }));
    expect(report.materialCheck!.reporting).toMatchObject({ total: 11, provided: 1 });
    expect(report.evalEnv.systemSpec.os).toBe("제공되지 않음");
  });

  it("지연시간 컬럼을 매핑했으면 8번은 제공", () => {
    const report = mapWorkflowToFinalReport(
      baseInput({
        composer: composer(),
        columnMapping: [{ confirmedRole: "latency" } as MapWorkflowToReportInput["columnMapping"][number]],
      }),
    );
    expect(report.materialCheck!.warningIds).not.toContain("reporting:8");
  });

  it("IR 은 검증 응답의 분포(평가와 같은 프레임)를 먼저 쓰고, 없으면 업로드 분석 분포를 쓴다", () => {
    const input = baseInput({
      composer: composer(),
      selectedMetricIds: ["M9"],
      metadata: { class_distribution: { "0": 50, "1": 50 } },
    });
    const fromValidation = mapWorkflowToFinalReport(input, validation({ "0": 950, "1": 50 })).materialCheck!;
    expect(fromValidation).toMatchObject({ imbalanceRatio: 19, distributionSource: "validation" });
    expect(fromValidation.warningIds).toContain("purpose:curveImbalance");

    const fromUpload = mapWorkflowToFinalReport(input, validation()).materialCheck!;
    expect(fromUpload).toMatchObject({ imbalanceRatio: 1, distributionSource: "upload" });
    expect(fromUpload.warningIds).not.toContain("purpose:curveImbalance");
  });

  it("진행 기록을 넘기면 점검이 인정 여부를 정한다", () => {
    const input = baseInput({ composer: composer() });
    const warningIds = mapWorkflowToFinalReport(input).materialCheck!.warningIds;
    const ack = { at: "2026-10-17T05:03:00.000Z", version: "1.0", warningIds };
    expect(mapWorkflowToFinalReport({ ...input, materialCheckAck: ack }).materialCheck!.acknowledgement).toEqual({
      at: ack.at,
      version: "1.0",
    });
  });

  it("다중 클래스 3번 줄이 미충족이면 5절 평균 방식 문장을 바꿔 찍는다(충족이면 고정 문구 4 그대로)", () => {
    const unmet = mapWorkflowToFinalReport(
      baseInput({ taskType: "multiclass", selectedMetricIds: ["M1"], composer: composer({ classPriority: { text: "All equal" } }) }),
    );
    expect(unmet.materials!.averagingSentence).toBe(
      '의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔으나, 이에 맞는 매크로 평균 지표는 시험 항목에 없다(1.4 참조).',
    );
    const met = mapWorkflowToFinalReport(
      baseInput({ taskType: "multiclass", selectedMetricIds: ["M11"], composer: composer({ classPriority: { text: "All equal" } }) }),
    );
    expect(met.materials!.averagingSentence).toBe(
      '다중 클래스 지표의 평균 방식은 매크로 평균을 기준으로 한다. 의뢰자가 클래스 중요도를 "모든 클래스가 동등"으로 밝혔기 때문이다.',
    );
  });
});

describe("지연시간(8번)은 6.4 에 실제로 찍힐지로 센다 (검토 반영)", () => {
  const composer = (): ReportComposerInput => ({ ...withTraining({}, false).composer, perspective: { usageMode: { text: "Real-time" } } });
  const latencyRow = [{ confirmedRole: "latency" } as MapWorkflowToReportInput["columnMapping"][number]];
  const validation = (names: string[]) => ({
    task_type: "binary",
    selected_metric_ids: ["M1"],
    execution_summary: [],
    validation_details: names.map((name) => ({ name, result: "", handling: "", status: "pass" as const, group: "latency" as const })),
    error_count: 0,
    warning_count: 0,
  });

  it("매핑했어도 숫자 값이 없어 검증에 통계 항목이 없으면 빠짐(대화형 줄도 미충족)", () => {
    const check = mapWorkflowToFinalReport(
      baseInput({ composer: composer(), columnMapping: latencyRow }),
      validation(["Latency non-numeric values"]),
    ).materialCheck!;
    expect(check.warningIds).toContain("reporting:8");
    expect(check.warningIds).toContain("purpose:latency");
  });

  it("검증에 통계 항목이 있으면 제공", () => {
    const check = mapWorkflowToFinalReport(
      baseInput({ composer: composer(), columnMapping: latencyRow }),
      validation(["Latency statistics (ms)"]),
    ).materialCheck!;
    expect(check.warningIds).not.toContain("reporting:8");
    expect(check.warningIds).not.toContain("purpose:latency");
  });
});

describe("클래스 레이블 설명 — 적은 클래스만 3절에 (B14)", () => {
  const withClasses = (descriptions: Record<string, string>) =>
    baseInput({
      taskType: "multiclass",
      columnMapping: [
        { originalName: "label", sampleValues: ["cat", "dog", "bird"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
      ],
      classLabelDescriptions: descriptions,
    });

  it("3개 중 1개만 적으면 1줄", () => {
    const report = mapWorkflowToFinalReport(withClasses({ cat: "집고양이", dog: "", bird: "   " }));
    expect(report.datasetInfo.classLabelDescriptions).toEqual([{ label: "cat", description: "집고양이" }]);
  });

  it("하나도 적지 않으면 표가 없다 — '설명 미입력' 줄을 만들지 않는다", () => {
    expect(mapWorkflowToFinalReport(withClasses({})).datasetInfo.classLabelDescriptions).toBeUndefined();
    expect(mapWorkflowToFinalReport(withClasses({ cat: "", dog: " " })).datasetInfo.classLabelDescriptions).toBeUndefined();
  });

  it("모두 적으면 클래스 순서대로 모두", () => {
    const report = mapWorkflowToFinalReport(withClasses({ dog: "개", cat: "고양이", bird: "새" }));
    expect(report.datasetInfo.classLabelDescriptions?.map((item) => item.label)).toEqual(["cat", "dog", "bird"]);
  });
});

describe("목표값 자릿수 — 5절은 셋째 자리(B10)", () => {
  it("새 성적서는 targetDigits 3 을 싣고 5절 합격 기준을 셋째 자리로 찍는다", () => {
    const report = mapWorkflowToFinalReport(
      baseInput({
        selectedMetricIds: ["M1", "M8"],
        metricDetails: {
          M1: { targetValue: "0.855" },
          M8: { targetValue: "0.1" },
        } as unknown as MapWorkflowToReportInput["metricDetails"],
      }),
    );
    expect(report.targetDigits).toBe(3);
    expect(report.metricList.map((item) => item.passCriteria)).toEqual(["≥ 0.855", "≤ 0.100"]);
  });
});
