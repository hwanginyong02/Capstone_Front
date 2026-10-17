import type { TaskType } from "../data/evaluationData";

export type ValidationStatus = "pass" | "warning" | "error";
export type ValidationGroup = "common" | "multiclass" | "binary" | "multilabel" | "latency";

export interface ExecutionSummaryItem {
  label: string;
  value: string;
  note: string;
}

export interface ValidationDetailItem {
  name: string;
  result: string;
  handling: string;
  status: ValidationStatus;
  group: ValidationGroup;
}

export interface ValidationResponse {
  taskType: TaskType;
  selectedMetricIds: string[];
  executionSummary: ExecutionSummaryItem[];
  validationDetails: ValidationDetailItem[];
  errorCount: number;
  warningCount: number;
}

/**
 * 백엔드 `POST /api/validate-data` 응답 형태 (ValidateDataResponse 스키마와 1:1, snake_case).
 * 컬럼 매핑 검증 페이지와 리포트 데이터 매퍼가 공유하는 단일 진실 타입.
 */
export interface ValidateDataResponseData {
  task_type: string;
  selected_metric_ids: string[];
  execution_summary: ExecutionSummaryItem[];
  validation_details: ValidationDetailItem[];
  error_count: number;
  warning_count: number;
  /**
   * 평가 프레임 기준 클래스(레이블)별 등장 횟수. 평가 응답과 같은 함수·같은 프레임으로 센다 —
   * 재료 선택 점검의 불균형 비율이 성적서 3절과 같아진다. 이 키가 생기기 전 백엔드와, 프레임을
   * 만들지 못한 응답(필수 컬럼 누락 등)에는 없다.
   */
  class_distribution?: Record<string, number> | null;
}
