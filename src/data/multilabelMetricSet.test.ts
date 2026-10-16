import { describe, it, expect, beforeEach } from "vitest";
import {
  METRICS,
  getAvailableMetrics,
  getRecommendedMetricIds,
  getRequiredColumnsForMetric,
  type TaskType,
} from "./evaluationData";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

/**
 * ISSUES.md A-04 (2026-09-07 ★확정된 제품 결정 2) — multilabel 중복 지표 제거.
 *
 * multilabel 에서 M1·M11·M12·M13 은 다른 지표와 값이 완전히 같다(실측 16자리 일치).
 * 같은 수를 두 이름으로 인쇄하면 독자는 서로 다른 측정이라고 읽는다.
 *
 * A-04 가 말한 '프론트 내부 자기모순'의 실제 인쇄 결과는 이랬다 — `METRICS` 는
 * multilabel 에서 M1 을 노출하지 않는데 `RECOMMENDED_METRICS.multilabel` 에는
 * M1 이 있어서, **'추천 지표' 버튼 한 번이면 M1 이 실제로 평가로 전송되고**
 * 성적서 6절에 숫자가 찍혔다(4·5절에는 행이 없는 채로).
 */

const REMOVED = ["M1", "M11", "M12", "M13"];
const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("multilabel 노출 지표", () => {
  it.each(REMOVED)("%s 는 multilabel 에서 노출되지 않는다", (id) => {
    expect(METRICS.find((m) => m.id === id)?.supportedTaskTypes).not.toContain("multilabel");
  });

  it.each(REMOVED)("%s 는 multiclass 에서는 그대로 남는다(값이 겹치지 않으므로)", (id) => {
    expect(METRICS.find((m) => m.id === id)?.supportedTaskTypes).toContain("multiclass");
  });

  it.each(REMOVED)("%s 는 multilabel 요구 컬럼표에도 없다", (id) => {
    expect(getRequiredColumnsForMetric("multilabel", id)).toEqual([]);
  });

  it("뺀 자리를 대신하는 지표는 남아 있다", () => {
    const exposed = getAvailableMetrics("multilabel").map((m) => m.id);
    for (const id of ["M16", "M2", "M3", "M4", "M22"]) {
      expect(exposed, `${id} 가 없으면 제거한 지표의 정보가 사라진다`).toContain(id);
    }
  });
});

describe("추천 지표는 노출 지표의 부분집합이다 (A-04 자기모순 차단)", () => {
  it.each(TASK_TYPES)("%s", (taskType) => {
    const exposed = new Set(getAvailableMetrics(taskType).map((m) => m.id));
    const leaked = getRecommendedMetricIds(taskType).filter((id) => !exposed.has(id));

    expect(leaked, "추천에만 있고 노출되지 않는 지표는 평가로 새어 들어간다").toEqual([]);
  });
});

describe("persist 마이그레이션 — 기존 브라우저에 남은 지표 정리", () => {
  const KEY = "ml-evaluation-workflow";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("저장된 multilabel 선택 목록에서 제거된 지표를 걸러낸다", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        state: { taskType: "multilabel", selectedMetricIds: ["M1", "M4", "M11", "M16"] },
      }),
    );

    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    const migrated = migrateWorkflowState(
      { taskType: "multilabel", selectedMetricIds: ["M1", "M4", "M11", "M16"] },
      1,
    );

    expect(migrated.selectedMetricIds).toEqual(["M4", "M16"]);
  });

  it("multiclass 저장분은 건드리지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    const migrated = migrateWorkflowState(
      { taskType: "multiclass", selectedMetricIds: ["M1", "M11", "M12", "M13"] },
      1,
    );

    expect(migrated.selectedMetricIds).toEqual(["M1", "M11", "M12", "M13"]);
  });

  it("taskType 이 비어 있으면 아무것도 걸러내지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    const migrated = migrateWorkflowState({ taskType: "", selectedMetricIds: ["M1", "M11"] }, 1);

    expect(migrated.selectedMetricIds).toEqual(["M1", "M11"]);
  });

  it("현재 버전으로 저장된 상태는 그대로 둔다", async () => {
    const { migrateWorkflowState, WORKFLOW_PERSIST_VERSION } = await import(
      "../utils/stores/useWorkflowStore"
    );
    const state = { taskType: "multilabel", selectedMetricIds: ["M4"] };

    expect(migrateWorkflowState(state, WORKFLOW_PERSIST_VERSION).selectedMetricIds).toEqual(["M4"]);
  });
});

