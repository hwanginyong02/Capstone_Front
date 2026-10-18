/** 컬럼 매핑이 받는 역할 — 놓지 않은 샘플 ID·지연시간은 숨기고 맡아 둔다(docs/MATERIAL_PICKER.md §12.4). */
import { describe, expect, it } from "vitest";

import { MAPPABLE_ROLES_BY_TASK, type TaskType } from "../../data/evaluationData";
import { isLeafReceived } from "../../data/reportComposer";
import type { MappingRole, MappingRow } from "../../types/mapping.types";
import { applyRoleChange } from "./applyRoleChange";
import { allowedMappingRoles, buildRoleOptions, leafOfRole, restrictMappingRoles } from "./mappingPicks";

const TASKS: TaskType[] = ["binary", "multiclass", "multilabel"];

function row(name: string, role: MappingRole | null, extra: Partial<MappingRow> = {}): MappingRow {
  return {
    originalName: name,
    sampleValues: [],
    inferredRole: role,
    confirmedRole: role,
    modified: false,
    warnings: [],
    ...extra,
  };
}

describe("leafOfRole", () => {
  it("역할마다 그 역할을 받는 ① 항목", () => {
    expect(leafOfRole("y_true")).toBe("yTrueColumn");
    expect(leafOfRole("y_pred")).toBe("predictionColumns");
    expect(leafOfRole("score")).toBe("predictionColumns");
    expect(leafOfRole("prob_class_*")).toBe("predictionColumns");
    expect(leafOfRole("prob_label_*")).toBe("predictionColumns");
    expect(leafOfRole("latency")).toBe("latencyColumn");
    expect(leafOfRole("id")).toBe("sampleIdColumn");
    expect(leafOfRole("ignore")).toBeNull();
  });
});

describe("allowedMappingRoles", () => {
  it("picks 가 없으면 유형의 모든 역할 + ignore (시연·평가 흐름 이전)", () => {
    for (const task of TASKS) {
      expect(allowedMappingRoles(task, undefined)).toEqual([...MAPPABLE_ROLES_BY_TASK[task], "ignore"]);
    }
  });

  it("evalData 가 [] 이면 샘플 ID·지연시간이 빠진다 — 정답·예측·확률은 남는다", () => {
    expect(allowedMappingRoles("binary", [])).toEqual(["y_true", "y_pred", "score", "ignore"]);
    expect(allowedMappingRoles("multiclass", [])).toEqual(["y_true", "y_pred", "prob_class_*", "ignore"]);
    expect(allowedMappingRoles("multilabel", [])).toEqual(["y_true", "y_pred", "prob_label_*", "ignore"]);
  });

  it("놓은 항목의 역할만 돌아온다", () => {
    expect(allowedMappingRoles("binary", ["latencyColumn"])).toEqual([
      "y_true",
      "y_pred",
      "score",
      "latency",
      "ignore",
    ]);
    expect(allowedMappingRoles("multiclass", ["sampleIdColumn"])).toEqual([
      "id",
      "y_true",
      "y_pred",
      "prob_class_*",
      "ignore",
    ]);
  });
});

