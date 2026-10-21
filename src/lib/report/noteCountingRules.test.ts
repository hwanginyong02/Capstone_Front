/**
 * 덧붙이는 글의 셈 규칙 표(서술 라운드 B, 점검 표 2.0) — 한 곳에 표로 고정한다.
 *
 * 한 줄마다 네 자리를 같이 본다. 자리마다 판정 함수가 달라(진행 점검 `hasValue`, 성적서 줄 `buildReportMaterials`,
 * 2층 셈 `checkMaterialSelection`, AI 고객 입력 `buildClientInputs`) 한 자리만 바뀌면 어긋난다.
 * - 답함: 진행 점검이 이 칸을 채운 것으로 보는가(필수 칸이면 "다음"이 열리는가).
 * - 제공: 재료 선택 점검 2층이 그 보고 항목을 제공으로 세는가(1층 선언은 2층 셈이 없다 — `null`).
 * - 인쇄: 성적서 표에 찍히는 글(`toTableRows`). AI 고객 입력도 같은 글이다.
 *
 * 규칙: 1층 선택지 필수 · 2층 글만도 제공 · "모름 + 글"은 제공 아님(글은 "의뢰자 제공: …"으로 인쇄·AI 전달) ·
 * "기타"를 고르고 내용을 비우면 제공 아님 · GPU 두 줄은 선택 필수(글은 두 줄 아래 한 줄).
 */
import { describe, expect, it } from "vitest";

import { getCard } from "../../data/reportComposer";
import { hasValue } from "../../utils/domain/composerFieldGate";
import { toTableRows } from "../../components/report/shared/materialRows";
import { checkMaterialSelection } from "./materialCheck";
import { labelCautions } from "./problemList";
import { labelCautionSentence, sourceRelationSentence } from "./dataCautionPhrases";
import { declarations } from "./narrativeFacts";
import { buildClientInputs, buildReportMaterials, type ReportComposerInput } from "./reportMaterials";
import type { ComposerCardId, ComposerFieldValue } from "../../types/reportComposer.types";
import type { MaterialRow, ReportMaterials } from "../../types/finalReport.types";

const N = "외주 업체가 붙였다고만 들음";

type Where = "declarations" | "groundTruth" | "training" | "environment";

interface Case {
  name: string;
  card: ComposerCardId;
  field: string;
  value: ComposerFieldValue;
  answered: boolean;
  /** 2층 보고 항목의 제공 여부. 1층 선언이면 null. */
  provided: boolean | null;
  /** 그 칸이 찍히는 줄(이름 → 인쇄 글). */
  printed: Record<string, string>;
}

