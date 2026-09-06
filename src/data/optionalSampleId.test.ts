import { describe, it, expect } from "vitest";
import {
  MAPPABLE_ROLES_BY_TASK,
  METRICS,
  getRequiredColumnsForMetric,
  getRequiredColumnsForSelection,
  getRequiredColumnsForTaskType,
  resolveMissingRoleCodes,
  type TaskType,
} from "./evaluationData";
import { getMappingValidityReason } from "../utils/domain/mappingValidity";

/**
 * ISSUES.md A-13 (2026-09-07 ★확정된 제품 결정 3 — "`id` 를 선택으로 되돌림").
 *
 * SPEC §0 은 `id` 를 **선택(권장)** 으로 규정하고 백엔드 `METRIC_REQUIREMENTS` 에도
 * `sample_id` 가 한 번도 없다. 그런데 프론트 `REQUIRED_COLUMNS_BY_METRIC` 의 43개
 * 항목이 전부 `"id"` 로 시작해, 매핑 화면이 '다음' 버튼을 **하드 차단**했다.
 * 그래서 id 컬럼이 없는 데이터셋은 백엔드까지 요청이 가보지도 못했다.
 *
 * 계약 테스트가 이를 잡지 못한 이유는 `NON_METRIC_ROLES` 필터가 `sample_id` 를
 * 비교에서 빼고 있었기 때문이다. 그 필터가 3자 불일치를 정확히 가리고 있었다.
 */

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("A-13 — id 는 어떤 지표의 필수 컬럼도 아니다", () => {
  it.each(TASK_TYPES)("%s: 어떤 지표의 요구 컬럼에도 id 가 없다", (taskType) => {
    const offenders = METRICS.filter((m) => m.supportedTaskTypes.includes(taskType))
      .map((m) => ({ id: m.id, codes: getRequiredColumnsForMetric(taskType, m.id).map((c) => c.code) }))
      .filter((r) => r.codes.includes("id"));

    expect(offenders).toEqual([]);
  });

  it.each(TASK_TYPES)("%s: 선택 지표 전체의 요구 컬럼에도 id 가 없다", (taskType) => {
    const ids = METRICS.filter((m) => m.supportedTaskTypes.includes(taskType)).map((m) => m.id);
    expect(getRequiredColumnsForSelection(taskType, ids).map((c) => c.code)).not.toContain("id");
  });

  it.each(TASK_TYPES)("%s: task 전체 요구 컬럼에도 id 가 없다", (taskType) => {
    expect(getRequiredColumnsForTaskType(taskType).map((c) => c.code)).not.toContain("id");
  });

  it("id 를 매핑하지 않아도 '다음'이 막히지 않는다", () => {
    const required = getRequiredColumnsForSelection("binary", ["M1"]).map((c) => c.code);
    const missing = resolveMissingRoleCodes("binary", required, { y_true: 1, y_pred: 1 });

    expect(missing).toEqual([]);
    expect(
      getMappingValidityReason({
        taskType: "binary",
        selectedMetricIds: ["M1"],
        assignedRoleCount: 2,
        missingRoleCodes: missing,
        duplicateRoleCount: 0,
        positiveClass: "1",
      }),
    ).toBe("ok");
  });

  it.each(TASK_TYPES)("%s: id 는 여전히 매핑 가능한 역할이다(선택·권장이므로 선택지에는 남는다)", (taskType) => {
    expect(MAPPABLE_ROLES_BY_TASK[taskType]).toContain("id");
  });

  it("정답 컬럼 누락은 여전히 막는다(과잉 완화 방지)", () => {
    const required = getRequiredColumnsForSelection("binary", ["M1"]).map((c) => c.code);
    expect(resolveMissingRoleCodes("binary", required, { id: 1 })).toContain("y_true");
  });
});

describe("A-05 — 성적서 5절에 인쇄되는 M18 산정식이 실제 구현과 같다", () => {
  /**
   * 구현은 레이블 빈도 벡터의 **코사인 거리**(1 - cos_sim)다
   * (Capstone_Back/app/evaluation/metrics/multilabel.py `calculate_distribution_diff_ml`).
   * 인쇄되던 문자열은 M14(multiclass)의 TVD 식이라, 독자가 그 식으로 재계산하면
   * 성적서의 수치와 다른 값이 나왔다. SPEC §3 은 이미 코사인 거리로 정정돼 있었다.
   */
  const formulaOf = (id: string) => METRICS.find((m) => m.id === id)?.formula ?? "";

  it("M18 은 코사인 거리로 적혀 있다", () => {
    expect(formulaOf("M18")).toMatch(/cos/i);
  });

  it("M18 은 TVD 식(0.5 * ∑ |P - Q|)이 아니다", () => {
    expect(formulaOf("M18")).not.toContain("0.5 * ∑");
  });

  it("M14 는 TVD 그대로다(구현이 실제로 TVD 이므로)", () => {
    expect(formulaOf("M14")).toContain("0.5 * ∑");
  });

  it("M14 와 M18 은 서로 다른 식이다", () => {
    expect(formulaOf("M18")).not.toBe(formulaOf("M14"));
  });
});
