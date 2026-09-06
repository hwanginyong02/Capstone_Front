import { describe, it, expect } from "vitest";
import {
  METRICS,
  MAPPABLE_ROLES_BY_TASK,
  PREDICTION_ROLE_ALTERNATIVES,
  getRequiredColumnsForMetric,
  type TaskType,
  type RequiredColumnCode,
} from "./evaluationData";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";

/**
 * 프론트 REQUIRED_COLUMNS_BY_METRIC ↔ 백엔드 METRIC_REQUIREMENTS 교차 레포 계약 테스트.
 *
 * 두 표가 어긋나면 사용자는 "화면이 시킨 대로 매핑했는데 /api/confirm-mapping 이 거부"하는
 * 상황을 만난다. 실제로 M6(프론트가 확률을 요구, 백엔드는 y_pred를 요구)와
 * M18/M23 이 이 상태로 배포되어 있었고, 양쪽 어디에도 이를 잡는 테스트가 없었다.
 *
 * 아래 BACKEND_METRIC_REQUIREMENTS 는 Capstone_Back/app/core/schemas.py 의 고정 사본이다.
 * 백엔드 표를 바꾸면 여기도 같이 바꿔야 하며, 어긋나면 이 테스트가 깨진다.
 */
const BACKEND_METRIC_REQUIREMENTS: Record<TaskType, Record<string, string[]>> = {
  binary: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M7: ["y_true", "y_pred"],
    M8: ["y_true", "y_pred"],
    M9: ["y_true", "score_positive"],
    M10: ["y_true", "score_positive"],
    M19: ["y_true", "score_positive"],
    M20: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multiclass: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M11: ["y_true", "y_pred"],
    M12: ["y_true", "y_pred"],
    M13: ["y_true", "y_pred"],
    M14: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multilabel: {
    // M6 는 multilabel 미지원(백엔드 계산 함수가 1-D 라벨만 처리) — 표에서 제외되어 있다.
    M1: ["true_labels", "pred_labels"],
    M2: ["true_labels", "pred_labels"],
    M3: ["true_labels", "pred_labels"],
    M4: ["true_labels", "pred_labels"],
    M5: ["true_labels", "pred_labels"],
    M11: ["true_labels", "pred_labels"],
    M12: ["true_labels", "pred_labels"],
    M13: ["true_labels", "pred_labels"],
    M15: ["true_labels", "pred_labels"],
    M16: ["true_labels", "pred_labels"],
    M17: ["true_labels", "pred_labels"],
    M18: ["true_labels", "pred_labels"],
    M21: ["true_labels", "pred_labels"],
    M22: ["true_labels", "pred_labels"],
    M23: ["true_labels"],
  },
};

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

/** 지표 요구사항과 무관한 역할(모든 지표에 공통이거나 선택 컬럼). */
const NON_METRIC_ROLES = new Set(["sample_id", "latency", "ignore"]);

const PROBABILITY_CODES = new Set<RequiredColumnCode>(["score", "prob_class_*", "prob_label_*"]);

function frontendRolesFor(taskType: TaskType, metricId: string): string[] {
  const roles = getRequiredColumnsForMetric(taskType, metricId)
    .map((column) => translateRoleToBackend(column.code, taskType))
    .filter((role) => !NON_METRIC_ROLES.has(role));
  return [...new Set(roles)].sort();
}

function isExposedByFrontend(taskType: TaskType, metricId: string): boolean {
  return METRICS.find((m) => m.id === metricId)?.supportedTaskTypes.includes(taskType) ?? false;
}

