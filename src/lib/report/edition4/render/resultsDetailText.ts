/**
 * 판 4 4.4~4.8(시험 결과 뒷부분) 문구 — 갈래 b4 전용 상수. 출처 순서(판 4 라운드 계획 정해진 것 1)를 줄마다 적는다:
 * 고정 문구 → 예시본 글자 그대로 → 판 3 글(부록 A 치환만) → 부록 B. 공용 상수(`edition4Text.ts`)에 이미 있는 것
 * (`EX_4_4_*`, `B15`·`B16`·`B17`·`B33`, `FIXED_24_DISTRIBUTION`, `ED4_DASH`)은 다시 정의하지 않는다.
 */

/* ---------------- 4.4 오분류 ---------------- */

/** 예시본 4.4 표 위 소제목. */
export const EX_4_4_COUNTS_TITLE = "혼동 행렬 건수";
/** 예시본 4.4 건수 표 머리(이진). 다중·멀티는 첫 칸이 "클래스"(판 3 `ConfusionCountsTable` 과 같음). */
export const EX_4_4_COUNTS_HEAD_BINARY = "양성 클래스";
export const ED3_COUNTS_HEAD_PER_CLASS = "클래스";
export const EX_4_4_COUNTS_COLUMNS = ["TP", "TN", "FP", "FN"] as const;
/** 판 3 글(`ConfusionCountsTable` 표 아래, 다중·멀티) — 치환할 말 없음. */
export const ED3_COUNTS_PER_CLASS_NOTE = "클래스마다 그 클래스를 양성, 나머지를 음성으로 본 건수입니다.";

/** 예시본 "최약 클래스(F1 최저)" — 멀티레이블은 판 3 처럼 "레이블"({unit}). */
export const EX_4_4_WEAKEST_TITLE = "최약 {unit}(F1 최저)";
/** 예시본 최약 클래스 표 머리(첫 칸은 {unit}). */
export const EX_4_4_WEAKEST_COLUMNS = ["F1", "표본 수", "비율", "매크로 F1과의 차이", "작은 표본"] as const;
export const EX_4_4_YES = "예";
export const EX_4_4_NO = "아니오";
/** 예시본 최약 클래스 표 아래 설명 줄({unit} = 클래스·레이블 — 판 3 `WeakestClassTable` 과 같은 틀). */
export const EX_4_4_WEAKEST_NOTE = "매크로 F1과의 차이 = 매크로 F1 − 이 {unit}의 F1. 작은 표본은 표본 수 30건 미만 또는 전체의 5% 미만입니다.";
/** 판 3 글(`WeakestClassTable`, 멀티레이블 비율의 분모) — 설명 줄 뒤에 붙인다. 치환할 말 없음. */
export const ED3_WEAKEST_LABEL_BASIS_NOTE = " 비율은 전체 표본 수가 아니라 모든 레이블의 등장 횟수 합에 대한 비율입니다.";

/** 예시본 "예측 편향(예측 수 대 실제 수)". */
export const EX_4_4_BIAS_TITLE = "예측 편향(예측 수 대 실제 수)";
/** 예측 편향 표 첫 칸 머리 — 이진은 예시본 "양성 클래스", 다중·멀티는 판 3 `PredictionBiasTable` 글. */
export const BIAS_HEAD: Record<"positive_class" | "per_class" | "label_total", string> = {
  positive_class: "양성 클래스",
  per_class: "클래스",
  label_total: "대상",
};
export const EX_4_4_BIAS_COLUMNS = ["예측 수", "실제 수", "차이(예측 − 실제)"] as const;
/** 판 3 글 — 멀티레이블 예측 편향의 한 줄(레이블 총수). */
export const ED3_BIAS_ALL_LABELS = "전체 레이블";

/** 판 3 글(`ConfusionPairsTable`, 다중 클래스) — 예시본(이진)에 없는 표. */
export const ED3_PAIRS_TITLE = "최다 오분류 쌍(상위 {n})";
export const ED3_PAIRS_COLUMNS = ["실제 → 예측", "건수", "오분류 중 비율"] as const;

