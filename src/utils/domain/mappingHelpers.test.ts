/** 매핑 화면의 상태 배지와 겹침 판정 — B12(확률만 매핑하면 y_pred 가 빨강)·B13(score 두 컬럼). */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { MULTI_COLUMN_ROLES, getColumnDisplay, type TaskType } from "../../data/evaluationData";
import { translateRoleToBackend } from "../../lib/mapping/translateRoleToBackend";
import { countDuplicateRoles, getRoleStatusLabel, isDuplicateRole } from "./mappingHelpers";

const yPred = getColumnDisplay("y_pred");
const yTrue = getColumnDisplay("y_true");

describe("필수 역할 배지 (B12)", () => {
  it("이진에서 score 만 매핑하면 y_pred 는 빨강이 아니라 '확률로 대신'", () => {
    expect(getRoleStatusLabel("binary", yPred, { y_true: 1, score: 1 })).toEqual({
      label: "확률로 대신",
      tone: "secondary",
    });
  });

  it("다중·멀티도 확률 역할이 예측을 대신한다", () => {
    expect(getRoleStatusLabel("multiclass", yPred, { "prob_class_*": 3 }).label).toBe("확률로 대신");
    expect(getRoleStatusLabel("multilabel", yPred, { "prob_label_*": 2 }).label).toBe("확률로 대신");
  });

  it("예측도 확률도 없으면 '없음'(빨강). 정답은 대신할 것이 없다", () => {
    expect(getRoleStatusLabel("binary", yPred, { y_true: 1 })).toEqual({ label: "없음", tone: "destructive" });
    expect(getRoleStatusLabel("binary", yTrue, { score: 1 })).toEqual({ label: "없음", tone: "destructive" });
    // 다른 유형의 확률 역할은 대신하지 못한다.
    expect(getRoleStatusLabel("binary", yPred, { "prob_class_*": 2 }).label).toBe("없음");
  });

  it("여러 컬럼 역할은 'n개'(영어 'n mapped' 아님), 한 컬럼 역할은 지정됨·겹침", () => {
    expect(getRoleStatusLabel("multiclass", getColumnDisplay("prob_class_*"), { "prob_class_*": 3 }).label).toBe("3개");
    expect(getRoleStatusLabel("binary", yPred, { y_pred: 1 }).label).toBe("지정됨");
    expect(getRoleStatusLabel("binary", getColumnDisplay("score"), { score: 2 })).toEqual({
      label: "겹침",
      tone: "destructive",
    });
  });
});

describe("겹침 (B13)", () => {
  it("이진 score 를 두 컬럼에 주면 겹침이라 확정이 막힌다", () => {
    expect(isDuplicateRole("score", { score: 2 })).toBe(true);
    expect(countDuplicateRoles({ y_true: 1, score: 2 })).toBe(1);
  });

  it("확률 클래스·레이블 여러 컬럼과 ignore 는 겹침이 아니다", () => {
    expect(countDuplicateRoles({ y_true: 1, "prob_class_*": 3, ignore: 4 })).toBe(0);
    expect(countDuplicateRoles({ "prob_label_*": 5 })).toBe(0);
    expect(isDuplicateRole(null, {})).toBe(false);
  });

  it("한 컬럼 역할은 둘이면 겹침", () => {
    expect(countDuplicateRoles({ y_true: 2, y_pred: 2, latency: 1 })).toBe(2);
  });
});

// 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인한다.
const backendSchemas = resolve(__dirname, "../../../../Capstone_Back/app/core/schemas.py");
describe("백엔드 대조", () => {
  it.skipIf(!existsSync(backendSchemas))("MULTI_COLUMN_ROLES 는 백엔드 표(ignore 제외)와 같다", () => {
    const source = readFileSync(backendSchemas, "utf-8");
    const block = source.match(/MULTI_COLUMN_ROLES[^=]*=\s*frozenset\(\{([\s\S]*?)\}\)/);
    expect(block).not.toBeNull();
    const backend = [...block![1].matchAll(/ColumnRole\.(\w+)/g)].map((m) => m[1]).filter((role) => role !== "ignore");
    expect(backend.length).toBeGreaterThan(0);

    const tasks: TaskType[] = ["binary", "multiclass", "multilabel"];
    const front = MULTI_COLUMN_ROLES.map((code) =>
      tasks.map((task) => translateRoleToBackend(code, task)).find((role) => role !== "ignore"),
    );
    expect(new Set(front)).toEqual(new Set(backend));
    expect(front).not.toContain("score_positive");
  });
});
