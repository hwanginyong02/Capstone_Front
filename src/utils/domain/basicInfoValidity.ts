/**
 * ③ 의뢰자 정보·④ 평가 대상 모델의 필수 입력(재료 선택 점검 1층: 17025 §7.8.2.1 e·g).
 *
 * 각 입력 화면이 다음 버튼을 잠그고, 검증 화면의 "다음"이 끝난 단계로 돌아가 필수 칸을 지운 경우를
 * 대비해 다시 본다(`layerOneGaps`).
 */
import type { BasicInfoFormData } from "../../types/workflow.types";
import type { FieldIssue } from "./composerFieldGate";

/** 칸이 채워져 있는가 — 공백만 있는 칸은 빈 칸이다(B11). 옛 저장분에 문자열이 아닌 값이 남아도 빈 칸으로 본다. */
function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/** 빈 필수 칸 하나 — 화면의 칸 이름(`label`)과 저장 키. */
export interface BasicInfoGap {
  key: keyof BasicInfoFormData;
  label: string;
}

const CLIENT_REQUIRED: ReadonlyArray<BasicInfoGap> = [
  { key: "companyName", label: "회사명" },
  { key: "representative", label: "대표자" },
  { key: "businessNumber", label: "사업자등록번호" },
  { key: "phone", label: "전화번호" },
  { key: "address", label: "주소" },
  { key: "contractDate", label: "평가 의뢰일" },
  { key: "reportPurpose", label: "성적서 용도" },
];
const PROJECT_REQUIRED: ReadonlyArray<BasicInfoGap> = [
  { key: "projectName", label: "과제명" },
  { key: "projectAgency", label: "과제 기관" },
];
const MODEL_REQUIRED: ReadonlyArray<BasicInfoGap> = [
  { key: "modelName", label: "모델 이름" },
  { key: "versionName", label: "버전" },
  { key: "modelPurpose", label: "모델 용도" },
  { key: "modelCategory", label: "모델 분류" },
];

/**
 * ③ 의뢰자 정보의 빈 필수 칸 — 화면 순서대로. 회사·성적서 용도·과제. 칸마다 trim 해서 본다(B11): 종전에는 공백 한
 * 칸만 넣어도 통과해 성적서 1.2 에 빈 이름이 찍혔다. 화면의 "다음" 옆 안내(무엇이 비었는지, 점검 다-8)와 판정
 * (`isClientInfoValid`)이 이 함수 하나를 쓴다.
 */
export function clientInfoGaps(formData: BasicInfoFormData): BasicInfoGap[] {
  const required = formData.reportPurpose === "project" ? [...CLIENT_REQUIRED, ...PROJECT_REQUIRED] : CLIENT_REQUIRED;
  return required.filter((gap) => !filled(formData[gap.key]));
}

/** ④ 평가 대상 모델의 빈 필수 칸 — 이름·버전·용도·분류. 이름·버전은 run 을 식별하는 이름표이기도 하다. */
export function modelInfoGaps(formData: BasicInfoFormData): BasicInfoGap[] {
  return MODEL_REQUIRED.filter((gap) => !filled(formData[gap.key]));
}

/**
 * ③ 의뢰자 정보가 다 찼는가. 화면의 다음 버튼과 검증 화면의 1층 재확인(`layerOneGaps`)이 쓴다.
 */
export function isClientInfoValid(formData: BasicInfoFormData): boolean {
  return clientInfoGaps(formData).length === 0;
}

/** ④ 평가 대상 모델이 다 찼는가. */
export function isModelInfoValid(formData: BasicInfoFormData): boolean {
  return modelInfoGaps(formData).length === 0;
}

/**
 * 빈 칸 → 작성 화면의 "다음" 옆 안내(`RemainingNotice`)가 읽는 모양. ③④ 는 "모름"이 없다.
 */
export function basicInfoIssues(cardId: "clientInfo" | "model", gaps: BasicInfoGap[]): FieldIssue[] {
  return gaps.map((gap) => ({ cardId, fieldId: gap.key, label: gap.label, reason: "missing", allowsUnknown: false }));
}
