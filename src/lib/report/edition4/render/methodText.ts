/**
 * 판 4 3절 시험 방법(갈래 b2) 전용 문구 — 공용 `edition4Text.ts` 에 없는 글만 둔다. 출처 순서는 판 4 라운드 계획 정해진 것 1
 * (고정 문구 → 예시본 글자 → 판 3 글(부록 A 치환) → 부록 B). 공용 상수(고정 문구 10·23·25·26, B5·B7·B8)는 `edition4Text.ts` 에서
 * 그대로 import 한다 — 여기 다시 적지 않는다.
 */

/* ------------------------------------------------------------------ *
 * 3.1 의뢰자 요구사항
 * ------------------------------------------------------------------ */

/** 예시본 3.1 표 위 소제목 두 개. */
export const EX_3_1_DECLARATIONS_TITLE = "의뢰자 선언";
export const EX_3_1_CRITERIA_TITLE = "선택 지표와 합격 기준";
/** 예시본 3.1 "선택 지표와 합격 기준" 표 머리. */
export const EX_3_1_CRITERIA_COLUMNS = ["Metric ID", "시험항목", "합격 기준", "핵심 지표"] as const;
/** 예시본 3.1 핵심 지표 열 — 의뢰자 지정 핵심이면 "핵심", 아니면 "—"(기본값 핵심은 고정 문구 26 의 "핵심(기본값)"). */
export const EX_3_1_CORE_CELL = "핵심";
/**
 * 고정 문구 5(멀티레이블, 위치 3.1 — 판 3 은 5절) — "지표 선택 기준: {지표 선택 이유}". 판 3 `MetricListSection` 과 같은 글이고,
 * 이유 칸은 `materialRowText`(값 없으면 "제공되지 않음", 의뢰자 글은 "(의뢰자 제공: …)")로 채운다.
 */
export const FIXED_5_METRIC_RATIONALE = "지표 선택 기준: {지표 선택 이유}";
/** 부록 B5 — 3.1 에서 늘 참고 지표로 찍는 지표(M21 혼동 행렬·M22 클래스별 표). */
export const B5_REFERENCE_METRIC_IDS: ReadonlySet<string> = new Set(["M21", "M22"]);

/* ------------------------------------------------------------------ *
 * 3.2 시험항목과 산정식
 * ------------------------------------------------------------------ */

/** 예시본 3.2 머리 문장(판 3 "사용자가 선택한…"의 부록 A2 치환과 같은 글). */
export const EX_3_2_HEAD = "의뢰자가 선택한 시험항목에 대해서만 평가를 수행한다.";
/** 예시본 3.2 공통 묶음 이름 — {binary}·{multiclass}·{multilabel} 은 유형 이름(판 3 `MetricListSection` 과 같은 자리). */
export const EX_3_2_COMMON_GROUP = "공통 지표 ({binary} / {multiclass} / {multilabel} 모두 적용)";
/** 예시본 3.2 유형 전용 묶음 이름("이진 분류 전용 지표") — 판 3 `{taskTypeLabel} 전용 지표` 와 같은 꼴. */
export const EX_3_2_SPECIAL_GROUP = "{유형} 전용 지표";
/** 예시본 3.2 표 머리(대응표 11 — 열 이름 "시험목표", 합격 기준 줄 없음). */
export const EX_3_2_COLUMNS = ["Metric ID", "시험항목", "시험목표", "시험방법 및 산정식"] as const;

/* ------------------------------------------------------------------ *
 * 3.3 산출 기준
 * ------------------------------------------------------------------ */

/** 3.3 첫 항목 뒤 점수 컬럼 덧붙임(예시본 "… 산출하였습니다. (점수 컬럼: score_malignant)", 판 3 `DerivationNote` 와 같은 꼴). */
export const EX_3_3_SCORE_COLUMNS = " (점수 컬럼: {columns})";
/** 3.3 레이블별 결정 임계값 표 머리(판 3 `DerivationNote` 표 머리 그대로). */
export const ED3_PER_LABEL_COLUMNS = ["점수 컬럼", "결정 임계값"] as const;
/** 예시본 3.3 양성 클래스 문장(이진). */
export const EX_3_3_POSITIVE_CLASS = "본 시험성적서의 이진 분류 평가 지표는 의뢰자가 지정한 양성 클래스 {positive} 기준으로 산출되었습니다.";
/** 판 3 6.0 상자의 M6 줄(`KpiResultSection`) — 글자 그대로(치환할 낱말 없음, 이미 합니다체). */
export const ED3_M6_NOTE =
  "KL Divergence(M6) 지표는 예측 확률(Probability) 분포가 아닌, 정답 레이블과 모델이 예측한 클래스 레이블 간의 분포 차이(Target Drift)를 기반으로 산출되었습니다.";

/** 3.4 핵심 지표가 하나도 없을 때의 {core_metrics} — 판 3 `verdictRuleText` 글 그대로. */
export const ED3_NO_CORE = "지정 없음";

/* ------------------------------------------------------------------ *
 * 3.5 시험 절차와 평가 환경
 * ------------------------------------------------------------------ */

/** 예시본 3.5 단계별 수행 일시 — 소제목·머리·세 행의 단계 이름과 수행내용(부록 A "3.5 단계별 수행 일시 표"). */
export const EX_3_5_SCHEDULE_TITLE = "단계별 수행 일시";
export const EX_3_5_SCHEDULE_COLUMNS = ["시험 단계", "수행내용", "시험기간"] as const;
export const EX_3_5_SCHEDULE_STEPS: ReadonlyArray<readonly [step: string, work: string]> = [
  ["접수·업로드·점검", "의뢰 정보 입력, 데이터 업로드와 컬럼 지정, 데이터 점검과 입력 점검"],
  ["산출·작성·점검", "지표와 신뢰구간 산출, 판정, 소견 작성과 점검"],
  ["확인·발급", "의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급"],
];
/** 예시본 3.5 평가 시스템 환경 — 소제목과 머리 문장. */
export const EX_3_5_SYSTEM_TITLE = "평가 시스템 환경";
export const EX_3_5_SYSTEM_HEAD =
  "본 시험은 의뢰자가 업로드한 추론 결과 데이터를 기반으로, 당사 자동화 평가 엔진이 ISO/IEC TS 4213:2022 기준에 따라 서버 사이드에서 지표를 자동 산출하였다.";
/** 예시본 3.5 평가 시스템 환경 표의 줄 이름과 고정 값. */
export const EX_3_5_ROW_PLATFORM = "평가 플랫폼";
export const EX_3_5_PLATFORM_VALUE = "분류 성능 평가 시스템";
export const EX_3_5_ROW_METHOD = "평가 실행 방식";
export const EX_3_5_ROW_STANDARD = "적용 기준 표준";
export const EX_3_5_STANDARD_VALUE = "ISO/IEC TS 4213:2022";
export const EX_3_5_ROW_LIBRARIES = "주요 라이브러리";
export const EX_3_5_ROW_EVALUATED_AT = "평가 수행 일시";
export const EX_3_5_ROW_ENGINE = "평가 엔진 버전";
/** 판 3 `EvalEnvSection` 의 평가 시각이 없을 때 글("{날짜} (시각 미기록)") — 판 3 글 그대로. */
export const ED3_EVALUATED_AT_MISSING = "{date} (시각 미기록)";
/** 라이브러리 응답 키의 표시 이름(판 3 `reportEnvironment` 과 같은 규칙 — 파이썬만 대문자). */
export const LIBRARY_DISPLAY_NAME: Readonly<Record<string, string>> = { python: "Python" };
