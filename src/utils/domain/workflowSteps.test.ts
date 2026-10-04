/**
 * 단계 목록이 카드 선택을 따라가는지 고정한다.
 *
 * 최소 구성이면 7단계, 전체면 9단계다. 그 사이의 8단계는 어느 카드를 켰는지로 갈린다.
 * (⑤ 평가 관점은 단계가 아니라 지표 선택 화면 안에 있다 — docs/WORKFLOW_REDESIGN.md §10.)
 */
import { describe, expect, it } from "vitest";

import {
  buildStepList,
  canEnterStepId,
  nextStepId,
  pathToStepId,
  prevStepId,
  resumeStepId,
  stepIdToPath,
  stepNumberOf,
} from "./workflowSteps";
import { DEFAULT_COMPOSER_SELECTION } from "../../types/reportComposer.types";
import { presetSelection } from "../../data/reportComposer";
import type { ComposerSelection } from "../../types/reportComposer.types";

const MINIMAL = presetSelection("minimal");
const FULL = presetSelection("full");

describe("단계 목록", () => {
  it("최소 구성은 7단계다 — 데이터 정보·모델 정보가 빠진다", () => {
    expect(buildStepList(MINIMAL)).toEqual([
      "upload",
      "metrics",
      "mapping",
      "validation",
      "summary",
      "clientInfo",
      "report",
    ]);
  });

  it("전체는 9단계다", () => {
    expect(buildStepList(FULL)).toEqual([
      "upload",
      "metrics",
      "mapping",
      "validation",
      "summary",
      "dataInfo",
      "modelEnv",
      "clientInfo",
      "report",
    ]);
  });

  it("기본 선택(필수 카드만)이면 7단계다", () => {
    expect(buildStepList(DEFAULT_COMPOSER_SELECTION)).toHaveLength(7);
  });

  it("가능한 단계 수는 7 · 8 · 9 뿐이다", () => {
    const counts = new Set<number>();
    const ids: Array<keyof ComposerSelection> = [
      "trainingData",
      "testData",
      "groundTruth",
      "modelEnv",
    ];
    // 선택 카드 4개의 16가지 조합을 전부 돌린다.
    for (let mask = 0; mask < 16; mask += 1) {
      const selection = ids.reduce(
        (acc, id, index) => ({ ...acc, [id]: Boolean(mask & (1 << index)) }),
        {} as ComposerSelection,
      );
      counts.add(buildStepList(selection).length);
    }
    expect([...counts].sort((a, b) => a - b)).toEqual([7, 8, 9]);
  });
});

describe("데이터 정보 — ⑥ ⑦ ⑧ 중 하나라도 켜면 나타난다", () => {
  it.each(["trainingData", "testData", "groundTruth"] as const)(
    "%s 만 켜도 나타난다",
    (cardId) => {
      const steps = buildStepList({ ...MINIMAL, [cardId]: true });
      expect(steps).toContain("dataInfo");
      expect(steps).not.toContain("modelEnv");
      expect(steps).toHaveLength(8);
    },
  );

  it("셋 다 꺼지면 사라진다", () => {
    expect(buildStepList({ ...FULL, trainingData: false, testData: false, groundTruth: false }))
      .not.toContain("dataInfo");
  });
});

describe("모델 정보 — ⑨ 에만 달려 있다", () => {
  it("⑨ 만 켜면 나타나고 데이터 정보는 빠진다", () => {
    const steps = buildStepList({ ...MINIMAL, modelEnv: true });
    expect(steps).toContain("modelEnv");
    expect(steps).not.toContain("dataInfo");
    expect(steps).toHaveLength(8);
  });

  it("⑨ 만 끄면 8단계가 된다", () => {
    expect(buildStepList({ ...FULL, modelEnv: false })).toHaveLength(8);
  });
});

