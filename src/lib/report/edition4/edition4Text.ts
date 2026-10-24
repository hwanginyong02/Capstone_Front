/**
 * 판 4 문구(판 4 라운드 계획 2.4 "순수 함수는 src/lib/report/edition4/", 부록 A 문안 출처 규칙) — 생성 때 저장하는 판 4 글의
 * 틀. 글자는 고정 문구 탭 → 예시본 → 판 3 글(부록 A 치환) → 부록 B(승인된 것) 순으로 가져왔고, 시험이 고정 문구 사본
 * (`src/test/edition4/fixedWording.ed4.json`)과 글자를 대조한다. 렌더러 단계(S4·S5)가 그리는 문구도 이 파일에 더한다.
 *
 * 틀의 `{이름}` 뒤에 붙은 조사 표기("과(와)"·"은(는)"·"이(가)"·"을(를)"·"(으)로")는 `fillTemplate` 이 끼운 글자의 끝소리로
 * 하나를 고른다(`josa`, 공통 대조 표 `number_wording_ed4.json`).
 */
import { josa, type JosaPair } from "../koreanJosa";
import { ed4Given } from "./edition4Number";

/** 고정 문구 9(판 4) — 끝만 합니다체(부록 A8). 결정 임계값은 의뢰자가 준 글자 그대로(`ed4Given` — 지수 꼴 없이). */
export const FIXED_9_THRESHOLD_ED4 = "본 평가의 예측값은 제출된 확률값에 결정 임계값 {threshold}을(를) 적용하여 산출하였습니다.";
export const FIXED_9_PER_LABEL_ED4 = "본 평가의 예측값은 제출된 확률값에 레이블별 결정 임계값(아래 표)을 적용하여 산출하였습니다.";
export const FIXED_9_ARGMAX_ED4 =
  "본 평가의 예측값은 제출된 클래스별 확률값 중 가장 큰 값의 클래스를 택하여 산출하였습니다(결정 임계값 없음).";

/** 고정 문구 20 — 4.2 판정 근거. 합격은 확정 글, 나머지 세 갈래는 예시본을 만들며 정한 초안(판 4 를 켜기 전 확인 목록). */
export const VERDICT_BASIS_PASS = "핵심 지표 {핵심 지표}과(와) 그 밖의 판정 대상 지표가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.";
export const VERDICT_BASIS_CONDITIONAL_DRAFT =
  "핵심 지표 {핵심 지표}은(는) 목표를 충족하였으나 {미달 지표}이(가) 목표에 미달하여, 3.4의 판정 규칙에 따라 조건부 합격으로 판정하였다.";
export const VERDICT_BASIS_FAIL_DRAFT = "핵심 지표 {미달 핵심 지표}이(가) 목표에 미달하여, 3.4의 판정 규칙에 따라 불합격으로 판정하였다.";
export const VERDICT_BASIS_INCONCLUSIVE_DRAFT = "{원인}(으)로 3.4의 판정 규칙에 따라 판정할 수 없었다.";
/** 부록 B13 — 핵심 지표만 판정 대상인 합격. */
export const VERDICT_BASIS_PASS_CORE_ONLY = "핵심 지표 {핵심 지표}이(가) 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.";
/**
 * 부록 B31(초안, 2026-10-24 승인 — 판 4 를 켜기 전 확인 목록) — 핵심 지표가 하나도 없는 성적서의 4.2 판정 근거. {판정} 은 판정
 * 글자(`VERDICT_BASIS_WORD`), 조사 (으)로 는 그 글자로 고른다.
 */
