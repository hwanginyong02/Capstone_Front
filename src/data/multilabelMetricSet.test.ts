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

    // 선택 카드 4개가 모두 켜진 상태(프리셋 "전체")로 시작한다.
    expect(migrated.composerCards).toEqual({
      trainingData: true,
      testData: true,
      groundTruth: true,
      modelEnv: true,
    });
    expect(migrated.composerPerspective).toEqual({});
    expect(migrated.composerTrainingData).toEqual({});
    expect(migrated.composerTestData).toEqual({});
    expect(migrated.composerGroundTruth).toEqual({});
    expect(migrated.composerModelEnv).toEqual({});
  });

  it("v3 의 기존 입력과 진행 표시는 그대로 둔다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "binary", selectedMetricIds: ["M1", "M9"], completedSteps: [1, 2], currentStep: 3 },
      3,
    );

    // v2 → v3 과 달리 버릴 것이 없다 — 기존 키의 뜻이 하나도 바뀌지 않았다.
    expect(migrated.selectedMetricIds).toEqual(["M1", "M9"]);
    expect(migrated.completedSteps).toEqual([1, 2]);
    expect(migrated.currentStep).toBe(3);
  });

  it("v1 저장분도 v4 까지 한 번에 올라간다", async () => {
    const { migrateWorkflowState } = await import("../utils/stores/useWorkflowStore");

    const migrated = migrateWorkflowState(
      { taskType: "multilabel", selectedMetricIds: ["M1", "M4"], completedSteps: [1, 2, 3] },
      1,
    );

    // v1 → v2 의 지표 정리, v2 → v3 의 진행 초기화, v3 → v4 의 신규 키가 모두 적용된다.
    expect(migrated.selectedMetricIds).toEqual(["M4"]);
    expect(migrated.completedSteps).toEqual([]);
    expect(migrated.composerCards.modelEnv).toBe(true);
  });
});
