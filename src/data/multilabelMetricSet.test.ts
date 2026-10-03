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
    expect(migrated.currentStepId).toBe("summary");
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

    // 평가 관점·데이터 정보·모델과 환경·의뢰자 정보는 들어 있지 않다.
    expect(migrated.completedStepIds).toEqual([
      "upload",
      "metrics",
      "mapping",
      "validation",
      "summary",
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
