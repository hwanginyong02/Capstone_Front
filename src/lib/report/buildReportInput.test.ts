/**
 * 성적서 입력은 재료 고르기에서 받기로 한 것만 싣는다(docs/MATERIAL_PICKER.md §6).
 *
 * 체크를 끄기 전에 적어 둔 값이 저장소에 남아 있을 수 있다. 그 값을 찍으면 "고르지 않은 권장 항목은
 * 제공되지 않음"이 깨진다. 또 ⑨ 실행 환경은 성적서 4절 환경 표의 칸(`basicInfo.env*`)으로 옮긴다 —
 * 종전에는 Details 의 "시험 환경" 폼이 같은 값을 따로 받았다(§5).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildReportInput, mapWorkflowToFinalReport } from "./mapWorkflowToFinalReport";
import { NOT_PROVIDED, buildClientInputs, buildReportMaterials } from "./reportMaterials";
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

describe("재료 선택 점검의 진행 기록", () => {
  it("스토어의 기록을 성적서 입력에 싣는다(없으면 null)", () => {
    expect(buildReportInput(source()).materialCheckAck).toBeNull();
    const ack = { at: "2026-10-17T05:03:00.000Z", version: "1.0", warningIds: ["reporting:8"] };
    useWorkflowStore.getState().setMaterialCheckAck(ack);
    expect(buildReportInput(source()).materialCheckAck).toEqual(ack);
  });
});

describe("[B2] 조건부 값은 조건을 정하는 필드를 받을 때만 싣는다", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      composerCards: { trainingData: false, testData: false, groundTruth: true, modelEnv: false },
      composerGroundTruth: {
        labelAuthor: { text: "Client" },
        labelReview: { text: "Several reviewers" },
        labelReviewerCount: { text: "3" },
        labelAgreementKind: { text: "Percent agreement" },
        labelAgreementValue: { text: "82" },
      },
    });
  });

  it("검수 방식을 빼면 라벨러 수·일치도 값도 빠진다 — 성적서 줄은 종전과 같다", () => {
    useWorkflowStore.setState({ materialPicks: { groundTruth: ["labelAuthor"] } });
    const input = buildReportInput(source());

    expect(Object.keys(input.composer!.groundTruth)).toEqual(["labelAuthor"]);
    // 종전에도 검수 방식이 빠져 있으면 라벨러 수 줄을 찍지 않았다 — 인쇄 결과는 바뀌지 않는다.
    const legacy = {
      ...input.composer!,
      groundTruth: { ...input.composer!.groundTruth, labelReviewerCount: { text: "3" } },
    };
    const rows = buildReportMaterials(input.composer!, "binary").groundTruth;
    expect(rows.map((row) => row.label)).toEqual(["정답 라벨 구축 방법", "정답 라벨 신뢰성"]);
    expect(buildReportMaterials(legacy, "binary").groundTruth).toEqual(rows);
  });

  it("검수 방식을 받으면 라벨러 수·일치도를 싣는다", () => {
    useWorkflowStore.setState({ materialPicks: { groundTruth: ["labelAuthor", "labelReview"] } });
    const rows = buildReportMaterials(buildReportInput(source()).composer!, "binary").groundTruth;

    expect(rows.find((row) => row.label === "라벨러 수")?.value).toBe("3명");
    expect(rows.find((row) => row.label === "라벨 일치도")?.value).toMatch(/0\.82$/);
  });
});

describe("전용 화면이 받는 선택 항목 — 놓지 않았으면 성적서·AI 에 싣지 않는다(§12.4)", () => {
  const file = (name: string) => ({ name, size: 1, type: "image/png" }) as never;

  beforeEach(() => {
    useWorkflowStore.setState({
      columnMapping: [
        { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
      ],
      metadata: { column_unique_values: { label: ["0", "1"] } },
      classLabelDescriptions: { "0": "정상", "1": "이탈" },
      trainingExampleFiles: [file("ok.png")],
      trainingUnsuitableExampleFiles: [file("bad.png")],
    });
  });

  it("평가 흐름 이전(picks 없음)이면 그대로 싣는다", () => {
    const input = buildReportInput(source());
    expect(input.classLabelDescriptions).toEqual({ "0": "정상", "1": "이탈" });
    expect(input.trainingExampleFiles.map((item) => item.name)).toEqual(["ok.png"]);
    expect(input.trainingUnsuitableExampleFiles.map((item) => item.name)).toEqual(["bad.png"]);
  });

  it("클래스 레이블 설명을 놓지 않았으면 {} — 다른 ① 항목을 놓았어도", () => {
    useWorkflowStore.setState({ materialPicks: { evalData: ["latencyColumn"] } });
    expect(buildReportInput(source()).classLabelDescriptions).toEqual({});
  });

  it("놓았으면 싣는다", () => {
    useWorkflowStore.setState({ materialPicks: { evalData: ["classLabelDescriptions"] } });
    expect(buildReportInput(source()).classLabelDescriptions).toEqual({ "0": "정상", "1": "이탈" });
  });

  it("예시 파일은 칸마다 따로 — 놓은 쪽만 싣는다", () => {
    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingUnsuitableExamples"] } });
    const input = buildReportInput(source());
    expect(input.trainingExampleFiles).toEqual([]);
    expect(input.trainingUnsuitableExampleFiles.map((item) => item.name)).toEqual(["bad.png"]);

    useWorkflowStore.setState({ materialPicks: { trainingData: ["trainingExamples"] } });
    const other = buildReportInput(source());
    expect(other.trainingExampleFiles.map((item) => item.name)).toEqual(["ok.png"]);
    expect(other.trainingUnsuitableExampleFiles).toEqual([]);
  });

  it("지금 클래스의 설명만 — 옛 파일·옛 정답 컬럼의 키는 싣지 않는다(N1)", () => {
    useWorkflowStore.setState({ classLabelDescriptions: { "0": "정상", "1": "이탈", churn: "옛 파일의 클래스" } });
    expect(buildReportInput(source()).classLabelDescriptions).toEqual({ "0": "정상", "1": "이탈" });

    // 정답 컬럼을 바꾸면 그 컬럼의 클래스가 기준이다.
    useWorkflowStore.setState({
      columnMapping: [
        { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "ignore", modified: true, warnings: [] },
        { originalName: "status", sampleValues: ["churn"], inferredRole: "ignore", confirmedRole: "y_true", modified: true, warnings: [] },
      ],
      metadata: { column_unique_values: { label: ["0", "1"], status: ["churn", "stay"] } },
    });
    expect(buildReportInput(source()).classLabelDescriptions).toEqual({ churn: "옛 파일의 클래스" });
  });

  it("정답 컬럼이 없으면 설명을 싣지 않는다 — 3절도 클래스를 찍지 않는다", () => {
    useWorkflowStore.setState({ columnMapping: [] });
    expect(buildReportInput(source()).classLabelDescriptions).toEqual({});
  });

  it("AI 에 넘기는 설명도 같은 거른 값이다 — useReportData 가 스토어 값을 직접 넘기지 않는다", () => {
    const hook = readFileSync(resolve(__dirname, "../../hooks/useReportData.ts"), "utf-8");
    const start = hook.indexOf("buildClientInputs({");
    expect(start).toBeGreaterThan(0);
    const call = hook.slice(start);
    expect(call).toMatch(/classLabelDescriptions:\s*reportInput\.classLabelDescriptions/);
    expect(hook).not.toMatch(/workflowState\.classLabelDescriptions/);
  });
});

/**
 * B5③ — ⑥ 학습 클래스 분포는 지금 클래스의 칸만 싣는다. 옛 파일·옛 정답 컬럼에서 적어 둔 칸이 남으면 3절에
 * 옛 클래스가 찍히고, 9절 분포 차이가 평가 데이터에 없는 클래스로 거짓 차이를 냈다.
 */
