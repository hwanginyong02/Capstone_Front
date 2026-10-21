import type { ImbalanceEffect } from "../../types/finalReport.types";
import { josaEuroRoNumber, josaWaGwaNumber } from "./koreanJosa";

/**
 * 데이터셋 분포 사전 진단 문구 생성 (3절).
 *
 * 가짜 MOCK 진단문("학습-평가 비율 0.80:0.20, Negative 61.8%..." 등) 대신
 * 실제 클래스 분포(metadata.class_distribution)와 불균형 비율(M23 또는 직접 산출)을
 * 기반으로 사실만 서술한다. (LLM 아님 — 규칙 기반 사실 진술)
 */

/**
 * 클래스 분포의 불균형 비율(IR = 최다 클래스 수 ÷ 최소 클래스 수). 3절 진단과 재료 선택 점검(4번 줄,
 * IR > 9)이 이 함수 하나로 같은 값을 쓴다.
 *
 * 클래스가 2종 미만이거나 최소 수가 0 이면 정의되지 않으므로 `null` 이다.
 */
export function imbalanceRatioOf(distribution: Record<string, number> | null | undefined): number | null {
  const counts = Object.values(distribution ?? {}).filter(
    (count): count is number => typeof count === "number" && Number.isFinite(count),
  );
  if (counts.length < 2) return null;
  const min = Math.min(...counts);
  return min > 0 ? Math.max(...counts) / min : null;
}

/**
 * 재료 선택 점검(IR > 9)이 비교하는 IR 자릿수(소수 둘째 자리) — 9.004 는 "9.00" 이다.
 * 3절의 1.5 경계 판정은 이 값이 아니라 반올림 전 값(또는 백엔드 판정)으로 한다(`isBalancedImbalance`).
 */
export function printedImbalanceRatio(ratio: number): number {
  return Number(ratio.toFixed(2));
}

/** 3절 진단의 균형 기준(서술 설계 D20). IR 이 이 값 **미만**이어야 균형(경미)이다. */
export const BALANCED_IMBALANCE_RATIO = 1.5;

/**
 * 3절의 균형(경미) 판정. 판정하는 곳은 한 곳 — 백엔드 D20 판정(`imbalance_effect.level`)이 있으면
 * 그 결과를 그대로 읽는다(mild = 균형, affected·no_distortion = 불균형). 없으면(옛 응답·예측 없음)
 * 백엔드와 같은 식으로 **반올림 전** IR 을 1.5 와 비교한다.
 */
export function isBalancedImbalance(ratio: number, imbalanceEffect?: ImbalanceEffect | null): boolean {
  if (imbalanceEffect) return imbalanceEffect.level === "mild";
  return ratio < BALANCED_IMBALANCE_RATIO;
}

/** 3절에 찍는 IR 의 최대 소수 자릿수. */
const MAX_IMBALANCE_DECIMALS = 4;

/**
 * 3절에 찍는 IR 문자열. 평소에는 소수 둘째 자리다. 찍힌 숫자가 판정과 어긋나지 않게 자릿수를 고른다.
 * - 균형 판정인데 둘째 자리 반올림이 "1.50" 이 되면(예: 1.497) 1.5 아래로 읽힐 때까지 자릿수를 늘린다
 *   (최대 넷째 자리, 그래도 안 되면 넷째 자리에서 버린다 — 1.49999 → "1.4999").
 * - 불균형 판정인데 둘째 자리가 1.5 아래로 읽히면(엔진 판정에서는 생기지 않지만 막아 둔다) 값을 그대로
 *   찍는다(숫자를 지어내지 않는다). 둘째 자리가 1.5 아래면 값이 1.495 미만이라 자릿수를 늘려도 1.5 이상으로
 *   읽히지 않는다(1.49996 은 둘째 자리가 이미 "1.50" 이다).
 */