/**
 * v3 → v4 — 성적서 구성 상태가 생겼다.
 *
 * 위 블록의 "현재 버전으로 저장된 상태는 그대로 둔다" 테스트는 `WORKFLOW_PERSIST_VERSION` 을
 * 그대로 쓰므로 버전을 올려도 계속 통과하지만, **그래서 새 분기를 타지 않는다.** 옛 버전을
 * 명시한 케이스가 따로 있어야 마이그레이션이 실제로 검사된다.
 */
describe("persist 마이그레이션 v3 → v4 — 성적서 구성 상태", () => {
  it("v3 저장분에 카드 선택과 입력 그룹을 채운다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "binary", selectedMetricIds: ["M1"], completedSteps: [1, 2], currentStep: 3 },
      3,
    );

    // 필수 카드만 들어간 상태(프리셋 "최소 구성")로 시작한다.
    expect(migrated.composerCards).toEqual({
      trainingData: false,
      testData: false,
      groundTruth: false,
      modelEnv: false,
    });
    expect(migrated.composerPerspective).toEqual({});
    expect(migrated.composerTrainingData).toEqual({});
    expect(migrated.composerTestData).toEqual({});
    expect(migrated.composerGroundTruth).toEqual({});
    expect(migrated.composerModelEnv).toEqual({});
  });

  it("v3 의 기존 입력은 그대로 두고 진행은 이어서 v5 로 옮긴다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "binary", selectedMetricIds: ["M1", "M9"], completedSteps: [1, 2], currentStep: 3 },
      3,
    );

    // v2 → v3 과 달리 v3 → v4 는 버릴 것이 없다 — 기존 키의 뜻이 하나도 바뀌지 않았다.
    expect(migrated.selectedMetricIds).toEqual(["M1", "M9"]);
    // 다만 체인이 v5 까지 이어지므로 진행 표시는 이름으로 옮겨져 있다.
    expect(migrated.completedStepIds).toEqual(["upload", "metrics"]);
    expect(migrated.currentStepId).toBe("mapping");
  });

  it("v1 저장분도 v5 까지 한 번에 올라간다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "multilabel", selectedMetricIds: ["M1", "M4"], completedSteps: [1, 2, 3] },
      1,
    );

    // v1→v2 지표 정리, v2→v3 진행 초기화, v3→v4 신규 키, v4→v5 이름 전환이 모두 적용된다.
    expect(migrated.selectedMetricIds).toEqual(["M4"]);
    expect(migrated.completedStepIds).toEqual([]);
    expect(migrated.currentStepId).toBe("upload");
    expect(migrated.composerCards.modelEnv).toBe(false);
  });
});

/**
 * v4 → v5 — 진행 표시를 번호에서 이름으로.
 *
 * v2 → v3 은 번호 체계가 뒤집혀 진행을 **버렸다**. 여기는 다르다 — 구 1~6 이 가리켰던 단계가
 * 새 체계에 그대로 있고 순서도 같으므로 **옮긴다**. 다 걸어온 사용자를 1단계로 돌려보낼
 * 이유가 없다.
 */
