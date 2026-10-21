/**
 * 사실 시트 계약(facts-1) — `NARRATIVE_ROUND/사실시트_계약.json` 의 사본(`src/test/contract/`)과 실제 조립이 같은가.
 *
 * - 백엔드 골든 평가 응답 세 개(사본)를 고정한 의뢰자 입력으로 조립한 요청이 계약 예시(`fact_sheet_*.json`)와
 *   같아야 한다. 백엔드는 같은 예시를 자기 사본으로 읽어 `NarrativeRequest` 로 검증한다(각 저장소가 CI 에서 돈다).
 * - 예시를 다시 만들려면 `UPDATE_CONTRACT=1 npx vitest run src/lib/report/factSheetContract.test.ts` — 바뀐 이유를
 *   라운드 기록에 적고 세 사본(라운드 폴더·백엔드)을 함께 고친다.
 * - 두 저장소 사본이 같은지는 옆 저장소가 있을 때만 본다(CI 는 저장소 하나만 받는다 — skipIf).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { TaskType } from "../../data/evaluationData";
import { DEFAULT_BASIC_INFO, type MetricDetailStateMap } from "../../types/workflow.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import { assembleEvaluatedReport } from "./assembleEvaluatedReport";
import type { NarrativeRequestPayload } from "./buildFactSheet";
import * as limits from "./factSheetLimits";
import { fitNarrativePayload } from "./factSheetFit";
import { mapWorkflowToFinalReport } from "./mapWorkflowToFinalReport";
import * as facts from "./narrativeFacts";
import { NEAR_TARGET_RATIO } from "./computeVerdict";
import { BENCHMARK_METRIC_NAMES } from "./benchmarkBaselines";
import type { ReportComposerInput } from "./reportMaterials";

const CONTRACT_DIR = resolve(__dirname, "../../test/contract");
const BACKEND_CONTRACT_DIR = resolve(__dirname, "../../../../Capstone_Back/tests/contract");
const BACKEND_GOLDEN_DIR = resolve(__dirname, "../../../../Capstone_Back/tests/golden");
const ROUND_CONTRACT = resolve(__dirname, "../../../../NARRATIVE_ROUND/사실시트_계약.json");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const contract = readJson(resolve(CONTRACT_DIR, "fact_sheet_contract.json"));

function details(targets: Record<string, string>, beta?: string): MetricDetailStateMap {
  return Object.fromEntries(
    Object.entries(targets).map(([id, targetValue]) => [
      id,
      { id, name: id, description: "", targetValue, beta: id === "M5" ? beta ?? "" : "", positiveClass: "", completed: true },
    ]),
  );
}

function composer(p: {
  perspective: ComposerValueMap;
  training?: Record<string, string>;
}): ReportComposerInput {
  return {
    cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true } as ReportComposerInput["cards"],
    metrics: {},
    perspective: p.perspective,
    trainingData: p.training
      ? { trainingClassVolume: { entries: Object.entries(p.training).map(([key, value]) => ({ key, value })) } }
      : {},
    testData: { testSourceRelation: { text: "Same source", unknown: false } },
    groundTruth: {},
    modelEnv: {},
  };
}

interface Case {
  taskType: TaskType;
  golden: string;
  /** M21·M22 는 고르지 않는다 — 표·최약 클래스가 지표 선택과 무관하게 실리는지가 계약의 핵심이다. */
  selected: string[];
  targets: Record<string, string>;
  beta?: string;
  composerMetrics: ComposerValueMap;
  composer: ReportComposerInput;
  metadata: Record<string, unknown>;
}

