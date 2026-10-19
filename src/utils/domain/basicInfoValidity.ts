/**
 * ③ 의뢰자 정보·④ 평가 대상 모델의 필수 입력(재료 선택 점검 1층: 17025 §7.8.2.1 e·g).
 *
 * 각 입력 화면이 다음 버튼을 잠그고, 검증 화면의 "다음"이 끝난 단계로 돌아가 필수 칸을 지운 경우를
 * 대비해 다시 본다(`layerOneGaps`).
 */
import type { BasicInfoFormData } from "../../types/workflow.types";

/** 칸이 채워져 있는가 — 공백만 있는 칸은 빈 칸이다(B11). 옛 저장분에 문자열이 아닌 값이 남아도 빈 칸으로 본다. */
function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * ③ 의뢰자 정보 — 회사·성적서 용도·과제. 칸마다 trim 해서 본다(B11): 종전에는 공백 한 칸만 넣어도 통과해
 * 성적서 1.2 에 빈 이름이 찍혔다. 화면의 다음 버튼과 검증 화면의 1층 재확인(`layerOneGaps`)이 이 함수 하나를 쓴다.
 */
export function isClientInfoValid(formData: BasicInfoFormData): boolean {
  const baseValid =
    filled(formData.companyName) &&
    filled(formData.representative) &&
    filled(formData.businessNumber) &&
    filled(formData.phone) &&
    filled(formData.address) &&
    filled(formData.contractDate) &&
    filled(formData.reportPurpose);
  if (formData.reportPurpose === "project") {
    return baseValid && filled(formData.projectName) && filled(formData.projectAgency);
  }
  return baseValid;
}

/** ④ 평가 대상 모델 — 이름·버전·용도·분류. 이름·버전은 run 을 식별하는 이름표이기도 하다. */
export function isModelInfoValid(formData: BasicInfoFormData): boolean {
  return Boolean(
    formData.modelName.trim() &&
      formData.versionName.trim() &&
      formData.modelPurpose.trim() &&
      formData.modelCategory.trim(),
  );
}
