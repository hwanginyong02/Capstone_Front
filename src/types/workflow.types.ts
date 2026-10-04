import type { TaskType } from "../data/evaluationData";
import { todayIsoDate } from "../utils/domain/isoDate";

/**
 * 단계의 안정적인 식별자.
 *
 * 종전에는 단계를 번호(`STEP` 상수 + `STEP_PATHS` 배열 위치)로 가리켰다. 이제 단계 목록이
 * 성적서 구성 화면의 카드 선택에서 **계산되므로**(docs/COMPOSER_COMPONENTS.md "카드별 입력
 * 단계"), 번호는 선택이 바뀔 때마다 뜻이 달라진다 — 저장된 진행 표시가 조용히 어긋나는
 * 바로 그 상황이다(docs/WORKFLOW_REDESIGN.md §3.3). 그래서 번호가 아니라 이름으로 가리킨다.
 *
 * 아래 순서가 정본 순서다. 실제 목록은 `data/workflowSteps.ts` 가 들고 있다.
 */
export type StepId =
  | "upload" // 1. Evaluation File — ① 결과 파일, ④ 모델명·버전
  | "metrics" // 2. Metrics — ⑤ 평가 관점 + ② 지표
  | "mapping" // 3. Column mapping — ① 컬럼 매핑·양성 클래스·결정 임계값
  | "validation" // 4. Validation — 검증·평가 실행
  | "summary" // 5. Evaluation — 평가 결과
  | "dataInfo" // 6. Data info — ⑥ ⑦ ⑧ 중 켠 카드 (조건부)
  | "modelEnv" // 7. Model info — ⑨ (조건부)
  | "clientInfo" // 8. Details — ③, ④ 모델 용도
  | "report"; // 9. Result — 성적서

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

export interface DatasetInfoFormData {
  trainingSampleCount: string;
  validationSampleCount: string;
  trainingDatasetName: string;
  trainingDataFormat: string;
  trainingClassDistribution: string;
  trainingDataDescription: string;
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

export const DEFAULT_DATASET_INFO: DatasetInfoFormData = {
  trainingSampleCount: "",
  validationSampleCount: "",
  trainingDatasetName: "",
  trainingDataFormat: "",
  trainingClassDistribution: "",
  trainingDataDescription: "",
};

