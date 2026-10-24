/**
 * 판 4 1절 시험 개요의 글자(판 4 라운드 S4 ③ — 렌더러 갈래 b1 전용). 출처 순서(계획 정해진 것 1):
 * - 예시본 글자 그대로: 표 소제목("의뢰자"·"시험기관"), 1.2 목적 문단(대응표 5 — "신뢰성" 표현 없음), 1.3 머리 문장과 기본 3항목.
 * - 1.3 기본 3항목·머리 문장은 판 3 `reportConstants`(BASE_CONSTRAINTS 의 판 3 몫)의 글에 부록 A1(결과서 → 시험성적서)만 한 것과
 *   같다 — 시험(`overview.test.ts`)이 판 3 글에 A1 을 해서 이 상수와 글자로 대조한다.
 * - "목적별 점검 미충족" 항목은 판 3 1.4 글 그대로(치환할 말 없음).
 * 고정 문구 13·3·2.2 이름표는 공용 상수(`FIXED_13_ED4`, `CONFIDENCE_INTERVAL_PREMISE`, `FIXED_2_2_NOT_PROVIDED_LABEL`)를 쓴다.
 */

/** 1.1 표 위 소제목(예시본). */
export const OVERVIEW_CLIENT_TITLE = "의뢰자";
export const OVERVIEW_INSTITUTION_TITLE = "시험기관";

/** 1.1 의뢰자 표 칸 이름(예시본 순서. FAX·홈페이지는 값이 있을 때만 — 판 3 과 같은 이름). */
export const OVERVIEW_CLIENT_LABEL = {
  companyName: "회사명",
  representative: "대표자",
  businessNumber: "사업자등록번호",
  contact: "전화번호",
  fax: "FAX번호",
  homepage: "홈페이지",
  address: "주소",
  contractDate: "평가 의뢰일",
} as const;

/** 1.1 시험기관 표 칸 이름(예시본). 값은 기관명과 발급 방식(`coverText.ISSUE_METHOD_AUTO`). */
export const OVERVIEW_INSTITUTION_LABEL = { orgName: "기관명", issueMethod: "발급 방식" } as const;

/**
 * 1.2 목적 문단(예시본 글자 그대로). {모델} 은 따옴표로 감싼 모델명, {조사} 는 그 뒤 을/를(`josa` — 괄호 앞 이름의 읽는 소리).
 */
export const PURPOSE_PARAGRAPH =
  '본 시험성적서는 "{모델}"{조사} 대상으로 ISO/IEC TS 4213:2022 기준에 따른 기계학습 분류 성능 시험을 수행한 결과를 기술한 문서이다. 본 시험의 목적은 의뢰자가 제출한 기계학습 분류 모델의 추론 결과 데이터(Inference Result Dataset)를 바탕으로, 국제 표준인 ISO/IEC TS 4213:2022에 명시된 평가 지표를 적용하여 객관적인 분류 성능을 정량적으로 측정하는 데 있다.';

/** 1.2 용도 표의 칸 이름 — 첫 줄(머리 행) "용도 | {용도}", 그다음 "개요" 와 과제 칸(판 3 1.3 용도 표와 같은 이름). */
export const PURPOSE_LABEL = {
  purpose: "용도",
  overview: "개요",
  projectName: "과제명",
  projectAgency: "과제 기관",
  projectNumber: "과제 번호",
} as const;

/** 1.3 머리 문장(예시본 = 판 3 글 + A1). */
export const CONSTRAINTS_HEAD = "본 시험성적서에서 기술한 내용은 다음의 전제 및 명시적 한계를 지닌다.";

/** 1.3 기본 3항목(예시본 = 판 3 BASE_CONSTRAINTS 의 판 3 몫 + A1). */
export const BASE_CONSTRAINTS_ED4: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "데이터 기반 평가의 국한성",
    body: "본 시험은 평가 대상 모델 자체가 아닌, 의뢰자가 당사 평가 시스템에 업로드한 추론 결과 데이터셋(Inference Result Dataset)을 기반으로 정량적 지표를 산출하였다. 따라서 본 시험성적서는 모델의 내부 아키텍처, 소스코드, 원본 학습 데이터의 무결성에 대한 직접적인 검증 결과를 포함하지 않는다.",
  },
  {
    title: "시험성적서 효력의 한계",
    body: "산출된 평가지표 및 종합 소견은 의뢰자가 제출한 특정 테스트 데이터셋 환경에 국한된 성능을 증명하며, 실제 서비스 배포 이후 발생하는 데이터 분포 변화(Data Drift)나 환경적 요인에 따른 성능 변동을 보장하지 않는다.",
  },
  {
    title: "자동화 진단 소견에 대한 면책",
    body: "종합 분석 소견은 산출된 통계 지표를 바탕으로 한 성능 해석 및 기술적 권고안으로, 모델 개선을 위한 보조적 참고 자료이다. 최종적인 서비스 운영 및 상용화 의사결정의 책임은 전적으로 평가 의뢰자에게 있다.",
  },
];

/** 1.3 4번 이름(예시본) — 글은 고정 문구 13(판 4). */
export const CONSTRAINT_CLIENT_PREMISE_TITLE = "의뢰자 제공 정보에 대한 전제";
/** 1.3 5번 이름(예시본) — 글은 고정 문구 3. */
export const CONSTRAINT_SIGNIFICANCE_TITLE = "통계적 유의성 검정";
/** 1.3 목적별 점검 미충족 항목(판 3 1.4 글 그대로) — 표지 주요 제약의 "목적별 점검 {K}개 중 {k}개 충족 (1.3)" 이 가리키는 자리. */
export const CONSTRAINT_PURPOSE_TITLE = "목적별 점검 미충족";
export const CONSTRAINT_PURPOSE_BODY = "의뢰자가 밝힌 사용 목적에 비추어 다음 재료가 시험에 포함되지 않았다.";