export const VERDICT_BASIS_PASS_NO_CORE_DRAFT = "판정 대상 지표 {N}개가 모두 목표를 충족하여, 3.4의 판정 규칙에 따라 합격으로 판정하였다.";
export const VERDICT_BASIS_FAILED_NO_CORE_DRAFT = "{미달 지표}이(가) 목표에 미달하여, 3.4의 판정 규칙에 따라 {판정}(으)로 판정하였다.";
/** 근거 문장 끝 "…(으)로 판정하였다" 의 판정 글자(고정 문구 20 의 "합격으로"·"조건부 합격으로"·"불합격으로"). */
export const VERDICT_BASIS_WORD: Record<"PASS" | "CONDITIONAL_PASS" | "FAIL", string> = {
  PASS: "합격",
  CONDITIONAL_PASS: "조건부 합격",
  FAIL: "불합격",
};
/** 부록 B13 — 판정 불가의 {원인}. */
export const INCONCLUSIVE_CAUSE_NOT_COMPUTED = "핵심 지표 {이름}의 산출 실패";
export const INCONCLUSIVE_CAUSE_NO_TARGET = "핵심 지표 {이름}의 목표값 부재";
export const INCONCLUSIVE_CAUSE_NO_JUDGED = "판정 대상 지표 부재";

/** 4.2·표지 요약의 종합 판정 이름 — 판 3 6.1 판정 상자(`ConclusionSection`)와 같은 이름이다(예시본 "최종 합격"). */
export const VERDICT_LABEL_ED4: Record<"PASS" | "CONDITIONAL_PASS" | "FAIL" | "INCONCLUSIVE", string> = {
  PASS: "최종 합격",
  CONDITIONAL_PASS: "조건부 합격",
  FAIL: "최종 불합격",
  INCONCLUSIVE: "판정 불가",
};

/** 4.2 표 "판정 대상 지표 중 충족" 칸(예시본 "5개 중 5개"). 판정 대상이 없으면 부록 B12 의 "—". */
export const VERDICT_COUNT_CELL = "{N}개 중 {n}개";
export const VERDICT_COUNT_NONE = "—";

/** 고정 문구 21 — 표지 시험 결과 요약의 줄 이름과 종합 판정·핵심 지표 줄. */
export const COVER_ROW_VERDICT = "종합 판정";
export const COVER_ROW_CORE = "핵심 지표";
export const COVER_VERDICT_ROW = "{판정} (판정 대상 지표 {N}개 중 {n}개 충족, 4.2)";
export const COVER_CORE_ROW = "{이름} {값} (합격 기준 {기준}, {충족/미달}, 판정 여유 {작음/충분}, 4.3)";
/** 부록 B2 — 판정 대상 0개. */
export const COVER_VERDICT_NONE = "판정 불가 (판정 대상 지표 없음, 4.2)";
/**
 * 부록 B32(초안, 2026-10-24 승인 — 판 4 를 켜기 전 확인 목록) — 목표값이 없는 핵심 지표. 값은 판정과 무관해 plain(같은 원값의
 * 판정 대상 지표가 있으면 그 글자 — D2).
 */
export const COVER_CORE_NO_TARGET_DRAFT = "{이름} {값} (합격 기준 없음, 참고 지표, 4.3)";
/** 부록 B3 — 핵심 지표 측정 불가. */
export const COVER_CORE_UNAVAILABLE = "{이름} 측정 불가 (합격 기준 {기준}, 4.3)";

/** 고정 문구 19 의 판정 여유 값(4.3 열·표지 핵심 지표 줄). */
export const JUDGMENT_MARGIN_LABEL: Record<"small" | "ample", string> = { small: "작음", ample: "충분" };

/** 4.5 분포 문장(예시본 4.5 그대로 — 첫 문장은 판 3 3절 분포 문장과 같은 틀). */
export const DISTRIBUTION_SENTENCE = "평가 데이터셋은 총 {total}건이며, 클래스(레이블)별 분포는 {목록}이다.";
export const IMBALANCE_RATIO_SENTENCE = "클래스 불균형 비율(Imbalance Ratio)은 {IR}이다.";

const JOSA_MARKS: Record<string, JosaPair> = {
  "과(와)": "과/와",
  "은(는)": "은/는",
  "이(가)": "이/가",
  "을(를)": "을/를",
  "(으)로": "으로/로",
};

