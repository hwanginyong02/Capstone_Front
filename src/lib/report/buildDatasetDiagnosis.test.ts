import { describe, it, expect } from "vitest";
import type { ImbalanceEffect } from "../../types/finalReport.types";
import { buildDatasetDiagnosis, imbalanceRatioOf, printedImbalanceRatio } from "./buildDatasetDiagnosis";

/**
 * ISSUES.md C-04 (2026-09-07 ★확정된 제품 결정 6-②).
 *
 * 정답 클래스가 1종이면 불균형비는 정의되지 않는다. 백엔드는 이제 M23 을 '측정 불가'로
 * 내려보내는데(`imbalanceRatio` 가 undefined 로 도착한다), 이 함수가 그때 **분포에서
 * 자기가 다시 계산**하면 `max/min = 1` → "허용 기준(≤ 1.50) 이내의 균형 상태이다" 를
 * 그대로 인쇄한다. 평가가 성립하지 않는 데이터에 정반대 결론이 찍히는 것이다.
 *
 * 결정문은 "computeVerdict 가 이미 걸러주므로 별도 조정이 필요 없다"고 적었지만 그것은
 * **8절 판정** 얘기이고, C-04 가 지적한 문장은 **3절 데이터셋 진단문**이다.
 */
describe("3절 데이터셋 진단 — 단일 클래스 (C-04)", () => {
  it("클래스가 1종이면 '균형 상태'라고 말하지 않는다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 100 } }, undefined, 0, 100, "multiclass");

    expect(text).not.toContain("균형 상태");
    expect(text).not.toMatch(/불균형 비율\(Imbalance Ratio\)은 1\.00/);
  });

  it("클래스가 1종이면 그 사실을 말한다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 100 } }, undefined, 0, 100, "multiclass");

    expect(text).toMatch(/클래스가 1종|측정 불가|정의되지 않/);
  });

  it("분포는 그대로 인쇄한다(정보를 잃지 않는다)", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 100 } }, undefined, 0, 100, "multiclass");

    expect(text).toContain("A 100건");
  });
});

describe("3절 데이터셋 진단 — 백엔드 값을 우선한다", () => {
  it("백엔드가 준 불균형비를 쓴다", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 90, B: 10 } }, 9, 0, 100, "binary",
    );

    expect(text).toContain("9.00");
    expect(text).toContain("벗어나");
  });

  it("백엔드 값이 없으면 분포에서 계산한다(2종 이상일 때만)", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 90, B: 10 } }, undefined, 0, 100, "binary",
    );

    expect(text).toContain("9.00");
  });

  it("균형 잡힌 2종은 종전대로 '균형 상태'라고 말한다(과잉 변경 방지)", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 50, B: 50 } }, undefined, 0, 100, "binary",
    );

    expect(text).toContain("균형 상태");
  });

  it("분포 자체가 없으면 종전 문구를 유지한다", () => {
    expect(buildDatasetDiagnosis(null)).toBe("데이터셋 분포 정보가 제공되지 않았습니다.");
  });

  it("제외 행 수는 그대로 보고한다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 50, B: 50 } }, 1, 3, 100, "binary");

    expect(text).toContain("3개 샘플이 평가에서 제외");
  });
});

/**
 * 서술 설계 D20: IR 1.5 미만이 '경미'(균형)다. 종전 `<= 1.5` 는 꼭 1.5 를 균형으로 찍어
 * 9절 불균형 판정(백엔드 imbalance_effect, IR ≥ 1.5 부터 불균형)과 어긋났다.
 */