describe("persist 마이그레이션 v4 → v5 — 단계 번호를 이름으로", () => {
  it("완료 번호를 단계 이름으로 옮긴다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "binary", completedSteps: [1, 2, 3, 4], currentStep: 5 },
      4,
    );

    expect(migrated.completedStepIds).toEqual(["upload", "metrics", "mapping", "validation"]);
    // 구 5번(평가 결과)은 v8 에서 폐지돼, 이어지는 v7 → v8 이 검증 다음(Details)으로 옮긴다.
    expect(migrated.currentStepId).toBe("clientInfo");
  });

  it("옛 번호 키는 남기지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState({ completedSteps: [1], currentStep: 2 }, 4);

    expect(migrated.completedSteps).toBeUndefined();
    expect(migrated.currentStep).toBeUndefined();
  });

  it("새로 생긴 단계는 미완료로 남는다 — 그 입력을 아직 받지 않았다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState({ completedSteps: [1, 2, 3, 4, 5, 6] }, 4);

    // 평가 관점·데이터 정보·모델과 환경·의뢰자 정보는 들어 있지 않다. 구 5번(평가 결과)은
    // v8 에서 폐지돼 함께 빠진다.
    expect(migrated.completedStepIds).toEqual([
      "upload",
      "metrics",
      "mapping",
      "validation",
      "report",
    ]);
    expect(migrated.completedStepIds).not.toContain("perspective");
    expect(migrated.completedStepIds).not.toContain("clientInfo");
  });

  it("범위를 벗어난 번호나 빈 값은 버린다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState({ completedSteps: [0, 7, 99, null], currentStep: 42 }, 4);

    expect(migrated.completedStepIds).toEqual([]);
    // 알 수 없는 현재 단계는 첫 단계로 둔다.
    expect(migrated.currentStepId).toBe("upload");
  });

  it("진행 표시가 아예 없던 저장분도 깨지지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState({ taskType: "binary" }, 4);

    expect(migrated.completedStepIds).toEqual([]);
    expect(migrated.currentStepId).toBe("upload");
  });

  it("v2 저장분은 v5 까지 한 번에 올라간다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "binary", selectedMetricIds: ["M1"], completedSteps: [1, 2, 3], currentStep: 4 },
      2,
    );

    // v2 → v3 이 진행을 버리고, v3 → v4 가 구성 상태를 채우고, v4 → v5 가 이름으로 옮긴다.
    expect(migrated.completedStepIds).toEqual([]);
    expect(migrated.currentStepId).toBe("upload");
    expect(migrated.composerCards.trainingData).toBe(false);
  });
});

/**
 * v5 → v6 — 평가 관점이 단계에서 빠졌다.
 *
 * 입력은 그대로 살아 있고 받는 화면만 지표 선택으로 옮겨졌다. 그래서 버리는 것은 **진행
 * 표시에 남은 단계 id** 뿐이다 — 목록에 없는 id 가 남으면 진입 가드가 갈 곳 없는 상태를
 * 만난다.
 */
describe("persist 마이그레이션 v5 → v6 — 평가 관점이 단계에서 빠졌다", () => {
  it("완료 목록에서 평가 관점을 지운다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { completedStepIds: ["upload", "perspective", "metrics"], currentStepId: "mapping" },
      5,
    );

    expect(migrated.completedStepIds).toEqual(["upload", "metrics"]);
    expect(migrated.currentStepId).toBe("mapping");
  });

  it("평가 관점에 서 있던 사용자는 지표 선택으로 옮긴다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { completedStepIds: ["upload"], currentStepId: "perspective" },
      5,
    );

    expect(migrated.currentStepId).toBe("metrics");
    expect(migrated.completedStepIds).toEqual(["upload"]);
  });

  it("이미 적어둔 평가 관점 답은 그대로 둔다 — 같은 질문을 다시 묻지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const answers = { usageMode: { text: "Batch" } };
    const migrated = migrateWorkflowState(
      { completedStepIds: [], currentStepId: "perspective", composerPerspective: answers },
      5,
    );

    expect(migrated.composerPerspective).toEqual(answers);
  });

  it("v4 저장분도 v6 까지 한 번에 올라간다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    // 구 번호 2 는 지표 선택이다 — 평가 관점은 번호 체계에 없었으므로 끼어들 여지가 없다.
    const migrated = migrateWorkflowState({ completedSteps: [1, 2], currentStep: 3 }, 4);

    expect(migrated.completedStepIds).toEqual(["upload", "metrics"]);
    expect(migrated.currentStepId).toBe("mapping");
  });
});

/**
 * v6 → v7 — 선택지와 칸 이름이 영어가 됐다.
 *
 * 이 둘은 화면에 그리는 라벨이면서 **저장되는 값 자체**다. 옛 한국어 값을 그대로 두면
 * 라디오는 빈 채로 열리는데 필수 점검은 통과하는 모순이 생긴다 — 저장된 값이 "비어 있지
 * 않다"는 것만 보기 때문이다.
 */
