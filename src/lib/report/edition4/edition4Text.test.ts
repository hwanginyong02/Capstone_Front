/**
 * 판 4 문구(S3 ⑥⑦ 이 저장하는 글의 틀)가 고정 문구 사본(`src/test/edition4/fixedWording.ed4.json`)과 글자까지 같은가, 그리고 틀을
 * 채우는 `fillTemplate` 이 조사를 끼운 글자의 끝소리로 고르는가.
 *
 * 고정 문구 20 의 조건부 합격·불합격·판정 불가 세 갈래는 예시본을 만들며 정한 초안이다(판 4 를 켜기 전 확인 목록) — 시험 이름에 "초안".
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COVER_CORE_ROW,
  COVER_CORE_UNAVAILABLE,
  COVER_ROW_CORE,
  COVER_ROW_VERDICT,
  COVER_VERDICT_NONE,
  COVER_VERDICT_ROW,
  derivationStatementEd4,
  fillTemplate,
  FIXED_9_ARGMAX_ED4,
  FIXED_9_PER_LABEL_ED4,
  FIXED_9_THRESHOLD_ED4,
  INCONCLUSIVE_CAUSE_NO_JUDGED,
  INCONCLUSIVE_CAUSE_NO_TARGET,
  INCONCLUSIVE_CAUSE_NOT_COMPUTED,
  JUDGMENT_MARGIN_LABEL,
  VERDICT_BASIS_CONDITIONAL_DRAFT,
  VERDICT_BASIS_FAIL_DRAFT,
  VERDICT_BASIS_INCONCLUSIVE_DRAFT,
  VERDICT_BASIS_PASS,
  VERDICT_BASIS_PASS_CORE_ONLY,
  VERDICT_COUNT_NONE,
} from "./edition4Text";

type Json = any;
const WORDING: Json = JSON.parse(readFileSync(resolve(__dirname, "../../../test/edition4/fixedWording.ed4.json"), "utf8"));
const FIXED: Record<string, Json> = WORDING.fixed;
const B: Record<string, { candidate: string }> = WORDING.appendixB_raw;

describe("판 4 문구 = 고정 문구 사본(글자 대조)", () => {
  it("고정 문구 20 합격 글", () => {
    expect(VERDICT_BASIS_PASS).toBe(FIXED["20_pass"]);
  });

  it("고정 문구 20 초안 세 갈래(조건부 합격·불합격·판정 불가)", () => {
    expect([VERDICT_BASIS_CONDITIONAL_DRAFT, VERDICT_BASIS_FAIL_DRAFT, VERDICT_BASIS_INCONCLUSIVE_DRAFT]).toEqual([
      FIXED["20_conditional_draft"],
      FIXED["20_fail_draft"],
      FIXED["20_inconclusive_draft"],
    ]);
  });

  it("고정 문구 21 — 줄 이름(종합 판정·핵심 지표)과 두 줄의 틀", () => {
    expect(FIXED["21_labels"].slice(0, 2)).toEqual([COVER_ROW_VERDICT, COVER_ROW_CORE]);
    expect(COVER_VERDICT_ROW).toBe(FIXED["21_verdict_row"]);
    expect(COVER_CORE_ROW).toBe(FIXED["21_core_row"]);
  });

  it("부록 B2·B3·B12", () => {
    expect(COVER_VERDICT_NONE).toBe(B.B2.candidate);
    expect(COVER_CORE_UNAVAILABLE).toBe(B.B3.candidate);
    expect(B.B12.candidate).toBe(`판정 불가 | ${VERDICT_COUNT_NONE}`);
  });

  it("부록 B13 — 핵심 지표만 판정 대상인 합격 글, 판정 불가의 원인 셋(후보 글 안의 따옴표 글 그대로)", () => {
    const quoted = [...B.B13.candidate.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(quoted).toEqual([
      "이름(ID)",
      VERDICT_BASIS_PASS_CORE_ONLY,
      INCONCLUSIVE_CAUSE_NOT_COMPUTED,
      INCONCLUSIVE_CAUSE_NO_TARGET,
      INCONCLUSIVE_CAUSE_NO_JUDGED,
    ]);
  });

  it("고정 문구 19 판정 여유 값", () => {
    expect([JUDGMENT_MARGIN_LABEL.small, JUDGMENT_MARGIN_LABEL.ample]).toEqual(FIXED["19_values"].slice(0, 2));
  });

  it("고정 문구 9 판 4 세 갈래(합니다체)", () => {
    expect([FIXED_9_THRESHOLD_ED4, FIXED_9_PER_LABEL_ED4, FIXED_9_ARGMAX_ED4]).toEqual([
      FIXED["9_threshold_ed4"].text,
      FIXED["9_per_label_ed4"].text,
      FIXED["9_argmax_ed4"].text,
    ]);
  });
});

describe("fillTemplate — 조사는 끼운 글자의 끝소리로", () => {
  it("예시본 4.2 — Recall(M3)과", () => {
    expect(fillTemplate(VERDICT_BASIS_PASS, { "핵심 지표": "Recall(M3)" })).toBe(
      "핵심 지표 Recall(M3)과 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.",
    );
  });

  it("받침 없는 이름은 와·는·가, 쉼표로 이은 이름은 마지막 이름으로(부록 B13)", () => {
    expect(fillTemplate(VERDICT_BASIS_PASS, { "핵심 지표": "Accuracy(M1), F1 Score(M4)" })).toContain("F1 Score(M4)와 그 밖의");
    expect(fillTemplate(VERDICT_BASIS_PASS, { "핵심 지표": "F1 Score(M4), Recall(M3)" })).toContain("Recall(M3)과 그 밖의");
    expect(
      fillTemplate(VERDICT_BASIS_CONDITIONAL_DRAFT, { "핵심 지표": "F1 Score(M4)", "미달 지표": "AUROC(M9)" }),
    ).toBe("핵심 지표 F1 Score(M4)는 목표를 충족하였으나 AUROC(M9)가 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.");
    expect(fillTemplate(VERDICT_BASIS_FAIL_DRAFT, { "미달 핵심 지표": "Recall(M3)" })).toBe(
      "핵심 지표 Recall(M3)이 목표에 미달하여, 3.4의 판정 규칙에 따라 불합격으로 판정하였다.",
    );
  });

  it("(으)로 — 원인 글 끝('실패'·'부재')은 받침이 없어 '로'", () => {
    expect(fillTemplate(VERDICT_BASIS_INCONCLUSIVE_DRAFT, { 원인: INCONCLUSIVE_CAUSE_NO_JUDGED })).toBe(
      "판정 대상 지표 부재로 3.4의 판정 규칙에 따라 판정할 수 없었다.",
    );
  });

  it("숫자 글자의 을/를 — 0.5를 · 0.3을 · 0.35를", () => {
    expect(fillTemplate(FIXED_9_THRESHOLD_ED4, { threshold: "0.5" })).toContain("0.5를 적용");
    expect(fillTemplate(FIXED_9_THRESHOLD_ED4, { threshold: "0.3" })).toContain("0.3을 적용");
    expect(fillTemplate(FIXED_9_THRESHOLD_ED4, { threshold: "0.35" })).toContain("0.35를 적용");
  });

  it("값이 없는 자리는 그대로 남는다(채우지 못한 틀이 숨지 않게)", () => {
    expect(fillTemplate(COVER_VERDICT_ROW, { 판정: "최종 합격" })).toBe("최종 합격 (판정 대상 지표 {N}개 중 {n}개 충족, 4.2)");
  });
});

describe("derivationStatementEd4 — 고정 문구 9 판 4 글(판 3 과 같은 갈래)", () => {
  it("한 임계값 — 의뢰자가 준 글자 그대로, 조사는 그 글자로", () => {
    expect(derivationStatementEd4({ method: "threshold", threshold: 0.5 })).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.5를 적용하여 산출하였습니다.",
    );
    expect(derivationStatementEd4({ method: "threshold", threshold: 0.3 })).toBe(
      "본 평가의 예측값은 제출된 확률값에 결정 임계값 0.3을 적용하여 산출하였습니다.",
    );
  });

  it("레이블별 임계값·argmax", () => {
    expect(derivationStatementEd4({ method: "threshold_per_label", threshold: { a: 0.4, b: 0.6 } })).toBe(FIXED_9_PER_LABEL_ED4);
    expect(derivationStatementEd4({ method: "argmax", threshold: null })).toBe(FIXED_9_ARGMAX_ED4);
  });
});
