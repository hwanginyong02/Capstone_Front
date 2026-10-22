/**
 * 3절 불균형 진단 세 갈래(서술 설계 D20, 서술 라운드 세션 B 결정 6) — 문구는 사용자가 정한 그대로.
 *
 * - 갈래(엔진 `imbalance_effect.level`) × 유형(이진·다중·멀티레이블) × 새 칸(정확도·매크로 F1 값, 세션 B 엔진부터) 있음/없음.
 * - 숫자는 엔진 표시 문자열, 숫자 뒤 조사는 숫자 끝소리(`josaEuroRoNumber`).
 * - 이 문장은 조립 때 만들어 성적서에 저장한다(`assembleEvaluatedReport` → `datasetDiagnosis`) — 이미 만든 성적서는
 *   바뀌지 않으므로 판 조건이 없다.
 */
import { describe, expect, it } from "vitest";

import type { ImbalanceEffect } from "../../types/finalReport.types";
import { buildDatasetDiagnosis } from "./buildDatasetDiagnosis";
import { josaEuroRoNumber, josaWaGwaNumber } from "./koreanJosa";
import { parseImbalanceEffect } from "./problemList";
import binaryGolden from "../../test/contract/evaluate_binary_csv.json";
import multiclassGolden from "../../test/contract/evaluate_multiclass_csv.json";
import multilabelGolden from "../../test/contract/evaluate_multilabel_csv.json";

type Task = "binary" | "multiclass" | "multilabel";
const DIST = { class_distribution: { A: 70, B: 30 } };
const PREFIX = "평가 데이터셋은 총 100건이며, 클래스(레이블)별 분포는 A 70건(70.0%), B 30건(30.0%)이다. ";

/** 엔진 응답 모양의 imbalance_effect. accGap/classGap 은 표시 문자열, 숫자 칸은 그 값. */
function effect(
  level: ImbalanceEffect["level"],
  { task, accGap, classGap, withNew }: { task: Task; accGap: string; classGap: string; withNew: boolean },
): ImbalanceEffect {
  const multilabel = task === "multilabel";
  const out: ImbalanceEffect = {
    level,
    imbalance_ratio: 2.3333,
    accuracy_minus_macro_f1: multilabel ? null : Number(accGap),
    majority_minus_minority_f1: Number(classGap),
    majority_class: "A",
    minority_class: "B",
    display: {
      imbalance_ratio: level === "mild" ? "1.2982" : "2.33",
      accuracy_minus_macro_f1: multilabel ? null : accGap,
      majority_minus_minority_f1: classGap,
    },
  };
  if (level === "mild") out.imbalance_ratio = 1.2982;
  if (withNew) {
    if (!multilabel) {
      out.accuracy = 0.9;
      out.macro_f1 = 0.75;
      out.display!.accuracy = "0.9";
      out.display!.macro_f1 = "0.75";
    }
    out.majority_f1 = 0.9;
    out.minority_f1 = 0.6167;
    out.display!.majority_f1 = "0.9";
    out.display!.minority_f1 = "0.6167";
  }
  return out;
}

const diagnose = (task: Task, ie: ImbalanceEffect, descriptions?: Record<string, string>) =>
  buildDatasetDiagnosis(DIST, ie.imbalance_ratio, 0, 100, task, ie, descriptions);

const AFFECTED_TAIL = "불균형에 따른 성능 지표 왜곡이 관찰되었다. 정확도보다 매크로 F1과 클래스별 지표를 우선 참고해야 한다.";
const IR_HEAD = "클래스 불균형 비율(Imbalance Ratio)은 2.33으로";