export function formatImbalanceRatio(ratio: number, balanced: boolean): string {
  const twoDecimals = ratio.toFixed(2);
  const readsBalanced = Number(twoDecimals) < BALANCED_IMBALANCE_RATIO;
  if (readsBalanced === balanced) return twoDecimals;
  if (!balanced) return String(ratio);
  for (let digits = 3; digits <= MAX_IMBALANCE_DECIMALS; digits += 1) {
    const printed = ratio.toFixed(digits);
    if (Number(printed) < BALANCED_IMBALANCE_RATIO) return printed;
  }
  const scale = 10 ** MAX_IMBALANCE_DECIMALS;
  return (Math.floor(ratio * scale) / scale).toFixed(MAX_IMBALANCE_DECIMALS);
}

/** 차이 판정 기준(서술 설계 D20·D12). 차이가 이 값 **이상**이면 왜곡으로 본다. */
const IMBALANCE_F1_GAP = 0.1;

/** 클래스·레이블을 부르는 꼴 — 설명이 있으면 '이름(설명)', 없으면 이름만(서술 설계 D37, 백엔드 `class_name` 과 같은 규칙). */
function className(label: string, descriptions: Record<string, string> | undefined): string {
  const description = descriptions?.[label.trim()]?.trim();
  return description && description !== "제공되지 않음" && description !== label.trim()
    ? `${label}(${description})`
    : label;
}

/**
 * 엔진 판정이 있을 때의 불균형 진단 한 문장 — 서술 설계 D20 세 갈래(경미·영향 있음·불균형 있으나 왜곡 미관찰).
 * 문구는 사용자가 정한 그대로(서술 라운드 세션 B, 결정 6). 숫자는 엔진 표시 문자열(판정과 같은 쪽으로 자릿수를
 * 늘린 값)을 쓰고, 표시값이 없는 옛 응답만 숫자 칸을 그대로 찍는다. 기준(0.10) 이상인지는 백엔드 7.2 문장과 같이
 * 표시값으로 본다(4자리 값 0.1 이 실제로는 0.09996 일 수 있다). 정확도·매크로 F1 값(새 칸)이 없는 옛 응답이면
 * 조건 문장은 차이만 찍는다. 멀티레이블은 엔진이 정확도 차이를 null 로 두므로 그 갈래를 빼고 '레이블' 로 부른다.
 */
function imbalanceEffectSentence(
  effect: ImbalanceEffect,
  irText: string,
  descriptions: Record<string, string> | undefined,
): string {
  const head = `클래스 불균형 비율(Imbalance Ratio)은 ${irText}${josaEuroRoNumber(irText)}`;
  if (effect.level === "mild") return `${head}, 허용 기준(1.50 미만) 이내이다.`;

  const shown = effect.display;
  // 멀티레이블인지는 엔진이 정확도 차이를 null 로 둔 것으로 안다(백엔드 7.2 문장과 같은 판단 — 한 곳).
  const unit = effect.accuracy_minus_macro_f1 === null ? "레이블" : "클래스";
  const accuracyGap =
    effect.accuracy_minus_macro_f1 === null
      ? null
      : (shown?.accuracy_minus_macro_f1 ?? String(effect.accuracy_minus_macro_f1));
  const classGap = shown?.majority_minus_minority_f1 ?? String(effect.majority_minus_minority_f1);
  const atLeast = (text: string, value: number) => {
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed >= IMBALANCE_F1_GAP : value >= IMBALANCE_F1_GAP;
  };
  const pair = `다수 ${unit} '${className(effect.majority_class, descriptions)}'와 소수 ${unit} '${className(effect.minority_class, descriptions)}'의 F1 차이`;

  if (effect.level === "affected") {
    const conditions: string[] = [];
    if (accuracyGap !== null && atLeast(accuracyGap, effect.accuracy_minus_macro_f1 as number)) {
      const accuracy = shown?.accuracy ?? (effect.accuracy != null ? String(effect.accuracy) : null);
      const macroF1 = shown?.macro_f1 ?? (effect.macro_f1 != null ? String(effect.macro_f1) : null);
      const subject =
        accuracy !== null && macroF1 !== null
          ? `정확도 ${accuracy}${josaWaGwaNumber(accuracy)} 매크로 F1 ${macroF1}의 차이`
          : "정확도와 매크로 F1의 차이";
      conditions.push(`${subject}가 ${accuracyGap}${josaEuroRoNumber(accuracyGap)} 0.10 이상`);
    }
    if (atLeast(classGap, effect.majority_minus_minority_f1)) {
      conditions.push(`${pair}가 ${classGap}${josaEuroRoNumber(classGap)} 0.10 이상`);
    }
    // 엔진은 '영향 있음'인데 기준 이상인 차이를 찾지 못하면(표시값이 없는 옛 응답의 반올림) 조건을 지어내지 않는다.
    const because = conditions.length > 0 ? `${conditions.join("이고, ")}이어서 ` : "";
    return (
      `${head} 허용 기준(1.50 미만)을 벗어나며, ${because}불균형에 따른 성능 지표 왜곡이 관찰되었다. ` +
      "정확도보다 매크로 F1과 클래스별 지표를 우선 참고해야 한다."
    );
  }

  // no_distortion
  if (accuracyGap === null) {
    return (
      `${head} 허용 기준(1.50 미만)을 벗어나나, 다수·소수 ${unit} F1의 차이가 0.10 미만이라 ` +
      `불균형에 따른 성능 왜곡은 관찰되지 않았다(${pair} ${classGap}).`
    );
  }
  return (
    `${head} 허용 기준(1.50 미만)을 벗어나나, 정확도와 매크로 F1, 다수·소수 ${unit} F1의 차이가 모두 0.10 미만이라 ` +
    `불균형에 따른 성능 왜곡은 관찰되지 않았다(정확도와 매크로 F1의 차이 ${accuracyGap}, ${pair} ${classGap}).`
  );
}

