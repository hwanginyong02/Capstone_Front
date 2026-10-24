/**
 * 렌더러용 판 4 문구 상수(판 4 라운드 S4·S5) — 고정 문구는 사본(`fixedWording.ed4.json`)과, 예시본 글자는 예시본 사본과,
 * 부록 B 는 사본의 `appendixB_raw`(B30 까지) 또는 아래 주석에 옮겨 적은 계획 부록 B 글과 글자까지 대조한다.
 *
 * 계획 부록 B 원문(2026-10-24 승인, 렌더러가 찍는 것 — 사본에 없는 B33 은 여기 옮긴 글이 기준):
 * - B33 4.5 비율 표 자리(멀티레이블) | 학습 분포는 있으나 학습 표본 수가 없음 | 제공되지 않음 — 학습 표본 수가 제공되지 않아 학습·평가
 *   비율을 비교하지 않았다. (초안, 2026-10-24 승인)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import * as T from "./edition4Text";
import { CONFIDENCE_INTERVAL_PREMISE } from "../reportConstants";

type Json = any;
const WORDING: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/fixedWording.ed4.json"), "utf8"));
const FIXED: Record<string, Json> = WORDING.fixed;
const B: Record<string, { candidate: string }> = WORDING.appendixB_raw;
const EXAMPLE = readFileSync(resolve(__dirname, "../../../test/edition4/rpt0001/example.md"), "utf8");
const quoted = (k: string) => [...B[k].candidate.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

describe("고정 문구 = 사본 글자", () => {
  it.each([
    ["10_rule_ed4", T.FIXED_10_RULE_ED4],
    ["10_margin_paragraph_ed4", T.FIXED_10_MARGIN_PARAGRAPH_ED4],
    ["10_core_client", T.FIXED_10_CORE_CLIENT],
    ["10_core_default", T.FIXED_10_CORE_DEFAULT],
    ["13_ed4", T.FIXED_13_ED4],
    ["note_ed4", T.FIXED_NOTE_ED4],
    ["19_note", T.FIXED_19_NOTE],
    ["22_issue", T.FIXED_22_ISSUE],
    ["23_rounding", T.FIXED_23_ROUNDING],
    ["24_distribution", T.FIXED_24_DISTRIBUTION],
    ["26_provided_all", T.FIXED_26_PROVIDED_ALL],
    ["26_provided_description", T.FIXED_26_PROVIDED_DESCRIPTION],
    ["26_specified_all", T.FIXED_26_SPECIFIED_ALL],
    ["26_specified_default_core", T.FIXED_26_SPECIFIED_DEFAULT_CORE],
    ["26_core_default_cell", T.FIXED_26_CORE_DEFAULT_CELL],
    ["26_recorded", T.FIXED_26_RECORDED],
  ])("%s", (key, value) => {
    expect(value).toBe(FIXED[key]);
  });

  it("25_steps 일곱 줄, 26_source_values 두 값", () => {
    expect([...T.FIXED_25_STEPS]).toEqual(FIXED["25_steps"]);
    expect([T.FIXED_26_SOURCE_CLIENT, T.FIXED_26_SOURCE_SYSTEM]).toEqual(FIXED["26_source_values"]);
  });

  it("3_significance 는 판 3 상수를 그대로 쓴다(중복 정의 없음)", () => {
    expect(CONFIDENCE_INTERVAL_PREMISE).toBe(FIXED["3_significance"]);
  });

  it("2.2 이름표 — 사본 글이 '{이름표}: ' 로 시작", () => {
    expect(FIXED["2_2_not_provided_ed4"].text.startsWith(`${T.FIXED_2_2_NOT_PROVIDED_LABEL}: `)).toBe(true);
  });

  it("10 첫 문단 안의 핵심 지표 문장이 '의뢰자 지정' 갈래와 같다", () => {
    expect(T.FIXED_10_RULE_ED4).toContain(T.FIXED_10_CORE_CLIENT);
  });
});

describe("예시본 글자", () => {
  it.each([
    [T.EX_ISSUED_STATUS],
    [T.EX_END_MARK],
    [T.EX_HISTORY_TITLE],
    [T.FIXED_NOTE_ED4],
    [T.FIXED_19_NOTE],
    [T.FIXED_22_ISSUE],
    [T.FIXED_24_DISTRIBUTION],
    [T.FIXED_10_MARGIN_PARAGRAPH_ED4],
    [T.FIXED_10_RULE_ED4.replace("{core_metrics}", "Recall(M3)")],
    [T.FIXED_23_ROUNDING],
    [T.FIXED_26_PROVIDED_ALL],
    [T.FIXED_26_RECORDED],
    ...T.FIXED_25_STEPS.map((s) => [s]),
  ])("예시본에 줄로 있다: %s", (line) => {
    expect(EXAMPLE.split("\n").some((l) => l === line || l === `- ${line}`)).toBe(true);
  });

  it("4.4 임계값 표 머리·상승폭 문장", () => {
    expect(EXAMPLE).toContain(
      `| 지표 | ${T.fillTemplate(T.EX_4_4_CURRENT_THRESHOLD, { threshold: "0.5" })} | ${T.fillTemplate(T.EX_4_4_BEST_THRESHOLD, { threshold: "0.6166" })} |`,
    );
    expect(EXAMPLE.split("\n")).toContain(T.fillTemplate(T.EX_4_4_GAIN, { gain: "0.008" }));
  });
});

describe("부록 B = 사본 appendixB_raw(계획 부록 B) 글자", () => {
  it("B1 상태 줄·안내·(미발급)", () => {
    expect(quoted("B1")).toEqual([T.B1_DRAFT_STATUS, T.B1_DRAFT_NOTICE, T.EX_END_MARK, T.B1_UNISSUED]);
    expect(T.B8_UNISSUED).toBe(T.B1_UNISSUED);
    expect(B.B8.candidate).toContain(`"${T.B8_UNISSUED}"`);
  });
  it("B5", () => expect(quoted("B5")).toEqual([T.B5_CRITERIA_REFERENCE, T.ED4_DASH, T.B5_VERDICT_REFERENCE]));
  it("B7 충족 글(미충족 글은 materialCheck)", () => expect(B.B7.candidate.startsWith(`${T.B7_AVERAGING_MET} / 미충족: `)).toBe(true));
  it("B9", () => {
    const head = T.B9_GROUP_HEAD.replace("{counts}", [T.B9_COUNT_ERROR, T.B9_COUNT_WARNING, T.B9_COUNT_PASS].join(", "));
    expect(B.B9.candidate.startsWith(head)).toBe(true);
  });
  it("B10", () => expect(B.B10.candidate).toBe([T.B10_NO_SAMPLE_ID, T.B10_NO_SCORE, T.B10_NO_ROLE].join(" / ")));
  it("B11", () =>
    expect(B.B11.candidate).toBe([T.B11_LATENCY_STATS, T.B11_ALL_BELOW_ONE, T.B11_UNCHECKED, T.B11_NON_NUMERIC].join(" / ")));
  it("B14", () => expect(quoted("B14")).toEqual([T.B14_UNMEASURABLE, T.ED4_DASH]));
  it("B15", () => expect(T.B15_SUBMITTED_PREDICTION).toBe(B.B15.candidate));
  it("B16", () => expect(B.B16.candidate.startsWith(`${T.B16_NO_TRAINING_DISTRIBUTION} `)).toBe(true));
  it("B17", () => expect(T.B17_NO_CURVES).toBe(B.B17.candidate));
  it("B18", () => expect(T.B18_NOT_APPLICABLE).toBe(B.B18.candidate));
  it("B25", () => expect(`${T.B25_RECORD_HEADER} · ${T.B25_RECORD_NOTE}`).toBe(B.B25.candidate));
  it("B27", () => expect(B.B27.candidate.startsWith(`${T.B27_PROGRESS_HEAD} `)).toBe(true));
  it("B28", () => expect(B.B28.candidate.startsWith(`…${T.B28_RULE_TAIL} `)).toBe(true));
  it("B29", () => expect(T.B29_PLACES).toBe(B.B29.candidate));
  it("B30", () => expect(quoted("B30")).toEqual(["하이퍼파라미터", T.B30_NOT_PROVIDED]));
  it("B33(초안) — 위 주석에 옮긴 계획 부록 B 글", () => {
    expect(T.B33_NO_TRAINING_SAMPLES_DRAFT).toBe("제공되지 않음 — 학습 표본 수가 제공되지 않아 학습·평가 비율을 비교하지 않았다.");
    expect(B.B33).toBeUndefined();
  });
});
