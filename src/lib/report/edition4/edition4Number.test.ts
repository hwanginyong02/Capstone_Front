/**
 * 판 4 숫자 표기(S3 ②) — 공통 대조 표 `src/test/contract/number_wording_ed4.json`(백엔드 tests/contract/ 와 같은 바이트)의
 * 모든 줄을 이 저장소 함수로 다시 찍는다. 표 자체가 규칙과 맞는지는 `src/test/edition4/contractEd4.test.ts` 의 기준 구현이 본다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { formatJudgedValue, percentText } from "../judgedNumber";
import { josa, type JosaPair } from "../koreanJosa";
import {
  ed4CiBound,
  ed4Distinct,
  ed4Given,
  ed4Judged,
  ed4Latency,
  ed4Percent,
  ed4PercentPoint,
  ed4Plain,
  ed4SignedCount,
  ed4SignedJudged,
  ed4Target,
  ed4TargetCriteria,
  MINUS_SIGN,
} from "./edition4Number";

type Json = any;
const TABLE: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/contract/number_wording_ed4.json"), "utf8"));
const CASES: Json[] = TABLE.number_cases;

/** 표 한 줄을 이 저장소 함수로 찍는다(규칙 이름 → 함수는 표의 `functions` 약속). */
function produce(c: Json): string {
  switch (c.rule) {
    case "plain":
      return ed4Plain(c.value);
    case "judged":
      return ed4Judged(c.value, c.threshold, c.higher_is_better, c.meets);
    case "signed_judged":
      return ed4SignedJudged(c.value, c.threshold, c.meets);
    case "ci_bound":
      return ed4CiBound(c.raw, c.target);
    case "percent":
      return ed4Percent(c.text);
    case "percent_point":
      return ed4PercentPoint(c.text);
    case "signed_count":
      return ed4SignedCount(c.value);
    case "given":
      return ed4Given(c.value);
    case "target":
      return ed4Target(c.value);
    case "latency":
      return ed4Latency(c.value);
    case "distinct":
      return ed4Distinct(c.value, c.others);
    default:
      throw new Error(`모르는 규칙 ${c.rule}`);
  }
}

