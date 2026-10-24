/**
 * 판 4 금지어(판 4 라운드 계획 6절 "판 4 금지어 시험") — 화면·인쇄·번호 열기 세 경로의 판 4 글(작성 기록 상자 제외)에 판 3 글 갈래가
 * 섞이지 않았는가. 지금(1단계)은 뼈대라 통과하고, 2단계가 절을 채우며 판 3 글이 섞이면 이 시험이 잡는다.
 *
 * 금지어: 이모지, 시험결과서, 본 결과서, 사용자가, 매핑 단계, 정보 제공, 아슬아슬, HIGH/MEDIUM/LOW, N/A, 우수, 미흡, 사내 합의,
 * 평가자, 연락처, 서명, 1.4 참조, 통과율, 판 3 절 번호 참조, 서술을 감싼 따옴표.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { FinalReportData } from "../../../types/finalReport.types";

import { loadEd4, loadEd4Issuance, type Ed4Tag } from "./ed4Fixtures";
import { byNumberText, printText, screenText } from "./renderEd4";

const FORBIDDEN: Array<[name: string, pattern: RegExp]> = [
  ["이모지", /\p{Extended_Pictographic}/u],
  ["시험결과서", /시험결과서/],
  ["본 결과서", /본 결과서/],
  ["사용자가", /사용자가/],
  ["매핑 단계", /매핑 단계/],
  ["정보 제공", /정보 제공/],
  ["아슬아슬", /아슬아슬/],
  ["HIGH/MEDIUM/LOW", /\b(HIGH|MEDIUM|LOW)\b/],
  ["N/A", /N\/A/],
  ["우수", /우수/],
  ["미흡", /미흡/],
  ["사내 합의", /사내 합의/],
  ["평가자", /평가자/],
  ["연락처", /연락처/],
  ["서명", /서명/],
  ["1.4 참조", /1\.4 참조/],
  ["통과율", /통과율/],
  // 판 3 절 번호를 가리키는 말: "7.1절", "8.2 참조", "(9.1)", "9절", "6.0" 등(숫자 안의 7.1 — 0.971 — 은 앞이 숫자·점이라 뺀다).
  ["판 3 절 번호 참조", /(?<![\d.])(?:6\.0(?:\.\d)?|[789]\.[123]|9)(?:절| 참조|\))|\((?:6\.0|[789]\.[123])/],
  ["서술을 감싼 따옴표", /^["“].*["”]$/m],
];

function expectClean(text: string) {
  const hits = FORBIDDEN.filter(([, p]) => p.test(text)).map(([name]) => name);
  expect(hits).toEqual([]);
}

const TAGS: Ed4Tag[] = ["bc_strong", "digits_strong", "yeast_strong"];

describe("판 4 금지어 — 세 경로(작성 기록 제외)", () => {
  it.each(TAGS)("%s 화면(완료·대기·발급)", (tag) => {
    for (const kind of ["final", "pending", "issued"] as const) expectClean(screenText(loadEd4(tag, kind)));
  });

  it("bc_strong 화면(실패)", () => {
    expectClean(screenText(loadEd4("bc_strong", "failed")));
  });

  it.each(TAGS)("%s 인쇄(발급본·미발급)", async (tag) => {
    expectClean(await printText(loadEd4(tag, "issued")));
    expectClean(await printText(loadEd4(tag, "final")));
  });

  it.each(TAGS)("%s 번호 열기(작성 기록 상자 뺌)", async (tag) => {
    expectClean(await byNumberText(loadEd4(tag, "final"), loadEd4Issuance(tag), { dropRecord: true }));
  });
});

describe("금지어 패턴 자체", () => {
  it.each([
    ["이모지", "판정 ✅"],
    ["HIGH/MEDIUM/LOW", "우선순위 HIGH"],
    ["판 3 절 번호 참조", "7.1절에서 다룬다"],
    ["판 3 절 번호 참조", "권고는 9절 권고표"],
    ["판 3 절 번호 참조", "(8.2 참조)"],
    ["서술을 감싼 따옴표", "“모델은 좋다.”"],
    ["N/A", "N/A (no score mapped)"],
  ])("%s 를 잡는다: %s", (name, sample) => {
    const pattern = FORBIDDEN.find(([n]) => n === name)![1];
    expect(pattern.test(sample)).toBe(true);
  });

  it.each(["F1 0.971, 구간 0.917~0.997", "5.1·5.2절", "6.2 모델과 운영", "(4.3)", "부록 1.2", "malignant(악성 종양)"])(
    "판 4 글은 잡지 않는다: %s",
    (sample) => {
      expectClean(sample);
    },
  );
});

describe("대조군 — 판 3 글은 금지어에 걸린다(판 3 글이 섞이면 잡는다)", () => {
  it("같은 입력의 판 3 발급본(RPT-2026-0001) 화면 글", () => {
    const ed3 = JSON.parse(
      readFileSync(resolve(__dirname, "../../archive/issued/RPT-2026-0001.content.json"), "utf8"),
    ) as FinalReportData;
    const text = screenText(ed3);
    const hits = FORBIDDEN.filter(([, p]) => p.test(text)).map(([name]) => name);
    expect(hits).toEqual(expect.arrayContaining(["시험결과서", "정보 제공", "판 3 절 번호 참조"]));
  });
});
