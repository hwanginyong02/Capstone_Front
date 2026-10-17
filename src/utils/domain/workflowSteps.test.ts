/**
 * 단계 목록이 카드 선택을 따라가는지 고정한다.
 *
 * 순서는 재료 고르기의 카드 순서다(docs/MATERIAL_PICKER.md §3). 최소 구성이면 8단계, 전체면
 * 10단계다. 그 사이의 9단계는 어느 카드를 넣었는지로 갈린다.
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
import { OPTIONAL_CARD_IDS, catalogCards } from "../../data/reportComposer";
import type { ComposerSelection } from "../../types/reportComposer.types";
import type { StepId } from "../../types/workflow.types";

/** 필수 카드만 — 선택 카드를 하나도 넣지 않은 상태. */
const MINIMAL: ComposerSelection = DEFAULT_COMPOSER_SELECTION;
/** 선택 카드 넷을 모두 넣은 상태. */
const FULL = Object.fromEntries(OPTIONAL_CARD_IDS.map((id) => [id, true])) as ComposerSelection;

describe("단계 목록", () => {
  it("최소 구성은 8단계다 — 모델 설정과 데이터 정보가 빠진다", () => {
    expect(buildStepList(MINIMAL)).toEqual([
      "clientInfo",
      "model",
      "upload",
      "mapping",
      "perspective",
      "metrics",
      "validation",
      "report",
    ]);
  });

  it("전체는 10단계다", () => {
    expect(buildStepList(FULL)).toEqual([
      "clientInfo",
      "model",
      "modelEnv",
      "upload",
      "mapping",
      "dataInfo",
      "perspective",
      "metrics",
      "validation",
      "report",
    ]);
  });

  it("평가 결과 단계는 없다 — 고객은 성적서를 내려고 평가한다", () => {
    expect(buildStepList(FULL)).not.toContain("summary" as never);
  });

  it("가능한 단계 수는 8 · 9 · 10 뿐이다", () => {
    const counts = new Set<number>();
    // 선택 카드 4개의 16가지 조합을 전부 돌린다.
    for (let mask = 0; mask < 16; mask += 1) {
      const selection = OPTIONAL_CARD_IDS.reduce(
        (acc, id, index) => ({ ...acc, [id]: Boolean(mask & (1 << index)) }),
        {} as ComposerSelection,
      );
      counts.add(buildStepList(selection).length);
    }
    expect([...counts].sort((a, b) => a - b)).toEqual([8, 9, 10]);
  });
});

describe("데이터 정보 — ⑥ ⑦ ⑧ 중 하나라도 넣으면 나타난다", () => {
  it.each(["trainingData", "testData", "groundTruth"] as const)(
    "%s 만 넣어도 나타난다",
    (cardId) => {
      const steps = buildStepList({ ...MINIMAL, [cardId]: true });
      expect(steps).toContain("dataInfo");
      expect(steps).not.toContain("modelEnv");
      expect(steps).toHaveLength(9);
    },
  );

  it("셋 다 빠지면 사라진다", () => {
    expect(buildStepList({ ...FULL, trainingData: false, testData: false, groundTruth: false }))
      .not.toContain("dataInfo");
  });
});

describe("모델 설정과 실행 환경 — ⑨ 에만 달려 있다", () => {
  it("⑨ 만 넣으면 나타나고 데이터 정보는 빠진다", () => {
    const steps = buildStepList({ ...MINIMAL, modelEnv: true });
    expect(steps).toContain("modelEnv");
    expect(steps).not.toContain("dataInfo");
    expect(steps).toHaveLength(9);
  });

  it("⑨ 만 빼면 9단계가 된다", () => {
    expect(buildStepList({ ...FULL, modelEnv: false })).toHaveLength(9);
  });
});

