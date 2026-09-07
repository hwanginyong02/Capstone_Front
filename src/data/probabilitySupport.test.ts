import { describe, it, expect, beforeEach } from "vitest";
import {
  MAPPABLE_ROLES_BY_TASK,
  PREDICTION_ROLE_ALTERNATIVES,
  resolveMissingRoleCodes,
  getRequiredColumnsForSelection,
  type TaskType,
  type RequiredColumnCode,
} from "./evaluationData";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";

/**
 * ISSUES.md A-01·A-02 (2026-09-07 ★확정된 제품 결정 1) — 확률·점수 전면 지원.
 *
 * 하드 예측(y_pred) 없이 확률만 매핑해도 매핑 화면이 '다음'을 허용해야 한다.
 * 종전에는 확률 역할이 드롭다운에서 아예 빠져 있었고, 요구 역할표가 y_pred 를
 * 무조건 요구해 화면이 진행을 하드 차단했다.
 */

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("확률 역할이 매핑 가능 역할로 돌아왔다 (A-02)", () => {
  it.each([
    ["binary", "score"],
    ["multiclass", "prob_class_*"],
    ["multilabel", "prob_label_*"],
  ] as Array<[TaskType, RequiredColumnCode]>)(
    "%s 드롭다운에 %s 가 있다",
    (taskType, code) => {
      expect(MAPPABLE_ROLES_BY_TASK[taskType]).toContain(code);
    },
  );

  it("확률 역할이 백엔드 역할로 정확히 번역된다(ignore 로 강등되지 않는다)", () => {
    expect(translateRoleToBackend("prob_class_*", "multiclass")).toBe("prob_per_class");
    expect(translateRoleToBackend("prob_label_*", "multilabel")).toBe("score_per_label");
    expect(translateRoleToBackend("score", "binary")).toBe("score_positive");
  });
});

describe("예측 역할의 대체 규칙 (백엔드 PREDICTION_ROLES_BY_TASK 의 거울)", () => {
  it.each(TASK_TYPES)("%s 의 대체 역할이 정의돼 있다", (taskType) => {
    const { primary, alternatives } = PREDICTION_ROLE_ALTERNATIVES[taskType];
    expect(primary).toBe("y_pred");
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives).not.toContain(primary);
  });

  it("대체 역할은 전부 매핑 가능한 역할이다", () => {
    for (const taskType of TASK_TYPES) {
      const mappable = new Set(MAPPABLE_ROLES_BY_TASK[taskType]);
      for (const alt of PREDICTION_ROLE_ALTERNATIVES[taskType].alternatives) {
        expect(mappable.has(alt), `${taskType}: ${alt}`).toBe(true);
      }
    }
  });
});

describe("resolveMissingRoleCodes — 확률이 y_pred 를 대신한다 (A-01)", () => {
  const required = (taskType: TaskType) =>
    getRequiredColumnsForSelection(taskType, ["M1"]).map((c) => c.code);

  it.each([
    ["binary", "score"],
    ["multiclass", "prob_class_*"],
    ["multilabel", "prob_label_*"],
  ] as Array<[TaskType, RequiredColumnCode]>)(
    "%s: 확률(%s)만 매핑해도 y_pred 가 누락으로 잡히지 않는다",
    (taskType, probCode) => {
      const counts: Record<string, number> = { id: 1, y_true: 1, [probCode]: 2 };
      expect(resolveMissingRoleCodes(taskType, required(taskType), counts)).not.toContain("y_pred");
    },
  );

  it("정답도 확률도 없으면 여전히 누락으로 잡는다", () => {
    const missing = resolveMissingRoleCodes("binary", required("binary"), { id: 1 });
    expect(missing).toContain("y_true");
    expect(missing).toContain("y_pred");
  });

  it("확률 역할 자체가 요구될 때는 대체되지 않는다(M9 는 score 가 필수)", () => {
    const codes = getRequiredColumnsForSelection("binary", ["M9"]).map((c) => c.code);
    const missing = resolveMissingRoleCodes("binary", codes, { id: 1, y_true: 1, y_pred: 1 });
    expect(missing).toContain("score");
  });
});

describe("결정 임계값 (decisionThreshold) — 성적서 합격 목표값과 다른 개념", () => {
  beforeEach(() => {
    useWorkflowStore.setState({ decisionThreshold: null });
  });

  it("store 에 전용 필드가 있고 기본값은 미설정이다", () => {
    expect(useWorkflowStore.getState().decisionThreshold).toBeNull();
  });

  it("설정한 값이 보존된다", () => {
    useWorkflowStore.getState().setDecisionThreshold(0.7);
    expect(useWorkflowStore.getState().decisionThreshold).toBe(0.7);
  });

  it("resetWorkflow 가 초기화한다", () => {
    useWorkflowStore.getState().setDecisionThreshold(0.7);
    useWorkflowStore.getState().resetWorkflow();
    expect(useWorkflowStore.getState().decisionThreshold).toBeNull();
  });

  it("성적서 합격 목표값(metricDetails.targetValue)과 별개 필드다", () => {
    useWorkflowStore.getState().setDecisionThreshold(0.7);
    const state = useWorkflowStore.getState();
    expect(state.metricDetails).not.toHaveProperty("decisionThreshold");
    expect(state.decisionThreshold).toBe(0.7);
  });
});
