/**
 * 재료 선택 점검 판 4 글(S3 ⑤, 대응표 4, 4절 표지 요약) — 판정·버전(2.0)은 판 3 과 같고, 찍는 글 셋(표지 표준 문구·
 * 1.3 "제공되지 않은 정보"·3.3 평균 방식 미충족)이 판 4 글이며, 표지 요약의 보고 항목·주요 제약 줄(`coverRows`)을 더 만든다.
 *
 * 글자는 고정 문구 사본(`src/test/edition4/fixedWording.ed4.json`)과 대조한다 — 고정 문구 탭(2.2·2.3·21) → 부록 B(B4·B7).
 * 주요 제약 규칙(21번)과 B4 는 예시본을 만들며 정한 초안이다(판 4 를 켜기 전 확인 목록) — 시험 이름에 "초안".
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { TaskType } from "../../data/evaluationData";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import { josaEunNeun, josaEuroRo } from "./koreanJosa";
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "./mapWorkflowToFinalReport";
import {
  checkMaterialSelection,
  COVER_ROW_CONSTRAINT,
  COVER_ROW_REPORTING,
  COVER_STANDARD_ALL,
  COVER_STANDARD_MISSING_ED4,
  MATERIAL_CHECK_VERSION,
  type MaterialCheckInput,
} from "./materialCheck";
import { buildReportMaterials, type ReportComposerInput } from "./reportMaterials";

type Json = any;
const WORDING: Json = JSON.parse(readFileSync(resolve(__dirname, "../../test/edition4/fixedWording.ed4.json"), "utf8"));
const FIXED: Record<string, Json> = WORDING.fixed;
const B: Record<string, { candidate: string }> = WORDING.appendixB_raw;

const FULL_COMPOSER: ReportComposerInput = {
  cards: { trainingData: true, testData: true, groundTruth: true, modelEnv: true },
  metrics: { metricRationale: { text: "Errors weighted evenly" } },
  perspective: {},
  trainingData: {
    trainingDatasetName: { text: "사내 데이터 v3" },
    trainingDataSource: { text: "운영 로그" },
    trainingVolume: { entries: [{ key: "Training", value: "8000" }, { key: "Validation", value: "2000" }] },
    trainingClassVolume: { entries: [{ key: "0", value: "6000" }, { key: "1", value: "2000" }] },
    channelEffects: { choices: ["None known"] },
    imbalanceHandling: { choices: ["Did nothing"] },
  },
  testData: { testDataSource: { text: "별도 수집" }, testSourceRelation: { text: "Different source" } },
  groundTruth: {
    labelAuthor: { text: "Domain experts" },
    labelReview: { text: "Several reviewers" },
    labelReviewerCount: { text: "3" },
    labelAgreementKind: { text: "Not measured" },
  },
  modelEnv: {
    algorithm: { text: "XGBoost" },
    hyperparameters: { entries: [{ key: "max_depth", value: "6" }] },
    gpuUsage: { entries: [{ key: "Training", value: "Yes" }, { key: "Inference", value: "No" }] },
  },
};

const FULL_SPEC = { os: "Ubuntu 22.04", cpu: "Xeon", gpu: "A100", memory: "64GB", software: "Python 3.12" };
const answer = (fields: Record<string, string>): ComposerValueMap =>
  Object.fromEntries(Object.entries(fields).map(([id, text]) => [id, { text }]));

function input(over: Partial<Omit<MaterialCheckInput, "materials">> & { composer?: Partial<ReportComposerInput> } = {}): MaterialCheckInput {
  const { composer, ...rest } = over;
  const taskType: TaskType = rest.taskType ?? "binary";
  return {
    taskType,
    materials: buildReportMaterials({ ...FULL_COMPOSER, ...composer }, taskType),
    systemSpec: FULL_SPEC,
    latencyMapped: true,
    perspective: rest.perspective ?? {},
    selectedMetricIds: ["M1"],
    beta: 1,
    imbalanceRatio: 2,
    distributionSource: "validation",
    ...rest,
  };
}

/** 지연시간 빠짐(보고 항목 1개) + 목적별 2줄 중 1줄 충족 — 판 3 시험의 "6.0 세 줄" 입력과 같다. */
const MISSING = input({
  latencyMapped: false,
  perspective: answer({ usageMode: "Real-time", criticalErrorType: "Missed (FN)" }),
  selectedMetricIds: ["M3"],
});
const ed4 = (inp: MaterialCheckInput, sameSource = false) => checkMaterialSelection({ ...inp, edition: 4, sameSource });