/**
 * 틀의 `{이름}` 을 값으로 바꾼다. 바로 뒤에 조사 표기가 있으면 끼운 글자의 끝소리로 고른 조사 하나로 바꾼다
 * ("{핵심 지표}과(와)" + "Recall(M3)" → "Recall(M3)과"). 값이 없는 자리는 그대로 둔다 — 시험이 남은 `{` 를 본다.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}(과\(와\)|은\(는\)|이\(가\)|을\(를\)|\(으\)로)?/g, (whole, key: string, mark?: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return whole;
    const value = values[key];
    return mark ? `${value}${josa(value, JOSA_MARKS[mark])}` : value;
  });
}

/**
 * 고정 문구 9(판 4 합니다체) — 판 3 `derivationStatement` 와 같은 갈래(argmax·레이블별·한 임계값). 판 4 사실 시트 고정 문장 9 와
 * 3.3 첫 항목이 이 글이다. 3.3 의 "(점수 컬럼: …)" 은 그리는 쪽이 덧붙인다(사실 시트에는 싣지 않는다).
 */
export function derivationStatementEd4(fact: { method: string; threshold: number | Record<string, number> | null }): string {
  if (fact.method === "argmax") return FIXED_9_ARGMAX_ED4;
  if (fact.method === "threshold_per_label" && typeof fact.threshold === "object" && fact.threshold !== null) {
    return FIXED_9_PER_LABEL_ED4;
  }
  const threshold = typeof fact.threshold === "number" ? ed4Given(fact.threshold) : String(fact.threshold);
  return fillTemplate(FIXED_9_THRESHOLD_ED4, { threshold });
}

/* ------------------------------------------------------------------ *
 * 렌더러(S4·S5) — 절·소절 제목(예시본 글자 그대로, 부록 A "절·소절 제목")
 * ------------------------------------------------------------------ */

/** 판 4 절·소절 제목. 절 제목은 "{번호}. {제목}", 소절 제목은 "{번호} {제목}" 으로 찍는다(`Ed4SectionTitle`·`Ed4SubsectionTitle`). */
export const ED4_TITLES = {
  "1": "시험 개요",
  "1.1": "의뢰자와 시험기관",
  "1.2": "시험 목적과 성적서 용도",
  "1.3": "제약사항",
  "2": "시험 대상",
  "2.1": "대상 모델",
  "2.2": "평가 데이터",
  "2.3": "학습 데이터",
  "3": "시험 방법",
  "3.1": "의뢰자 요구사항",
  "3.2": "시험항목과 산정식",
  "3.3": "산출 기준",
  "3.4": "판정 규칙",
  "3.5": "시험 절차와 평가 환경",
  "4": "시험 결과",
  "4.1": "데이터 점검",
  "4.2": "종합 판정",
  "4.3": "지표별 결과",
  "4.4": "오분류",
  "4.5": "데이터 분포",
  "4.6": "참조 범위 비교",
  "4.7": "곡선",
  "4.8": "응답시간",
  "5": "분석 소견",
  "5.1": "판정과 불확실성",
  "5.2": "오분류",
  "5.3": "데이터 분포",
  "5.4": "참조 범위",
  "5.5": "운영 위험",
  "5.6": "추가 관찰",
  "6": "개선 권고",
  "6.1": "데이터",
  "6.2": "모델과 운영",
} as const;
export type Ed4TitleNumber = keyof typeof ED4_TITLES;
/**
 * 절·소절 번호를 성적서 순서로(1, 1.1, 1.2, …, 6.2). 객체 키는 정수 꼴("1"…"6")이 먼저 열거되므로 순서는 이 목록으로 본다.
 */
export const ED4_TITLE_NUMBERS: ReadonlyArray<Ed4TitleNumber> = (Object.keys(ED4_TITLES) as Ed4TitleNumber[]).sort((a, b) => {
  const [a1, a2 = 0] = a.split(".").map(Number);
  const [b1, b2 = 0] = b.split(".").map(Number);
  return a1 - b1 || a2 - b2;
});

