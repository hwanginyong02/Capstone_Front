/**
 * 판 4 4.1~4.3(갈래 b3) 전용 문구 — 출처 순서는 계획 정해진 것 1(고정 문구 → 예시본 글자 → 판 3 글(부록 A 치환) → 부록 B).
 * 고정 문구 19(`FIXED_19_NOTE`)·부록 B9~B14·B5·판정 이름(`VERDICT_LABEL_ED4`)·판정 여유(`JUDGMENT_MARGIN_LABEL`)는 공용
 * `edition4Text.ts` 에 있어 여기 다시 두지 않는다. 여기는 그 밖의 예시본 글자와 판 3 글(부록 A 치환)만 둔다.
 */
import { TASK_TYPE_LABELS_KO } from "../../../../data/evaluationData";
import type { ValidationGroup } from "../../../../types/validation.types";

/* ---------------- 4.1 데이터 점검 — 예시본 4.1 글자 그대로 ---------------- */

/** 요약 표 머리 행(예시본 "항목 | 값 | 비고"). */
export const EX_4_1_SUMMARY_COLUMNS = ["항목", "값", "비고"] as const;
/** 요약 표 줄 이름. "총 평가 건수"는 판 3 "총 검증 수행 건수"의 부록 A7 치환과 같은 글자. */
export const EX_4_1_TOTAL = "총 평가 건수";
export const EX_4_1_VALID = "유효 예측 건수";
export const EX_4_1_EXCLUDED = "제외된 샘플 수";
export const EX_4_1_RESULT = "데이터 검증 결과";
/** 요약 표 비고 열(예시본 글자). */
export const EX_4_1_TOTAL_NOTE = "업로드 데이터 전체 행(row) 수 = 고유 ID 수";
export const EX_4_1_VALID_NOTE = "누락값·오류 제외 후 실제 metric 산출에 사용된 건수";
export const EX_4_1_EXCLUDED_NOTE = "누락값/오류로 인해 평가에서 제외된 건수";
export const EX_4_1_RESULT_NOTE = "항목별 결과는 아래 표";
/** 건수 칸("171건") — `{n}` 은 천 단위 쉼표를 넣은 글자. */
export const EX_4_1_COUNT = "{n}건";
/** 데이터 검증 결과 칸(예시본 "오류 0건 / 경고 0건"). */
export const EX_4_1_RESULT_VALUE = "오류 {fail}건 / 경고 {warning}건";

/** 묶음 표 머리 행(예시본 "검증 항목 | 결과 | 상세 내역"). */
export const EX_4_1_GROUP_COLUMNS = ["검증 항목", "결과", "상세 내역"] as const;

/**
 * 묶음 이름과 적용 설명 — 판 3 `DataValidationSection` 의 `GROUP_META`(비공개라 복사, 판 3 파일 동결). 예시본의
 * "공통 검증 항목 — 모든 분류 유형에 공통 적용", "이진 분류 검증 항목 — 분류 유형이 이진 분류인 경우 적용" 과 같은 글자다.
 */
export const GROUP_META_ED4: Record<ValidationGroup, { label: string; description: string }> = {
  common: { label: "공통 검증 항목", description: "모든 분류 유형에 공통 적용" },
  multiclass: {
    label: `${TASK_TYPE_LABELS_KO.multiclass} 검증 항목`,
    description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multiclass}인 경우 적용`,
  },
  binary: { label: `${TASK_TYPE_LABELS_KO.binary} 검증 항목`, description: `분류 유형이 ${TASK_TYPE_LABELS_KO.binary}인 경우 적용` },
  multilabel: {
    label: `${TASK_TYPE_LABELS_KO.multilabel} 검증 항목`,
    description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multilabel}인 경우 적용`,
  },
  latency: { label: "응답시간 검증 항목", description: "응답시간(latency) 컬럼이 있는 경우 적용" },
};
/** 묶음 순서 — 판 3 `GROUP_ORDER` 와 같다. */
export const GROUP_ORDER_ED4: ReadonlyArray<ValidationGroup> = ["common", "multiclass", "binary", "multilabel", "latency"];

/** 검증 항목 결과 칸 — 판 3 `STATUS_CONFIG` 의 글자(아이콘 없이). */
export const VALIDATION_STATUS_ED4: Record<"pass" | "warning" | "fail", string> = { pass: "통과", warning: "경고", fail: "오류" };

/** 검증 결과가 하나도 없을 때(검증 단계를 건너뛴 평가) — 판 3 6.0.1 안내 글 그대로(부록 A 치환 대상 낱말 없음). */
export const V3_NO_VALIDATION = "데이터 검증 결과가 없습니다. (검증 단계를 수행한 평가에서만 표시됩니다.)";

/** A7 "N/A" → "해당 없음". */
export const A7_NOT_APPLICABLE = "해당 없음";

/* ---------------- 4.2 종합 판정 — 예시본 4.2 표 머리 ---------------- */
export const EX_4_2_COLUMNS = ["종합 판정", "판정 대상 지표 중 충족"] as const;

/* ---------------- 4.3 지표별 결과 — 고정 문구 19 의 표 머리(예시본 글자) ---------------- */
export const EX_4_3_COLUMNS = ["Metric ID", "시험항목", "산출 결과", "95% 신뢰구간", "합격 기준", "판정", "판정 여유"] as const;
/** 핵심 지표 이름 뒤 표시(예시본 "Recall (핵심)"). */
export const EX_4_3_CORE_SUFFIX = " (핵심)";
/** 판정 칸(예시본 "합격", 대응표 10·17 — 이모지 없는 글자). 미달은 판 4 판정 규칙(고정 문구 10)의 낱말. */
export const VERDICT_CELL_PASS = "합격";
export const VERDICT_CELL_FAIL = "미달";
/** 신뢰구간 칸(예시본 "[0.9497, 0.994]"). */
export const EX_4_3_CI = "[{low}, {high}]";

/** M22 클래스별 표·M11~M13 세부 표 — 판 3 6.2 의 표 제목·머리 글자 그대로(계획 4절 "판 3 표 제목 그대로"). */
export const V3_CLASS_REPORT_TITLE = "M22 — Class-wise Metric (클래스별 세부 성능)";
export const V3_CLASS_REPORT_COLUMNS = ["클래스", "Precision", "Recall", "F1", "표본 수"] as const;
export const V3_SUB_METRICS_TITLE = "Average 지표 세부 결과 (M11 / M12 / M13)";
export const V3_SUB_METRIC_HEAD = "{id} — {name}";
export const V3_SUB_METRIC_COLUMNS = ["Metric", "값"] as const;
export const V3_SUB_METRIC_ROWS = ["Precision", "Recall", "F1 Score"] as const;