describe("판정은 판과 무관 — 판 4 는 찍는 글만 다르다", () => {
  it("버전 2.0 유지, 판정·경고·6.0 요약은 판 3 과 같다", () => {
    const three = checkMaterialSelection(MISSING);
    const four = ed4(MISSING, true);
    expect(four.version).toBe("2.0");
    expect(MATERIAL_CHECK_VERSION).toBe("2.0");
    const { printed: p3, ...judged3 } = three;
    const { printed: p4, ...judged4 } = four;
    expect(judged4).toEqual(judged3);
    expect(p4.impacts).toEqual(p3.impacts);
    expect(p4.purposeShortfalls).toEqual(p3.purposeShortfalls);
    expect(p4.summary).toEqual(p3.summary);
  });

  it("판 3(기본값·3)은 종전 글 그대로이고 coverRows 가 없다 — 같은 출처를 넘겨도", () => {
    const base = checkMaterialSelection(MISSING);
    expect(checkMaterialSelection({ ...MISSING, edition: 3, sameSource: true })).toEqual(base);
    expect(base.printed.cover).toBe("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.4 참조)");
    expect(base.printed.notProvided).toContain("따라서 본 결과서는 이 항목들에 대해");
    expect(base.printed).not.toHaveProperty("coverRows");
  });
});