// 표 — 바꾸려면 점검 표 버전(주 번호)도 함께 올린다(materialCheck.ts 머리).
const TABLE: Case[] = [
  // 1층 선언(⑤) — 선택지를 골라야 답이다.
  { name: "1층 선택", card: "perspective", field: "criticalErrorType", value: { text: "Missed (FN)" }, answered: true, provided: null, printed: { "위험 방향": "FN이 더 위험" } },
  { name: "1층 선택 + 글", card: "perspective", field: "criticalErrorType", value: { text: "Missed (FN)", note: N }, answered: true, provided: null, printed: { "위험 방향": `FN이 더 위험 (의뢰자 제공: ${N})` } },
  { name: "1층 글만", card: "perspective", field: "criticalErrorType", value: { note: N }, answered: false, provided: null, printed: { "위험 방향": `제공되지 않음 (의뢰자 제공: ${N})` } },
  { name: "1층 빈칸", card: "perspective", field: "usageMode", value: {}, answered: false, provided: null, printed: { "사용 방식": "제공되지 않음" } },
  // 2층 하나 고르기(⑧ 라벨 작성 주체 → 4번).
  { name: "2층 선택", card: "groundTruth", field: "labelAuthor", value: { text: "Domain experts" }, answered: true, provided: true, printed: { "정답 라벨 구축 방법": "전문가 수동" } },
  { name: "2층 선택 + 글", card: "groundTruth", field: "labelAuthor", value: { text: "Domain experts", note: N }, answered: true, provided: true, printed: { "정답 라벨 구축 방법": `전문가 수동 (의뢰자 제공: ${N})` } },
  { name: "2층 글만", card: "groundTruth", field: "labelAuthor", value: { note: N }, answered: true, provided: true, printed: { "정답 라벨 구축 방법": `의뢰자 제공: ${N}` } },
  { name: "2층 모름", card: "groundTruth", field: "labelAuthor", value: { unknown: true }, answered: true, provided: false, printed: { "정답 라벨 구축 방법": "제공되지 않음" } },
  { name: "2층 모름 + 글", card: "groundTruth", field: "labelAuthor", value: { unknown: true, note: N }, answered: true, provided: false, printed: { "정답 라벨 구축 방법": `제공되지 않음 (의뢰자 제공: ${N})` } },
  { name: "2층 기타 + 내용", card: "groundTruth", field: "labelAuthor", value: { text: "Other (free text)", otherText: "의사 2인" }, answered: true, provided: true, printed: { "정답 라벨 구축 방법": "기타(의사 2인)" } },
  { name: "2층 기타 빈칸", card: "groundTruth", field: "labelAuthor", value: { text: "Other (free text)" }, answered: false, provided: false, printed: { "정답 라벨 구축 방법": "제공되지 않음" } },
  { name: "2층 기타 빈칸 + 글", card: "groundTruth", field: "labelAuthor", value: { text: "Other (free text)", note: N }, answered: false, provided: false, printed: { "정답 라벨 구축 방법": `제공되지 않음 (의뢰자 제공: ${N})` } },
  { name: "2층 빈칸", card: "groundTruth", field: "labelAuthor", value: {}, answered: false, provided: false, printed: { "정답 라벨 구축 방법": "제공되지 않음" } },
  // 2층 여럿 고르기(⑥ 채널 효과 → 9번). "알려진 것 없음"은 제공된 답이다.
  { name: "2층 여럿 글만", card: "trainingData", field: "channelEffects", value: { note: N }, answered: true, provided: true, printed: { "채널 효과": `의뢰자 제공: ${N}` } },
  { name: "2층 여럿 알려진 것 없음 + 글", card: "trainingData", field: "channelEffects", value: { choices: ["None known"], note: N }, answered: true, provided: true, printed: { "채널 효과": `알려진 것 없음 (의뢰자 제공: ${N})` } },
  // ⑨ GPU 사용 여부(두 줄 → 11번) — 선택 필수, 글은 두 줄 아래 한 줄(보고 항목 번호 없음).
  { name: "GPU 두 줄 + 글", card: "modelEnv", field: "gpuUsage", value: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "No" }], note: N }, answered: true, provided: true, printed: { "학습 가속": "예", "추론 가속": "아니오", "가속 사용 덧붙임": `의뢰자 제공: ${N}` } },
  { name: "GPU 모름 줄 + 글", card: "modelEnv", field: "gpuUsage", value: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "Unknown" }], note: N }, answered: true, provided: false, printed: { "학습 가속": "예", "추론 가속": "제공되지 않음", "가속 사용 덧붙임": `의뢰자 제공: ${N}` } },
  { name: "GPU 글만", card: "modelEnv", field: "gpuUsage", value: { note: N }, answered: false, provided: false, printed: { "학습 가속": "제공되지 않음", "추론 가속": "제공되지 않음", "가속 사용 덧붙임": `의뢰자 제공: ${N}` } },
];

const ITEM_OF: Partial<Record<string, number>> = { labelAuthor: 4, channelEffects: 9, gpuUsage: 11 };
const WHERE: Record<ComposerCardId, Where> = {
  perspective: "declarations",
  groundTruth: "groundTruth",
  trainingData: "training",
  modelEnv: "environment",
} as Record<ComposerCardId, Where>;
const AI_KEY: Record<Where, string> = {
  declarations: "declarations",
  groundTruth: "ground_truth",
  training: "training_data",
  environment: "environment",
};

function composerWith(c: Case): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
    metrics: {},
    perspective: {},
    trainingData: {},
    testData: {},
    groundTruth: {},
    modelEnv: {},
    [c.card]: { [c.field]: c.value },
  } as ReportComposerInput;
}

function rowsOf(materials: ReportMaterials, where: Where): MaterialRow[] {
  return materials[where];
}