describe("persist 마이그레이션 v6 → v7 — 선택지가 영어가 됐다", () => {
  it("⑥ ⑦ ⑧ ⑨ 의 옛 입력을 비운다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      {
        composerTrainingData: { channelEffects: { choices: ["알려진 것 없음"] } },
        composerTestData: { testSourceRelation: { text: "같음" } },
        composerGroundTruth: { labelAuthor: { text: "전문가" } },
        composerModelEnv: { runtimeEnv: { entries: [{ key: "운영체제", value: "Ubuntu" }] } },
      },
      6,
    );

    expect(migrated.composerTrainingData).toEqual({});
    expect(migrated.composerTestData).toEqual({});
    expect(migrated.composerGroundTruth).toEqual({});
    expect(migrated.composerModelEnv).toEqual({});
  });

  it("⑤ 평가 관점은 남긴다 — 선택지가 이미 영어였다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const answers = { usageMode: { text: "Batch" }, criticalErrorType: { text: "Missed (FN)" } };
    const migrated = migrateWorkflowState({ composerPerspective: answers }, 6);

    expect(migrated.composerPerspective).toEqual(answers);
  });

  it("진행 표시는 건드리지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { completedStepIds: ["upload", "metrics"], currentStepId: "mapping" },
      6,
    );

    expect(migrated.completedStepIds).toEqual(["upload", "metrics"]);
    expect(migrated.currentStepId).toBe("mapping");
  });
});

/**
 * v7 → v8 — 평가 결과 단계가 폐지되고 Details 가 선택 카드 단계 앞으로 왔다
 * (docs/WORKFLOW_REDESIGN.md §11).
 *
 * 남은 단계는 이름이 그대로라 손대지 않는다. 버리는 것은 진행 표시에 남은 `"summary"` 뿐이다.
 */
describe("persist 마이그레이션 v7 → v8 — 평가 결과 단계가 폐지됐다", () => {
  it("완료 목록에서 평가 결과를 지운다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      {
        completedStepIds: ["upload", "metrics", "mapping", "validation", "summary"],
        currentStepId: "dataInfo",
      },
      7,
    );

    expect(migrated.completedStepIds).toEqual(["upload", "metrics", "mapping", "validation"]);
    expect(migrated.currentStepId).toBe("dataInfo");
  });

  it("평가 결과에 서 있던 사용자는 Details 로 옮긴다 — 검증 다음 단계다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { completedStepIds: ["upload", "metrics", "mapping", "validation"], currentStepId: "summary" },
      7,
    );

    expect(migrated.currentStepId).toBe("clientInfo");
  });

  it("입력값은 건드리지 않는다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const values = { algorithm: { text: "XGBoost" } };
    const migrated = migrateWorkflowState(
      { composerModelEnv: values, completedStepIds: [], currentStepId: "upload" },
      7,
    );

    expect(migrated.composerModelEnv).toEqual(values);
  });
});

/**
 * v8 → v9 — 입력 형태를 재료 목록에 맞췄다.
 *
 * v6 → v7 은 선택지가 통째로 바뀌어 비웠지만 여기는 **같은 답을 다른 그릇에 담는 것**이라
 * 옮긴다. 옮길 수 없는 자유 텍스트만 버린다 — 틀리게 옮긴 숫자가 성적서에 찍히는 것보다
 * 빈 칸으로 다시 묻는 편이 안전하다.
 */