describe("판 4 글 세 문장 — 고정 문구 사본과 글자 대조", () => {
  it("표지 표준 문구(고정 문구 2.3 판 4)", () => {
    expect(COVER_STANDARD_MISSING_ED4).toBe(FIXED["2_3_cover_missing_ed4"]);
    expect(COVER_STANDARD_ALL).toBe(FIXED["2_3_cover_all"]);
    expect(ed4(MISSING).printed.cover).toBe(FIXED["2_3_cover_missing_ed4"]);
    expect(ed4(input()).printed.cover).toBe(FIXED["2_3_cover_all"]);
  });

  it("1.3 제공되지 않은 정보(고정 문구 2.2 판 4) — 이름표 '제공되지 않은 정보: '는 그리는 쪽이 붙인다(판 3 과 같음)", () => {
    const template: string = FIXED["2_2_not_provided_ed4"].text;
    const prefix = "제공되지 않은 정보: ";
    expect(template.startsWith(prefix)).toBe(true);
    const names = ["추론 효율성(지연시간)"];
    const expected = template.slice(prefix.length).replace("{목록}{은/는}", `${names.join(", ")}${josaEunNeun(names.at(-1)!)}`);
    expect(expected).not.toMatch(/[{}]/);
    expect(ed4(MISSING).printed.notProvided).toBe(expected);
    // 예시본 1.3 의 6번 글(이름표 뒤)과 같다.
    expect(ed4(MISSING).printed.notProvided).toBe(
      "ISO/IEC TS 4213이 보고를 요구하는 항목 중 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해 기재하지 않았다. 따라서 본 시험성적서는 위 항목에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
    );
    expect(ed4(input()).printed).not.toHaveProperty("notProvided");
  });

  it("빠진 항목이 여럿이면 쉼표로 잇고 마지막 이름으로 은/는", () => {
    const many = ed4(input({ latencyMapped: false, systemSpec: { ...FULL_SPEC, gpu: "" } }));
    // 추론 환경은 다섯 줄 중 GPU 만 빠짐 → "추론 환경(빠진 것: GPU)"(S6 뒤 사용자 결정 2).
    expect(many.printed.notProvided).toMatch(
      /^ISO\/IEC TS 4213이 보고를 요구하는 항목 중 추론 환경\(빠진 것: GPU\), 추론 효율성\(지연시간\)은 의뢰자로부터/,
    );
  });

  it("3.3 평균 방식 미충족(B7 미충족 글 — 안내문 자리라 합니다체, 1.3 참조)", () => {
    const check = (priority: string) =>
      ed4(input({ taskType: "multiclass", perspective: answer({ classPriority: priority }), selectedMetricIds: ["M1"] }));
    const result = check("Larger classes first");
    const declared = "다수 클래스 우선";
    const b7 = B.B7.candidate.split(" / 미충족: ")[1];
    expect(b7).toContain("없습니다(1.3 참조).");
    const expected = b7
      .replace('"{선언 값}"(으)로', `"${declared}"${josaEuroRo(declared)}`)
      .replace("{평균 방식}", "가중 평균");
    expect(expected).not.toMatch(/[{}]/);
    expect(result.printed.averagingSentence).toBe(expected);
    expect(result.printed.averagingSentence).toBe(
      '의뢰자가 클래스 중요도를 "다수 클래스 우선"으로 밝혔으나, 이에 맞는 가중 평균 지표는 시험 항목에 없습니다(1.3 참조).',
    );
    // 판 3 은 종전 해라체·1.4.
    expect(
      checkMaterialSelection(input({ taskType: "multiclass", perspective: answer({ classPriority: "Larger classes first" }), selectedMetricIds: ["M1"] }))
        .printed.averagingSentence,
    ).toBe('의뢰자가 클래스 중요도를 "다수 클래스 우선"으로 밝혔으나, 이에 맞는 가중 평균 지표는 시험 항목에 없다(1.4 참조).');
  });

  it("판 4 글 세 문장에 판 3 말(결과서·이 항목들·1.4 참조)이 없다", () => {
    const texts = [
      ed4(MISSING).printed.cover,
      ed4(MISSING).printed.notProvided!,
      ed4(input({ taskType: "multiclass", perspective: answer({ classPriority: "All equal" }), selectedMetricIds: ["M1"] })).printed
        .averagingSentence!,
    ];
    expect(texts.every((t) => typeof t === "string" && t.length > 0)).toBe(true);
    for (const t of texts) expect(t).not.toMatch(/결과서는|이 항목들|1\.4 참조/);
  });
});

