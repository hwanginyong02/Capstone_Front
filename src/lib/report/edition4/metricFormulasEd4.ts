/**
 * 판 4 의 3.2 산정식 덮어쓰기 표(대응표 11) — 판 4 run 을 만들 때 `metricFormulas` 의 산정식 글을 이 표로 바꿔 저장한다. 표에
 * 없는 지표는 판 3 글(`evaluationData.METRICS.formula`, 동결) 그대로다. 시험목표 열(`description`)은 판과 무관하게 같다.
 *
 * 출처(부록 A 문안 출처 규칙):
 * - M2·M3·M4·M19: 예시본 3.2 글자 그대로.
 * - M5: 판 3 글에 부록 A9 치환만(binary → 이진, 그 외 → 다중·멀티, macro → 매크로).
 * - M10: 고정 문구 사본 `3_2_M10_formula`(2026-10-24 받은 새 글자).
 * - M11~M13: 부록 B6.
 */
export const EDITION4_FORMULA_OVERRIDES: Readonly<Record<string, string>> = {
  M2: "이진: TP/(TP+FP) · 다중·멀티: 클래스별 TP/(TP+FP)의 매크로 평균",
  M3: "이진: TP/(TP+FN) · 다중·멀티: 클래스별 TP/(TP+FN)의 매크로 평균",
  M4: "이진: 2PR/(P+R) · 다중·멀티: 클래스별 F1의 매크로 평균(매크로 정밀도와 매크로 재현율의 조화평균이 아님)",
  M5: "이진: (1+β²)PR/(β²P+R) · 다중·멀티: 클래스별 Fβ 의 매크로 평균",
  M10: "평균 정밀도(Average Precision): Σ (Rₙ − Rₙ₋₁) · Pₙ",
  M11: "클래스별 P·R·F1의 매크로 평균 — (Class1 + … + ClassN) / N",
  M12: "마이크로 평균 — 전 클래스의 TP·FP·FN을 합산해 P·R·F1을 계산",
  M13: "가중 평균 — 클래스별 지표를 표본 수(support)로 가중 평균",
  M19: "−(1/N) Σ [y·log(p) + (1−y)·log(1−p)]",
};

/** 판 4 산정식 — 덮어쓰기 표에 있으면 그 글, 없으면 판 3 글. 키는 성적서 표시 ID(M 표기). */
export function formulaEd4(displayId: string, edition3Formula: string): string {
  return EDITION4_FORMULA_OVERRIDES[displayId] ?? edition3Formula;
}