describe("persist 마이그레이션 v8 → v9 — 입력 형태 변경", () => {
  const migrate = async (state: Record<string, unknown>) => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    return migrateWorkflowState(state, 8);
  };

  it("② 카드 값 그룹을 채운다", async () => {
    const migrated = await migrate({});
    expect(migrated.composerMetrics).toEqual({});
  });

  it("Report notes 메모를 ⑥ 학습 데이터 설명으로 옮긴다 — 이미 그 이름으로 인쇄되고 있었다", async () => {
    const migrated = await migrate({
      datasetInfo: { trainingDatasetName: "Logs", trainingDataDescription: "Evaluated on Q1 data." },
      composerTrainingData: {},
    });

    expect(migrated.composerTrainingData.trainingDescription).toEqual({
      text: "Evaluated on Q1 data.",
    });
    // 체인이 v10 까지 이어져 나머지 폼 값도 ⑥ 으로 옮겨지고 폼 저장소는 사라진다.
    expect(migrated.composerTrainingData.trainingDatasetName).toEqual({ text: "Logs" });
    expect(migrated.datasetInfo).toBeUndefined();
  });

  it("⑥ 에 이미 설명이 있으면 덮지 않는다", async () => {
    const migrated = await migrate({
      datasetInfo: { trainingDataDescription: "old memo" },
      composerTrainingData: { trainingDescription: { text: "card text" } },
    });

    expect(migrated.composerTrainingData.trainingDescription).toEqual({ text: "card text" });
  });

  it("편향 감소 노력: 하나 고른 답을 여럿 고르기로 옮긴다", async () => {
    const migrated = await migrate({
      composerTrainingData: { imbalanceHandling: { text: "Did nothing", unknown: false } },
    });

    expect(migrated.composerTrainingData.imbalanceHandling).toEqual({
      choices: ["Did nothing"],
      unknown: false,
    });
  });

  it("라벨러 수·일치도: 한 칸 글을 두 칸 숫자로 옮긴다", async () => {
    const migrated = await migrate({
      composerGroundTruth: { labelAgreement: { text: "3명 · 82%" } },
    });

    // 체인이 v11 까지 이어져 일치도는 "단순 일치율" 종류와 값으로 나뉜다(% 로 받던 칸이다).
    expect(migrated.composerGroundTruth).toEqual({
      labelReviewerCount: { text: "3" },
      labelAgreementKind: { text: "Percent agreement" },
      labelAgreementValue: { text: "82" },
    });
  });

  it("라벨러 수·일치도: 숫자를 찾지 못하면 옛 값을 버린다", async () => {
    const migrated = await migrate({
      composerGroundTruth: { labelAgreement: { text: "several, mostly agreed" } },
    });

    expect(migrated.composerGroundTruth).toEqual({});
  });

  it("수집 기간: 'YYYY-MM ~ YYYY-MM' 을 시작 월·끝 월로 옮긴다", async () => {
    const migrated = await migrate({
      composerTrainingData: { trainingPeriod: { text: "2023-01 ~ 2024-12" } },
      composerTestData: { testPeriod: { text: "spring 2025" } },
    });

    expect(migrated.composerTrainingData.trainingPeriod).toEqual({
      entries: [
        { key: "From", value: "2023-01" },
        { key: "To", value: "2024-12" },
      ],
    });
    // 형식이 다른 글은 옮길 수 없어 버린다.
    expect(migrated.composerTestData.testPeriod).toBeUndefined();
  });

  it("진행 표시는 건드리지 않는다", async () => {
    const migrated = await migrate({
      completedStepIds: ["upload", "metrics"],
      currentStepId: "mapping",
    });

    expect(migrated.completedStepIds).toEqual(["upload", "metrics"]);
    expect(migrated.currentStepId).toBe("mapping");
  });
});

/**
 * v9 → v10 — Details 의 학습 데이터 폼(`datasetInfo`)을 ⑥ 카드로 합쳤다.
 *
 * 같은 값을 두 화면에서 받던 것을 하나로 줄였다. 폼에 적은 값은 ⑥ 의 같은 칸으로 옮기고,
 * 폼 저장소는 지운다.
 */
describe("persist 마이그레이션 v9 → v10 — 학습 데이터 폼을 ⑥ 으로", () => {
  const migrate = async (state: Record<string, unknown>) => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    return migrateWorkflowState(state, 9);
  };

  it("이름·건수·형식을 ⑥ 으로 옮기고 폼 저장소를 지운다", async () => {
    const migrated = await migrate({
      datasetInfo: {
        trainingDatasetName: "Customer logs 2024",
        trainingSampleCount: "12000",
        validationSampleCount: "3000",
        trainingDataFormat: "CSV",
        trainingClassDistribution: "normal 8400 / churn 3600",
      },
      composerTrainingData: {},
    });

    expect(migrated.datasetInfo).toBeUndefined();
    expect(migrated.composerTrainingData).toEqual({
      trainingDatasetName: { text: "Customer logs 2024" },
      trainingVolume: {
        entries: [
          { key: "Training", value: "12000" },
          { key: "Validation", value: "3000" },
        ],
      },
      trainingDataFormat: { text: "CSV" },
    });
  });

  it("클래스 분포는 옮기지 않는다 — 한 줄 글을 클래스별 칸으로 쪼개면 틀릴 수 있다", async () => {
    const migrated = await migrate({
      datasetInfo: { trainingClassDistribution: "normal 8400 / churn 3600" },
    });

    expect(migrated.composerTrainingData.trainingClassVolume).toBeUndefined();
  });

  it("⑥ 에 이미 적은 값은 덮지 않는다", async () => {
    const migrated = await migrate({
      datasetInfo: { trainingDatasetName: "form name", trainingSampleCount: "1" },
      composerTrainingData: {
        trainingDatasetName: { text: "card name" },
        trainingVolume: { unknown: true },
      },
    });

    expect(migrated.composerTrainingData.trainingDatasetName).toEqual({ text: "card name" });
    expect(migrated.composerTrainingData.trainingVolume).toEqual({ unknown: true });
  });

  it("카드 선택은 건드리지 않는다 — 켜는 것은 사용자의 결정이다", async () => {
    const cards = { trainingData: false, testData: false, groundTruth: false, modelEnv: false };
    const migrated = await migrate({
      datasetInfo: { trainingDatasetName: "x" },
      composerCards: cards,
    });

    expect(migrated.composerCards).toEqual(cards);
  });
});