describe("단계 순서와 번호", () => {
  it("평가 관점은 단계가 아니다 — 지표 선택 화면 안으로 들어갔다", () => {
    // 질문 둘이 곧 지표 추천의 근거라 고르는 화면과 같은 자리에 둔다.
    expect(buildStepList(FULL)).not.toContain("perspective" as never);
    expect(buildStepList(FULL).indexOf("metrics")).toBe(buildStepList(FULL).indexOf("upload") + 1);
  });

  it("지표가 매핑보다 앞이다 — 백엔드가 지표 없는 평가 요청을 받지 않는다", () => {
    const steps = buildStepList(FULL);
    expect(steps.indexOf("metrics")).toBeLessThan(steps.indexOf("mapping"));
  });

  it("성적서가 항상 마지막이다", () => {
    for (const selection of [MINIMAL, FULL, { ...MINIMAL, modelEnv: true }]) {
      const steps = buildStepList(selection);
      expect(steps[steps.length - 1]).toBe("report");
    }
  });

  it("번호는 목록 위치에서 만든다 — 카드를 끄면 뒤 단계의 번호가 당겨진다", () => {
    expect(stepNumberOf("clientInfo", buildStepList(FULL))).toBe(8);
    expect(stepNumberOf("clientInfo", buildStepList(MINIMAL))).toBe(6);
    expect(stepNumberOf("dataInfo", buildStepList(MINIMAL))).toBe(0);
  });
});

describe("이웃 단계", () => {
  it("전체 구성에서 평가 결과의 다음은 데이터 정보다", () => {
    expect(nextStepId("summary", buildStepList(FULL))).toBe("dataInfo");
  });

  it("최소 구성에서 평가 결과의 다음은 의뢰자 정보다 — 두 단계를 건너뛴다", () => {
    // 하드코딩된 다음 목적지가 성립하지 않는 이유가 바로 이것이다.
    expect(nextStepId("summary", buildStepList(MINIMAL))).toBe("clientInfo");
  });

  it("⑨ 만 켜면 평가 결과의 다음은 모델과 환경이다", () => {
    expect(nextStepId("summary", buildStepList({ ...MINIMAL, modelEnv: true }))).toBe("modelEnv");
  });

  it("마지막 단계의 다음은 없다", () => {
    expect(nextStepId("report", buildStepList(FULL))).toBeNull();
  });

  it("첫 단계의 이전은 없다", () => {
    expect(prevStepId("upload", buildStepList(FULL))).toBeNull();
  });

  it("이전도 건너뛴 단계를 넘어간다", () => {
    expect(prevStepId("clientInfo", buildStepList(MINIMAL))).toBe("summary");
    expect(prevStepId("clientInfo", buildStepList(FULL))).toBe("modelEnv");
  });

  it("목록에 없는 단계는 이웃이 없다", () => {
    expect(nextStepId("dataInfo", buildStepList(MINIMAL))).toBeNull();
    expect(prevStepId("dataInfo", buildStepList(MINIMAL))).toBeNull();
  });
});

/**
 * 종전 `canEnterStep` 은 `step - 1` 을 선행 단계로 삼았다. 단계가 고정일 때만 맞는 산수다 —
 * 카드를 끄면 번호가 당겨지므로 **계산된 목록의 직전 항목**을 봐야 한다(ISSUES.md E-12).
 */
describe("진입 가드", () => {
  const steps = buildStepList(FULL);

  it("첫 단계는 언제나 들어갈 수 있다", () => {
    expect(canEnterStepId("upload", [], steps)).toBe(true);
  });

  it("아무것도 안 마쳤으면 뒤 단계로 뛸 수 없다", () => {
    expect(canEnterStepId("metrics", [], steps)).toBe(false);
    expect(canEnterStepId("report", ["upload", "metrics"], steps)).toBe(false);
  });

  it("직전 단계를 마쳤으면 들어갈 수 있다", () => {
    expect(canEnterStepId("metrics", ["upload"], steps)).toBe(true);
    expect(canEnterStepId("mapping", ["upload", "metrics"], steps)).toBe(true);
  });

  it("이미 마친 단계는 언제든 다시 볼 수 있다", () => {
    const done: typeof steps = ["upload", "metrics", "mapping"];
    expect(canEnterStepId("upload", done, steps)).toBe(true);
    expect(canEnterStepId("metrics", done, steps)).toBe(true);
  });

  it("직전 단계는 목록 기준이다 — 카드를 끄면 선행 단계가 달라진다", () => {
    // 전체 구성에서 의뢰자 정보의 직전은 모델과 환경,
    const full = buildStepList(FULL);
    expect(canEnterStepId("clientInfo", ["summary"], full)).toBe(false);
    expect(canEnterStepId("clientInfo", ["modelEnv"], full)).toBe(true);

    // 최소 구성에서는 평가 결과다.
    const minimal = buildStepList(MINIMAL);
    expect(canEnterStepId("clientInfo", ["summary"], minimal)).toBe(true);
  });

  it("목록에서 빠진 단계는 들어갈 수 없다", () => {
    // 카드를 꺼서 사라진 단계는 URL 로도 열리지 않아야 한다.
    expect(canEnterStepId("dataInfo", ["summary"], buildStepList(MINIMAL))).toBe(false);
  });
});