/* ------------------------------------------------------------------ *
 * 렌더러(S4·S5) — 고정 문구(사본 `fixedWording.ed4.json` 의 fixed 키 = 이름 속 번호)
 * 이미 다른 곳에 있는 것은 여기 두지 않는다: 3_significance = reportConstants.CONFIDENCE_INTERVAL_PREMISE,
 * 2_3_cover_* = materialCheck.COVER_STANDARD_*, 2_2_not_provided_ed4 = materialCheck(printed.notProvided),
 * 21_reporting·21_constraint = materialCheck(printed.coverRows), 3_2_M10_formula = metricFormulasEd4, 19_values = JUDGMENT_MARGIN_LABEL + "—".
 * ------------------------------------------------------------------ */

/** 고정 문구 10(판 4) — 3.4 판정 규칙 첫 문단. {core_metrics} = "Recall(M3)" 꼴. */
export const FIXED_10_RULE_ED4 =
  "목표값이 설정되고 산출에 성공한 지표를 판정 대상으로 하며, 핵심 지표는 의뢰자가 지정하였다({core_metrics}). 핵심 지표가 하나라도 목표에 미달하면 불합격, 핵심 지표가 산출되지 않았거나 판정 대상 지표가 없으면 판정 불가, 핵심 지표는 모두 충족하였으나 그 외 지표 중 미달이 있으면 조건부 합격, 모든 판정 대상 지표가 목표를 충족하면 합격으로 판정한다. 판정은 측정값을 목표값과 직접 비교하였으며 측정 불확도는 반영하지 않았다.";
/** 고정 문구 10(판 4) — 3.4 둘째 문단(판정 여유·충족 수). */
export const FIXED_10_MARGIN_PARAGRAPH_ED4 =
  '95% 신뢰구간이 목표값을 포함하는 지표는 판정 여유가 작은 지표로 보고, 4.3의 판정 여유 열에 "작음"으로 표시한다. 신뢰구간이 없는 지표는 목표값과의 차이가 목표값의 3% 미만일 때 표시한다. 종합 판정에는 판정 대상 지표 가운데 목표를 충족한 수를 함께 적는다. 이 수는 참고이며 판정의 근거가 아니다.';
/** 고정 문구 10 — 핵심 지표 출처 두 갈래(첫 문단 안의 그 문장을 이것으로 바꾼다). */
export const FIXED_10_CORE_CLIENT = "핵심 지표는 의뢰자가 지정하였다({core_metrics}).";
export const FIXED_10_CORE_DEFAULT = "핵심 지표는 분류 유형의 기본값을 의뢰자가 바꾸지 않고 사용하였다({core_metrics}).";
/** 고정 문구 13(판 4) — 1.3 의뢰자 제공 정보 전제. */
export const FIXED_13_ED4 =
  "본 시험성적서는 의뢰자가 제공한 데이터와 정보를 바탕으로 작성되었다. 제공된 내용이 사실과 다르면 본 시험성적서의 결과와 해석은 유효하지 않다.";
/** ※ 판 4 — 5절 머리 줄. */
export const FIXED_NOTE_ED4 = "※ 5절은 4절의 시험 결과를 해석한 참고 의견이며, 시험 결과에 해당하지 않습니다.";
/** 고정 문구 19 — 4.3 표 아래. */
export const FIXED_19_NOTE =
  '판정 여유 "작음"은 95% 신뢰구간이 합격 기준을 포함하거나, 신뢰구간이 없는 지표에서는 목표값과의 차이가 목표값의 3% 미만이라는 뜻입니다(3.4).';
/** 고정 문구 22 — 표지 발급 문구(발급본에만, 부록 B1). */
export const FIXED_22_ISSUE =
  "본 시험성적서는 평가 시스템이 자동으로 발급한 문서이며, 발급 전에 사람이 승인하지 않았습니다. 의뢰자는 입력 내용을 확인하고 발급을 요청하였습니다.";
