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

describe("연결이 없는 필드", () => {
  it("빈 patch 를 돌려준다", () => {
    // ⑥ 수집 환경 차이는 기존 저장소에 대응 칸이 없다 — 저장만 하는 새 필드다.
    expect(buildLegacyPatch(fieldOf("trainingData", "channelEffects"), { choices: ["장비 차이"] }))
      .toEqual({});
  });
});

describe("한 칸 → 한 필드", () => {
  it("⑥ 데이터 이름이 datasetInfo 로 간다", () => {
    expect(buildLegacyPatch(fieldOf("trainingData", "trainingDatasetName"), { text: "고객 로그 2024" }))
      .toEqual({ datasetInfo: { trainingDatasetName: "고객 로그 2024" } });
  });

  it('"모름"은 빈 값으로 보낸다', () => {
    // 기존 저장소에 모름을 담을 자리가 없고, 성적서는 빈 칸을 "제공되지 않음"으로 그린다.
    expect(buildLegacyPatch(fieldOf("trainingData", "trainingDatasetName"), { unknown: true }))
      .toEqual({ datasetInfo: { trainingDatasetName: "" } });
  });
});

describe("칸마다 다른 필드 (byKey)", () => {
  it("⑥ 데이터 양이 학습·검증 건수로 갈린다", () => {
    const value = { entries: [{ key: "학습", value: "12000" }, { key: "검증", value: "3000" }] };

    expect(buildLegacyPatch(fieldOf("trainingData", "trainingVolume"), value)).toEqual({
      datasetInfo: { trainingSampleCount: "12000", validationSampleCount: "3000" },
    });
  });

  it("⑨ 실행 환경이 OS·CPU·GPU·메모리·소프트웨어로 갈린다", () => {
    const value = {
      entries: [
        { key: "운영체제", value: "Ubuntu 22.04" },
        { key: "GPU", value: "A100" },
        { key: "메모리", value: "64GB" },
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

describe("칸이 동적인 필드는 한 줄로 합친다", () => {
  it("⑥ 클래스별 데이터 양", () => {
    // 칸이 업로드한 클래스마다 생기므로 짝지을 기존 필드가 하나뿐이다.
    const value = { entries: [{ key: "정상", value: "8400" }, { key: "이탈", value: "3600" }] };

    expect(buildLegacyPatch(fieldOf("trainingData", "trainingClassVolume"), value)).toEqual({
      datasetInfo: { trainingClassDistribution: "정상 8400 / 이탈 3600" },
    });
  });

  it("빈 줄은 빼고 합친다", () => {
    const value = {
      entries: [{ key: "정상", value: "8400" }, { key: "", value: "" }],
    };

    expect(buildLegacyPatch(fieldOf("trainingData", "trainingClassVolume"), value)).toEqual({
      datasetInfo: { trainingClassDistribution: "정상 8400" },
    });
  });
});

describe("레지스트리와 기존 저장소가 어긋나지 않는다", () => {
  it("연결된 필드 이름이 실제 저장소 키와 같다", () => {
    const BASIC_INFO_KEYS = ["envOS", "envCPU", "envGPU", "envMemory", "envSoftware"];
    const DATASET_INFO_KEYS = [
      "trainingDatasetName",
      "trainingSampleCount",
      "validationSampleCount",
      "trainingClassDistribution",
      "trainingDataFormat",
      "trainingDataDescription",
    ];

    for (const card of [getCard("trainingData"), getCard("modelEnv")]) {
      for (const field of card.fields) {
        if (!field.legacy) continue;
        const names =
          "byKey" in field.legacy ? Object.values(field.legacy.byKey) : [field.legacy.field];
        const allowed = field.legacy.target === "basicInfo" ? BASIC_INFO_KEYS : DATASET_INFO_KEYS;
        for (const name of names) expect(allowed, `${field.id} → ${name}`).toContain(name);
      }
    }
  });
});
