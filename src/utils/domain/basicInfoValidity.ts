/**
 * ③ 의뢰자 정보·④ 평가 대상 모델의 필수 입력(재료 선택 점검 1층: 17025 §7.8.2.1 e·g).
 *
 * 각 입력 화면이 다음 버튼을 잠그고, 검증 화면의 "다음"이 끝난 단계로 돌아가 필수 칸을 지운 경우를
 * 대비해 다시 본다(`layerOneGaps`).
 */
import type { BasicInfoFormData } from "../../types/workflow.types";

/** ③ 의뢰자 정보 — 회사·성적서 용도·과제. */
export function isClientInfoValid(formData: BasicInfoFormData): boolean {
  const baseValid = Boolean(
    formData.companyName &&
      formData.representative &&
      formData.businessNumber &&
      formData.phone &&
      formData.address &&
      formData.contractDate &&
      formData.reportPurpose,
  );
  if (formData.reportPurpose === "project") {
    return baseValid && Boolean(formData.projectName && formData.projectAgency);
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