/**
 * 종전 `resumeStep` 은 `Math.max(...completed) + 1` 이었다. 번호가 연속일 때만 맞는 식이라,
 * 건너뛴 단계가 있으면 빈 화면으로 보냈다.
 */
describe("이어서 할 단계", () => {
  const steps = buildStepList(FULL);

  it("아무것도 안 마쳤으면 첫 단계다", () => {
    expect(resumeStepId([], steps)).toBe("upload");
  });

  it("앞에서부터 훑어 처음 미완료를 돌려준다", () => {
    expect(resumeStepId(["upload"], steps)).toBe("metrics");
    expect(resumeStepId(["upload", "metrics", "mapping"], steps)).toBe("validation");
  });

  it("순서가 뒤섞여 저장돼 있어도 목록 순서로 판단한다", () => {
    expect(resumeStepId(["mapping", "upload", "metrics"], steps)).toBe("validation");
  });

  it("중간에 구멍이 있으면 그 구멍으로 보낸다 — Math.max 식의 실패 지점", () => {
    // 옛 식이라면 mapping 다음(validation)으로 보내 빈 화면에 앉혔다.
    expect(resumeStepId(["upload", "mapping", "validation"], steps)).toBe("metrics");
  });

  it("전부 마쳤으면 마지막 단계다", () => {
    expect(resumeStepId([...steps], steps)).toBe("report");
  });
});

describe("단계 ↔ 경로", () => {
  it("고정 경로를 가진 단계는 그 경로로 간다", () => {
    expect(stepIdToPath("upload")).toBe("/app/data-upload");
    expect(stepIdToPath("metrics")).toBe("/app/metrics");
  });

  it("run 에 매인 단계는 run id 로 경로를 만든다", () => {
    expect(stepIdToPath("summary", "run-1")).toBe("/report/run-1/summary");
    expect(stepIdToPath("dataInfo", "run-1")).toBe("/report/run-1/data-info");
    expect(stepIdToPath("clientInfo", "run-1")).toBe("/report/run-1/issue-info");
    // 성적서는 조각 없이 run 경로 자체다.
    expect(stepIdToPath("report", "run-1")).toBe("/report/run-1");
  });

  it("run id 가 없으면 워크스페이스 목록으로 보낸다 (ISSUES.md E-02·E-06)", () => {
    // 종전의 `/report/preview` 는 저장되지 않는 임시 성적서를 만들어 발급을 불가능하게 했다.
    expect(stepIdToPath("report")).toBe("/workspaces");
    expect(stepIdToPath("summary", null)).toBe("/workspaces");
  });

  it("경로에서 단계를 알아본다", () => {
    expect(pathToStepId("/app/data-upload")).toBe("upload");
    expect(pathToStepId("/app/data-validation")).toBe("validation");
    expect(pathToStepId("/report/run-1/summary")).toBe("summary");
    expect(pathToStepId("/report/run-1/issue-info")).toBe("clientInfo");
    expect(pathToStepId("/report/run-1")).toBe("report");
  });

  it("단계가 아닌 경로는 null 이다 — 종전처럼 조용히 1단계로 떨어지지 않는다", () => {
    expect(pathToStepId("/app")).toBeNull();
    expect(pathToStepId("/app/composer")).toBeNull();
    expect(pathToStepId("/workspaces")).toBeNull();
    expect(pathToStepId("/report/run-1/print")).toBeNull();
    // 성적서 번호로 서버 보관본을 복원하는 경로. 단계가 아니다.
    expect(pathToStepId("/report/no/RPT-2026-0001")).toBeNull();
  });

  it("경로와 단계가 서로를 되돌린다", () => {
    for (const id of buildStepList(FULL)) {
      expect(pathToStepId(stepIdToPath(id, "run-1"))).toBe(id);
    }
  });
});
