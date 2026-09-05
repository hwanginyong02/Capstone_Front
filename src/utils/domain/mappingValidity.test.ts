/**
 * ISSUES.md E-13 — Step 5 진행 판정 규칙.
 *
 * 컴포넌트 레벨 테스트(`ColumnMapping.test.tsx`)가 실제 화면 동작을 고정하고,
 * 여기서는 판정 **순서**와 사유 문구를 못박는다. 순서가 의미를 갖는다 —
 * 작업 유형이 없으면 요구 역할 자체를 계산할 수 없고, 지표가 없으면 무엇을 매핑해야
 * 하는지도 정해지지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  describeMappingValidity,
  getMappingValidityReason,
  isMappingValid,
  type MappingValidityInput,
} from "./mappingValidity";

const OK: MappingValidityInput = {
  taskType: "multiclass",
  selectedMetricIds: ["M23"],
  assignedRoleCount: 2,
  missingRoleCodes: [],
  duplicateRoleCount: 0,
  positiveClass: "",
};

describe("매핑 진행 판정", () => {
  it("[E-13] 조건이 모두 갖춰지면 진행할 수 있다", () => {
    expect(getMappingValidityReason(OK)).toBe("ok");
    expect(isMappingValid(OK)).toBe(true);
  });

  it("[E-13] 작업 유형이 비면 막는다 — 'multiclass' 로 둔갑시키지 않는다", () => {
    expect(getMappingValidityReason({ ...OK, taskType: "" })).toBe("no_task_type");
  });

  it("[E-13] 지표가 하나도 없으면 막는다 — 요구 역할이 0개가 되어 '빠진 역할 없음'으로 통과하던 구멍", () => {
    expect(getMappingValidityReason({ ...OK, selectedMetricIds: [] })).toBe("no_metrics");
  });

  it("[E-13] 역할이 배정된 행이 0개면 막는다", () => {
    expect(getMappingValidityReason({ ...OK, assignedRoleCount: 0 })).toBe("no_mapped_rows");
  });

  it("[E-13] 중복 역할이 있으면 막는다(기존 동작 보존)", () => {
    expect(getMappingValidityReason({ ...OK, duplicateRoleCount: 1 })).toBe("duplicate_roles");
  });

  it("[E-13] 필수 역할이 빠지면 막는다(기존 동작 보존)", () => {
    expect(getMappingValidityReason({ ...OK, missingRoleCodes: ["y_pred"] })).toBe("missing_roles");
  });

  it("[E-13] binary 는 양성 클래스가 있어야 한다(기존 동작 보존)", () => {
    const bin = { ...OK, taskType: "binary" as const };
    expect(getMappingValidityReason(bin)).toBe("no_positive_class");
    expect(getMappingValidityReason({ ...bin, positiveClass: "1" })).toBe("ok");
  });

  it("[E-13] multiclass·multilabel 은 양성 클래스를 요구하지 않는다", () => {
    expect(getMappingValidityReason({ ...OK, taskType: "multilabel" })).toBe("ok");
  });

  it("[E-13] 빈 상태(새로고침 직후)는 가장 앞선 사유로 보고된다", () => {
    expect(
      getMappingValidityReason({
        taskType: "",
        selectedMetricIds: [],
        assignedRoleCount: 0,
        missingRoleCodes: [],
        duplicateRoleCount: 0,
        positiveClass: "",
      })
    ).toBe("no_task_type");
  });
});

describe("차단 사유 문구", () => {
  it("차단 사유마다 안내가 있고, 통과 시에는 없다", () => {
    expect(describeMappingValidity("no_task_type")).toContain("작업 유형");
    expect(describeMappingValidity("no_metrics")).toContain("지표");
    expect(describeMappingValidity("no_mapped_rows")).toContain("역할이 배정된 컬럼");
    expect(describeMappingValidity("duplicate_roles")).toContain("중복");
    expect(describeMappingValidity("no_positive_class")).toContain("양성 클래스");
    expect(describeMappingValidity("ok")).toBeNull();
  });

  it("빠진 역할은 문구에 나열된다", () => {
    expect(describeMappingValidity("missing_roles", ["y_true", "y_pred"])).toContain("y_true, y_pred");
  });
});