/**
 * v10 → v11 — 문서에서 정할 것으로 남았던 항목을 정했다(서술 설계 D41~D44).
 *
 * 전처리 세 칸은 ⑦ 한 칸으로, 라벨 일치도는 종류 + 값으로 바뀌었고, 성적서 용도에 덧붙이는
 * 글이 생겼다. 적어 둔 글은 버리지 않고 옮긴다.
 */
describe("persist 마이그레이션 v10 → v11 — 전처리 한 칸, 일치도 종류, 용도 덧붙임", () => {
  const migrate = async (state: Record<string, unknown>) => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    return migrateWorkflowState(state, 10);
  };

  it("전처리 세 칸을 ⑦ 한 칸으로 옮긴다 — 고른 답은 짝을 찾고, 적은 글은 덧붙임으로 남긴다", async () => {
    const migrated = await migrate({
      composerTrainingData: { preprocessing: { text: "Normalized" } },
      composerTestData: {
        testPreprocessing: { text: "Different from training" },
        testPreprocessingDetail: { text: "Dropped outliers" },
      },
    });

    // v11 은 ⑦ 에 만들고 v13 이 ⑥ 으로 옮긴다 — 체인 끝에서는 ⑥ 에 있다.
    expect(migrated.composerTrainingData.preprocessingMatch).toEqual({
      text: "Different",
      note: "Training: Normalized / Test: Dropped outliers",
    });
    expect(migrated.composerTestData).toEqual({});
    expect(migrated.composerTrainingData.preprocessing).toBeUndefined();
  });

  it('"모름"은 모름으로, "전처리 없음"은 짝이 없어 글로 남긴다', async () => {
    expect(
      (await migrate({ composerTestData: { testPreprocessing: { unknown: true } } })).composerTrainingData
        .preprocessingMatch,
    ).toEqual({ text: "Unknown" });
    expect(
      (await migrate({ composerTestData: { testPreprocessing: { text: "None" } } })).composerTrainingData
        .preprocessingMatch,
    ).toEqual({ note: "Test: no preprocessing" });
  });

  it("옛 일치도(%)는 단순 일치율로 옮긴다", async () => {
    const migrated = await migrate({
      composerGroundTruth: { labelAgreementRate: { text: "82" } },
    });

    expect(migrated.composerGroundTruth).toEqual({
      labelAgreementKind: { text: "Percent agreement" },
      labelAgreementValue: { text: "82" },
    });
  });

  it("성적서 용도 덧붙임 칸을 채운다 — 얕은 merge 라 옛 basicInfo 에는 없다", async () => {
    const migrated = await migrate({ basicInfo: { companyName: "Test Corp" } });

    expect(migrated.basicInfo).toEqual({ companyName: "Test Corp", reportPurposeNote: "" });
  });
});

/**
 * v11 → v12 — 재료 고르기(docs/MATERIAL_PICKER.md §7). 카드마다 저장한 체크가 생겼다.
 *
 * 진행 중이던 사용자가 재료 고르기에서 다시 막히지 않게 지금 상태를 저장된 것으로 옮긴다.
 */
