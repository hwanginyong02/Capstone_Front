/**
 * 카드 값이 기존 저장소에 제대로 흘러가는지 고정한다.
 *
 * 이 연결이 끊기면 **화면은 멀쩡한데 성적서의 칸만 조용히 빈다** — 사용자는 분명히 입력했고
 * 다음 단계로도 넘어갔는데 인쇄물에서만 사라지므로, 발급하고 나서야 알게 된다.
 */
import { describe, expect, it } from "vitest";

import { buildLegacyPatch } from "./composerLegacyMirror";
import { getCard } from "../../data/reportComposer";
import type { ComposerField } from "../../types/reportComposer.types";

const fieldOf = (cardId: Parameters<typeof getCard>[0], fieldId: string): ComposerField =>
  getCard(cardId).fields.find((field) => field.id === fieldId)!;

/** 한 칸짜리 연결. 지금 레지스트리에는 이런 필드가 없어 규칙만 고정한다. */
const singleLinked: ComposerField = {
  id: "fixture",
  label: "Fixture",
  inputExample: "x",
  kind: "required",
  input: "text",
  legacy: { target: "basicInfo", field: "envOS" },
};

describe("연결이 없는 필드", () => {
  it("빈 patch 를 돌려준다", () => {
    // ⑥ 은 기존 저장소로 흘려보내지 않는다 — 성적서가 카드 값을 직접 읽는다(persist v10).
    expect(buildLegacyPatch(fieldOf("trainingData", "trainingDatasetName"), { text: "고객 로그" }))
      .toEqual({});
    expect(buildLegacyPatch(fieldOf("trainingData", "trainingVolume"), { entries: [] })).toEqual({});
  });
});

describe("한 칸 → 한 필드", () => {
  it("값을 그 필드에 쓴다", () => {
    expect(buildLegacyPatch(singleLinked, { text: "Ubuntu" })).toEqual({
      basicInfo: { envOS: "Ubuntu" },
    });
  });

  it('"모름"은 빈 값으로 보낸다', () => {
    // 기존 저장소에 모름을 담을 자리가 없고, 성적서는 빈 칸을 "제공되지 않음"으로 그린다.
    expect(buildLegacyPatch(singleLinked, { unknown: true })).toEqual({ basicInfo: { envOS: "" } });
  });
});

describe("칸마다 다른 필드 (byKey)", () => {
  it("⑨ 실행 환경이 OS·CPU·GPU·메모리·소프트웨어로 갈린다", () => {
    const value = {
      entries: [
        { key: "Operating system", value: "Ubuntu 22.04" },
        { key: "GPU", value: "A100" },
        { key: "Memory", value: "64GB" },
      ],
    };

    // 비운 칸도 빈 문자열로 보낸다 — 지웠다는 사실이 전해져야 한다.
    expect(buildLegacyPatch(fieldOf("modelEnv", "runtimeEnv"), value)).toEqual({
      basicInfo: {
        envOS: "Ubuntu 22.04",
        envCPU: "",
        envGPU: "A100",
        envMemory: "64GB",
        envSoftware: "",
      },
    });
  });

  it('byKey 필드도 "모름" 이면 전부 비운다', () => {
    expect(buildLegacyPatch(fieldOf("modelEnv", "runtimeEnv"), { unknown: true })).toEqual({
      basicInfo: { envOS: "", envCPU: "", envGPU: "", envMemory: "", envSoftware: "" },
    });
  });
});

describe("레지스트리와 기존 저장소가 어긋나지 않는다", () => {
  it("연결된 필드 이름이 실제 저장소 키와 같다", () => {
    const BASIC_INFO_KEYS = ["envOS", "envCPU", "envGPU", "envMemory", "envSoftware"];

    for (const card of [getCard("trainingData"), getCard("modelEnv")]) {
      for (const field of card.fields) {
        if (!field.legacy) continue;
        const names =
          "byKey" in field.legacy ? Object.values(field.legacy.byKey) : [field.legacy.field];
        for (const name of names) expect(BASIC_INFO_KEYS, `${field.id} → ${name}`).toContain(name);
      }
    }
  });
});