describe("단계 순서와 번호 (docs/MATERIAL_PICKER.md §3)", () => {
  it("매핑이 지표보다 앞이다 — 매핑은 지표에 기대지 않는다", () => {
    const steps = buildStepList(FULL);
    expect(steps.indexOf("mapping")).toBeLessThan(steps.indexOf("metrics"));
  });

  it("평가 관점은 지표 바로 앞이다 — 지표 화면의 목적별 점검이 이 답을 읽는다", () => {
    for (const selection of [MINIMAL, FULL]) {
      const steps = buildStepList(selection);
      expect(steps.indexOf("perspective") + 1).toBe(steps.indexOf("metrics"));
    }
  });

  it("검증은 지표와 합격 기준 뒤, 성적서 바로 앞이다 — 백엔드는 지표 없는 검증을 받지 않는다", () => {
    for (const selection of [MINIMAL, FULL]) {
      const steps = buildStepList(selection);
      expect(steps.indexOf("metrics") + 1).toBe(steps.indexOf("validation"));
      expect(steps.indexOf("validation") + 1).toBe(steps.indexOf("report"));
    }
  });

  it("데이터 정보는 매핑 뒤다 — ⑥ 클래스별 데이터 양이 평가 데이터의 클래스 목록을 쓴다", () => {
    const steps = buildStepList(FULL);
    expect(steps.indexOf("mapping")).toBeLessThan(steps.indexOf("dataInfo"));
  });

  it("성적서가 항상 마지막이다", () => {
    for (const selection of [MINIMAL, FULL, { ...MINIMAL, modelEnv: true }]) {
      const steps = buildStepList(selection);
      expect(steps[steps.length - 1]).toBe("report");
    }
  });

  it("번호는 목록 위치에서 만든다 — 카드를 빼면 뒤 단계의 번호가 당겨진다", () => {
    expect(stepNumberOf("report", buildStepList(FULL))).toBe(10);
    expect(stepNumberOf("report", buildStepList(MINIMAL))).toBe(8);
    expect(stepNumberOf("dataInfo", buildStepList(MINIMAL))).toBe(0);
  });
});

/**
 * 입력 단계는 재료 고르기의 **카탈로그 순서**를 따른다(docs/MATERIAL_PICKER.md §1 "카탈로그 순서가
 * 곧 입력 순서다").
 *
 * 카탈로그(`STEP_CATALOG`)와 레지스트리(`MATERIAL_CATEGORIES`, 카드의 `steps`)는 따로 적혀 있어서,
 * 한쪽 순서만 고치면 조용히 어긋난다. 선택 카드 16가지 조합 전부에서 그 약속을 확인한다.
 * 종전과 달리 예외가 없다 — 검증 앞의 필수 카드도 카드 순서를 따른다.
 */
describe("카드 순서", () => {
  const ALL_SELECTIONS: ComposerSelection[] = Array.from({ length: 16 }, (_, mask) =>
    OPTIONAL_CARD_IDS.reduce(
      (acc, id, index) => ({ ...acc, [id]: Boolean(mask & (1 << index)) }),
      {} as ComposerSelection,
    ),
  );

  /** 카드가 받는 단계 중 목록에서 가장 앞의 위치. */
  const firstIndexOf = (cardSteps: StepId[], steps: StepId[]) =>
    Math.min(...cardSteps.map((id) => steps.indexOf(id)).filter((index) => index >= 0));

  it.each(ALL_SELECTIONS.map((selection) => [JSON.stringify(selection), selection] as const))(
    "%s",
    (_label, selection) => {
      const steps = buildStepList(selection);

      // 들어간 카드(필수 카드 + 넣은 선택 카드)의 단계가 카탈로그 순서대로 나온다.
      const included = catalogCards("binary").filter(
        (card) => card.locked || selection[card.id as keyof ComposerSelection],
      );
      const indexes = included.map((card) => firstIndexOf(card.steps, steps));
      expect(indexes.every((index) => index >= 0)).toBe(true);
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b));

      // 검증과 성적서가 맨 끝이다.
      expect(steps.slice(-2)).toEqual(["validation", "report"]);
    },
  );
});