describe("[B5③] 학습 클래스 분포 — 지금 클래스의 칸만", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      columnMapping: [
        { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
      ],
      metadata: { column_unique_values: { label: ["0", "1"] } },
      composerTrainingData: {
        trainingClassVolume: {
          entries: [
            { key: "0", value: "800" },
            { key: "1", value: "200" },
            { key: "churn", value: "5000" },
          ],
        },
      },
    });
  });

  it("옛 클래스 칸을 빼고 지금 클래스의 칸은 그대로 둔다 — 3절 분포 줄에 옛 클래스가 없다", () => {
    const input = buildReportInput(source());
    expect(input.composer!.trainingData.trainingClassVolume?.entries).toEqual([
      { key: "0", value: "800" },
      { key: "1", value: "200" },
    ]);
    const rows = buildReportMaterials(input.composer!, "binary").training;
    expect(rows.find((row) => row.label === "학습 클래스 분포")?.value).toBe("0 800 / 1 200");
  });

  it("정답 컬럼이 없으면 칸이 남지 않는다 — 3절은 '제공되지 않음'", () => {
    useWorkflowStore.setState({ columnMapping: [] });
    const input = buildReportInput(source());
    expect(input.composer!.trainingData.trainingClassVolume?.entries).toEqual([]);
    const rows = buildReportMaterials(input.composer!, "binary").training;
    expect(rows.find((row) => row.label === "학습 클래스 분포")?.value).toBeNull();
  });

  it("'모름'·값 없음은 그대로 둔다", () => {
    useWorkflowStore.setState({ composerTrainingData: { trainingClassVolume: { unknown: true } } });
    expect(buildReportInput(source()).composer!.trainingData.trainingClassVolume).toEqual({ unknown: true });
    useWorkflowStore.setState({ composerTrainingData: {} });
    expect(buildReportInput(source()).composer!.trainingData.trainingClassVolume).toBeUndefined();
  });
});

