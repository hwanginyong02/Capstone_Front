/**
 * 경계·확신 오류 비율 — 백엔드 `success_metrics.error_ratios` 를 읽고 7.1 문장을 만든다(서술 설계 D30,
 * 재료 목록 9절).
 *
 * - 경계 오류: 결정 임계값에서 0.1 안쪽으로 빗나간 오분류. 다중은 정의에 임계값이 없어 예측·정답 클래스
 *   확률 차가 0.1 미만인 오분류다.
 * - 확신 오류: 틀린 쪽 확률이 0.9 이상인 오분류. 다중은 예측 클래스 확률이 0.9 이상.
 * - 분모는 확률이 있는 오분류다. 멀티레이블은 "틀린 레이블 칸" 단위로 센다.
 * - 예측값을 직접 제출하면 임계값을 알 수 없어 경계 오류는 계산하지 않는다 — 그 사실을 문장에 적는다.
 *
 * 수치 판정은 백엔드 한 곳에서 한다. 여기서는 실려 온 값을 의심하며 읽고(모양이 틀리면 null),
 * 문장으로 옮기기만 한다. 문장은 생성 때 한 번 만들어 성적서 데이터에 저장한다.
 */
import type { TaskType } from "../../data/evaluationData";
import type { ErrorRatioCount, ErrorRatios } from "../../types/finalReport.types";
import { ed4Count } from "./edition4/edition4Number";

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function countOf(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

function toCount(raw: unknown): ErrorRatioCount | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const count = countOf(value.count);
  if (count === null) return null;
  if (value.ratio === null) return { count, ratio: null };
  const ratio = finite(value.ratio);
  if (ratio === null || ratio < 0 || ratio > 1) return null;
  return { count, ratio };
}

function toThreshold(raw: unknown): ErrorRatios["threshold"] | undefined {
  if (raw === null || raw === undefined) return null;
  if (finite(raw) !== null) return raw as number;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length > 0 && entries.every(([, v]) => finite(v) !== null)) {
      return Object.fromEntries(entries) as Record<string, number>;
    }
  }
  return undefined;
}

/** 응답의 error_ratios 를 읽는다. 키가 없거나 모양이 하나라도 틀리면 null(문장을 찍지 않는다). */
export function parseErrorRatios(raw: unknown): ErrorRatios | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;

  const unit = value.unit === "sample" || value.unit === "label_cell" ? value.unit : null;
  const misclassified = countOf(value.misclassified);
  const confident = toCount(value.confident);
  const boundary = value.boundary === null ? null : toCount(value.boundary);
  const boundaryMargin = finite(value.boundary_margin);
  const confidentLevel = finite(value.confident_level);
  const threshold = toThreshold(value.threshold);
  if (
    unit === null ||
    misclassified === null ||
    confident === null ||
    (value.boundary !== null && boundary === null) ||
    boundaryMargin === null ||
    confidentLevel === null ||
    threshold === undefined
  ) {
    return null;
  }

  return {
    unit,
    misclassified,
    boundary,
    // 경계 오류가 있으면 이유도 없다. 모르는 이유 값은 버린다.
    boundary_note: boundary === null && value.boundary_note === "threshold_unknown" ? "threshold_unknown" : null,
    confident,
    boundary_margin: boundaryMargin,
    confident_level: confidentLevel,
    threshold,
  };
}

/** 성적서 지표 표와 같은 백분율 표기(소수 1자리). */
function percent(ratio: number | null): string {
  return ratio === null ? "" : `(${(ratio * 100).toFixed(1)}%)`;
}

/** 이진·멀티레이블 경계의 임계값 표기 — 레이블마다 다르면 "레이블별 결정 임계값". */
function thresholdPhrase(threshold: ErrorRatios["threshold"]): string {
  if (typeof threshold === "number") return `결정 임계값 ${threshold}`;
  if (threshold && typeof threshold === "object") {
    const values = [...new Set(Object.values(threshold))];
    return values.length === 1 ? `결정 임계값 ${values[0]}` : "레이블별 결정 임계값";
  }
  return "결정 임계값";
}

/**
 * 7.1 에 찍는 한 문장(결정적). 예:
 * "확률이 있는 오분류 12건 중 경계 오류(확률과 결정 임계값 0.5의 차가 0.1 미만)는 5건(41.7%),
 *  확신 오류(틀린 쪽 확률 0.9 이상)는 2건(16.7%)이다."
 */
export function errorRatioSentence(ratios: ErrorRatios, taskType: TaskType, options: { edition4?: boolean } = {}): string {
  const labelCell = ratios.unit === "label_cell";
  // 판 4 는 건수에 천 단위 쉼표(S6 뒤 사용자 결정 4 — "틀린 레이블 칸 2,687개"). 판 3 은 그대로(얼린 출력).
  const n = (count: number) => (options.edition4 ? ed4Count(count) : String(count));
  const counter = labelCell ? "개" : "건";

  if (ratios.misclassified === 0) {
    return labelCell
      ? "확률이 있는 틀린 레이블 칸이 없어 경계·확신 오류 비율은 계산하지 않았다."
      : "확률이 있는 오분류가 없어 경계·확신 오류 비율은 계산하지 않았다.";
  }

  // 다중은 임계값 없이 예측·정답 클래스 확률 차로 경계를 본다(설계 D30).
  const multiclass = taskType === "multiclass";
  const margin = ratios.boundary_margin;
  const level = ratios.confident_level;
  const subject = labelCell ? "틀린 레이블 칸" : "오분류";
  const head = `확률이 있는 ${subject} ${n(ratios.misclassified)}${counter} 중 `;

  const confidentRule = multiclass ? `예측 클래스 확률 ${level} 이상` : `틀린 쪽 확률 ${level} 이상`;
  const confident = `확신 오류(${confidentRule})는 ${n(ratios.confident.count)}${counter}${percent(ratios.confident.ratio)}`;

  if (ratios.boundary === null) {
    const why =
      ratios.boundary_note === "threshold_unknown"
        ? "경계 오류는 예측값을 직접 제출해 결정 임계값을 알 수 없어 계산하지 않았다."
        : "경계 오류는 계산하지 않았다.";
    return `${head}${confident}이다. ${why}`;
  }

  const boundaryRule = multiclass
    ? `예측·정답 클래스 확률 차가 ${margin} 미만`
    : `확률과 ${thresholdPhrase(ratios.threshold)}의 차가 ${margin} 미만`;
  const boundary = `경계 오류(${boundaryRule})는 ${n(ratios.boundary.count)}${counter}${percent(ratios.boundary.ratio)}`;
  return `${head}${boundary}, ${confident}이다.`;
}