describe("표지 요약 두 줄(coverRows, 고정 문구 21)", () => {
  const rows = (result: ReturnType<typeof checkMaterialSelection>) => result.printed.coverRows!;

  it("줄 이름은 고정 문구 21 의 셋째·넷째 이름", () => {
    expect([COVER_ROW_REPORTING, COVER_ROW_CONSTRAINT]).toEqual(FIXED["21_labels"].slice(2, 4));
    expect(rows(ed4(MISSING)).map((r) => r.label)).toEqual(["보고 항목", "주요 제약"]);
  });

  it("보고 항목 — 빠진 것이 있으면 '{N}개 중 {n}개 제공 (빠진 항목: …, 1.3)', 다 있으면 '모두 제공'", () => {
    const fill = (t: string, v: Record<string, string>) => Object.entries(v).reduce((acc, [k, x]) => acc.replace(`{${k}}`, x), t);
    expect(rows(ed4(MISSING))[0].value).toBe(fill(FIXED["21_reporting_row"], { N: "11", n: "10", 목록: "추론 효율성(지연시간)" }));
    expect(rows(ed4(MISSING))[0].value).toBe("TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)");
    expect(rows(ed4(input()))[0].value).toBe(fill(FIXED["21_reporting_all"], { N: "11" }));
    const multilabel = ed4(input({ taskType: "multilabel" }));
    expect(multilabel.reporting.total).toBe(12);
    expect(rows(multilabel)[0].value).toMatch(/^TS 4213 보고 항목 12개 /);
  });

  it("주요 제약(초안) — 같은 출처만: '평가 데이터가 학습 데이터와 같은 출처 (5.1)'", () => {
    expect(rows(ed4(input({ latencyMapped: true }), true))[1].value).toBe(FIXED["21_constraint_same_source_draft"]);
  });

  it("주요 제약(초안) — 목적별 점검 미충족만: '목적별 점검 {K}개 중 {k}개 충족 (1.3)'", () => {
    const value = rows(ed4(MISSING, false))[1].value;
    expect(value).toBe(FIXED["21_constraint_purpose_draft"].replace("{K}", "2").replace("{k}", "1"));
    expect(value).toBe("목적별 점검 2개 중 1개 충족 (1.3)");
  });

  it("주요 제약(초안, B4) — 같은 출처와 목적별 미충족이 함께면 쉼표로 잇는다", () => {
    const value = rows(ed4(MISSING, true))[1].value;
    expect(value).toBe(B.B4.candidate.replace("{K}", "2").replace("{k}", "1"));
    expect(value).toBe("평가 데이터가 학습 데이터와 같은 출처 (5.1), 목적별 점검 2개 중 1개 충족 (1.3)");
  });

  it("주요 제약(초안) — 둘 다 아니면 '없음'. 목적별 점검이 모두 충족이거나 적용 줄이 없으면 목적별 줄을 싣지 않는다", () => {
    expect(rows(ed4(input()))[1].value).toBe(FIXED["21_constraint_none_draft"]);
    const allMet = ed4(input({ perspective: answer({ criticalErrorType: "Missed (FN)" }), selectedMetricIds: ["M3"] }));
    expect(allMet.purpose).toMatchObject({ applicable: 1, met: 1 });
    expect(rows(allMet)[1].value).toBe("없음");
    // 빠진 보고 항목은 바로 위 줄에 있으므로 주요 제약에 되풀이하지 않는다.
    expect(rows(ed4(input({ latencyMapped: false })))[1].value).toBe("없음");
  });
});

// ── 배선: 매퍼가 판 4 run 에만 판 4 글을 저장하고, 같은 출처는 문제 목록과 같은 판단으로 ──────────────

function mapperInput(testSourceRelation: string): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "binary",
    selectedMetricIds: ["M1"],
    metricDetails: {},
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
    composer: { ...FULL_COMPOSER, testData: { ...FULL_COMPOSER.testData, testSourceRelation: { text: testSourceRelation } } },
  };
}

describe("mapWorkflowToFinalReport 배선", () => {
  it("판 4 run: 판 4 표지 문구와 coverRows, 같은 출처면 주요 제약에", () => {
    const same = mapWorkflowToFinalReport(mapperInput("Same source"), null, { contentSchema: 4 }).materialCheck!;
    expect(same.printed.cover).toBe(COVER_STANDARD_MISSING_ED4); // 검증 전이라 지연시간이 빠진다.
    expect(same.printed.coverRows![1].value).toMatch(/^평가 데이터가 학습 데이터와 같은 출처 \(5\.1\)/);
    const different = mapWorkflowToFinalReport(mapperInput("Different source"), null, { contentSchema: 4 }).materialCheck!;
    expect(different.printed.coverRows![1].value).not.toContain("같은 출처");
  });

  it("판 3 run: 종전 글, coverRows 없음", () => {
    const check = mapWorkflowToFinalReport(mapperInput("Same source"), null, { contentSchema: 3 }).materialCheck!;
    expect(check.printed.cover).toBe("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.4 참조)");
    expect(check.printed).not.toHaveProperty("coverRows");
    expect(mapWorkflowToFinalReport(mapperInput("Same source")).materialCheck).toEqual(check);
  });
});

