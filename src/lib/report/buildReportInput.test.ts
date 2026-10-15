/**
 * 성적서 입력은 재료 고르기에서 받기로 한 것만 싣는다(docs/MATERIAL_PICKER.md §6).
 *
 * 체크를 끄기 전에 적어 둔 값이 저장소에 남아 있을 수 있다. 그 값을 찍으면 "고르지 않은 권장 항목은
 * 제공되지 않음"이 깨진다. 또 ⑨ 실행 환경은 성적서 4절 환경 표의 칸(`basicInfo.env*`)으로 옮긴다 —
 * 종전에는 Details 의 "시험 환경" 폼이 같은 값을 따로 받았다(§5).
 */
import { beforeEach, describe, expect, it } from "vitest";

import { buildReportInput } from "./mapWorkflowToFinalReport";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

const source = () => useWorkflowStore.getState();

beforeEach(() => {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
  useWorkflowStore.setState({
    taskType: "binary",
    composerCards: { trainingData: true, testData: false, groundTruth: false, modelEnv: true },
    composerTrainingData: {
      trainingDatasetName: { text: "고객 로그 2024" },
      trainingDataSource: { text: "사내 CRM" },
      trainingNotes: { text: "이틀 뺐음" },
    },
    composerModelEnv: {
      algorithm: { text: "XGBoost" },
      runtimeEnv: {
        entries: [
          { key: "Operating system", value: "Ubuntu 22.04" },
          { key: "GPU", value: "A100" },
        ],
      },
    },
    basicInfo: {
      ...useWorkflowStore.getState().basicInfo,
      website: "https://example.com",
      fax: "02-1234-5679",
      envOS: "Windows 11",
    },
  });
});

describe("받기로 한 것만 싣는다", () => {
  it("고르지 않은 권장·선택 필드의 값은 뺀다 — 남아 있어도 성적서에 찍지 않는다", () => {
    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingDatasetName"] } });

    const training = buildReportInput(source()).composer!.trainingData;

    expect(training.trainingDatasetName?.text).toBe("고객 로그 2024");
    expect(training.trainingDataSource).toBeUndefined();
    expect(training.trainingNotes).toBeUndefined();
  });

  it("재료 고르기 이전 상태(저장한 체크 없음)에서는 모두 싣는다", () => {
    const training = buildReportInput(source()).composer!.trainingData;

    expect(Object.keys(training).sort()).toEqual([
      "trainingDataSource",
      "trainingDatasetName",
      "trainingNotes",
    ]);
  });

  it("③ 의 선택 항목도 고르지 않았으면 비운다", () => {
    useWorkflowStore.setState({ materialPicks: { clientInfo: ["contactExtra:fax"] } });

    const { basicInfo } = buildReportInput(source());

    expect(basicInfo.website).toBe("");
    expect(basicInfo.fax).toBe("02-1234-5679");
  });
});

describe("⑨ 실행 환경 → 성적서 4절", () => {
  it("⑨ 를 넣었으면 그 값으로 환경 칸을 채운다", () => {
    const { basicInfo } = buildReportInput(source());

    expect(basicInfo.envOS).toBe("Ubuntu 22.04");
    expect(basicInfo.envGPU).toBe("A100");
    // ⑨ 에서 지운 칸은 비운다 — 옛 폼 값이 남지 않는다.
    expect(basicInfo.envCPU).toBe("");
  });

  it("⑨ 를 넣지 않았으면 옛 폼에 적었던 값을 그대로 쓴다", () => {
    useWorkflowStore.setState({
      composerCards: { trainingData: true, testData: false, groundTruth: false, modelEnv: false },
    });

    expect(buildReportInput(source()).basicInfo.envOS).toBe("Windows 11");
  });

  it("실행 환경을 고르지 않았으면 옮기지 않는다", () => {
    useWorkflowStore.setState({ materialPicks: { modelEnv: ["algorithm"] } });

    const input = buildReportInput(source());

    expect(input.composer!.modelEnv.runtimeEnv).toBeUndefined();
    expect(input.basicInfo.envOS).toBe("Windows 11");
  });
});