export function buildDatasetDiagnosis(
  metadata: { class_distribution?: Record<string, number> } | null | undefined,
  imbalanceRatio?: number,
  droppedRows: number = 0,
  datasetSize?: number,
  taskType?: "binary" | "multiclass" | "multilabel",
  /** 백엔드 D20 판정(`parseImbalanceEffect`). 있으면 3절 문장이 이 판정의 세 갈래를 따른다. */
  imbalanceEffect?: ImbalanceEffect | null,
  /** 클래스 레이블 설명({클래스: 설명}). 다수·소수 클래스를 '이름(설명)' 으로 부른다(D37). */
  classDescriptions?: Record<string, string>,
): string {
  const dist: Record<string, number> = metadata?.class_distribution ?? {};
  const entries = Object.entries(dist).filter(([, count]) => typeof count === "number");

  const parts: string[] = [];

  if (droppedRows > 0) {
    parts.push(
      `결측치(NaN) 제거 전처리로 인해 전체 행 중 ${droppedRows.toLocaleString()}개 샘플이 평가에서 제외되었다.`,
    );
  }

  if (entries.length > 0) {
    const sumOfCounts = entries.reduce((sum, [, count]) => sum + count, 0);
    // 멀티레이블이면 datasetSize를 사용하거나, 주어지지 않은 경우 sumOfCounts 사용
    const total = datasetSize && datasetSize > 0 ? datasetSize : sumOfCounts;
    
    // 멀티레이블의 경우, 백분율은 해당 클래스의 출현 빈도 / 전체 샘플 수 (즉 총합이 100%가 넘을 수 있음)
    // 멀티클래스/바이너리의 경우 기존처럼 count / sumOfCounts 로 하여 정확히 100%가 되게 함
    const denominator = taskType === "multilabel" ? total : sumOfCounts;
    
    const distText = entries
      .map(
        ([label, count]) =>
          `${label} ${count.toLocaleString()}건(${denominator > 0 ? ((count / denominator) * 100).toFixed(1) : "0.0"}%)`,
      )
      .join(", ");
      
    parts.push(`평가 데이터셋은 총 ${total.toLocaleString()}건이며, 클래스(레이블)별 분포는 ${distText}이다.`);

    // 엔진 판정(imbalance_effect)이 있으면 판정과 같은 출처의 IR(M23 과 같은 값, 넷째 자리)을 찍는다 —
    // 찍는 숫자와 문장이 같은 값에서 나온다. 없으면(옛 응답·예측 없음) M23, 그것도 없으면 분포로 계산한다.
    // 단, 엔진은 반올림 전 값으로 판정하고 넷째 자리로 반올림해 싣는다. 1.49995 이상 1.5 미만은 경미인데
    // 실린 값이 1.5 가 된다 — 그때만 반올림 전 값(M23, 없으면 분포로 계산)을 찍는다.
    const rawRatio = typeof imbalanceRatio === "number" ? imbalanceRatio : (imbalanceRatioOf(dist) ?? 0);
    const engineRatio = imbalanceEffect?.imbalance_ratio;
    const engineRatioContradicts =
      imbalanceEffect != null &&
      engineRatio != null &&
      (engineRatio < BALANCED_IMBALANCE_RATIO) !== (imbalanceEffect.level === "mild") &&
      (rawRatio < BALANCED_IMBALANCE_RATIO) === (imbalanceEffect.level === "mild");
    const ratio = imbalanceEffect && engineRatio != null && !engineRatioContradicts ? engineRatio : rawRatio;

    if (entries.length < 2) {
      // 클래스가 1종이면 '가장 많은 클래스 / 가장 적은 클래스' 가 자기 자신이라 비율이
      // 항상 1이 된다. 그것을 그대로 서술하면 "허용 기준 이내의 균형 상태"가 인쇄되는데,
      // 실제로는 평가가 성립하지 않는 데이터다 — 정반대 결론이다(ISSUES.md C-04).
      // 백엔드도 같은 이유로 M23 을 '측정 불가'로 내려보낸다. 여기서 자기가 다시
      // 계산해버리면 백엔드의 판단이 무의미해진다.
      parts.push(
        `정답 클래스가 1종뿐이라 클래스 불균형 비율(Imbalance Ratio)은 정의되지 않는다(측정 불가). ` +
          `분류 성능 지표의 해석에도 주의가 필요하다.`,
      );
    } else if (ratio > 0) {
      // 서술 설계 D20: IR 1.5 미만이 '경미'다. 꼭 1.5 는 불균형 쪽이다(종전 `<= 1.5` 는
      // 1.5 를 균형으로 찍어 9절 불균형 판정과 어긋났다). 판정은 백엔드 D20 결과를 따르고(없으면
      // 반올림 전 값으로 같은 식), 찍는 숫자가 판정과 어긋나지 않게 자릿수를 고른다 — 1.497 은
      // 경미이므로 "1.50" 이 아니라 "1.497" 로 찍는다.
      // 이 문장은 생성 때 만들어 저장하므로 이미 발행된 성적서의 3절은 바뀌지 않는다.
      const balanced = isBalancedImbalance(ratio, imbalanceEffect);
      if (imbalanceEffect) {
        // 엔진 판정이 있으면 세 갈래(D20, 새 run 부터 — 이 문장은 조립 때 저장하므로 판 조건이 필요 없다).
        // IR 은 엔진 표시 문자열(판정과 같은 쪽으로 자릿수를 늘린 값), 없으면(S2 이전 응답) 위에서 고른 값.
        const irText = imbalanceEffect.display?.imbalance_ratio ?? formatImbalanceRatio(ratio, balanced);
        parts.push(imbalanceEffectSentence(imbalanceEffect, irText, classDescriptions));
      } else {
        // 엔진 판정이 없으면(옛 응답·예측 없음) 왜곡 여부를 알 수 없다 — 종전 두 갈래. 조사만 숫자 끝소리로.
        const irText = formatImbalanceRatio(ratio, balanced);
        parts.push(
          `클래스 불균형 비율(Imbalance Ratio)은 ${irText}${josaEuroRoNumber(irText)}, ` +
            (balanced
              ? "허용 기준(< 1.50) 이내의 균형 상태이다."
              : "허용 기준(1.50 미만)을 벗어나 클래스 불균형에 따른 성능 지표 해석에 주의가 필요하다."),
        );
      }
    }
  }

  if (parts.length === 0) {
    return "데이터셋 분포 정보가 제공되지 않았습니다.";
  }

  return parts.join(" ");
}