/** 고정 문구 23 — 3.3 반올림 규칙. */
export const FIXED_23_ROUNDING =
  "본 시험성적서의 지표 산출 결과와 합격 기준은 원본 데이터에서 소수점 셋째 자리로 반올림 표기되었습니다. 다만 판정 대상 지표의 값 중 셋째 자리로 반올림하면 판정과 어긋나 보이는 값과, 신뢰구간 경계 중 반올림하면 목표값과 같아 보이는 값은 자릿수를 늘려 표기하였습니다. 결정 임계값은 그 값을 그대로 적용해도 같은 예측이 나오는 자릿수로 표기하였습니다. 소견 문장의 숫자도 같은 규칙을 따릅니다. 표기한 값끼리 계산한 차이는 반올림 때문에 끝자리가 다를 수 있습니다.";
/** 고정 문구 24 — 4.5 끝. */
export const FIXED_24_DISTRIBUTION = "불균형과 분포 차이가 성능에 준 영향은 5.3에서 해석합니다.";
/** 고정 문구 25 — 3.5 시험 절차 일곱 단계(번호 포함 글 그대로). */
export const FIXED_25_STEPS: ReadonlyArray<string> = [
  "1. 의뢰 접수: 의뢰자가 평가 흐름을 구성하고 의뢰자 정보, 대상 모델, 선언, 지표와 합격 기준을 입력한다.",
  "2. 데이터 업로드: 의뢰자가 추론 결과 파일(CSV 또는 JSON)을 올리고 정답·예측·확률 컬럼을 지정한다.",
  "3. 데이터 점검: 시스템이 라벨 표기를 맞추고 필수 컬럼, 누락값, 중복 ID, 값의 범위를 검증한다(4.1).",
  "4. 입력 점검: 시스템이 TS 4213 보고 항목과 선언에 필요한 항목을 점검하고, 부족한 항목을 의뢰자에게 안내한다(부록 1.2).",
  "5. 지표 산출과 판정: 시스템이 선택된 지표와 95% 신뢰구간을 산출하고 판정 규칙(3.4)에 따라 판정한다.",
  "6. 소견 작성과 점검: 시스템이 분석 소견과 권고를 작성하고 시험 데이터와 대조해 점검한다(부록 1.3).",
  "7. 확인과 발급: 의뢰자가 입력 내용을 확인하고 발급을 요청하면, 시스템이 시험성적서(PDF)를 자동 발급한다. 발급 전에 사람이 승인하지 않는다.",
];
/** 고정 문구 26 — 표 위 출처 안내와 2.2 출처 열 값. */
export const FIXED_26_PROVIDED_ALL = "다음 값은 모두 의뢰자가 제공하였습니다.";
export const FIXED_26_PROVIDED_DESCRIPTION = "다음 설명은 의뢰자가 제공하였습니다.";
export const FIXED_26_SPECIFIED_ALL = "다음 값은 모두 의뢰자가 지정하였습니다.";
export const FIXED_26_SPECIFIED_DEFAULT_CORE =
  "다음 값은 의뢰자가 지정하였습니다. 핵심 지표 열의 '기본값'은 의뢰자가 지정하지 않아 분류 유형의 기본값을 따른 것입니다.";
export const FIXED_26_CORE_DEFAULT_CELL = "핵심(기본값)";
export const FIXED_26_RECORDED = "다음 값은 평가 시스템이 기록하였습니다.";
export const FIXED_26_SOURCE_CLIENT = "의뢰자 제공";
export const FIXED_26_SOURCE_SYSTEM = "시스템 확인";
/** 고정 문구 2.2(판 4) 의 이름표 — materialCheck 의 printed.notProvided 앞에 "{이름표}: " 로 붙인다. */
export const FIXED_2_2_NOT_PROVIDED_LABEL = "제공되지 않은 정보";

/* ------------------------------------------------------------------ *
 * 렌더러 — 예시본 글자(부록 A "예시본에서 그대로 쓰는 글")
 * ------------------------------------------------------------------ */
