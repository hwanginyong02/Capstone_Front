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
 * 즉 "과거 평가를 편집해 다시 돌린다"(loadWorkflowSnapshot → Run evaluation)는 동선이
 * rawFile 소실(E-09) 말고도 **타입 붕괴로 한 겹 더** 막혀 있다.
 * E-01(워크플로우 상태 persist)을 도입하면 이 경로가 전면화되므로 선결 조건이다.
 */
import { describe, expect, it } from "vitest";

import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "./mapWorkflowToFinalReport";
import { DEFAULT_BASIC_INFO, DEFAULT_DATASET_INFO } from "../../types/workflow.types";

function baseInput(overrides: Partial<MapWorkflowToReportInput> = {}): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    datasetInfo: DEFAULT_DATASET_INFO,
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