describe("3절 데이터셋 진단 — 불균형 경계 1.5 (D20)", () => {
  it("IR 이 꼭 1.5 면 불균형 쪽이다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.5, 0, 100, "binary");

    expect(text).toContain("1.50로");
    expect(text).not.toContain("균형 상태");
    expect(text).toContain("주의가 필요하다");
  });

  it("분포에서 계산한 IR 이 꼭 1.5 여도 불균형 쪽이다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, undefined, 0, 100, "binary");

    expect(text).toContain("1.50로");
    expect(text).not.toContain("균형 상태");
  });

  it("IR 1.49 는 균형(경미)이다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 149, B: 100 } }, 1.49, 0, 249, "binary");

    expect(text).toContain("1.49로");
    expect(text).toContain("허용 기준(< 1.50) 이내의 균형 상태이다.");
  });

  it("1.497 은 반올림 전 값으로 판정해 경미다 — \"1.50\" 이 아니라 \"1.497\" 로 찍는다", () => {
    const text = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.497, 0, 100, "binary");

    expect(text).toContain("1.497로");
    expect(text).not.toContain("1.50로");
    expect(text).toContain("허용 기준(< 1.50) 이내의 균형 상태이다.");
  });

  it("백엔드 판정이 없으면 반올림 전 값으로 비교한다 — 꼭 1.5 는 불균형, 1.497 은 경미", () => {
    const atBoundary = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.5, 0, 100, "binary", null);
    const below = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.497, 0, 100, "binary", null);

    expect(atBoundary).toContain("1.50로");
    expect(atBoundary).toContain("허용 기준(1.50 미만)을 벗어나");
    expect(below).toContain("1.497로");
    expect(below).toContain("균형 상태이다.");
  });

  it("둘째 자리로도 셋째 자리로도 1.50 이 되면 넷째 자리까지 늘리고, 그래도 안 되면 버린다", () => {
    const fourth = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.4996, 0, 100, "binary");
    const truncated = buildDatasetDiagnosis({ class_distribution: { A: 60, B: 40 } }, 1.49999, 0, 100, "binary");

    expect(fourth).toContain("1.4996로");
    expect(truncated).toContain("1.4999로");
    expect(truncated).toContain("균형 상태이다.");
  });
});

/**
 * 판정하는 곳은 한 곳(서술 설계 D20) — 백엔드 imbalance_effect 가 있으면 3절은 그 level 을 그대로 따른다.
 * 9절 "불균형 영향 있음"과 3절 문장이 서로 다른 결론을 말하지 않게 한다.
 */
describe("3절 데이터셋 진단 — 백엔드 D20 판정을 따른다 (imbalance_effect)", () => {
  const effect = (level: ImbalanceEffect["level"], ratio: number): ImbalanceEffect => ({
    level,
    imbalance_ratio: ratio,
    accuracy_minus_macro_f1: 0.05,
    majority_minus_minority_f1: 0.12,
    majority_class: "A",
    minority_class: "B",
  });

  it("affected 면 IR 1.6 도 불균형 문장이다", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 80, B: 50 } }, 1.6, 0, 130, "binary", effect("affected", 1.6),
    );

    expect(text).toContain("1.60로");
    expect(text).toContain("허용 기준(1.50 미만)을 벗어나");
    expect(text).not.toContain("균형 상태");
  });

  it("no_distortion 도 IR 이 1.5 이상이므로 불균형 문장이다", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 75, B: 50 } }, 1.5, 0, 125, "binary", effect("no_distortion", 1.5),
    );

    expect(text).toContain("허용 기준(1.50 미만)을 벗어나");
    expect(text).not.toContain("균형 상태");
  });

  it("mild 면 균형(경미) 문장이고, 찍는 숫자도 1.5 아래로 읽힌다", () => {
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 60, B: 40 } }, 1.497, 0, 100, "binary", effect("mild", 1.497),
    );

    expect(text).toContain("1.497로");
    expect(text).toContain("허용 기준(< 1.50) 이내의 균형 상태이다.");
  });

  it("백엔드 판정이 숫자 비교와 다르면 판정을 따른다(판정 지점은 하나)", () => {
    // 분포로 다시 계산하면 1.4 라 경미지만, 엔진이 affected 라고 했으면 3절도 불균형이라고 말한다.
    const text = buildDatasetDiagnosis(
      { class_distribution: { A: 70, B: 50 } }, 1.4, 0, 120, "binary", effect("affected", 1.6),
    );

    expect(text).toContain("허용 기준(1.50 미만)을 벗어나");
  });
});

describe("불균형 비율 — 3절과 재료 선택 점검이 같은 값 (imbalanceRatioOf)", () => {
  it("최다 ÷ 최소, 클래스 2종 미만이거나 최소가 0 이면 null", () => {
    expect(imbalanceRatioOf({ a: 90, b: 10 })).toBe(9);
    expect(imbalanceRatioOf({ a: 5 })).toBeNull();
    expect(imbalanceRatioOf({ a: 5, b: 0 })).toBeNull();
    expect(imbalanceRatioOf(undefined)).toBeNull();
  });

  it("경계 비교는 3절이 찍는 자릿수로 — 9.004 는 9.00, 9.006 은 9.01", () => {
    expect(printedImbalanceRatio(9.004)).toBe(9);
    expect(printedImbalanceRatio(9.006)).toBe(9.01);
  });

  it("M23 이 없으면 3절 문장도 같은 함수 값을 찍는다", () => {
    expect(buildDatasetDiagnosis({ class_distribution: { a: 90, b: 10 } })).toContain("9.00");
  });
});