/** 세 유형의 고정 입력. 선언·학습 분포·핵심 지표 출처가 갈래마다 다르게 걸리도록 골랐다. */
const CASES: Record<"binary" | "multiclass" | "multilabel", Case> = {
  binary: {
    taskType: "binary",
    golden: "evaluate_binary_csv.json",
    selected: ["M1", "M2", "M3", "M4", "M5", "M9"],
    // M1 0.505 < 0.51 미달·근소, M4 0.5123 ≥ 0.5 충족·근소. M5 는 β 기본값(1) — 골든이 β=1 로 계산한 값이라
    // 다른 β 를 붙이면 계약 예시가 틀린 사실(β=2 인데 F1 과 같은 값)을 싣는다.
    targets: { M1: "0.51", M4: "0.5", M5: "0.5" },
    composerMetrics: {},
    composer: composer({
      perspective: { criticalErrorType: { text: "Missed (FN)" }, usageMode: { text: "Real-time" } },
      training: { "0": "600", "1": "400" },
    }),
    metadata: { positive_class: "1", detected_classes: ["0", "1"], class_distribution: { "0": 105, "1": 95 } },
  },
  multiclass: {
    taskType: "multiclass",
    golden: "evaluate_multiclass_csv.json",
    selected: ["M1", "M2", "M3", "M4"],
    targets: { M1: "0.4", M4: "0.3" },
    composerMetrics: { coreMetrics: { choices: ["M1"] } },
    composer: composer({
      perspective: { classPriority: { text: "Larger classes first" }, usageMode: { text: "Batch" } },
      training: { bird: "100", cat: "300", dog: "100" },
    }),
    metadata: { detected_classes: ["bird", "cat", "dog"], class_distribution: { bird: 69, cat: 57, dog: 74 } },
  },
  multilabel: {
    taskType: "multilabel",
    golden: "evaluate_multilabel_csv.json",
    selected: ["M4", "M15", "M16", "M17"],
    targets: { M4: "0.5", M15: "0.6" },
    composerMetrics: {},
    composer: composer({
      perspective: { classPriority: { text: "Individual samples first" }, usageMode: { text: "Real-time" } },
    }),
    metadata: { detected_labels: ["finance", "news", "sports", "tech"] },
  },
};

function buildPayload(c: Case): { payload: NarrativeRequestPayload; report: ReturnType<typeof assembleEvaluatedReport> } {
  const base = mapWorkflowToFinalReport({
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "계약 주식회사", modelName: "ContractModel", reportPurpose: "external" },
    taskType: c.taskType,
    selectedMetricIds: c.selected,
    metricDetails: {},
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
    composer: c.composer,
  });
  const golden = readJson(resolve(CONTRACT_DIR, c.golden));
  // 골든은 모든 지표를 골라 만든 응답이다. 엔진은 고른 지표만 돌려주므로 고르지 않은 M21·M22 를 뺀다 —
  // 늘 계산하는 새 칸(confusion_matrix·class_report)만 남는 실제 모양.
  for (const id of ["M21", "M22"]) if (!c.selected.includes(id)) delete golden.results.success_metrics[id];
  const report = assembleEvaluatedReport(base, golden, {
    taskType: c.taskType,
    selectedMetricIds: c.selected,
    metricDetails: details(c.targets, c.beta),
    composerMetrics: c.composerMetrics,
    columnMapping: [],
    metadata: c.metadata,
    composer: c.composer,
  });
  const payload = fitNarrativePayload({
    task_type: c.taskType,
    report_purpose: base.evalScope.reportPurposeKey,
    fact_sheet: report.factSheet,
  });
  return { payload, report };
}

/** 운영 main 프론트(9-22)가 보내던 모양 — facts·새 지표 칸이 없고 M21·M22 가 value 0·info 줄로 실린다. */
function legacyMainShape(payload: NarrativeRequestPayload): Record<string, unknown> {
  const sheet = structuredClone(payload.fact_sheet) as unknown as Record<string, unknown>;
  delete sheet.facts;
  const keep = ["metric_id", "display_name", "value", "threshold", "status", "is_core", "ci_low", "ci_high", "margin", "near_target"];
  const metrics = (sheet.metrics as Array<Record<string, unknown>>).map((m) =>
    Object.fromEntries(Object.entries(m).filter(([k]) => keep.includes(k))),
  );
  for (const id of ["M21", "M22"]) {
    metrics.push({ metric_id: id, display_name: id === "M21" ? "Confusion Matrix" : "Classification Report", value: 0, threshold: null, status: "info", is_core: false, ci_low: null, ci_high: null, margin: null, near_target: false });
  }
  sheet.metrics = metrics;
  const gain = sheet.f1_threshold_gain as Record<string, unknown> | null;
  if (gain) {
    delete gain.notable;
    delete gain.gain_text;
  }
  const effect = sheet.imbalance_effect as Record<string, unknown> | null;
  if (effect) {
    delete effect.display;
    // 차이를 만든 네 값(서술 라운드 세션 B 엔진부터)도 운영 main 프론트는 보내지 않았다.
    for (const key of ["accuracy", "macro_f1", "majority_f1", "minority_f1"]) delete effect[key];
  }
  return { task_type: payload.task_type, report_purpose: payload.report_purpose, fact_sheet: sheet };
}