describe("persist 마이그레이션 v11 → v12 — 재료 고르기 저장 상태", () => {
  const migrate = async (state: object) => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    return migrateWorkflowState(state, 11);
  };

  it("필수 카드는 모두 저장된 것으로 본다 — 다음에서 막히지 않는다", async () => {
    const migrated = await migrate({ taskType: "binary", composerCards: {} });

    for (const id of ["clientInfo", "model", "evalData", "perspective", "metrics"]) {
      expect(migrated.materialPicks[id], id).toEqual([]);
    }
  });

  it("켜져 있던 선택 카드는 권장 항목을 모두 고른 채 저장한다 — 종전 규칙과 같은 뜻이다", async () => {
    const migrated = await migrate({
      taskType: "binary",
      composerCards: { trainingData: false, testData: false, groundTruth: false, modelEnv: true },
    });

    expect(migrated.materialPicks.modelEnv).toEqual(["algorithm", "hyperparameters", "runtimeEnv", "gpuUsage"]);
    expect(migrated.materialPicks.trainingData).toBeUndefined();
  });

  it("이미 적어 둔 선택 항목은 고른 것으로 옮긴다", async () => {
    const migrated = await migrate({
      taskType: "binary",
      composerCards: { trainingData: true, testData: false, groundTruth: false, modelEnv: false },
      composerTrainingData: { trainingNotes: { text: "이틀 뺐음" }, trainingDataFormat: { text: "" } },
      basicInfo: { website: "https://example.com", fax: "", projectNumber: "P-1" },
    });

    expect(migrated.materialPicks.trainingData).toContain("trainingNotes");
    expect(migrated.materialPicks.trainingData).not.toContain("trainingDataFormat");
    expect(migrated.materialPicks.clientInfo).toEqual(["contactExtra:website", "projectNumber"]);
  });
});

describe("멀티레이블 기본 핵심 지표가 추천에 있다 (재료 목록 7절)", () => {
  it("F1(M4)과 Jaccard(M17)가 모두 추천 지표다 — 핵심 지표가 F1 하나로 줄지 않는다", async () => {
    const { resolveCoreMetricIds } = await import("../lib/report/computeVerdict");
    const recommended = getRecommendedMetricIds("multilabel");

    expect(recommended).toEqual(expect.arrayContaining(["M4", "M17"]));
    expect(resolveCoreMetricIds("multilabel", recommended)).toEqual(["M4", "M17"]);
  });
});

/**
 * v12 → v13 — 학습·평가 전처리 일치가 ⑦ 에서 ⑥ 으로 옮겨 갔다(재료 목록 4절 "AI 예" — ⑦ 을 넣지
 * 않으면 학습 데이터를 넣어도 값이 AI 로 가지 않던 문제).
 */
describe("persist 마이그레이션 v12 → v13 — 전처리 일치를 ⑥ 으로", () => {
  const migrate = async (state: Record<string, unknown>) => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");
    return migrateWorkflowState(state, 12);
  };

  it("적어 둔 값과 체크를 ⑥ 으로 옮긴다", async () => {
    const migrated = await migrate({
      composerTestData: { testDataSource: { text: "Q1 logs" }, preprocessingMatch: { text: "Same" } },
      composerTrainingData: {},
      materialPicks: { testData: ["testDataSource", "preprocessingMatch"], trainingData: ["trainingDatasetName"] },
      composerCards: { trainingData: true, testData: true, groundTruth: false, modelEnv: false },
    });

    expect(migrated.composerTrainingData.preprocessingMatch).toEqual({ text: "Same" });
    expect(migrated.composerTestData).toEqual({ testDataSource: { text: "Q1 logs" } });
    expect(migrated.materialPicks.testData).toEqual(["testDataSource"]);
    expect(migrated.materialPicks.trainingData).toEqual(["trainingDatasetName", "preprocessingMatch"]);
    expect(migrated.composerCards.testData).toBe(true);
  });

  it("⑦ 에 그 체크만 있었다면 ⑦ 은 빠진다", async () => {
    const migrated = await migrate({
      composerTestData: { preprocessingMatch: { text: "Different" } },
      materialPicks: { testData: ["preprocessingMatch"] },
      composerCards: { trainingData: false, testData: true, groundTruth: false, modelEnv: false },
    });

    expect(migrated.materialPicks.testData).toEqual([]);
    expect(migrated.composerCards.testData).toBe(false);
  });

  it("⑥ 에 이미 값이 있으면 그것을 둔다", async () => {
    const migrated = await migrate({
      composerTestData: { preprocessingMatch: { text: "Different" } },
      composerTrainingData: { preprocessingMatch: { text: "Same" } },
    });

    expect(migrated.composerTrainingData.preprocessingMatch).toEqual({ text: "Same" });
  });
});