describe("세 갈래 × 유형 × 새 칸 — 정확한 문장", () => {
  const SINGLE: Task[] = ["binary", "multiclass"];
  const BOTH_NEW = [true, false];

  it.each(SINGLE.flatMap((t) => BOTH_NEW.map((n) => [t, n] as const)))("mild — %s (새 칸 %s)", (task, withNew) => {
    expect(diagnose(task, effect("mild", { task, accGap: "0.15", classGap: "0.2833", withNew }))).toBe(
      `${PREFIX}클래스 불균형 비율(Imbalance Ratio)은 1.2982로, 허용 기준(1.50 미만) 이내이다.`,
    );
  });

  it.each(BOTH_NEW)("mild — 멀티레이블 (새 칸 %s)", (withNew) => {
    const text = buildDatasetDiagnosis(DIST, 1.2982, 0, 100, "multilabel", effect("mild", { task: "multilabel", accGap: "", classGap: "0.03", withNew }));
    expect(text).toBe(`${PREFIX}클래스 불균형 비율(Imbalance Ratio)은 1.2982로, 허용 기준(1.50 미만) 이내이다.`);
  });

  it.each(SINGLE)("affected 두 조건 — %s, 새 칸 있음: 정확도·매크로 F1 값을 찍고 두 조건을 '이고,' 로 잇는다", (task) => {
    expect(diagnose(task, effect("affected", { task, accGap: "0.15", classGap: "0.2833", withNew: true }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
        "정확도 0.9와 매크로 F1 0.75의 차이가 0.15로 0.10 이상이고, " +
        "다수 클래스 'A'와 소수 클래스 'B'의 F1 차이가 0.2833으로 0.10 이상이어서 " +
        AFFECTED_TAIL,
    );
  });

  it.each(SINGLE)("affected 두 조건 — %s, 새 칸 없음(옛 응답): 정확도·매크로 F1 값 없이 차이만", (task) => {
    expect(diagnose(task, effect("affected", { task, accGap: "0.15", classGap: "0.2833", withNew: false }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
        "정확도와 매크로 F1의 차이가 0.15로 0.10 이상이고, " +
        "다수 클래스 'A'와 소수 클래스 'B'의 F1 차이가 0.2833으로 0.10 이상이어서 " +
        AFFECTED_TAIL,
    );
  });

  it.each(SINGLE.flatMap((t) => BOTH_NEW.map((n) => [t, n] as const)))(
    "affected 클래스 조건만 — %s (새 칸 %s): 기준 미만인 정확도 조건은 쓰지 않는다",
    (task, withNew) => {
      expect(diagnose(task, effect("affected", { task, accGap: "0.05", classGap: "0.2833", withNew }))).toBe(
        `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
          "다수 클래스 'A'와 소수 클래스 'B'의 F1 차이가 0.2833으로 0.10 이상이어서 " +
          AFFECTED_TAIL,
      );
    },
  );

  it.each(SINGLE)("affected 정확도 조건만 — %s, 새 칸 있음", (task) => {
    expect(diagnose(task, effect("affected", { task, accGap: "0.16", classGap: "0.03", withNew: true }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
        "정확도 0.9와 매크로 F1 0.75의 차이가 0.16으로 0.10 이상이어서 " +
        AFFECTED_TAIL,
    );
  });

  it.each(SINGLE)("affected 정확도 조건만 — %s, 새 칸 없음", (task) => {
    expect(diagnose(task, effect("affected", { task, accGap: "0.16", classGap: "0.03", withNew: false }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
        "정확도와 매크로 F1의 차이가 0.16으로 0.10 이상이어서 " +
        AFFECTED_TAIL,
    );
  });

  it.each(BOTH_NEW)("affected — 멀티레이블 (새 칸 %s): '레이블', 정확도 갈래 없음", (withNew) => {
    expect(diagnose("multilabel", effect("affected", { task: "multilabel", accGap: "", classGap: "0.2833", withNew }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나며, ` +
        "다수 레이블 'A'와 소수 레이블 'B'의 F1 차이가 0.2833으로 0.10 이상이어서 " +
        // 멀티레이블은 정확도가 판정에 쓰이지 않아 끝 문장이 레이블별 지표를 가리킨다.
        "불균형에 따른 성능 지표 왜곡이 관찰되었다. 매크로 F1과 레이블별 지표를 우선 참고해야 한다.",
    );
  });

  it.each(SINGLE.flatMap((t) => BOTH_NEW.map((n) => [t, n] as const)))("no_distortion — %s (새 칸 %s)", (task, withNew) => {
    expect(diagnose(task, effect("no_distortion", { task, accGap: "0.05", classGap: "0.03", withNew }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나나, 정확도와 매크로 F1, 다수·소수 클래스 F1의 차이가 모두 0.10 미만이라 ` +
        "불균형에 따른 성능 왜곡은 관찰되지 않았다(정확도와 매크로 F1의 차이 0.05, 다수 클래스 'A'와 소수 클래스 'B'의 F1 차이 0.03).",
    );
  });

  it.each(BOTH_NEW)("no_distortion — 멀티레이블 (새 칸 %s): 정확도 차이를 빼고 '레이블'", (withNew) => {
    expect(diagnose("multilabel", effect("no_distortion", { task: "multilabel", accGap: "", classGap: "0.03", withNew }))).toBe(
      `${PREFIX}${IR_HEAD} 허용 기준(1.50 미만)을 벗어나나, 다수·소수 레이블 F1의 차이가 0.10 미만이라 ` +
        "불균형에 따른 성능 왜곡은 관찰되지 않았다(다수 레이블 'A'와 소수 레이블 'B'의 F1 차이 0.03).",
    );
  });
});

describe("기준(0.10) 이상 판단과 숫자 출처", () => {
  it("표시값이 기준 미만(0.09996)이면 4자리 숫자 칸이 0.1 이어도 그 조건을 쓰지 않는다", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.15", classGap: "0.09996", withNew: false });
    ie.majority_minus_minority_f1 = 0.1;
    const text = diagnose("binary", ie);
    expect(text).toContain("정확도와 매크로 F1의 차이가 0.15로 0.10 이상이어서 ");
    expect(text).not.toContain("F1 차이가 0.09996");
  });

  it("표시값이 없는 옛 응답(S2 이전)은 숫자 칸으로 판단하고 숫자 칸을 그대로 찍는다", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.05", classGap: "0.1", withNew: false });
    delete ie.display;
    const text = diagnose("binary", ie);
    // IR 표시값이 없으면 종전 자릿수(둘째 자리).
    expect(text).toContain("클래스 불균형 비율(Imbalance Ratio)은 2.33으로 허용 기준(1.50 미만)을 벗어나며, ");
    expect(text).toContain("다수 클래스 'A'와 소수 클래스 'B'의 F1 차이가 0.1로 0.10 이상이어서 ");
    expect(text).not.toContain("정확도와 매크로 F1의 차이");
  });

  it("엔진은 '영향 있음'인데 기준 이상인 차이를 찾지 못하면 조건을 지어내지 않는다", () => {
    const text = diagnose("binary", effect("affected", { task: "binary", accGap: "0.05", classGap: "0.03", withNew: true }));
    expect(text).toContain("허용 기준(1.50 미만)을 벗어나며, 불균형에 따른 성능 지표 왜곡이 관찰되었다.");
    expect(text).not.toContain("0.10 이상");
  });

  it("IR 은 엔진 표시 문자열을 그대로 찍는다(판정과 같은 쪽으로 자릿수를 늘린 값)", () => {
    const ie = effect("mild", { task: "binary", accGap: "0.01", classGap: "0.01", withNew: true });
    ie.imbalance_ratio = 1.5;
    ie.display!.imbalance_ratio = "1.49996";
    expect(buildDatasetDiagnosis(DIST, 1.49996, 0, 100, "binary", ie)).toContain(
      "클래스 불균형 비율(Imbalance Ratio)은 1.49996으로, 허용 기준(1.50 미만) 이내이다.",
    );
  });

  it("클래스 설명이 있으면 '이름(설명)' 으로 부른다(D37) — 설명 없는 쪽은 이름만", () => {
    const text = diagnose("binary", effect("no_distortion", { task: "binary", accGap: "0.05", classGap: "0.03", withNew: true }), {
      A: "정상",
      B: "",
    });
    expect(text).toContain("다수 클래스 'A(정상)'와 소수 클래스 'B'의 F1 차이 0.03");
  });
});

describe("변이 시험 구멍 — 숫자 출처·한쪽만 있는 새 칸·설명 거르기", () => {
  it("표시값이 숫자가 아니면(—) 원값으로 판단 — 원값이 꼭 기준(0.1)이어도 '이상'이라 조건을 쓴다", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.05", classGap: "0.2", withNew: false });
    ie.majority_minus_minority_f1 = 0.1;
    ie.display!.majority_minus_minority_f1 = "—";
    const text = diagnose("binary", ie);
    expect(text).toContain("다수 클래스 'A'와 소수 클래스 'B'의 F1 차이가 —(으)로 0.10 이상이어서 ");
    expect(text).not.toContain("매크로 F1의 차이가");
  });

  it("정확도만 있고 매크로 F1 이 원값·표시값 모두 없으면 값 없는 꼴('정확도와 매크로 F1의 차이') — null 을 찍지 않는다", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.15", classGap: "0.03", withNew: true });
    delete ie.macro_f1;
    delete ie.display!.macro_f1;
    const text = diagnose("binary", ie);
    expect(text).toContain("정확도와 매크로 F1의 차이가 0.15로 0.10 이상이어서 ");
    expect(text).not.toContain("null");
    expect(text).not.toContain("정확도 0.9");
  });

  it("매크로 F1 만 있어도 값 없는 꼴", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.15", classGap: "0.03", withNew: true });
    delete ie.accuracy;
    delete ie.display!.accuracy;
    expect(diagnose("binary", ie)).toContain("정확도와 매크로 F1의 차이가 0.15로 0.10 이상이어서 ");
  });

  it("정확도·매크로 F1 은 표시값을 원값보다 먼저 찍는다(판정 쪽으로 늘린 자릿수)", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.15", classGap: "0.03", withNew: true });
    ie.accuracy = 0.90004;
    ie.display!.accuracy = "0.9000";
    ie.macro_f1 = 0.75004;
    ie.display!.macro_f1 = "0.7500";
    const text = diagnose("binary", ie);
    expect(text).toContain("정확도 0.9000과 매크로 F1 0.7500의 차이가 0.15로 0.10 이상이어서 ");
    expect(text).not.toContain("0.90004");
    expect(text).not.toContain("0.75004");
  });

  it.each([
    ["제공되지 않음", "설명 자리에 '제공되지 않음'이 저장돼 있으면"],
    ["A", "설명이 이름과 같으면"],
    [" A ", "설명이 앞뒤 공백만 다른 이름이면"],
  ])("설명 %j — %s 이름만", (description) => {
    const text = diagnose("binary", effect("no_distortion", { task: "binary", accGap: "0.05", classGap: "0.03", withNew: true }), {
      A: description,
    });
    expect(text).toContain("다수 클래스 'A'와 소수 클래스 'B'의 F1 차이 0.03");
    expect(text).not.toContain("'A(");
  });
});

describe("다수 이름 뒤 과/와 — 이름의 끝소리(서술 라운드 세션 C, 승인 문구는 그대로 조사만)", () => {
  // 종전에는 '와' 가 고정이라 'benign'와·'0'와 로 찍혔다. 이름의 끝소리로 고른다 — '이름(설명)' 꼴은 괄호 앞 이름(공통 조사 규칙).
  const pairOf = (majority: string, descriptions?: Record<string, string>) => {
    const ie = effect("no_distortion", { task: "binary", accGap: "0.05", classGap: "0.03", withNew: true });
    ie.majority_class = majority;
    const text = buildDatasetDiagnosis({ class_distribution: { [majority]: 70, B: 30 } }, ie.imbalance_ratio, 0, 100, "binary", ie, descriptions);
    const match = /다수 클래스 '(.*?)'(와|과|와\(과\)) 소수 클래스 'B'의 F1 차이 0\.03\)/.exec(text);
    return match ? `'${match[1]}'${match[2]}` : text;
  };

  it.each([
    ["benign", undefined, "'benign'과"],
    ["malignant", undefined, "'malignant'와"], // 멀리그넌트
    ["cat", undefined, "'cat'과"],
    ["dog", undefined, "'dog'와"],
    ["Class12", undefined, "'Class12'와"], // 십이
    ["0", undefined, "'0'과"], // 영
    ["2", undefined, "'2'와"], // 이
    ["정상", undefined, "'정상'과"],
    ["세포 운명", undefined, "'세포 운명'과"],
    ["2", { "2": "정상" }, "'2(정상)'와"], // 괄호 앞 이름(이) 기준
    ["A", { A: "정상" }, "'A(정상)'와"], // 에이
    ["0", { "0": "정상" }, "'0(정상)'과"], // 영
    ["benign", { benign: "양성" }, "'benign(양성)'과"],
    ["0", { "0": "고양이" }, "'0(고양이)'과"], // 영
  ] as const)("%s (설명 %o) → %s", (majority, descriptions, expected) => {
    expect(pairOf(majority, descriptions as Record<string, string> | undefined)).toBe(expected);
  });

  it("affected 조건 문장에도 같은 조사 — 'benign'과 소수 클래스", () => {
    const ie = effect("affected", { task: "binary", accGap: "0.15", classGap: "0.2833", withNew: true });
    ie.majority_class = "benign";
    ie.minority_class = "malignant";
    const text = buildDatasetDiagnosis({ class_distribution: { benign: 70, malignant: 30 } }, ie.imbalance_ratio, 0, 100, "binary", ie);
    expect(text).toContain("다수 클래스 'benign'과 소수 클래스 'malignant'의 F1 차이가 0.2833으로 0.10 이상이어서 ");
  });
});

describe("숫자 뒤 조사 — 숫자 끝소리", () => {
  it.each([
    ["1.51", "로"], // 일(ㄹ)
    ["1.57", "로"], // 칠(ㄹ)
    ["1.58", "로"], // 팔(ㄹ)
    ["1.52", "로"], // 이(받침 없음)
    ["1.54", "로"],
    ["1.55", "로"],
    ["1.59", "로"],
    ["1.53", "으로"], // 삼
    ["1.56", "으로"], // 육
    ["1.50", "으로"], // 영
    ["10", "으로"], // 십
    ["200", "으로"], // 백
  ])("%s → %s", (value, josa) => {
    expect(josaEuroRoNumber(value)).toBe(josa);
  });

  it.each([
    ["0.505", "와"],
    ["0.9", "와"],
    ["0.83", "과"],
    ["0.81", "과"],
    ["0.80", "과"],
  ])("과/와: %s → %s", (value, josa) => {
    expect(josaWaGwaNumber(value)).toBe(josa);
  });
});

describe("parseImbalanceEffect — 새 칸(정확도·매크로 F1·다수·소수 F1) 읽기", () => {
  const goldenEffect = (g: unknown) => (g as any).results.success_metrics.imbalance_effect;

  it("이진·다중 골든: 새 칸 넷과 그 표시값을 싣는다", () => {
    for (const golden of [binaryGolden, multiclassGolden]) {
      const raw = goldenEffect(golden);
      const parsed = parseImbalanceEffect(raw)!;
      expect(parsed).not.toBeNull();
      expect(parsed).toMatchObject({
        accuracy: raw.accuracy,
        macro_f1: raw.macro_f1,
        majority_f1: raw.majority_f1,
        minority_f1: raw.minority_f1,
      });
      expect(parsed.display).toEqual(raw.display);
    }
  });

  it("멀티레이블 골든: 정확도·매크로 F1 이 null 이면 그 칸이 없다(다수·소수 F1 만)", () => {
    const raw = goldenEffect(multilabelGolden);
    expect(raw.accuracy).toBeNull();
    expect(raw.macro_f1).toBeNull();
    const parsed = parseImbalanceEffect(raw)!;
    expect(parsed).not.toBeNull();
    expect("accuracy" in parsed).toBe(false);
    expect("macro_f1" in parsed).toBe(false);
    expect(parsed.majority_f1).toBe(raw.majority_f1);
    expect("accuracy" in parsed.display!).toBe(false);
    expect("macro_f1" in parsed.display!).toBe(false);
    expect(parsed.display!.minority_f1).toBe(raw.display.minority_f1);
  });

  it("새 칸이 없는 옛 응답은 그 칸 없이 읽는다", () => {
    const raw = structuredClone(goldenEffect(binaryGolden));
    for (const key of ["accuracy", "macro_f1", "majority_f1", "minority_f1"]) {
      delete raw[key];
      delete raw.display[key];
    }
    const parsed = parseImbalanceEffect(raw)!;
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed).sort()).toEqual(
      ["accuracy_minus_macro_f1", "display", "imbalance_ratio", "level", "majority_class", "majority_minus_minority_f1", "minority_class"],
    );
    expect(Object.keys(parsed.display!).sort()).toEqual(["accuracy_minus_macro_f1", "imbalance_ratio", "majority_minus_minority_f1"]);
  });

  it("새 칸의 모양이 틀리면 그 칸만 버린다(옛 칸은 그대로 읽는다)", () => {
    const raw = { ...structuredClone(goldenEffect(binaryGolden)), accuracy: "0.5" };
    raw.display = { ...raw.display, macro_f1: 0.5 };
    const parsed = parseImbalanceEffect(raw)!;
    expect(parsed).not.toBeNull();
    expect("accuracy" in parsed).toBe(false);
    expect(parsed.macro_f1).toBe(raw.macro_f1);
    expect("macro_f1" in parsed.display!).toBe(false);
    expect(parsed.display!.accuracy).toBe(raw.display.accuracy);
  });

  it("골든 이진(mild, IR 1.1053) → 조사도 숫자 끝소리로 '1.1053으로'", () => {
    const parsed = parseImbalanceEffect(goldenEffect(binaryGolden));
    expect(buildDatasetDiagnosis({ class_distribution: { "0": 105, "1": 95 } }, 1.1053, 0, 200, "binary", parsed)).toContain(
      "클래스 불균형 비율(Imbalance Ratio)은 1.1053으로, 허용 기준(1.50 미만) 이내이다.",
    );
  });
});