describe("restrictMappingRoles", () => {
  const rows = [
    row("label", "y_true"),
    row("pred", "y_pred"),
    row("p", "score"),
    row("latency_ms", "latency"),
    row("sample_id", "id"),
    row("note", "ignore"),
  ];

  it("받지 않는 역할은 ignore 로 내리고 heldRole 에 맡긴다 — 자동 매핑 결과는 그대로, 고친 것으로 세지 않음", () => {
    const next = restrictMappingRoles(rows, "binary", []);
    expect(next.map((item) => item.confirmedRole)).toEqual(["y_true", "y_pred", "score", "ignore", "ignore", "ignore"]);
    expect(next[3]).toEqual({ ...rows[3], confirmedRole: "ignore", heldRole: "latency", modified: false });
    expect(next[4]).toEqual({ ...rows[4], confirmedRole: "ignore", heldRole: "id", modified: false });
    expect(next[3].inferredRole).toBe("latency");
    // 정답·예측·확률·원래 ignore 는 그대로(같은 객체).
    for (const index of [0, 1, 2, 5]) expect(next[index]).toBe(rows[index]);
  });

  it("고친 행이었어도 맡아 두면 modified 는 false", () => {
    const edited = [row("t", "latency", { inferredRole: "ignore", modified: true })];
    expect(restrictMappingRoles(edited, "binary", [])[0].modified).toBe(false);
  });

  it("항목을 다시 놓으면 맡아 둔 역할이 돌아오고 heldRole 은 없어진다", () => {
    const held = restrictMappingRoles(rows, "binary", []);
    const back = restrictMappingRoles(held, "binary", ["latencyColumn"]);
    expect(back[3].confirmedRole).toBe("latency");
    expect("heldRole" in back[3]).toBe(false);
    expect(back[3].modified).toBe(false);
    // 샘플 ID 는 아직 놓지 않았다 — 계속 맡아 둔다.
    expect(back[4]).toBe(held[4]);
  });

  it("되돌릴 때 modified 는 자동 매핑과 다를 때만 참", () => {
    const held = [row("c", "ignore", { inferredRole: "ignore", heldRole: "latency" })];
    expect(restrictMappingRoles(held, "binary", ["latencyColumn"])[0].modified).toBe(true);
  });

  it("사용자가 그 행을 직접 바꾸면 맡아 둔 값이 지워져, 다시 놓아도 돌아오지 않는다", () => {
    const held = restrictMappingRoles(rows, "binary", []);
    const changed = applyRoleChange(held, "latency_ms", "ignore");
    expect("heldRole" in changed[3]).toBe(false);
    const after = restrictMappingRoles(changed, "binary", ["latencyColumn"]);
    expect(after[3].confirmedRole).toBe("ignore");
    expect(after).toBe(changed);
  });

  it("맡아 둔 역할이 아직 받지 않는 역할이면 그대로", () => {
    const held = restrictMappingRoles(rows, "binary", []);
    expect(restrictMappingRoles(held, "binary", [])).toBe(held);
  });

  it("바뀐 것이 없으면 같은 배열(참조)", () => {
    expect(restrictMappingRoles(rows, "binary", undefined)).toBe(rows);
    expect(restrictMappingRoles(rows, "binary", ["latencyColumn", "sampleIdColumn"])).toBe(rows);
  });

  it("taskType 이 \"\" 면 그대로", () => {
    expect(restrictMappingRoles(rows, "", [])).toBe(rows);
  });

  it("유형의 매핑 역할이 아닌 값(유형을 바꾸기 전)은 숨김 규칙 대상이 아니다", () => {
    const stale = [row("p", "score")];
    expect(restrictMappingRoles(stale, "multiclass", [])).toBe(stale);
  });

  it("세 유형 모두 같은 규칙", () => {
    for (const task of TASKS) {
      const next = restrictMappingRoles([row("l", "latency"), row("i", "id")], task, []);
      expect(next.map((item) => [item.confirmedRole, item.heldRole])).toEqual([
        ["ignore", "latency"],
        ["ignore", "id"],
      ]);
    }
  });
});

describe("buildRoleOptions", () => {
  it("받는 역할 + ignore. 놓지 않은 샘플 ID·지연시간은 선택지에 없다", () => {
    const values = buildRoleOptions("binary", [], []).map((option) => option.value);
    expect(values).toEqual(["y_true", "y_pred", "score", "ignore"]);
  });

  it("picks 가 없으면 모든 역할", () => {
    const values = buildRoleOptions("multiclass", undefined, []).map((option) => option.value);
    expect(values).toEqual([...MAPPABLE_ROLES_BY_TASK.multiclass, "ignore"]);
  });

  it("유형 밖의 배정된 역할은 선택지에 남겨 Select 가 빈 칸이 되지 않게 한다", () => {
    const values = buildRoleOptions("multiclass", [], ["score", "y_true", "ignore"]).map((option) => option.value);
    expect(values).toEqual(["y_true", "y_pred", "prob_class_*", "score", "ignore"]);
  });
});

describe("isLeafReceived", () => {
  it("선택 항목은 놓았을 때만, picks 가 없으면 받는다", () => {
    expect(isLeafReceived("evalData", "classLabelDescriptions", undefined)).toBe(true);
    expect(isLeafReceived("evalData", "classLabelDescriptions", [])).toBe(false);
    expect(isLeafReceived("evalData", "classLabelDescriptions", ["classLabelDescriptions"])).toBe(true);
    expect(isLeafReceived("trainingData", "trainingExamples", ["trainingUnsuitableExamples"])).toBe(false);
    expect(isLeafReceived("trainingData", "trainingUnsuitableExamples", ["trainingUnsuitableExamples"])).toBe(true);
  });

  it("필수 항목은 늘 받고, 모르는 id 는 받지 않는다", () => {
    expect(isLeafReceived("evalData", "yTrueColumn", [])).toBe(true);
    expect(isLeafReceived("evalData", "nope", undefined)).toBe(false);
  });
});

describe("getRowMatchState — 맡아 둔 행", () => {
  it("'맡아 둠'이고 고친 것·문제로 보지 않는다", async () => {
    const { getRowMatchState } = await import("./mappingHelpers");
    const held = row("l", "ignore", { inferredRole: "latency", heldRole: "latency" });
    expect(getRowMatchState(held, false)).toEqual({ label: "맡아 둠", tone: "outline" });
    expect(getRowMatchState(row("l", "ignore"), false).label).not.toBe("맡아 둠");
  });
});