describe("셈 규칙 표 (서술 라운드 B, 점검 표 2.0)", () => {
  it("표가 비지 않았고 네 갈래(1층·2층 하나·2층 여럿·GPU)를 다 담는다", () => {
    expect(TABLE.length).toBeGreaterThan(0);
    expect(new Set(TABLE.map((c) => c.field))).toEqual(
      new Set(["criticalErrorType", "usageMode", "labelAuthor", "channelEffects", "gpuUsage"]),
    );
  });

  it.each(TABLE)("$name — 답함 $answered · 제공 $provided", (c) => {
    const field = getCard(c.card).fields.find((f) => f.id === c.field)!;
    const composer = composerWith(c);
    const materials = buildReportMaterials(composer, "binary");
    const where = WHERE[c.card];

    // 답함 — 진행 점검.
    expect(hasValue(field, c.value)).toBe(c.answered);

    // 인쇄 — 성적서 표의 글.
    const printed = Object.fromEntries(
      toTableRows(rowsOf(materials, where))
        .filter((row) => row.label in c.printed)
        .map((row) => [row.label, row.value]),
    );
    expect(printed).toEqual(c.printed);

    // AI 고객 입력 — 같은 글.
    const inputs = buildClientInputs({
      composer,
      materials,
      model: { name: "m", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: null,
      classLabelDescriptions: {},
      runtime: {},
    });
    const block = inputs[AI_KEY[where]] as Record<string, string>;
    for (const [label, text] of Object.entries(c.printed)) expect(block[label], label).toBe(text);

    // 제공 — 2층 셈.
    const item = ITEM_OF[c.field];
    if (c.provided === null) {
      expect(item).toBeUndefined();
    } else {
      const result = checkMaterialSelection({
        taskType: "binary",
        materials,
        systemSpec: { os: "a", cpu: "b", gpu: "c", memory: "d", software: "e" },
        latencyMapped: true,
        perspective: {},
        selectedMetricIds: ["M1"],
        beta: 1,
        imbalanceRatio: 2,
        distributionSource: "validation",
      });
      expect(result.reporting.items.find((it) => it.item === item)?.provided).toBe(c.provided);
    }
  });

  it("글을 받지 않는 칸은 글만으로 답이 되지 않고, 글도 싣지 않는다", () => {
    const source = getCard("testData").fields.find((f) => f.id === "testDataSource")!;
    expect(source.allowsNote).toBeFalsy();
    expect(hasValue(source, { note: N })).toBe(false);
  });
});

describe("멀티레이블 지표 선택 이유(12번) — 모름 + 글", () => {
  const build = (value: ComposerFieldValue) =>
    buildReportMaterials(
      {
        cards: { trainingData: false, testData: false, groundTruth: false, modelEnv: false },
        metrics: { metricRationale: value },
        perspective: {},
        trainingData: {},
        testData: {},
        groundTruth: {},
        modelEnv: {},
      },
      "multilabel",
    );

  it("모름 + 글이면 값은 null(12번 빠짐), 글은 따로 실려 AI 에 '제공되지 않음 (의뢰자 제공: …)'", () => {
    const materials = build({ unknown: true, note: N });
    expect(materials.metricRationale).toBeNull();
    expect(materials.metricRationaleNote).toBe(N);
    const inputs = buildClientInputs({
      composer: {} as never,
      materials,
      model: { name: "m", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: null,
      classLabelDescriptions: {},
      runtime: {},
    });
    expect(inputs.metric_rationale).toBe(`제공되지 않음 (의뢰자 제공: ${N})`);
  });

  it("글만이면 제공(값이 '의뢰자 제공: …'), 따로 실린 글은 없다", () => {
    const materials = build({ note: N });
    expect(materials.metricRationale).toBe(`의뢰자 제공: ${N}`);
    expect("metricRationaleNote" in materials).toBe(false);
  });
});

/**
 * 선택값으로 갈리는 조건 — 글만 쓴 답은 "선택값 없음"으로 읽혀 어느 조건도 열지 않는다. 글 자체는 성적서와 AI 에
 * "의뢰자 제공"으로 따로 간다(위 표). 자리마다 판정 함수가 달라 자리마다 따로 본다. 비교 기준으로 같은 자리에
 * 선택값이 있으면 조건이 열리는 것도 함께 확인한다(테스트가 늘 null 만 보는 것이 아님을).
 */
describe("글만 쓴 답 — 선택값을 읽는 조건", () => {
  const base: ReportComposerInput = {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
    metrics: {},
    perspective: {},
    trainingData: {},
    testData: {},
    groundTruth: {},
    modelEnv: {},
  };
  const withValues = (patch: Partial<ReportComposerInput>): ReportComposerInput => ({ ...base, ...patch });

  it("정답 라벨 주의(9절·7.2 고정 문구 12)", () => {
    expect(labelCautions(withValues({ groundTruth: { labelReview: { text: "No review" } } }))).toHaveLength(1);
    expect(labelCautions(withValues({ groundTruth: { labelReview: { note: "검토 없음" }, labelAuthor: { note: "규칙" } } }))).toEqual([]);
    expect(labelCautionSentence(withValues({ groundTruth: { labelReview: { note: "검토 없음" } } }))).toBeNull();
  });

  it("8.2 출처 관계 고정 문구 11a·11b", () => {
    expect(sourceRelationSentence(withValues({ testData: { testSourceRelation: { text: "Same source" } } }))).not.toBeNull();
    expect(sourceRelationSentence(withValues({ testData: { testSourceRelation: { note: "일부 겹침" } } }))).toBeNull();
  });

  it("D24 선언 코드(사실 시트 declarations)", () => {
    expect(declarations(withValues({ perspective: { criticalErrorType: { text: "Missed (FN)" } } }), "binary").risk_direction).toBe("fn");
    expect(declarations(withValues({ perspective: { criticalErrorType: { note: "놓치면 큰일" } } }), "binary")).toEqual({
      risk_direction: null,
      class_priority: null,
      usage_mode: null,
    });
  });

  it("5절 평균 방식 문장(고정 문구 4)", () => {
    expect(buildReportMaterials(withValues({ perspective: { classPriority: { text: "All equal" } } }), "multiclass").averagingSentence).toBeDefined();
    expect(buildReportMaterials(withValues({ perspective: { classPriority: { note: "모두 중요" } } }), "multiclass").averagingSentence).toBeUndefined();
  });

  it("재료 선택 점검 3층(사용 방식·위험 방향·클래스 중요도 줄)", () => {
    const lines = (perspective: ReportComposerInput["perspective"], taskType: "binary" | "multiclass") =>
      checkMaterialSelection({
        taskType,
        materials: buildReportMaterials(withValues({ perspective }), taskType),
        systemSpec: { os: "a", cpu: "b", gpu: "c", memory: "d", software: "e" },
        latencyMapped: false,
        perspective,
        selectedMetricIds: ["M1"],
        beta: 1,
        imbalanceRatio: 2,
        distributionSource: "validation",
      }).purpose.lines.map((line) => line.id);
    expect(lines({ usageMode: { text: "Real-time" }, criticalErrorType: { text: "Missed (FN)" } }, "binary")).toEqual([
      "latency",
      "riskDirection",
    ]);
    expect(lines({ classPriority: { text: "All equal" } }, "multiclass")).toEqual(["averaging"]);
    expect(lines({ usageMode: { note: "실시간" }, criticalErrorType: { note: "놓침" } }, "binary")).toEqual([]);
    expect(lines({ classPriority: { note: "동등" } }, "multiclass")).toEqual([]);
  });
});

describe("'해당 없음' 줄(서술 설계 D15) — 성적서에는 찍고 AI 고객 입력에서는 뺀다", () => {
  const composer: ReportComposerInput = {
    cards: { trainingData: false, testData: false, groundTruth: true, modelEnv: false },
    metrics: {},
    perspective: {},
    trainingData: {},
    testData: {},
    groundTruth: { labelAuthor: { text: "Domain experts" }, labelReview: { text: "One reviewer" } },
    modelEnv: {},
  };
  const materials = buildReportMaterials(composer, "binary");

  it("성적서 3절 표에는 두 줄이 '해당 없음'으로 있다", () => {
    expect(toTableRows(materials.groundTruth)).toEqual([
      { label: "정답 라벨 구축 방법", value: "전문가 수동" },
      { label: "정답 라벨 신뢰성", value: "단일 라벨러" },
      { label: "라벨러 수", value: "해당 없음" },
      { label: "라벨 일치도", value: "해당 없음" },
    ]);
  });

  it("AI 에는 없다 — 나머지 줄은 그대로", () => {
    const inputs = buildClientInputs({
      composer,
      materials,
      model: { name: "m", version: "v1", purpose: "", category: "" },
      reportPurposeNote: "",
      coreMetrics: null,
      classLabelDescriptions: {},
      runtime: {},
    });
    expect(inputs.ground_truth).toEqual({ "정답 라벨 구축 방법": "전문가 수동", "정답 라벨 신뢰성": "단일 라벨러" });
  });

  it("2층 셈은 그대로 — 해당 없음 줄이 5번을 빠짐으로 만들지 않는다", () => {
    const result = checkMaterialSelection({
      taskType: "binary",
      materials,
      systemSpec: { os: "a", cpu: "b", gpu: "c", memory: "d", software: "e" },
      latencyMapped: true,
      perspective: {},
      selectedMetricIds: ["M1"],
      beta: 1,
      imbalanceRatio: 2,
      distributionSource: "validation",
    });
    expect(result.reporting.items.find((item) => item.item === 5)?.provided).toBe(true);
  });
});