describe("이웃 단계", () => {
  it("검증의 다음은 언제나 성적서다", () => {
    expect(nextStepId("validation", buildStepList(FULL))).toBe("report");
    expect(nextStepId("validation", buildStepList(MINIMAL))).toBe("report");
  });

  it("⑨ 를 넣으면 평가 대상 모델의 다음은 모델 설정과 실행 환경이다", () => {
    expect(nextStepId("model", buildStepList({ ...MINIMAL, modelEnv: true }))).toBe("modelEnv");
  });

  it("⑨ 를 빼면 평가 대상 모델의 다음은 평가 데이터다 — 한 단계를 건너뛴다", () => {
    // 하드코딩된 다음 목적지가 성립하지 않는 이유가 바로 이것이다.
    expect(nextStepId("model", buildStepList(MINIMAL))).toBe("upload");
  });

  it("데이터 정보가 없으면 컬럼 매핑의 다음은 평가 관점이다", () => {
    expect(nextStepId("mapping", buildStepList(MINIMAL))).toBe("perspective");
    expect(nextStepId("mapping", buildStepList(FULL))).toBe("dataInfo");
  });

  it("마지막 단계의 다음은 없다", () => {
    expect(nextStepId("report", buildStepList(FULL))).toBeNull();
  });

  it("첫 단계의 이전은 없다 — 화면은 재료 고르기로 돌아간다", () => {
    expect(prevStepId("clientInfo", buildStepList(FULL))).toBeNull();
  });

  it("이전도 건너뛴 단계를 넘어간다", () => {
    expect(prevStepId("upload", buildStepList(MINIMAL))).toBe("model");
    expect(prevStepId("upload", buildStepList(FULL))).toBe("modelEnv");
  });

  it("목록에 없는 단계는 이웃이 없다", () => {
    expect(nextStepId("dataInfo", buildStepList(MINIMAL))).toBeNull();
    expect(prevStepId("dataInfo", buildStepList(MINIMAL))).toBeNull();
  });
});

/**
 * 종전 `canEnterStep` 은 `step - 1` 을 선행 단계로 삼았다. 단계가 고정일 때만 맞는 산수다 —
 * 카드를 빼면 번호가 당겨지므로 **계산된 목록의 직전 항목**을 봐야 한다(ISSUES.md E-12).
 */
describe("진입 가드", () => {
  const steps = buildStepList(FULL);

  it("첫 단계는 언제나 들어갈 수 있다", () => {
    expect(canEnterStepId("clientInfo", [], steps)).toBe(true);
  });

  it("아무것도 안 마쳤으면 뒤 단계로 뛸 수 없다", () => {
    expect(canEnterStepId("model", [], steps)).toBe(false);
    expect(canEnterStepId("report", ["clientInfo", "model"], steps)).toBe(false);
  });

  it("직전 단계를 마쳤으면 들어갈 수 있다", () => {
    expect(canEnterStepId("model", ["clientInfo"], steps)).toBe(true);
    expect(canEnterStepId("modelEnv", ["clientInfo", "model"], steps)).toBe(true);
  });

  it("이미 마친 단계는 언제든 다시 볼 수 있다", () => {
    const done: StepId[] = ["clientInfo", "model", "modelEnv"];
    expect(canEnterStepId("clientInfo", done, steps)).toBe(true);
    expect(canEnterStepId("model", done, steps)).toBe(true);
  });

  it("직전 단계는 목록 기준이다 — 카드를 빼면 선행 단계가 달라진다", () => {
    // 전체 구성에서 평가 데이터의 직전은 모델 설정과 실행 환경,
    expect(canEnterStepId("upload", ["model"], steps)).toBe(false);
    expect(canEnterStepId("upload", ["modelEnv"], steps)).toBe(true);

    // ⑨ 를 빼면 평가 대상 모델이다.
    expect(canEnterStepId("upload", ["model"], buildStepList(MINIMAL))).toBe(true);
  });

  it("목록에서 빠진 단계는 들어갈 수 없다", () => {
    // 카드를 빼서 사라진 단계는 URL 로도 열리지 않아야 한다.
    expect(canEnterStepId("dataInfo", ["mapping"], buildStepList(MINIMAL))).toBe(false);
  });
});

/**
 * 종전 `resumeStep` 은 `Math.max(...completed) + 1` 이었다. 번호가 연속일 때만 맞는 식이라,
 * 건너뛴 단계가 있으면 빈 화면으로 보냈다.
 */
