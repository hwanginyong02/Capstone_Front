/**
 * ISSUES.md E-13 — Step 5 진행 판정 규칙.
 *
 * 컴포넌트 레벨 테스트(`ColumnMapping.test.tsx`)가 실제 화면 동작을 고정하고,
 * 여기서는 판정 **순서**와 사유 문구를 못박는다. 순서가 의미를 갖는다 —
 * 작업 유형이 없으면 요구 역할 자체를 계산할 수 없다.
 *
 * 매핑은 지표 선택보다 앞이라(docs/MATERIAL_PICKER.md §3) 지표가 없다는 것만으로 막지 않는다.
 * 요구 역할이 0개가 되던 구멍은 화면이 지표가 없을 때 정답·예측을 요구 역할로 넘겨 막는다
 * (`getBaseRequiredColumns`).
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

  it("지표 없이도 판정한다 — 매핑이 지표 선택보다 앞이다", () => {
    // 요구 역할이 0개가 되던 구멍은 화면이 정답·예측을 넘겨 막는다. 빠지면 missing_roles 다.
    expect(getMappingValidityReason({ ...OK, missingRoleCodes: ["y_true"] })).toBe("missing_roles");
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
    expect(describeMappingValidity("no_task_type")).toContain("분류 유형");
    expect(describeMappingValidity("no_mapped_rows")).toContain("역할이 지정된 컬럼");
    expect(describeMappingValidity("duplicate_roles")).toContain("여러 컬럼");
    expect(describeMappingValidity("no_positive_class")).toContain("양성 클래스");

    // 단계를 번호로 가리키지 않는다 — 번호는 개편 때마다 바뀌는데 문구는 안 바뀌어
    // 조용히 거짓말이 된다(업로드는 4단계였다가 1단계가 됐다).
    for (const reason of ["no_task_type", "no_mapped_rows"] as const) {
      expect(describeMappingValidity(reason)).not.toMatch(/step \d|\d단계/i);
    }
    expect(describeMappingValidity("ok")).toBeNull();
  });

  it("빠진 역할은 문구에 나열된다", () => {
    expect(describeMappingValidity("missing_roles", ["y_true", "y_pred"])).toContain("y_true, y_pred");
  });
});
