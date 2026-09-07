/**
 * 지표 **표시 이름**이 백엔드 서술 기준치의 키다 — ISSUES.md A-03 의 다섯 번째 사본 관계.
 *
 * `Capstone_Back/app/narrative/baselines.py` 의 `BASELINES` 와 `LOWER_IS_BETTER` 는
 * 지표 ID(M1·M4…)가 아니라 **프론트 `METRICS[].name`** 으로 키를 잡는다. 그 이름은
 * `buildFactSheet` 가 `display_name` 으로 실어 보내고 백엔드가 그것으로 조회한다.
 *
 * 그래서 프론트에서 지표 이름 하나를 바꾸면 —
 *
 *  · `BASELINES` 조회가 `None` 이 되어 성적서 **8절 벤치마크 문장에서 그 지표가 조용히 빠진다.**
 *  · `LOWER_IS_BETTER` 에서 빠지면 **낮을수록 좋은 지표가 반대로 판정된다** —
 *    Hamming Loss 0.05(우수)가 "기준 범위 아래"로 읽혀 미흡하다고 서술된다.
 *
 * 어느 쪽도 예외를 던지지 않고 타입도 걸리지 않는다. 성적서 문장만 조용히 틀린다.
 *
 * **백엔드는 이 파일을 읽을 수 없으므로 고정핀을 프론트에 둔다.** 이름을 바꿀 때
 * `baselines.py` 를 같은 PR 로 함께 고치도록 강제하는 것이 이 테스트의 목적이다.
 * 판단 근거는 `Capstone_Back/docs/ARCHITECTURE.md` §8.5 에 있다.
 */
import { describe, expect, it } from "vitest";

import { METRICS, type TaskType } from "./evaluationData";

/** `baselines.py` 의 `LOWER_IS_BETTER` 고정 사본(2026-09-07 실측). */
const BACKEND_LOWER_IS_BETTER = [
  "Distribution Diff (MC)",
  "Distribution Diff (ML)",
  "FPR",
  "Hamming Loss",
  "Imbalance Ratio",
  "KL Divergence",
  "Log Loss",
];

/** `baselines.py` 의 `BASELINES` 키 고정 사본(2026-09-07 실측). */
const BACKEND_BASELINE_KEYS: Record<TaskType, string[]> = {
  binary: ["AUPRC", "AUROC", "Accuracy", "F1 Score", "MCC", "Precision", "Recall"],
  multiclass: ["Accuracy", "F1 Score", "Precision", "Recall"],
  multilabel: ["F1 Score", "Hamming Loss", "Jaccard Index"],
};

const TASK_TYPES: TaskType[] = ["binary", "multiclass", "multilabel"];

describe("[A-03] 서술 기준치의 키 ↔ 프론트 지표 표시 이름", () => {
  it("낮을수록 좋은 지표 집합이 백엔드 LOWER_IS_BETTER 와 정확히 같다", () => {
    const frontend = METRICS.filter((m) => m.higherIsBetter === false)
      .map((m) => m.name)
      .sort();

    expect(frontend).toEqual([...BACKEND_LOWER_IS_BETTER].sort());
  });

  it("백엔드 기준치 키는 모두 실제로 존재하는 지표 이름이다", () => {
    const known = new Set(METRICS.map((m) => m.name));
    const unknown = TASK_TYPES.flatMap((task) =>
      BACKEND_BASELINE_KEYS[task]
        .filter((name) => !known.has(name))
        .map((name) => `${task}: ${name}`),
    );

    expect(unknown).toEqual([]);
  });

  it("백엔드 기준치 키는 그 task 가 실제로 노출하는 지표다", () => {
    const byName = new Map(METRICS.map((m) => [m.name, m]));
    const wrongTask = TASK_TYPES.flatMap((task) =>
      BACKEND_BASELINE_KEYS[task]
        .filter((name) => !byName.get(name)?.supportedTaskTypes.includes(task))
        .map((name) => `${task}: ${name}`),
    );

    // 이 목록이 비지 않으면 8절이 그 task 에서 절대 쓰이지 않는 기준치를 들고 있다는 뜻이다.
    expect(wrongTask).toEqual([]);
  });

  it("지표 이름은 중복되지 않는다 — 이름이 키이므로 중복은 조회를 흐트러뜨린다", () => {
    const names = METRICS.map((m) => m.name);
    const duplicated = names.filter((n, i) => names.indexOf(n) !== i);

    expect(duplicated).toEqual([]);
  });
});