describe("일부만 빠진 보고 항목 — '{항목 이름}(빠진 것: …)'(S6 뒤 사용자 결정 2, 판 4 만)", () => {
  const without = (map: ComposerValueMap, key: string): ComposerValueMap => Object.fromEntries(Object.entries(map).filter(([k]) => k !== key));
  const noClassVolume: Partial<ReportComposerInput> = { trainingData: without(FULL_COMPOSER.trainingData!, "trainingClassVolume") };
  const partial = input({ composer: noClassVolume });

  it("학습 데이터 줄 중 클래스 분포만 빠짐 → 표지·1.3·영향 줄에 빠진 줄 라벨", () => {
    const four = ed4(partial);
    const item = four.reporting.items.find((i) => i.item === 1)!;
    expect(item.provided).toBe(false);
    const name = `학습 데이터의 출처·크기·구성(빠진 것: ${item.missing.join("·")})`;
    expect(item.missing).toEqual(["학습 클래스 분포"]);
    expect(four.printed.coverRows![0].value).toBe(`TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: ${name}, 1.3)`);
    expect(four.printed.notProvided).toBe(
      `ISO/IEC TS 4213이 보고를 요구하는 항목 중 ${name}은 의뢰자로부터 제공받지 못해 기재하지 않았다. 따라서 본 시험성적서는 위 항목에 대해 TS 4213의 보고 요구를 충족하지 않는다.`,
    );
    expect(four.printed.impacts).toEqual([`${name}: 평가 결과를 학습 데이터와 견주어 해석할 수 있는지 판단할 수 없다.`]);
  });

  it("판정·경고 ID·저장 항목·버전·진행 기록 요약은 판 3 과 같고, 판 3 글은 이름만", () => {
    const three = checkMaterialSelection(partial);
    const four = ed4(partial);
    const { printed: p3, ...judged3 } = three;
    const { printed: p4, ...judged4 } = four;
    expect(judged4).toEqual(judged3);
    expect(four.warningIds).toEqual(["reporting:1"]);
    expect(four.reporting.items.every((i) => !("parts" in i))).toBe(true);
    expect(p4.summary).toEqual(p3.summary);
    expect(p3.impacts).toEqual(["학습 데이터의 출처·크기·구성: 평가 결과를 학습 데이터와 견주어 해석할 수 있는지 판단할 수 없다."]);
    expect(p3.notProvided).toContain("항목 중 학습 데이터의 출처·크기·구성은 의뢰자로부터");
  });

  it("빠진 줄이 여럿이면 '·'로 잇는다(추론 환경 다섯 칸 중 GPU·메모리)", () => {
    const two = ed4(input({ systemSpec: { ...FULL_SPEC, gpu: "", memory: "" } }));
    expect(two.printed.impacts).toEqual(["추론 환경(빠진 것: GPU·메모리): 결과가 어떤 하드웨어·소프트웨어에서 나왔는지 판단할 수 없다."]);
  });

  it("통째로 빠진 항목·한 줄 항목·빠진 줄이 항목 이름 그 자체면 이름만", () => {
    const whole = ed4(input({ composer: { cards: { ...FULL_COMPOSER.cards, trainingData: false } }, latencyMapped: false }));
    expect(whole.printed.impacts.map((l) => l.split(":")[0])).toEqual(
      expect.arrayContaining(["학습 데이터의 출처·크기·구성", "추론 효율성(지연시간)"]),
    );
    expect(whole.printed.notProvided).not.toContain("빠진 것");
    const noHyper = ed4(input({ composer: { modelEnv: without(FULL_COMPOSER.modelEnv!, "hyperparameters") } }));
    expect(noHyper.reporting.items.find((i) => i.item === 10)!.missing).toEqual(["하이퍼파라미터"]);
    expect(noHyper.printed.impacts[0]).toMatch(/^하이퍼파라미터: /);
    const noAlgo = ed4(input({ composer: { modelEnv: without(FULL_COMPOSER.modelEnv!, "algorithm") } }));
    expect(noAlgo.printed.impacts[0]).toMatch(/^하이퍼파라미터\(빠진 것: 알고리즘\): /);
  });
});
