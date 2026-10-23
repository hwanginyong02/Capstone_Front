/**
 * 매핑으로 계산할 수 없는 지표 — 지표 화면이 비활성으로 두고 이유를 붙인다(docs/MATERIAL_PICKER.md §3).
 *
 * 매핑이 지표보다 앞이라, 확률 컬럼 없이 매핑하면 확률이 있어야 하는 지표(이진의 AUROC·AUPRC·
 * Log Loss)는 처음부터 고를 수 없다. 예측 컬럼이 없어도 확률 컬럼이 있으면 예측을 쓰는 지표는
 * 계산할 수 있다 — 백엔드가 확률에서 예측을 만든다(ISSUES.md A-01·A-02).
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  getMetricAvailability,
  mappedRoleCounts,
  unavailableMetricReasons,
} from "./metricAvailability";
import type { MappingRole, MappingRow } from "../../types/mapping.types";
import { useWorkflowStore } from "../stores/useWorkflowStore";

function rows(...roles: (MappingRole | null)[]): MappingRow[] {
  return roles.map((role, index) => ({
    originalName: `col_${index}`,
    sampleValues: [],
    inferredRole: role,
    confirmedRole: role,
    modified: false,
    warnings: [],
  }));
}

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
});

describe("이진 분류", () => {
  it("확률 컬럼이 없으면 AUROC·AUPRC·Log Loss 만 막고, 빠진 컬럼을 이유로 적는다", () => {
    const reasons = unavailableMetricReasons("binary", rows("id", "y_true", "y_pred"));

    expect(Object.keys(reasons).sort()).toEqual(["M10", "M19", "M9"]);
    expect(reasons.M9).toBe("양성 클래스 점수(score) 컬럼이 매핑되지 않아 계산할 수 없습니다.");
  });

  it("확률 컬럼이 있으면 모두 고를 수 있다 — 예측 컬럼이 없어도 확률로 대신한다", () => {
    expect(unavailableMetricReasons("binary", rows("y_true", "y_pred", "score"))).toEqual({});
    expect(unavailableMetricReasons("binary", rows("y_true", "score"))).toEqual({});
  });
});

describe("다중 클래스", () => {
  it("예측이나 클래스별 확률이 있으면 모두 고를 수 있다", () => {
    expect(unavailableMetricReasons("multiclass", rows("y_true", "y_pred"))).toEqual({});
    expect(unavailableMetricReasons("multiclass", rows("y_true", "prob_class_*", "prob_class_*"))).toEqual(
      {},
    );
  });

  it("정답만 있으면 정답만 쓰는 지표(M23)만 남는다", () => {
    const reasons = unavailableMetricReasons("multiclass", rows("y_true"));

    expect(reasons.M23).toBeUndefined();
    expect(reasons.M1).toBe("예측 레이블(y_pred) 컬럼이 매핑되지 않아 계산할 수 없습니다.");
  });
});

describe("멀티레이블", () => {
  it("예측이나 레이블별 확률이 있으면 모두 고를 수 있다", () => {
    expect(unavailableMetricReasons("multilabel", rows("y_true", "y_pred"))).toEqual({});
    expect(unavailableMetricReasons("multilabel", rows("y_true", "prob_label_*"))).toEqual({});
  });
});

describe("매핑 확정 응답이 정본이다", () => {
  it("응답이 있으면 응답대로 막고 연다", () => {
    const counts = mappedRoleCounts(rows("y_true", "y_pred"));

    // 이 규칙으로는 막히지만 백엔드가 계산할 수 있다고 답했다.
    expect(getMetricAvailability("binary", "M9", counts, ["M9"]).available).toBe(true);
    // 이 규칙으로는 열리지만 백엔드가 답에서 뺐다 — 이유는 일반 문구다.
    expect(unavailableMetricReasons("binary", rows("y_true", "y_pred"), ["M9"]).M1).toBe(
      "매핑한 컬럼으로는 계산할 수 없습니다.",
    );
  });

  it("매핑을 바꾸면 응답을 비운다 — 낡은 답으로 지표를 막거나 열지 않는다", () => {
    const store = useWorkflowStore.getState();
    store.setColumnMapping(rows("y_true", "y_pred"));
    store.setMappingFeedback({ warnings: [], availableMetricIds: ["M1"] });

    useWorkflowStore.getState().setColumnMapping(rows("y_true", "score"));

    expect(useWorkflowStore.getState().availableMetricIds).toBeNull();
  });
});

describe("판정할 근거가 없으면 막지 않는다", () => {
  it("매핑이 없거나 유형이 없으면 아무것도 막지 않는다", () => {
    expect(unavailableMetricReasons("binary", [])).toEqual({});
    expect(unavailableMetricReasons("binary", rows("ignore", null))).toEqual({});
    expect(unavailableMetricReasons("", rows("y_true"))).toEqual({});
  });
});
