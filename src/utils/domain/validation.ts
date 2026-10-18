import type { MetricDetailState } from "../../types/workflow.types";

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
      summary: "0과 1 사이의 숫자를 넣으세요.",
      validate: (value) => (value < 0 || value > 1 ? "이 지표의 목표값은 0과 1 사이여야 합니다." : null),
    };
  }

  if (nonNegativeIds.has(metricId)) {
    return {
      summary: "0 이상의 숫자를 넣으세요.",
      validate: (value) => (value < 0 ? "이 지표의 목표값은 0 이상이어야 합니다." : null),
    };
  }

  if (metricId === "M20") {
    return {
      summary: "-1과 1 사이의 숫자를 넣으세요.",
      validate: (value) => (value < -1 || value > 1 ? "MCC 의 목표값은 -1과 1 사이여야 합니다." : null),
    };
  }

  if (metricId === "M23") {
    return {
      summary: "1 이상의 숫자를 넣으세요.",
      validate: (value) => (value < 1 ? "불균형 비율의 목표값은 1 이상이어야 합니다." : null),
    };
  }

  return {
    summary: "목표값을 숫자로 넣으세요.",
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

/**
 * 성적서·판정에 쓸 합격 목표값. 목표값이 없으면 `null` 이다.
 *
 * 비었거나, 숫자가 아니거나, 그 지표의 허용 범위(`getTargetValueRule`)를 벗어나면 목표값이 없는
 * 것으로 본다. 정보성 지표(M21·M22)는 늘 `null` 이다.
 *
 * 종전에는 "목표값 없음"을 0 으로 나타내고 `> 0` 만 판정했다. 그래서 MCC(−1~1)처럼 0 이나
 * 음수가 정상인 목표가 판정에서 조용히 빠졌다(재료 목록 7절 "지표별 허용 범위 검사").
 */
export function resolveTargetValue(metricId: string, raw: string | undefined): number | null {
  if (!metricNeedsTargetValue(metricId)) return null;
  const value = parseNumericValue(raw ?? "");
  if (value === null) return null;
  return getTargetValueRule(metricId).validate(value) === null ? value : null;
}

/**
 * Fβ(M5)의 β. 입력이 비었으면 1.0 이다 — 평가 요청과 재료 선택 점검(2번 줄: β > 1 이면 재현율 쪽,
 * β < 1 이면 정밀도 쪽)이 이 함수 하나로 같은 값을 쓴다. 숫자가 아니면 NaN 이 그대로 나온다
 * (지표 화면이 그 값을 막는다).
 */
export function resolveBeta(metricDetails: Record<string, { beta?: string } | undefined> | null | undefined): number {
  return parseFloat(metricDetails?.["M5"]?.beta || DEFAULT_BETA);
}

/**
 * Fβ(M5)의 β 기본값. β 칸의 처음 값, 저장값이 없을 때의 화면 표시, 평가 요청이 모두 이 하나를 쓴다.
 * 종전에는 목표값을 β 보다 먼저 적으면 M5 줄이 `beta: ""` 로 만들어져 β 칸이 비고 "다음"이 잠겼다(B3).
 */
export const DEFAULT_BETA = "1.0";

/** β 입력이 쓸 수 있는 값인가(0 보다 큰 숫자). 지표 화면과 검증 화면의 1층 재확인이 같은 규칙을 쓴다. */
export function isBetaValid(raw: string | undefined): boolean {
  const beta = raw ?? DEFAULT_BETA;
  return beta.trim() !== "" && Number.isFinite(Number(beta)) && Number(beta) > 0;
}

/**
 * 지표 하나의 처음 상세 값. β 칸과 목표값 칸 중 어느 쪽을 먼저 적어도 이 함수로 줄을 만든다 —
 * Fβ(M5)는 β 가 `DEFAULT_BETA` 로 시작한다. 다른 지표의 β 는 쓰이지 않아 비워 둔다.
 */
export function newMetricDetail(id: string, name: string): MetricDetailState {
  return {
    id,
    name,
    description: "",
    targetValue: "",
    beta: id === "M5" ? DEFAULT_BETA : "",
    positiveClass: "",
    completed: false,
  };
}