describe("이어서 할 단계", () => {
  const steps = buildStepList(FULL);

  it("아무것도 안 마쳤으면 첫 단계다", () => {
    expect(resumeStepId([], steps)).toBe("clientInfo");
  });

  it("앞에서부터 훑어 처음 미완료를 돌려준다", () => {
    expect(resumeStepId(["clientInfo"], steps)).toBe("model");
    expect(resumeStepId(["clientInfo", "model", "modelEnv"], steps)).toBe("upload");
  });

  it("순서가 뒤섞여 저장돼 있어도 목록 순서로 판단한다", () => {
    expect(resumeStepId(["modelEnv", "clientInfo", "model"], steps)).toBe("upload");
  });

  it("중간에 구멍이 있으면 그 구멍으로 보낸다 — Math.max 식의 실패 지점", () => {
    expect(resumeStepId(["clientInfo", "modelEnv", "upload"], steps)).toBe("model");
  });

  it("종전 순서로 마친 사용자도 처음 미완료로 간다 — 의뢰자 정보가 맨 앞으로 왔다", () => {
    // 종전에는 업로드 → 지표 → 매핑 → 검증 → 의뢰자 정보 순이었다.
    expect(resumeStepId(["upload", "metrics", "mapping", "validation"], steps)).toBe("clientInfo");
  });

  it("전부 마쳤으면 마지막 단계다", () => {
    expect(resumeStepId([...steps], steps)).toBe("report");
  });
});

describe("단계 ↔ 경로", () => {
  it("성적서 앞의 단계는 모두 /app/* 고정 경로다 — run 은 검증에서 생긴다", () => {
    expect(stepIdToPath("clientInfo")).toBe("/app/client-info");
    expect(stepIdToPath("model")).toBe("/app/model");
    expect(stepIdToPath("modelEnv")).toBe("/app/model-env");
    expect(stepIdToPath("dataInfo")).toBe("/app/data-info");
    expect(stepIdToPath("perspective")).toBe("/app/perspective");
    expect(stepIdToPath("metrics")).toBe("/app/metrics");
    // run id 가 있어도 고정 경로다.
    expect(stepIdToPath("dataInfo", "run-1")).toBe("/app/data-info");
  });

  it("성적서는 run 경로 자체다", () => {
    expect(stepIdToPath("report", "run-1")).toBe("/report/run-1");
  });

  it("run id 가 없으면 성적서 대신 워크스페이스 목록으로 보낸다 (ISSUES.md E-02·E-06)", () => {
    // 종전의 `/report/preview` 는 저장되지 않는 임시 성적서를 만들어 발급을 불가능하게 했다.
    expect(stepIdToPath("report")).toBe("/workspaces");
    expect(stepIdToPath("report", null)).toBe("/workspaces");
  });

  it("경로에서 단계를 알아본다", () => {
    expect(pathToStepId("/app/client-info")).toBe("clientInfo");
    expect(pathToStepId("/app/perspective")).toBe("perspective");
    expect(pathToStepId("/app/data-validation")).toBe("validation");
    expect(pathToStepId("/report/run-1")).toBe("report");
  });

  it("단계가 아닌 경로는 null 이다 — 종전처럼 조용히 1단계로 떨어지지 않는다", () => {
    expect(pathToStepId("/app")).toBeNull();
    expect(pathToStepId("/app/composer")).toBeNull();
    expect(pathToStepId("/workspaces")).toBeNull();
    expect(pathToStepId("/report/run-1/print")).toBeNull();
    // 옛 run 경로들. 라우트가 /app/* 나 성적서로 리다이렉트하고, 단계로는 알아보지 않는다.
    expect(pathToStepId("/report/run-1/issue-info")).toBeNull();
    expect(pathToStepId("/report/run-1/summary")).toBeNull();
    // 성적서 번호로 서버 보관본을 복원하는 경로. 단계가 아니다.
    expect(pathToStepId("/report/no/RPT-2026-0001")).toBeNull();
  });

  it("경로와 단계가 서로를 되돌린다", () => {
    for (const id of buildStepList(FULL)) {
      expect(pathToStepId(stepIdToPath(id, "run-1"))).toBe(id);
    }
  });
});
