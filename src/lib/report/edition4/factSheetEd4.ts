/**
 * 판 4 사실 시트의 칸(공통 계약 `fact_sheet_contract_ed4.json`) 중 지표 줄·불균형 영향 표시값과, 평가 응답의 판 4 최상위 칸
 * (파일 해시·크기, 평가 엔진 버전)을 읽는 곳.
 *
 * - 지표 줄: `near_target` 은 판 4 뜻(판정 여유 "작음" — 저장된 `KpiResult.judgmentMargin` 하나만 읽는다, 다시 계산하지 않음),
 *   `ci_contains_target` 은 반올림 전 경계로(`ciContainsTarget` — 판정 여유와 같은 함수라 불변식 near_target == ci_contains_target
 *   이 한 곳에서 지켜진다), `margin_text` 는 판 4 표기, 판 4 전용 `ci_low_text`·`ci_high_text` 는 4.3 표와 같은 경계 표기.
 * - 불균형 영향 `display`: 엔진이 넷째 자리로 찍은 글자를 반올림 전 값(S1 `*_raw`)에서 판 4 표기로 다시 찍는다. 칸 집합은 판 3
 *   요청과 같다(엔진이 싣지 않은 칸은 판 4 에서도 없다 — 계약 "판 4 요청의 키 집합 = 판 3 + 판 4 전용").
 */
import type { ImbalanceEffect, KpiResult } from "../../../types/finalReport.types";
import { isJudged } from "../computeVerdict";
import { difference } from "../judgedNumber";
import { imbalanceRatioTextEd4 } from "./distributionEd4";
import { ed4CiBound, ed4Judged } from "./edition4Number";
import { sameValueTextEd4 } from "./sameValueEd4";
import { ciContainsTarget } from "./judgmentMargin";

/** 지표 한 줄의 판 4 칸 — 판 3 칸을 덮는 셋과 판 4 전용 둘. */
export interface MetricFieldsEd4 {
  near_target: boolean;
  margin_text: string | null;
  ci_contains_target: boolean | null;
  ci_low_text: string | null;
  ci_high_text: string | null;
}

/** 4.3·사실 시트가 쓰는 신뢰구간 경계 — 반올림 전 값(`ciRaw`)이 있으면 그것, 없으면(옛 응답) 넷째 자리 경계. */
export function intervalBoundsEd4(r: KpiResult): { low: number; high: number } | null {
  if (!r.ci || !isJudged(r)) return null;
  return r.ciRaw ?? { low: r.ci.low, high: r.ci.high };
}

export function metricFieldsEd4(r: KpiResult, margin: number | null): MetricFieldsEd4 {
  const bounds = intervalBoundsEd4(r);
  const target = r.threshold;
  return {
    near_target: r.judgmentMargin === "small",
    margin_text: margin === null ? null : ed4Judged(margin, 0, true, r.status === "pass"),
    ci_contains_target: bounds && target !== null ? ciContainsTarget(bounds.low, bounds.high, target) : null,
    ci_low_text: bounds && target !== null ? ed4CiBound(bounds.low, target) : null,
    ci_high_text: bounds && target !== null ? ed4CiBound(bounds.high, target) : null,
  };
}

/** 평가 응답 `imbalance_effect` 의 반올림 전 값(S1 `*_raw`). 없는 칸은 넷째 자리 칸으로 대신한다. */
export interface ImbalanceRawEd4 {
  imbalance_ratio: number;
  accuracy_minus_macro_f1: number | null;
  majority_minus_minority_f1: number;
  accuracy: number | null;
  macro_f1: number | null;
  majority_f1: number | null;
  minority_f1: number | null;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 판 3 파서(`parseImbalanceEffect`)가 읽은 값이 있을 때만 — 반올림 전 칸을 그 위에 얹는다. */
export function parseImbalanceRawEd4(raw: unknown, ed3: ImbalanceEffect | null): ImbalanceRawEd4 | null {
  if (!ed3 || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const pick = (key: string, fallback: number | null | undefined) => finite(r[`${key}_raw`]) ?? fallback ?? null;
  return {
    imbalance_ratio: pick("imbalance_ratio", ed3.imbalance_ratio)!,
    accuracy_minus_macro_f1: ed3.accuracy_minus_macro_f1 === null ? null : pick("accuracy_minus_macro_f1", ed3.accuracy_minus_macro_f1),
    majority_minus_minority_f1: pick("majority_minus_minority_f1", ed3.majority_minus_minority_f1)!,
    accuracy: pick("accuracy", ed3.accuracy),
    macro_f1: pick("macro_f1", ed3.macro_f1),
    majority_f1: pick("majority_f1", ed3.majority_f1),
    minority_f1: pick("minority_f1", ed3.minority_f1),
  };
}

/** 차이 둘의 기준(서술 설계 D20 — 0.1 이상이면 왜곡). */
const IMBALANCE_GAP_MIN = 0.1;

/**
 * 불균형 영향을 판 4 표기로. 판정 칸(level 등)과 숫자 칸은 그대로 두고 `display` 의 글자만 바꾼다 — 비율은
 * judged(1.5, 충족 = level ≠ mild), 두 차이는 judged(0.1, 충족 = 원값 ≥ 0.1, 부호 그대로), 네 값은 plain. 다만 네 값 중 판정 대상
 * 지표(`kpiResults`)와 같은 원값은 그 지표의 value_text(D2 — Accuracy 가 판정 대상이면 accuracy 칸은 4.3 과 같은 글자).
 */
export function imbalanceEffectEd4(
  effect: ImbalanceEffect,
  raw: ImbalanceRawEd4 | null,
  kpiResults: KpiResult[] = [],
): ImbalanceEffect {
  if (!effect.display || !raw) return effect;
  const gap = (v: number) => ed4Judged(v, IMBALANCE_GAP_MIN, true, difference(v, IMBALANCE_GAP_MIN) >= 0);
  const display: NonNullable<ImbalanceEffect["display"]> = { ...effect.display };
  display.imbalance_ratio = imbalanceRatioTextEd4(raw.imbalance_ratio, effect);
  display.accuracy_minus_macro_f1 =
    display.accuracy_minus_macro_f1 === null || raw.accuracy_minus_macro_f1 === null ? null : gap(raw.accuracy_minus_macro_f1);
  display.majority_minus_minority_f1 = gap(raw.majority_minus_minority_f1);
  // 네 값은 판 3 칸에 글자가 있을 때만 바꾼다(없거나 null 인 칸은 그대로 — 칸 집합이 판 3 과 같게).
  for (const key of ["accuracy", "macro_f1", "majority_f1", "minority_f1"] as const) {
    const value = raw[key];
    if (typeof display[key] === "string" && value !== null) display[key] = sameValueTextEd4(kpiResults, value);
  }
  return { ...effect, display };
}

/** 2.2 파일 해시·크기(평가 응답 `source_file`, 백엔드가 업로드 원본 바이트로 계산). 모양이 틀리면 null(그릴 때 "—"). */
export function parseSourceFile(raw: unknown): { sha256: string; sizeBytes: number } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { sha256, size_bytes: size } = raw as Record<string, unknown>;
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 0) return null;
  return { sha256, sizeBytes: size };
}

/** 3.5 평가 엔진 버전(평가 응답 `engine_version`, 백엔드 상수). 문자열이 아니거나 비었으면 null(그릴 때 "—"). */
export function parseEngineVersion(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}
