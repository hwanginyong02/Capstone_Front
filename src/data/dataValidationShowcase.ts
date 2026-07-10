/**
 * 데이터 검증(Step 6) showcase 모드용 정적 목(mock) 데이터.
 *
 * URL 쿼리 ?showcase=1 로 진입한 경우 실제 /api/validate-data 호출 대신 이 데이터를
 * 사용해 화면을 시연한다. useDataValidation 훅에서 참조한다.
 */
import type { ValidateDataResponseData } from "../types/validation.types";

export const DATA_VALIDATION_SHOWCASE: ValidateDataResponseData = {
  task_type: "binary",
  selected_metric_ids: ["M1", "M2"],
  execution_summary: [
    { label: "총 샘플 수", value: "1,200", note: "건" },
    { label: "결측치 처리", value: "0", note: "건" },
  ],
  validation_details: [
    {
      name: "필수 컬럼 검사",
      result: "모든 필수 컬럼이 존재합니다.",
      handling: "통과",
      status: "pass",
      group: "common",
    },
    {
      name: "레이블 형식",
      result: "이진 분류 레이블 형식이 올바릅니다.",
      handling: "통과",
      status: "pass",
      group: "binary",
    },
  ],
  error_count: 0,
  warning_count: 0,
};
