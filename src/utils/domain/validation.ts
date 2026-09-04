/**
 * 평가 데이터 유효성 검사 규칙
 *
 * 이 모듈은 워크플로우 전반(특히 Step 3 Metric Detail Input)에서 사용되는 핵심 유효성 검사
 * 로직을 포함합니다. 다양한 숫자 입력값(target value, beta 등)에 대한 허용 범위,
 * 검증 규칙 및 파싱(parsing) 로직을 정의합니다.
 */
/**
 * Parse a string to a number, returning null for empty or invalid values.
 */
export function parseNumericValue(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Get the validation rule for a metric target value based on its internal ID.
 * Returns the range description and a validate function.
 */
export function getTargetValueRule(metricId: string): { summary: string; validate: (value: number) => string | null } {
  const zeroToOneIds = new Set([
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M7",
    "M8",
    "M9",
    "M10",
    "M11",
    "M12",
    "M13",
    "M15",
    "M16",
    "M17",
    "M22",
  ]);

  const nonNegativeIds = new Set(["M6", "M14", "M18", "M19"]);

  if (zeroToOneIds.has(metricId)) {
    return {
      summary: "Enter a number between 0 and 1.",
      validate: (value) => (value < 0 || value > 1 ? "Target value must be between 0 and 1 for this metric." : null),
    };
  }

  if (nonNegativeIds.has(metricId)) {
    return {
      summary: "Enter a number greater than or equal to 0.",
      validate: (value) => (value < 0 ? "Target value must be 0 or greater for this metric." : null),
    };
  }

  if (metricId === "M20") {
    return {
      summary: "Enter a number between -1 and 1.",
      validate: (value) => (value < -1 || value > 1 ? "Target value must be between -1 and 1 for MCC." : null),
    };
  }

  if (metricId === "M23") {
    return {
      summary: "Enter a number greater than or equal to 1.",
      validate: (value) => (value < 1 ? "Target value must be 1 or greater for imbalance ratio." : null),
    };
  }

  return {
    summary: "Enter a valid numeric target value.",
    validate: () => null,
  };
}

/**
 * 단일 숫자 판정 기준이 필요한 메트릭인지 확인합니다.
 *
 * M21(Confusion Matrix)·M22(Class별 Metric)는 단일 숫자가 아니라 표/행렬을 산출하는
 * 정보성 항목이라 타겟값을 받지 않습니다. 이 둘은 백엔드가 dict 를 반환하는데,
 * 성적서 변환 계층은 대표 숫자를 뽑지 못해 값 0 으로 둡니다. 그 상태에서 타겟값을
 * 받으면 "0 < 기준" 이 되어 항상 미달로 집계되고, 종합판정이 절대 PASS 가 될 수
 * 없게 됩니다(두 지표 모두 추천 지표 세트에 포함되어 기본 경로에서 발생).
 * 표시 계층(MetricRow)도 이 둘을 "시각화 참조"로 렌더하므로 화면상 드러나지도 않습니다.
 */
export function metricNeedsTargetValue(metricId: string): boolean {
  return metricId !== "M21" && metricId !== "M22";
}
