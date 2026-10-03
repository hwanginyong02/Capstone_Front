/**
 * 단계 목록이 카드 선택을 따라가는지 고정한다.
 *
 * 문서가 숫자로 못박은 것은 둘이다: 최소 구성이면 8단계(1~6, 9, 10), 전체면 10단계
 * (docs/COMPOSER_COMPONENTS.md "카드별 입력 단계"). 그 사이의 9단계는 어느 카드를 켰는지로
 * 갈린다.
 */
import { describe, expect, it } from "vitest";

import { buildStepList, stepNumberOf } from "./workflowSteps";
import { DEFAULT_COMPOSER_SELECTION } from "../../types/reportComposer.types";
import { presetSelection } from "../../data/reportComposer";
import type { ComposerSelection } from "../../types/reportComposer.types";

const MINIMAL = presetSelection("minimal");
const FULL = presetSelection("full");

describe("단계 목록", () => {
  it("최소 구성은 8단계다 — 7·8단계가 빠진다", () => {
    expect(buildStepList(MINIMAL)).toEqual([
      "upload",
      "perspective",
      "metrics",
      "mapping",
      "validation",
      "summary",
      "clientInfo",
      "report",
    ]);
  });

  it("전체는 10단계다", () => {
    expect(buildStepList(FULL)).toEqual([
      "upload",
      "perspective",
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

  it("기본 선택(프리셋 전체)이면 10단계다", () => {
    expect(buildStepList(DEFAULT_COMPOSER_SELECTION)).toHaveLength(10);
  });

  it("가능한 단계 수는 8 · 9 · 10 뿐이다", () => {
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
    expect([...counts].sort((a, b) => a - b)).toEqual([8, 9, 10]);
  });
});

describe("7단계 데이터 정보 — ⑥ ⑦ ⑧ 중 하나라도 켜면 나타난다", () => {
  it.each(["trainingData", "testData", "groundTruth"] as const)(
    "%s 만 켜도 나타난다",
    (cardId) => {
      const steps = buildStepList({ ...MINIMAL, [cardId]: true });
      expect(steps).toContain("dataInfo");
      expect(steps).not.toContain("modelEnv");
      expect(steps).toHaveLength(9);
    },
  );

  it("셋 다 꺼지면 사라진다", () => {
    expect(buildStepList({ ...FULL, trainingData: false, testData: false, groundTruth: false }))
      .not.toContain("dataInfo");
  });
});

describe("8단계 모델과 환경 — ⑨ 에만 달려 있다", () => {
  it("⑨ 만 켜면 나타나고 7단계는 빠진다", () => {
    const steps = buildStepList({ ...MINIMAL, modelEnv: true });
    expect(steps).toContain("modelEnv");
    expect(steps).not.toContain("dataInfo");
    expect(steps).toHaveLength(9);
  });

  it("⑨ 만 끄면 9단계가 된다", () => {
    expect(buildStepList({ ...FULL, modelEnv: false })).toHaveLength(9);
  });
});

describe("단계 순서와 번호", () => {
  it("평가 관점은 업로드 다음, 지표 바로 앞이다", () => {
    // 평가 관점이 지표 점검의 기준이라 지표보다 먼저 받아야 한다.
    const steps = buildStepList(FULL);
    expect(steps.indexOf("perspective")).toBe(steps.indexOf("upload") + 1);
    expect(steps.indexOf("metrics")).toBe(steps.indexOf("perspective") + 1);
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
    expect(stepNumberOf("clientInfo", buildStepList(FULL))).toBe(9);
    expect(stepNumberOf("clientInfo", buildStepList(MINIMAL))).toBe(7);
    expect(stepNumberOf("dataInfo", buildStepList(MINIMAL))).toBe(0);
  });
});
