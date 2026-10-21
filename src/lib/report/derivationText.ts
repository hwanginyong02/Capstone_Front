/**
 * 파생 예측 사실의 성적서 문장 — 확률·점수에서 예측을 만들었을 때(ISSUES.md A-01, SPEC §0).
 *
 * - `derivationStatement`: 7절 첫머리(7.1 앞)에 찍는 고정 문구 9 — "본 평가의 예측값은 제출된
 *   확률값에 결정 임계값 {threshold}를 적용하여 산출하였다." 멀티레이블은 레이블별 임계값 표를
 *   함께 찍는다(`perLabelThresholds`).
 * - `describeDerivation`: 종전 6.0 일러두기의 문장. 판 2 이전에 발급된 보관본만 이 문장을 6.0 에
 *   찍는다(재료 목록 4절 "결정 임계값 — 7.1 앞 고정 문구").
 */
import type { DerivedPredictionFact } from "../../types/finalReport.types";
import { josaEulReul } from "./koreanJosa";

/**
 * 고정 문구 9(멀티레이블 레이블별 임계값이면 그 뜻으로 바꾼 문장).
 *
 * "결정 임계값 {t}를" 의 조사는 판 3 부터 숫자를 읽는 소리로 고른다(0.5를 · 0.3을, 서술 라운드 세션 B).
 * 판 2 보관본은 발급 당시처럼 늘 "를" — 그 판을 그리는 곳만 `legacyParticle` 을 켠다. 사실 시트의 고정 문장
 * (새 run = 판 3)은 기본값 그대로 부른다.
 */
export function derivationStatement(
  fact: DerivedPredictionFact,
  options: { legacyParticle?: boolean } = {},
): string {
  if (fact.method === "argmax") {
    return "본 평가의 예측값은 제출된 클래스별 확률값 중 가장 큰 값의 클래스를 택하여 산출하였다(결정 임계값 없음).";
  }
  if (fact.method === "threshold_per_label" && typeof fact.threshold === "object" && fact.threshold !== null) {
    return "본 평가의 예측값은 제출된 확률값에 레이블별 결정 임계값(아래 표)을 적용하여 산출하였다.";
  }
  const particle = options.legacyParticle ? "를" : josaEulReul(String(fact.threshold));
  return `본 평가의 예측값은 제출된 확률값에 결정 임계값 ${fact.threshold}${particle} 적용하여 산출하였다.`;
}

/** 멀티레이블 레이블별 임계값 — [점수 컬럼, 임계값]. 레이블마다 다르지 않으면 빈 배열. */
export function perLabelThresholds(fact: DerivedPredictionFact): Array<[column: string, threshold: number]> {
  if (fact.method !== "threshold_per_label") return [];
  if (typeof fact.threshold !== "object" || fact.threshold === null) return [];
  return Object.entries(fact.threshold);
}

/**
 * 파생의 방법·임계값·출처를 한 문장으로(종전 6.0 일러두기). 어떤 컬럼에서 어떤 규칙으로
 * 만들었는지가 성적서에 남아야 독자가 그 수치를 재현할 수 있다.
 */
export function describeDerivation(fact: DerivedPredictionFact): string {
  const source = fact.source_columns.join(", ");
  if (fact.method === "argmax") {
    return `확률 컬럼 [${source}] 중 가장 큰 값의 클래스를 예측으로 삼았습니다(argmax, 임계값 없음).`;
  }
  if (fact.method === "threshold_per_label") {
    const t =
      typeof fact.threshold === "object" && fact.threshold !== null
        ? Object.entries(fact.threshold).map(([col, v]) => `${col} ≥ ${v}`).join(", ")
        : `모든 레이블 ≥ ${fact.threshold}`;
    return `점수 컬럼 [${source}] 에 레이블별 결정 임계값을 적용했습니다(${t}).`;
  }
  const positive = fact.positive_class ? ` 양성 클래스는 [${fact.positive_class}] 입니다.` : "";
  return `점수 컬럼 [${source}] 이 결정 임계값 ${fact.threshold} 이상이면 양성으로 판정했습니다.${positive}`;
}
