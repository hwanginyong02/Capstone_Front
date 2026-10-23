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

/**
 * 백엔드 검증 항목명(영문) → 성적서·검증 화면의 한글 이름. 백엔드가 내는 이름은 모두 여기 있어야 한다 —
 * 테스트가 `Capstone_Back/app/analysis/validation_checks.py` 의 `name="…"` 와 `*_CHECK = "…"` 상수 정의를
 * 모아 대조한다(새 항목은 상수를 `name=` 에 넘기므로 리터럴만 모으면 놓친다).
 */
export const CHECK_NAME_KO: Readonly<Record<string, string>> = {
  "Invalid role for task type": "유형에 맞지 않는 역할",
  "Same column for true/pred": "정답·예측 같은 컬럼",
  "Column mapped to multiple roles": "한 컬럼에 여러 역할",
  "Empty dataset (no data rows)": "빈 데이터(행 없음)",
  "Missing required column": "필수 컬럼 누락",
  "Missing value": "누락값(NaN)",
  "Duplicate ID": "중복 ID",
  "Class mismatch": "클래스 불일치",
  // S2 — 앞뒤 공백·숫자 표기만 다른 정답·예측 라벨을 평가가 같은 클래스로 합친다(결과 칸은 한국어 문구).
  "Label notation": "라벨 표기 맞춤",
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
  // M3 — 확률 컬럼 이름으로 클래스·레이블을 확정할 수 없음(평가 단계의 400 을 검증에서 미리 막는다).
  "Probability column names": "확률 컬럼 이름",
  // M4 — 지연시간 값이 모두 1 미만이라 초 단위로 적은 것 같음(경고만).
  "Latency unit": "지연시간 단위",
};

/**
 * 결과 칸이 이미 한국어 문구로 오는 항목 — 영문 낱말 바꾸기(`normalizeResult`)를 하지 않고 그대로 싣는다.
 * "Label notation" 은 "정답 ' cat' → 'cat'" 처럼 클래스 이름이 들어 있다(이름에 rows·classes 가 올 수 있다).
 * "Probability column names" 의 결과는 평가 단계 400 과 같은 한국어 문구이고, 컬럼·클래스 이름이 들어
 * 있어("rows" 같은 이름도 올 수 있다) 바꾸면 이름이 망가진다.
 */
const KOREAN_RESULT_CHECKS: ReadonlySet<string> = new Set(["Probability column names", "Label notation"]);

/** 검증 항목명의 한글 이름. 표에 없는 이름은 그대로 돌려준다. 검증 화면도 이 표를 쓴다. */
export function checkNameKo(name: string): string {
  return CHECK_NAME_KO[name] ?? name;
}

/**
 * 검증 항목 하나의 결과 칸 글 — 성적서 6절과 검증 화면이 같이 쓴다(판정 지점 하나). 한국어 문구 항목은 그대로 두되
 * 통과("None")는 "없음"으로, 나머지는 영문 낱말을 바꾼다(`normalizeResult`). 종전 검증 화면은 "None" 을 날것으로 보였다.
 */
export function validationResultText(item: { name: string; result: string }): string {
  // 한국어 문구 항목도 통과("None")는 "없음"으로 — 바꾸기를 건너뛰면 성적서에 "None" 이 찍혔다(S2 검토).
  return KOREAN_RESULT_CHECKS.has(item.name) && item.result !== "None" ? item.result : normalizeResult(item.result);
}

/** 실행 요약 칸 이름(백엔드 `validation_service` 의 고정 다섯 개) → 검증 화면의 한글 이름. 모르는 이름은 그대로. */
const SUMMARY_LABEL_KO: Record<string, string> = {
  "Total validated rows": "검증한 전체 행",
  "Valid prediction rows": "평가에 쓸 행",
  "Excluded samples": "제외한 행",
  "Selected metric count": "선택한 지표 수",
  "Validation result": "검증 결과",
};

/** 실행 요약 한 줄의 한글 이름과 값("1,234 rows" → "1,234건", "Errors 0 / Warnings 2" → "오류 0 / 경고 2"). */
export function summaryItemKo(item: { label: string; value: string }): { label: string; value: string } {
  const value = String(item.value)
    .replace(/^([\d,]+) rows?$/, "$1건")
    .replace(/^([\d,]+) items?$/, "$1개")
    .replace(/^Errors (\d+) \/ Warnings (\d+)$/, "오류 $1 / 경고 $2");
  return { label: SUMMARY_LABEL_KO[item.label] ?? item.label, value };
}

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
    detail: validationResultText(item),
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