export const EX_ISSUED_STATUS = "[ 발급 완료 ]";
export const EX_END_MARK = "— 끝 —";
export const EX_HISTORY_TITLE = "발급 이력";
/** 4.4 임계값 표 머리·상승폭 문장. */
export const EX_4_4_CURRENT_THRESHOLD = "현재 결정 임계값 {threshold}";
export const EX_4_4_BEST_THRESHOLD = "F1이 가장 높은 결정 임계값 {threshold}";
export const EX_4_4_GAIN = "F1의 최대 상승폭은 {gain}이다.";

/* ------------------------------------------------------------------ *
 * 렌더러 — 부록 B(승인된 후보). B2·B3·B12·B13·B31·B32 는 위(생성값), B6 은 metricFormulasEd4, B7 미충족은 materialCheck.
 * ------------------------------------------------------------------ */
export const B1_DRAFT_STATUS = "[ 초안 — 미발급 ]";
export const B1_DRAFT_NOTICE = "평가 결과는 확정되었으나 아직 발급되지 않았습니다.";
export const B1_UNISSUED = "(미발급)";
export const B5_CRITERIA_REFERENCE = "없음(참고 지표)";
export const B5_VERDICT_REFERENCE = "참고 지표";
export const ED4_DASH = "—";
export const B7_AVERAGING_MET = '다중 클래스 지표의 평균 방식은 {평균 방식}을 기준으로 합니다. 의뢰자가 클래스 중요도를 "{선언 값}"(으)로 밝혔기 때문입니다.';
export const B8_UNISSUED = B1_UNISSUED;
export const B9_GROUP_HEAD = "{묶음 이름} — {적용 설명} ({counts})";
export const B9_COUNT_ERROR = "{n}건 오류";
export const B9_COUNT_WARNING = "{n}건 경고";
export const B9_COUNT_PASS = "{n}건 통과";
export const B10_NO_SAMPLE_ID = "해당 없음 (샘플 ID 컬럼을 지정하지 않음)";
export const B10_NO_SCORE = "해당 없음 (확률(score) 컬럼을 지정하지 않음)";
export const B10_NO_ROLE = "해당 없음 ({역할} 컬럼을 지정하지 않음)";
export const B11_LATENCY_STATS = "평균 {m}, p95 {p}, 최대 {x} ({n}건)";
export const B11_ALL_BELOW_ONE = "모든 값 {n}건이 1 미만 (최대 {x})";
export const B11_UNCHECKED = "확인하지 못함";
export const B11_NON_NUMERIC = "숫자가 아닌 값이 있는 컬럼: {목록}";
export const B14_UNMEASURABLE = "측정 불가";
export const B15_SUBMITTED_PREDICTION = "현재 예측(제출된 예측값)";
export const B16_NO_TRAINING_DISTRIBUTION = "제공되지 않음 — 학습 클래스 분포가 제공되지 않아 학습·평가 비율을 비교하지 않았다.";
export const B17_NO_CURVES = "해당 없음 — ROC·PR 곡선은 이진 분류에서 확률(score) 컬럼이 있을 때 산출한다.";
export const B18_NOT_APPLICABLE = "해당 없음";
export const B25_RECORD_HEADER = "작성 기록";
export const B25_RECORD_NOTE = "5·6절 칸마다 쓴 방식(화면에만 보이며 인쇄본에는 없습니다)";
export const B27_PROGRESS_HEAD = "정성 서술(5·6절)을 만드는 중입니다 — {단계}.";
export const B28_RULE_TAIL = "진행한 것으로 기록됩니다 (입력 점검 규칙 {v}).";
export const B29_PLACES = "(표지·1.3·부록 1.2)";
export const B30_NOT_PROVIDED = "제공되지 않음";
/** 부록 B33(초안, 2026-10-24 승인) — 멀티레이블, 학습 표본 수 없음(저장 이유 코드 training_samples_not_provided). */
export const B33_NO_TRAINING_SAMPLES_DRAFT = "제공되지 않음 — 학습 표본 수가 제공되지 않아 학습·평가 비율을 비교하지 않았다.";