const UPDATE = process.env.UPDATE_CONTRACT === "1";

function expectExample(name: string, actual: unknown) {
  const path = resolve(CONTRACT_DIR, name);
  // JSON 왕복 — 계약 파일에 실제로 실리는 모양(undefined 키 없음)으로 비교한다.
  const normalized = JSON.parse(JSON.stringify(actual));
  if (UPDATE) writeFileSync(path, `${JSON.stringify(normalized, null, 2)}\n`);
  expect(normalized).toEqual(readJson(path));
}

describe("계약 예시 — 백엔드 골든 평가 응답 → 조립 → 미리 자르기 = 계약 사본", () => {
  for (const [name, c] of Object.entries(CASES)) {
    it(`${name}`, () => {
      expectExample(`fact_sheet_${name}.json`, buildPayload(c).payload);
    });
  }

  it("legacy — 운영 main 프론트 모양(facts 없음, M21·M22 값 0 줄)", () => {
    expectExample("fact_sheet_legacy_main.json", legacyMainShape(buildPayload(CASES.binary).payload));
  });
});

describe("계약 예시의 뜻 — M21·M22 를 고르지 않아도 표·최약 클래스가 실리고, 6절 인쇄는 선택을 따른다", () => {
  for (const [name, c] of Object.entries(CASES)) {
    const { payload, report } = buildPayload(c);
    const sheet = payload.fact_sheet;

    it(`${name}: 사실 시트에 클래스별 표·평균 줄·최약 클래스, 지표 목록에 M21·M22 없음`, () => {
      expect(sheet.per_class.length).toBeGreaterThan(1);
      expect(sheet.class_averages.map((r) => r.label)).toContain("매크로 평균");
      expect(sheet.facts?.weakest_class?.label).toEqual(expect.any(String));
      expect(sheet.metrics.map((m) => m.metric_id)).not.toContain("M21");
      expect(sheet.metrics.map((m) => m.metric_id)).not.toContain("M22");
    });

    it(`${name}: 6절 인쇄용 표(M21·M22)는 고르지 않았으니 없다`, () => {
      expect(report.stage1Report.classReport).toBeNull();
      expect(report.stage1Report.charts.confusionMatrix).toBeNull();
    });

    it(`${name}: 성적서 데이터에 보낸 facts 와 같은 값을 저장한다(S7 D6 표)`, () => {
      expect(report.stage1Report.narrativeFacts).toEqual(sheet.facts);
    });
  }

  it("고정 문구 16: 이진(F-beta)·멀티(Exact Match Ratio)는 '일부', 다중(M1~M4 모두 기준표에 있음)은 없다", () => {
    const sixteen = (name: keyof typeof CASES) =>
      buildPayload(CASES[name]).payload.fact_sheet.facts?.fixed_sentences.filter((s) => s.id === "16") ?? [];
    expect(sixteen("binary")).toEqual([
      { id: "16", section: "8.1", text: "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: F-beta Score." },
    ]);
    expect(sixteen("multilabel")).toEqual([
      { id: "16", section: "8.1", text: "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: Exact Match Ratio." },
    ]);
    expect(buildPayload(CASES.multiclass).payload.fact_sheet.facts?.fixed_sentences.length).toBeGreaterThan(0);
    expect(sixteen("multiclass")).toEqual([]);
  });

  it("다중: 혼동행렬이 사실 시트에 실리고 6.2 와 같은 마이크로 평균 줄(accuracy)이 있다", () => {
    const sheet = buildPayload(CASES.multiclass).payload.fact_sheet;
    expect(sheet.confusion?.labels).toEqual(["bird", "cat", "dog"]);
    expect(sheet.class_averages.find((r) => r.label === "마이크로 평균")?.f1).toBe(0.335);
  });

  it("이진: 양성 클래스는 confusion_counts 에서(M21 무관), β 는 따로", () => {
    const sheet = buildPayload(CASES.binary).payload.fact_sheet;
    expect(sheet.confusion?.positive_class).toBe("1");
    expect(sheet.facts?.positive_class).toBe("1");
    const f5 = sheet.metrics.find((m) => m.metric_id === "M5")!;
    expect(f5.beta).toBe(1);
    expect(sheet.facts?.selected_metrics).toEqual(["M1", "M2", "M3", "M4", "M5", "M9"]);
    expect(f5.display_name).not.toMatch(/β/);
  });
});

