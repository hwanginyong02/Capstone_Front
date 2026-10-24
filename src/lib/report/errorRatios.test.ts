/**
 * 경계·확신 오류 비율(서술 설계 D30) — 응답 읽기와 7.1 문장.
 *
 * 문장은 생성 때 한 번 만들어 저장하므로, 유형·임계값 유무마다 문안을 여기서 고정한다.
 */
import { describe, expect, it } from "vitest";

import { errorRatioSentence, parseErrorRatios } from "./errorRatios";

const binaryRaw = {
  unit: "sample",
  misclassified: 12,
  boundary: { count: 5, ratio: 0.4167 },
  boundary_note: null,
  confident: { count: 2, ratio: 0.1667 },
  boundary_margin: 0.1,
  confident_level: 0.9,
  threshold: 0.5,
};

function parsed(overrides: Record<string, unknown> = {}) {
  const value = parseErrorRatios({ ...binaryRaw, ...overrides });
  if (!value) throw new Error("parse failed");
  return value;
}

describe("parseErrorRatios", () => {
  it("계약 모양을 그대로 읽는다", () => {
    expect(parseErrorRatios(binaryRaw)).toEqual(binaryRaw);
  });

  it("멀티레이블 컬럼별 임계값과 다중의 null 임계값을 받는다", () => {
    expect(parsed({ unit: "label_cell", threshold: { score_a: 0.4, score_b: 0.6 } }).threshold).toEqual({
      score_a: 0.4,
      score_b: 0.6,
    });
    expect(parsed({ threshold: null }).threshold).toBeNull();
  });

  it("임계값을 모르면 경계는 null, 이유는 threshold_unknown", () => {
    const value = parsed({ boundary: null, boundary_note: "threshold_unknown", threshold: null });
    expect(value.boundary).toBeNull();
    expect(value.boundary_note).toBe("threshold_unknown");
  });

  it("오분류 0 이면 비율 null 을 받는다", () => {
    const value = parsed({ misclassified: 0, boundary: { count: 0, ratio: null }, confident: { count: 0, ratio: null } });
    expect(value.confident).toEqual({ count: 0, ratio: null });
  });

  it.each([
    ["키 없음", undefined],
    ["null", null],
    ["배열", []],
    ["문자열", "x"],
    ["모르는 단위", { ...binaryRaw, unit: "row" }],
    ["음수 오분류", { ...binaryRaw, misclassified: -1 }],
    ["소수 오분류", { ...binaryRaw, misclassified: 1.5 }],
    ["확신 없음", { ...binaryRaw, confident: undefined }],
    ["확신 비율이 1 초과", { ...binaryRaw, confident: { count: 2, ratio: 1.2 } }],
    ["경계 모양 틀림", { ...binaryRaw, boundary: { count: "5", ratio: 0.4 } }],
    ["경계 키 없음", { ...binaryRaw, boundary: undefined }],
    ["경계 폭 없음", { ...binaryRaw, boundary_margin: undefined }],
    ["확신 수준 문자열", { ...binaryRaw, confident_level: "0.9" }],
    ["임계값 문자열", { ...binaryRaw, threshold: "0.5" }],
    ["임계값 dict 에 숫자 아님", { ...binaryRaw, threshold: { a: "0.5" } }],
  ])("모양이 틀리면 null — %s", (_name, raw) => {
    expect(parseErrorRatios(raw)).toBeNull();
  });
});

