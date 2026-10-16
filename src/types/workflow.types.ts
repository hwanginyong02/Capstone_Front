import type { TaskType } from "../data/evaluationData";
import { todayIsoDate } from "../utils/domain/isoDate";

/**
 * 단계의 안정적인 식별자.
 *
 * 종전에는 단계를 번호(`STEP` 상수 + `STEP_PATHS` 배열 위치)로 가리켰다. 이제 단계 목록이
 * 재료 고르기에서 고른 카드에서 **계산되므로**(docs/MATERIAL_PICKER.md §3), 번호는 선택이 바뀔 때마다 뜻이 달라진다 — 저장된 진행 표시가 조용히 어긋나는
 * 바로 그 상황이다(docs/WORKFLOW_REDESIGN.md §3.3). 그래서 번호가 아니라 이름으로 가리킨다.
 *
 * 순서는 여기서 정하지 않는다. 사용자가 재료 고르기 다이어그램에서 정한 카드 순서를 펼친 것이
 * 걸을 순서다(`utils/domain/workflowSteps.ts` 의 `buildStepList`, docs/MATERIAL_PICKER.md §11).
 */
export type StepId =
  | "clientInfo" // 의뢰자 정보 — ③
  | "model" // 평가 대상 모델 — ④
  | "modelEnv" // 모델 설정과 실행 환경 — ⑨ (조건부)
  | "upload" // 평가 데이터 — ① 결과 파일
  | "mapping" // 컬럼 매핑 — ① 컬럼 매핑·양성 클래스·결정 임계값
  | "trainingData" // 학습 데이터 — ⑥ (조건부)
  | "testData" // 테스트 데이터 — ⑦ (조건부)
  | "groundTruth" // 정답 라벨 — ⑧ (조건부)
  | "perspective" // 평가 관점 — ⑤
  | "metrics" // 지표와 합격 기준 — ②
  | "validation" // 검증 — 검증·평가 run 저장
  | "report"; // 확인과 생성 — 성적서

export interface BasicInfoFormData {
  companyName: string;
  representative: string;
  businessNumber: string;
  website: string;
  phone: string;
  fax: string;
  address: string;
  /** ISO 날짜 문자열("YYYY-MM-DD"). 이 상태는 localStorage 를 왕복하므로
   *  직렬화 가능한 형태가 참 타입이다(ISSUES.md E-09). UI 경계에서만 Date 로 변환한다. */
  contractDate?: string;
  reportPurpose: string;
  /**
   * 성적서 용도에 덧붙이는 글(선택). 서술 설계 D26 — 모든 선택지 필드는 추가 서술을 함께 받는다.
   * 성적서 1.3 개요 칸에 "의뢰자 제공"으로 싣고 AI 에도 넘긴다. persist v11 에서 생겼다.
   */
  reportPurposeNote: string;
  projectName: string;
  projectAgency: string;
  projectNumber: string;
  versionName: string;
  modelName: string;
  modelPurpose: string;
  modelCategory: string;
  taskType: TaskType | "";
  envOS: string;
  envCPU: string;
  envGPU: string;
  envMemory: string;
  envSoftware: string;
}

export interface MetricDetailState {
  id: string;
  name: string;
  description: string;
  targetValue: string;
  beta: string;
  positiveClass: string;
  completed: boolean;
}

export type MetricDetailStateMap = Record<string, MetricDetailState>;

export interface UploadedFileInfo {
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

export const DEFAULT_BASIC_INFO: BasicInfoFormData = {
  companyName: "",
  representative: "",
  businessNumber: "",
  website: "",
  phone: "",
  fax: "",
  address: "",
  contractDate: todayIsoDate(),
  reportPurpose: "",
  reportPurposeNote: "",
  projectName: "",
  projectAgency: "",
  projectNumber: "",
  versionName: "v1.0.0",
  modelName: "",
  modelPurpose: "",
  modelCategory: "",
  taskType: "",
  envOS: "",
  envCPU: "",
  envGPU: "",
  envMemory: "",
  envSoftware: "",
};