/** 예시본 "임계값 조정 여지" 와 첫 칸 머리 "지표". 두 칸 머리는 공용 `EX_4_4_CURRENT_THRESHOLD`·`EX_4_4_BEST_THRESHOLD`·`B15`. */
export const EX_4_4_THRESHOLD_TITLE = "임계값 조정 여지";
export const EX_4_4_THRESHOLD_METRIC_HEAD = "지표";

/* ---------------- 4.5 데이터 분포 ---------------- */

/** 고정 문구 7(멀티레이블, 4.5 불균형 비율 문장 앞) — 판 3 `MULTILABEL_IMBALANCE_DEFINITION` 과 같은 글자. */
export const FIXED_7_MULTILABEL_IMBALANCE = "다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다.";
/** 예시본 "학습·평가 클래스 비율" 과 표 머리. */
export const EX_4_5_TRAINING_TITLE = "학습·평가 클래스 비율";
export const EX_4_5_TRAINING_COLUMNS = ["클래스", "학습 비율", "평가 비율", "차이"] as const;

/* ---------------- 4.6 참조 범위 비교 ---------------- */

/** 예시본 4.6 표 머리. */
export const EX_4_6_COLUMNS = ["지표", "모델 값", "참조 범위", "위치", "목표값", "목표값 수준"] as const;
/**
 * 위치·목표값 수준(부록 A10 — 판 3 `ConclusionSection` 의 비공개 `TARGET_POSITION_LABEL` 복사, 판 3 파일은 동결).
 * 판 3 의 우수·범위 내·미흡은 쓰지 않는다.
 */
export const TARGET_POSITION_LABEL_ED4: Record<"below" | "within" | "above", string> = {
  below: "범위보다 낮음",
  within: "범위 안",
  above: "범위보다 높음",
};
/** 판 3 글(8.1 표 지표 칸 뒤, 낮을수록 좋은 지표). */
export const ED3_LOWER_IS_BETTER = "(낮을수록 좋음)";
/** 예시본 ※ 줄의 머리(뒤에 출처 글 — 서술 응답 benchmark_refs 의 source_note). */
export const EX_4_6_NOTE_PREFIX = "※ ";

/* ---------------- 4.7 곡선 ---------------- */

/** 예시본 4.7 두 줄의 앞부분(차트 부품의 제목·축 글을 한 줄로). 뒤에 " — AUROC: {값}". */
export const EX_4_7_ROC_TITLE = "ROC Curve (Y: true positive rate / X: false positive rate)";
export const EX_4_7_PR_TITLE = "Precision-Recall Curve (Y: precision / X: recall)";
export const EX_4_7_ROC_SCORE = " — AUROC: {value}";
export const EX_4_7_PR_SCORE = " — AUPRC: {value}";

/* ---------------- 4.8 응답시간 ---------------- */

/** 예시본 4.8(지연시간 없음). */
export const EX_4_8_NO_LATENCY = "제공되지 않음 — 응답시간(latency) 자료가 제공되지 않아 측정하지 않았다.";
/** 판 3 글(`LatencySection` 표) — 표 머리와 줄 이름. 치환할 말 없음. */
export const ED3_LATENCY_COLUMNS = ["항목", "값"] as const;
export const ED3_LATENCY_ROWS: ReadonlyArray<{ label: string; key: "mean" | "min" | "p50" | "p95" | "p99" | "max" }> = [
  { label: "평균 응답시간 (Mean Latency)", key: "mean" },
  { label: "최소 응답시간 (Min Latency)", key: "min" },
  { label: "P50 응답시간", key: "p50" },
  { label: "P95 응답시간", key: "p95" },
  { label: "P99 응답시간", key: "p99" },
  { label: "최대 응답시간 (Max Latency)", key: "max" },
];