describe("errorRatioSentence — 7.1 문장", () => {
  it("이진: 결정 임계값 기준 경계 오류와 틀린 쪽 확신 오류", () => {
    expect(errorRatioSentence(parsed(), "binary")).toBe(
      "확률이 있는 오분류 12건 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 5건(41.7%), " +
        "확신 오류(틀린 쪽 확률 0.9 이상)는 2건(16.7%)이다.",
    );
  });

  it("임계값을 모르면 경계 오류를 계산하지 않았다고 적는다", () => {
    const value = parsed({ boundary: null, boundary_note: "threshold_unknown", threshold: null });
    expect(errorRatioSentence(value, "binary")).toBe(
      "확률이 있는 오분류 12건 중 확신 오류(틀린 쪽 확률 0.9 이상)는 2건(16.7%)이다. " +
        "경계 오류는 예측값을 직접 제출해 결정 임계값을 알 수 없어 계산하지 않았다.",
    );
  });

  it("다중: 임계값 없이 예측·정답 클래스 확률 차로 적는다", () => {
    const value = parsed({ threshold: null });
    expect(errorRatioSentence(value, "multiclass")).toBe(
      "확률이 있는 오분류 12건 중 경계 오류(예측·정답 클래스 확률 차가 0.1 미만)는 5건(41.7%), " +
        "확신 오류(예측 클래스 확률 0.9 이상)는 2건(16.7%)이다.",
    );
  });

  it("멀티레이블: 틀린 레이블 칸 단위, 레이블마다 임계값이 다르면 '레이블별'", () => {
    const value = parsed({ unit: "label_cell", misclassified: 30, threshold: { a: 0.4, b: 0.6 } });
    expect(errorRatioSentence(value, "multilabel")).toBe(
      "확률이 있는 틀린 레이블 칸 30개 중 경계 오류(확률과 레이블별 결정 임계값의 차가 0.1 미만)는 5개(41.7%), " +
        "확신 오류(틀린 쪽 확률 0.9 이상)는 2개(16.7%)이다.",
    );
  });

  it("멀티레이블 임계값이 모두 같으면 그 값을 적는다", () => {
    const value = parsed({ unit: "label_cell", threshold: { a: 0.5, b: 0.5 } });
    expect(errorRatioSentence(value, "multilabel")).toContain("결정 임계값 0.5의 차가 0.1 미만");
  });

  it("오분류 0: 비율을 계산하지 않았다고 적는다", () => {
    const zero = { misclassified: 0, boundary: { count: 0, ratio: null }, confident: { count: 0, ratio: null } };
    expect(errorRatioSentence(parsed(zero), "binary")).toBe(
      "확률이 있는 오분류가 없어 경계·확신 오류 비율은 계산하지 않았다.",
    );
    expect(errorRatioSentence(parsed({ ...zero, unit: "label_cell" }), "multilabel")).toBe(
      "확률이 있는 틀린 레이블 칸이 없어 경계·확신 오류 비율은 계산하지 않았다.",
    );
  });

  it("같은 입력이면 같은 문장(결정적)", () => {
    expect(errorRatioSentence(parsed(), "binary")).toBe(errorRatioSentence(parsed(), "binary"));
  });
});

describe("판 4 건수 쉼표(S6 뒤 사용자 결정 4 — 고정 문구 17)", () => {
  const big = () =>
    parsed({ unit: "label_cell", misclassified: 2687, boundary: { count: 1637, ratio: 0.6092 }, confident: { count: 1431, ratio: 0.5326 } });

  it("판 4 는 1,000 이상 건수에 쉼표, 판 3 은 그대로", () => {
    expect(errorRatioSentence(big(), "multilabel", { edition4: true })).toBe(
      "확률이 있는 틀린 레이블 칸 2,687개 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 1,637개(60.9%), 확신 오류(틀린 쪽 확률 0.9 이상)는 1,431개(53.3%)이다.",
    );
    expect(errorRatioSentence(big(), "multilabel")).toBe(
      "확률이 있는 틀린 레이블 칸 2687개 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 1637개(60.9%), 확신 오류(틀린 쪽 확률 0.9 이상)는 1431개(53.3%)이다.",
    );
  });

  it("1,000 미만이면 판 4 도 같은 글", () => {
    expect(errorRatioSentence(parsed(), "binary", { edition4: true })).toBe(errorRatioSentence(parsed(), "binary"));
  });
});