describe("계약 상수 = 코드 상수", () => {
  it("상한(MAX_*)과 예산은 factSheetLimits 와 같다", () => {
    for (const [name, value] of Object.entries(contract.constants)) {
      if (name.startsWith("$")) continue;
      if (name in limits) expect([name, (limits as Record<string, unknown>)[name]]).toEqual([name, value]);
    }
    // 코드의 상한 상수는 (프론트 전용 줄이기 단계 크기 하나를 빼고) 모두 계약에 있다 — 한쪽에만 생기면 실패.
    const codeOnly = Object.keys(limits).filter((k) => !(k in contract.constants));
    expect(codeOnly).toEqual(["FACTS_LIST_TRIM"]);
  });

  it("기준표 지표 이름(고정 문구 16)은 benchmarkBaselines 사본과 같다", () => {
    expect(Object.keys(contract.constants.benchmark_metric_names).length).toBeGreaterThan(0);
    expect(contract.constants.benchmark_metric_names).toEqual(BENCHMARK_METRIC_NAMES);
  });

  it("판정 기준값은 narrativeFacts·computeVerdict 와 같다", () => {
    const k = contract.constants;
    expect([
      facts.LOW_SUPPORT_MIN,
      facts.LOW_SHARE_MIN,
      facts.WEAKEST_F1_GAP,
      facts.PR_GAP_MIN,
      facts.DISTRIBUTION_SHIFT_MIN,
      facts.TOP_CONFUSION_PAIRS,
      NEAR_TARGET_RATIO,
    ]).toEqual([
      k.LOW_SUPPORT_MIN,
      k.LOW_SHARE_MIN,
      k.WEAKEST_F1_GAP,
      k.PR_GAP_MIN,
      k.DISTRIBUTION_SHIFT_MIN,
      k.TOP_CONFUSION_PAIRS,
      k.NEAR_TARGET_RATIO,
    ]);
    expect(facts.FACTS_CONTRACT).toBe(contract.contract);
  });

  it("계약의 facts 칸 목록 = 실제 facts 키", () => {
    const declared = Object.keys(contract.facts).filter((k) => !k.startsWith("$"));
    const actual = Object.keys(buildPayload(CASES.binary).payload.fact_sheet.facts!);
    expect([...actual].sort()).toEqual([...declared].sort());
  });
});

describe("두 저장소·라운드 폴더 사본이 같다(옆 저장소가 있을 때만)", () => {
  const files = [
    "fact_sheet_contract.json",
    "fact_sheet_binary.json",
    "fact_sheet_multiclass.json",
    "fact_sheet_multilabel.json",
    "fact_sheet_legacy_main.json",
  ];
  it.skipIf(!existsSync(BACKEND_CONTRACT_DIR))("백엔드 tests/contract 사본", () => {
    for (const f of files) {
      expect([f, readJson(resolve(BACKEND_CONTRACT_DIR, f))]).toEqual([f, readJson(resolve(CONTRACT_DIR, f))]);
    }
  });
  it.skipIf(!existsSync(ROUND_CONTRACT))("라운드 폴더 계약", () => {
    expect(readJson(ROUND_CONTRACT)).toEqual(contract);
  });
  it.skipIf(!existsSync(BACKEND_GOLDEN_DIR))("골든 평가 응답 사본 = 백엔드 골든", () => {
    for (const c of Object.values(CASES)) {
      expect([c.golden, readJson(resolve(CONTRACT_DIR, c.golden))]).toEqual([
        c.golden,
        readJson(resolve(BACKEND_GOLDEN_DIR, c.golden)),
      ]);
    }
  });
});