describe("REQUIRED_COLUMNS_BY_METRIC ↔ 백엔드 METRIC_REQUIREMENTS", () => {
  for (const taskType of TASK_TYPES) {
    it(`${taskType}: 프론트가 요구하는 컬럼이 백엔드 요구 역할과 일치한다`, () => {
      const backendTable = BACKEND_METRIC_REQUIREMENTS[taskType];
      const mismatches = Object.keys(backendTable)
        .filter((metricId) => isExposedByFrontend(taskType, metricId))
        .map((metricId) => ({
          metricId,
          frontend: frontendRolesFor(taskType, metricId),
          backend: [...backendTable[metricId]].sort(),
        }))
        .filter(({ frontend, backend }) => frontend.join() !== backend.join());

      expect(mismatches).toEqual([]);
    });

    it(`${taskType}: 프론트가 노출하는 지표는 백엔드 표에 모두 존재한다`, () => {
      const missing = METRICS.filter((m) => m.supportedTaskTypes.includes(taskType))
        .map((m) => m.id)
        .filter((id) => !(id in BACKEND_METRIC_REQUIREMENTS[taskType]));

      expect(missing).toEqual([]);
    });
  }

  /**
   * 백엔드 app/core/schemas.py VALID_ROLES_BY_TASK 의 고정 사본.
   * 매핑 화면 드롭다운이 이 목록을 벗어나면, 사용자가 고른 역할이 백엔드 변환에서
   * 조용히 "ignore" 로 강등되어 해당 컬럼이 평가에서 빠진다.
   */
  const BACKEND_VALID_ROLES: Record<TaskType, string[]> = {
    binary: ["sample_id", "y_true", "y_pred", "score_positive", "latency"],
    // 확률 역할은 세 task 모두에서 정식 입력이다(2026-09-07 결정 1) — 하드 예측이 없으면
    // 백엔드가 확률에서 예측을 파생한다. BACKEND_PREDICTION_ROLES 참조.
    multiclass: ["sample_id", "y_true", "y_pred", "prob_per_class", "latency"],
    multilabel: ["sample_id", "true_labels", "pred_labels", "score_per_label", "latency"],
  };

  /**
   * 백엔드 app/core/schemas.py PREDICTION_ROLES_BY_TASK 의 고정 사본.
   * 이 표가 어긋나면 화면이 허용한 매핑을 백엔드가 거절하거나(또는 그 반대),
   * 확률만 제출한 사용자가 어느 한쪽에서만 막힌다(ISSUES.md A-01·A-02).
   */
  const BACKEND_PREDICTION_ROLES: Record<TaskType, { primary: string; alternatives: string[] }> = {
    binary: { primary: "y_pred", alternatives: ["score_positive"] },
    multiclass: { primary: "y_pred", alternatives: ["prob_per_class"] },
    multilabel: { primary: "pred_labels", alternatives: ["score_per_label"] },
  };

  for (const taskType of TASK_TYPES) {
    it(`${taskType}: 예측 역할의 대체 규칙이 백엔드와 일치한다`, () => {
      const front = PREDICTION_ROLE_ALTERNATIVES[taskType];
      const translated = {
        primary: translateRoleToBackend(front.primary, taskType),
        alternatives: front.alternatives.map((code) => translateRoleToBackend(code, taskType)).sort(),
      };

      expect(translated).toEqual({
        primary: BACKEND_PREDICTION_ROLES[taskType].primary,
        alternatives: [...BACKEND_PREDICTION_ROLES[taskType].alternatives].sort(),
      });
    });
  }

  for (const taskType of TASK_TYPES) {
    it(`${taskType}: 매핑 가능 역할이 백엔드 허용 역할과 일치한다`, () => {
      const translated = MAPPABLE_ROLES_BY_TASK[taskType]
        .map((code) => translateRoleToBackend(code, taskType))
        .sort();

      expect(translated).toEqual([...BACKEND_VALID_ROLES[taskType]].sort());
    });

    it(`${taskType}: 필수 컬럼은 모두 매핑 가능한 역할이다`, () => {
      const mappable = new Set<RequiredColumnCode>(MAPPABLE_ROLES_BY_TASK[taskType]);
      const required = METRICS.filter((m) => m.supportedTaskTypes.includes(taskType)).flatMap((m) =>
        getRequiredColumnsForMetric(taskType, m.id).map((c) => c.code),
      );

      expect([...new Set(required)].filter((code) => !mappable.has(code))).toEqual([]);
    });
  }

  it("probabilityRequiredFor 는 실제로 확률 컬럼을 요구하는 지표에만 붙는다", () => {
    const inconsistent = METRICS.flatMap((metric) =>
      (metric.probabilityRequiredFor ?? []).map((taskType) => ({
        metricId: metric.id,
        taskType,
        requiredColumns: getRequiredColumnsForMetric(taskType, metric.id).map((c) => c.code),
      })),
    ).filter(({ requiredColumns }) => !requiredColumns.some((code) => PROBABILITY_CODES.has(code)));

    expect(inconsistent).toEqual([]);
  });
});
