import { describe, it, expect } from "vitest";
import { buildDatasetDiagnosis } from "./buildDatasetDiagnosis";

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
    expect(text).toContain("초과");
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