/**
 * W3 — 칸별 "모름"을 성적서 4절·3절, AI, 2층 점검에 싣는다. 모름인 칸만 "제공되지 않음"이고 아는 칸은 그대로다.
 */
describe("[W3] 칸별 모름 → 성적서·AI·2층", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      composerModelEnv: {
        runtimeEnv: {
          entries: [
            { key: "Operating system", value: "Ubuntu 22.04" },
            { key: "CPU", value: "옛 값" },
            { key: "GPU", value: "A100" },
            { key: "Memory", value: "64GB" },
            { key: "Software", value: "Python 3.11" },
          ],
          unknownKeys: ["CPU"],
        },
        gpuUsage: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "Unknown" }] },
      },
      composerTrainingData: {
        trainingVolume: {
          entries: [
            { key: "Training", value: "12000" },
            { key: "Validation", value: "3000" },
          ],
          unknownKeys: ["Validation"],
        },
      },
    });
  });

  it("4절: CPU 만 '제공되지 않음', 나머지 칸은 적은 값 — 잠근 칸에 남은 값은 싣지 않는다", () => {
    const report = mapWorkflowToFinalReport(buildReportInput(source()));
    expect(report.evalEnv.systemSpec).toEqual({
      os: "Ubuntu 22.04",
      cpu: NOT_PROVIDED,
      gpu: "A100",
      memory: "64GB",
      software: "Python 3.11",
    });
  });

  it("2층 7번은 CPU 하나만 빠졌다고 센다", () => {
    const report = mapWorkflowToFinalReport(buildReportInput(source()));
    const item7 = report.materialCheck!.reporting.items.find((item) => item.item === 7)!;
    expect(item7).toMatchObject({ provided: false, missing: ["CPU"] });
  });

  it("3절: 학습 수만 알면 검증 줄만 '제공되지 않음'", () => {
    const rows = buildReportMaterials(buildReportInput(source()).composer!, "binary").training;
    expect(rows.find((row) => row.label === "학습 샘플 수")?.value).toBe("12,000개");
    expect(rows.find((row) => row.label === "검증 샘플 수")?.value).toBeNull();
  });

  it("3절 학습 데이터 표(trainingDatasetInfo)도 검증 칸의 잠긴 값을 싣지 않는다", () => {
    const info = mapWorkflowToFinalReport(buildReportInput(source())).trainingDatasetInfo!;
    expect(info.trainingSampleCount).toBe(12000);
    // 0 은 DatasetSection 이 줄을 그리지 않는 값이다 — 잠긴 "3000" 이 찍히면 안 된다.
    expect(info.validationSampleCount).toBe(0);
  });

  it("AI: 실행 환경 CPU·검증 샘플 수·추론 가속이 '제공되지 않음'으로 간다", () => {
    const input = buildReportInput(source());
    const materials = buildReportMaterials(input.composer!, "binary");
    const inputs = buildClientInputs({
      composer: input.composer!,
      materials,
      model: { name: "m", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: [],
      classLabelDescriptions: {},
      // useReportData 와 같은 출처(성적서 4절과 같은 basicInfo.env*).
      runtime: {
        운영체제: input.basicInfo.envOS ?? "",
        CPU: input.basicInfo.envCPU ?? "",
        GPU: input.basicInfo.envGPU ?? "",
        메모리: input.basicInfo.envMemory ?? "",
        소프트웨어: input.basicInfo.envSoftware ?? "",
      },
    });
    const env = inputs.environment as Record<string, string>;
    expect(env.CPU).toBe(NOT_PROVIDED);
    expect(env.운영체제).toBe("Ubuntu 22.04");
    expect(env["학습 가속"]).toBe("예");
    expect(env["추론 가속"]).toBe(NOT_PROVIDED);
    const training = inputs.training_data as Record<string, string>;
    expect(training["학습 샘플 수"]).toBe("12,000개");
    expect(training["검증 샘플 수"]).toBe(NOT_PROVIDED);
  });

  it("옮기기 전 스냅샷의 필드 모름도 칸마다 '제공되지 않음'이다 — GPU 필드 모름 포함(N8)", () => {
    useWorkflowStore.setState({
      composerModelEnv: { runtimeEnv: { unknown: true, entries: [{ key: "CPU", value: "x" }] }, gpuUsage: { unknown: true, entries: [{ key: "Training", value: "Yes" }] } },
    });
    const input = buildReportInput(source());
    expect(input.basicInfo.envCPU).toBe("");
    const env = buildReportMaterials(input.composer!, "binary").environment;
    expect(env.map((row) => row.value)).toEqual([null, null]);
  });
});
