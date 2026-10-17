/**
 * 의뢰자 답으로 정해지는 고정 문구 — 7.2 정답 라벨 주의(고정 문구 12)와 8.2 일반화(고정 문구 11a·11b).
 *
 * - 문장은 생성 때 만들어 성적서 데이터에 저장한다 — 발급본은 나중에 문안을 바꿔도 그대로다.
 *   이 키가 생기기 전 성적서에는 없고, 그 성적서의 7.2·8.2 는 종전대로 서술만 찍는다.
 * - 정답 라벨 주의는 9절 문제(`label_caution`)와 같은 판정 함수 `labelCautions` 하나를 본다.
 *   자리마다 따로 적으면 9절에는 문제가 있는데 7.2 에는 문구가 없는 식으로 어긋난다.
 * - 답이 없거나 "모름"이면 문장을 만들지 않는다. 빠진 답은 재료 선택 점검(1.4)이 "제공되지 않음"으로 다룬다.
 */
import { josaEuroRo } from "./koreanJosa";
import { labelCautions } from "./problemList";
import type { ReportComposerInput } from "./reportMaterials";

/**
 * 고정 문구 12(7.2) — "정답 라벨의 {구축 방법/신뢰성}이 {값}으로, 정답 자체의 오류가 성능 수치에
 * 반영되었을 수 있다. 수치 해석 시 이를 고려해야 한다." 걸리지 않으면 null.
 *
 * 둘 다 걸리면 한 문장에 "구축 방법과 신뢰성이 각각 {값}, {값}으로"로 묶는다(설계 문안의 자리 하나에
 * 두 답을 넣은 것).
 */
export function labelCautionSentence(composer: ReportComposerInput | undefined): string | null {
  const cautions = labelCautions(composer);
  if (cautions.length === 0) return null;
  const last = cautions[cautions.length - 1].value;
  const subject =
    cautions.length === 1
      ? `${cautions[0].aspect}이 ${last}`
      : `${cautions.map((c) => c.aspect).join("과 ")}이 각각 ${cautions.map((c) => c.value).join(", ")}`;
  return `정답 라벨의 ${subject}${josaEuroRo(last)}, 정답 자체의 오류가 성능 수치에 반영되었을 수 있다. 수치 해석 시 이를 고려해야 한다.`;
}

/** 고정 문구 11a — 평가 데이터가 학습 데이터와 같은 출처일 때. */
export const SAME_SOURCE_SENTENCE =
  "평가 데이터는 학습 데이터와 동일한 출처에서 수집되었다. 본 결과는 동일 분포 내 성능을 나타내며, 다른 운영 환경에서의 일반화 성능을 보증하지 않는다.";
/** 고정 문구 11b — 평가 데이터가 학습 데이터와 다른 출처일 때. */
export const DIFFERENT_SOURCE_SENTENCE = "평가 데이터는 학습 데이터와 다른 출처에서 수집되었다.";

/**
 * 8.2 일반화 고정 문구 — ⑦ 테스트 데이터 카드의 "학습 데이터와 출처 관계"(`testSourceRelation`) 답으로
 * 고른다. 카드를 껐거나, 답이 없거나, "모름"이면 null.
 */
export function sourceRelationSentence(composer: ReportComposerInput | undefined): string | null {
  if (!composer?.cards.testData) return null;
  const answer = composer.testData.testSourceRelation;
  if (!answer || answer.unknown) return null;
  if (answer.text === "Same source") return SAME_SOURCE_SENTENCE;
  if (answer.text === "Different source") return DIFFERENT_SOURCE_SENTENCE;
  return null;
}
