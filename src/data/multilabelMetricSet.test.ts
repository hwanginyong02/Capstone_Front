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
