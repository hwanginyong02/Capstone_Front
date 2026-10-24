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