describe("판 4 숫자 표기 — 공통 대조 표", () => {
  it("표는 열한 규칙을 모두 덮고, 프론트 함수 이름 약속이 이 파일의 함수와 같다", () => {
    expect(CASES.length).toBeGreaterThan(100);
    const rules = [
      "plain",
      "judged",
      "signed_judged",
      "ci_bound",
      "percent",
      "percent_point",
      "signed_count",
      "given",
      "target",
      "latency",
      "distinct",
    ];
    expect(new Set(CASES.map((c) => c.rule))).toEqual(new Set(rules));
    const names = Object.fromEntries(
      Object.entries(TABLE.functions as Record<string, Json>)
        .filter(([k]) => rules.includes(k))
        .map(([k, v]) => [k, String(v.frontend).split("(")[0]]),
    );
    expect(names).toEqual({
      plain: "ed4Plain",
      judged: "ed4Judged",
      signed_judged: "ed4SignedJudged",
      ci_bound: "ed4CiBound",
      percent: "ed4Percent",
      percent_point: "ed4PercentPoint",
      signed_count: "ed4SignedCount",
      given: "ed4Given",
      target: "ed4Target",
      latency: "ed4Latency",
      distinct: "ed4Distinct",
    });
  });

  it.each(CASES.map((c) => [`${c.rule}:${c.expected} — ${c.source}`, c] as const))("%s", (_name, c) => {
    expect(produce(c)).toBe(c.expected);
  });

  it("자기 검문 — 표의 기대값을 비틀면(끝 0 하나 더, 부호 바꿈) 함수 결과와 다르다", () => {
    expect(CASES.filter((c) => produce(c) === `${c.expected}0`)).toEqual([]);
    const signed = CASES.filter((c) => /^[-+−]/.test(c.expected));
    expect(signed.length).toBeGreaterThan(5);
    expect(signed.filter((c) => produce(c) === c.expected.slice(1))).toEqual([]);
  });

  it("함정 줄(trap): 넷째 자리 반올림값을 다시 반올림하면 원값의 셋째 자리와 다르다(0.9825 → 0.983, 원값은 0.982)", () => {
    const traps = CASES.filter((c) => c.trap);
    expect(traps.length).toBeGreaterThan(0);
    for (const t of traps) expect(ed4Plain(t.value)).toBe(t.expected);
    expect(ed4Plain(0.9824561403508771)).toBe("0.982");
  });

  it("예시본 4~5절의 숫자 표기는 모두 이 함수들이 표의 입력에서 만든다(엔진 표기 0.6166 은 옮기기만)", () => {
    const made = new Set<string>();
    for (const c of CASES) {
      if (c.trap) continue;
      const text = produce(c);
      made.add(text);
      made.add(text.replace(/^-/, ""));
    }
    for (const e of TABLE.engine_texts as Json[]) made.add(e.expected);
    const examples: string[] = TABLE.example_numbers;
    expect(examples.length).toBeGreaterThan(30);
    expect(examples.filter((n) => !made.has(n))).toEqual([]);
  });

  it("숫자 꼴 칸(plain·judged·signed_judged·ci_bound)은 숫자 꼴, 음의 0 은 부호 없이", () => {
    const numeric = CASES.filter((c) => ["plain", "judged", "signed_judged", "ci_bound"].includes(c.rule));
    expect(numeric.length).toBeGreaterThan(50);
    expect(numeric.map(produce).filter((t) => !/^-?\d+\.\d+$/.test(t))).toEqual([]);
    expect(numeric.map(produce).filter((t) => /^-0\.0+$/.test(t))).toEqual([]);
    expect(ed4Plain(-0.0004)).toBe("0.000");
    expect(ed4Judged(-0.0001, 0, false, true)).toBe("0.000");
    expect(ed4SignedJudged(-0.0004, 0.1, false)).toBe("0.000");
  });

  it("그리는 차이의 음수는 U+2212, 숫자 꼴 칸의 음수는 ASCII '-'", () => {
    expect(MINUS_SIGN).toBe("−");
    expect(ed4PercentPoint("-0.002")).toBe("−0.2%p");
    expect(ed4SignedCount(-3)).toBe("−3");
    expect(ed4SignedJudged(-0.002409709, 0.1, false)).toBe("-0.002");
  });

  it("판 3 잎 함수는 그대로다 — 판 3 사실 시트 표기(넷째 자리·끝 0 빼기)와 판 4 표기는 다르다", () => {
    expect(formatJudgedValue(-0.0001, 0, false, true)).toBe("-0.000");
    expect(percentText("0.050")).toBe("5%");
    expect(ed4Percent("0.050")).toBe("5.0%");
  });

  it("숫자 꼴이 아닌 글자는 백분율로 옮기지 않는다", () => {
    expect(ed4Percent("—")).toBe("—");
    expect(ed4PercentPoint("abc")).toBe("abc");
  });
});

describe("판 4 조사 — 공통 대조 표", () => {
  const cases: Json[] = TABLE.josa_cases;

  it.each(cases.map((c) => [`${c.word} + ${c.pair} → ${c.expected}`, c] as const))("%s", (_name, c) => {
    expect(josa(c.word, c.pair as JosaPair)).toBe(c.expected);
  });

  it.each((TABLE.chains as Json[]).map((c) => [c.expected, c] as const))("숫자 규칙 → 조사: %s", (_name, chain) => {
    const text = produce(chain.number);
    expect(text + josa(text, chain.pair)).toBe(chain.expected);
  });

  it("읽는 소리를 모르면 두 꼴을 함께 적는다(고정 문구 표기)", () => {
    expect(josa("—", "이/가")).toBe("이(가)");
    expect(josa("", "을/를")).toBe("을(를)");
    expect(josa("*", "은/는")).toBe("은(는)");
    // 과/와 만 없을 때 꼴이 앞이다 — 판 3 josaWaGwa·백엔드 wording.josa 와 같은 "와(과)"(S2·S3 검토 T14 로 "과(와)" 에서 고침).
    expect(josa("#", "과/와")).toBe("와(과)");
    expect(josa("·", "으로/로")).toBe("(으)로");
  });

  it("ㄹ 받침은 '으로/로' 에서만 받침 없음처럼(로), 나머지 쌍은 받침", () => {
    expect(["이/가", "을/를", "은/는", "과/와", "으로/로"].map((p) => josa("0.977", p as JosaPair))).toEqual([
      "이",
      "을",
      "은",
      "과",
      "로",
    ]);
    expect(["이/가", "을/를", "은/는", "과/와", "으로/로"].map((p) => josa("0.005", p as JosaPair))).toEqual([
      "가",
      "를",
      "는",
      "와",
      "로",
    ]);
    expect(["이/가", "을/를", "은/는", "과/와", "으로/로"].map((p) => josa("0.950", p as JosaPair))).toEqual([
      "이",
      "을",
      "은",
      "과",
      "으로",
    ]);
  });
});
