/**
 * 백엔드 `/api/validate-data` 응답(ValidateDataResponseData) → 리포트 데이터 매핑.
 *
 * 검증 페이지(Step 6)에서 받은 실제 전처리 검증 결과를 성적서 6절(시험 결과)의
 * `dataValidation`(검증 상세) 및 `validationSummary`(수행 요약 수치)로 변환한다.
 * 검증을 수행하지 않았으면 빈 배열을 돌려주고 섹션이 "검증 미수행"으로 안내한다 —
 * 채워 넣을 기본값(MOCK)은 없다(ISSUES.md H-11).
 */
import type { ValidationResult, ValidationSummary } from "../../types/finalReport.types";
import type { ValidateDataResponseData } from "../../types/validation.types";

/** 백엔드 검증 항목명(영문) → 성적서 한글 라벨 */
const CHECK_NAME_KO: Record<string, string> = {
  "Missing required column": "필수 컬럼 누락",
  "Missing value": "누락값(NaN)",
  "Duplicate ID": "중복 ID",
  "Class mismatch": "클래스 불일치",
  "Excluded samples": "제외된 샘플 수",
  "Score range error": "score 범위 오류",
  "Binary class system error": "이진 클래스 체계 오류",
  "Probability range error": "확률값 범위 오류",
  "Probability sum error": "확률합 오류",
  "Argmax and y_pred mismatch": "Argmax–y_pred 불일치",
  "Unknown class detected": "미확인 클래스 감지",
  "Label format mismatch": "레이블 형식 오류",
  "Latency non-numeric values": "지연시간 비숫자 값",
  "Latency negative values": "지연시간 음수 값",
  "Latency statistics (ms)": "지연시간 통계 (ms)",
};

/** 백엔드 결과 문자열(영문) → 한글 표기 정규화 */
function normalizeResult(result: string): string {
  if (!result || result === "None") return "없음";
  return result
    .replace(/\brows?\b/g, "건")
    .replace(/\bout of\b/g, "— 허용 범위 벗어남:")
    .replace(/\bsampled first\b/gi, "표본 상위")
    .replace(/\bExpected\b/g, "기대")
    .replace(/\bfound\b/g, "발견")
    .replace(/\bclasses\b/g, "클래스")
    .replace(/\bPred has unknown classes:\b/g, "예측에 미정의 클래스 존재:");
}

const STATUS_MAP: Record<string, ValidationResult["status"]> = {
  pass: "pass",
  warning: "warning",
  error: "fail",
};

/** execution_summary 에서 라벨로 정수값(예: "1,234 rows" → 1234)을 추출 */
function parseSummaryValue(
  vr: ValidateDataResponseData,
  label: string,
): number | null {
  const item = vr.execution_summary.find((s) => s.label === label);
  if (!item) return null;
  const num = Number(String(item.value).replace(/[^0-9]/g, ""));
  return Number.isFinite(num) ? num : null;
}

export interface MappedValidationResult {
  dataValidation: ValidationResult[];
  summary: ValidationSummary;
}

export function mapValidationResultToReport(
  vr: ValidateDataResponseData,
  fallbackTotal: number,
): MappedValidationResult {
  const dataValidation: ValidationResult[] = vr.validation_details.map((item) => ({
    checkName: CHECK_NAME_KO[item.name] ?? item.name,
    status: STATUS_MAP[item.status] ?? "warning",
    detail: normalizeResult(item.result),
    group: item.group,
  }));

  const totalRows = parseSummaryValue(vr, "Total validated rows") ?? fallbackTotal;
  const validRows = parseSummaryValue(vr, "Valid prediction rows") ?? totalRows;
  const excludedRows =
    parseSummaryValue(vr, "Excluded samples") ?? Math.max(0, totalRows - validRows);

  return {
    dataValidation,
    summary: { totalRows, validRows, excludedRows },
  };
}
