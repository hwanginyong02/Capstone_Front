/**
 * 보고서 생성 시 사용자 입력으로 채울 수 없는 영역의 상수.
 * 백엔드 API 도입 시 일부는 응답으로 대체됨.
 */
import type {
  EvalEnvironment,
  MaterialCheckResult,
  PerformerInfo,
  ReportPurposeKey,
} from "../../types/finalReport.types";

/**
 * **미발급 초안에만 쓰이는 자리표시자.** 정본은 서버의 `organization` 테이블이다
 * (백엔드 `app/issuance/bootstrap.py` 의 시드 → `GET /api/organization`).
 *
 * ISSUES.md F-10 — 종전에는 이 상수와 DB 시드가 **같은 값을 각각 하드코딩**하고 있어,
 * 기관명을 바꾸면 두 곳을 함께 고쳐야 한다는 사실이 어디에도 적혀 있지 않았다.
 * 값을 프론트에서 지울 수는 없다 — 발급 전 성적서에도 수행기관 칸이 인쇄되기 때문이다.
 * 대신 **여기가 정본이 아니라는 것**을 명시하고, 발급 후에는 서버 값으로 교체된다는
 * 사실을 함께 적는다(`useIssuance` 가 `IssuanceOut.organization` 으로 덮어쓴다).
 *
 * 기관 정보를 바꿔야 하면 **서버 시드를 고치는 것이 먼저다.** 이 상수는 그 값을 아직
 * 받아오지 못한 초안 화면의 자리표시자일 뿐이다.
 */
export const DEFAULT_PERFORMER: PerformerInfo = {
  orgName: "한국 AI 인증원",
  evaluator: "자동 평가 엔진",
  contact: "—",
};

export const DEFAULT_EVAL_SCOPE_TEXT =
  "의뢰자가 제출한 평가 데이터셋을 기반으로 선택된 시험항목에 대해 정량적 성능 지표를 산출하고 합격 기준 충족 여부를 판정한다.";

export const DEFAULT_EVAL_PURPOSE_TEXT =
  "KS X ISO/IEC TS 4213:2022 표준에 따른 AI 분류 모델의 성능 인증 목적으로 활용";

export const DEFAULT_EVAL_ENV_CONSTANTS: Pick<EvalEnvironment, "method" | "outputFormat" | "tools"> = {
  method: "서버 사이드 자동 연산 (Python 기반 metric 산출)",
  outputFormat: "성능 지표 수치 및 합격/불합격 판정 성적서 (PDF)",
  tools: ["Python 3.11", "scikit-learn 1.4.0", "pandas 2.2.0", "numpy 1.26.0"],
};

/** 성적서 용도 이름 — 화면 선택지·재료 목록 1절과 같은 이름을 쓴다(DESIGN_GAPS R6). */
export const REPORT_PURPOSE_LABEL: Record<ReportPurposeKey, string> = {
  internal: "내부 검증",
  external: "외부 제출",
  project: "과제 산출물",
};

export const REPORT_PURPOSE_OVERVIEW: Record<ReportPurposeKey, string> = {
  internal: "조직 내부 QA 및 모델 모니터링 목적으로 활용",
  external: "외부 제출 및 인증/심사기관 검토 목적으로 활용",
  project: "정부 또는 기관 과제의 산출물 증빙 목적으로 활용",
};

/**
 * 판정 규칙 — 성적서 고정 문구 10(서술 설계 D19, D32). 6.1 종합 핵심 성능 표에 인쇄한다.
 *
 * 문구의 마지막 문장("목표값과의 차이가 목표값의 3% 미만인 지표는 8.3에 별도 표시하였다")은
 * 뺐다. 그 표시가 아직 구현되지 않아, 넣으면 성적서가 하지 않은 일을 했다고 적게 된다.
 * 근소 차이 표시를 구현할 때 함께 되살린다.
 */
export function verdictRuleText(coreMetrics: string[]): string {
  const core = coreMetrics.length > 0 ? coreMetrics.join(", ") : "지정 없음";
  return (
    "판정 규칙: 목표값이 설정되고 산출에 성공한 지표를 판정 대상으로 하며, 핵심 지표는 의뢰자가 " +
    `지정하였다(${core}). 핵심 지표가 하나라도 목표에 미달하면 불합격, 핵심 지표가 산출되지 ` +
    "않았거나 판정 대상 지표가 없으면 판정 불가, 핵심 지표는 모두 충족하였으나 그 외 지표 중 " +
    "미달이 있으면 조건부 합격, 모든 판정 대상 지표가 목표를 충족하면 합격으로 판정한다. 판정은 " +
    "측정값을 목표값과 직접 비교하였으며 측정 불확도는 반영하지 않았다."
  );
}

/** 1.4 제약사항 한 항목. `details` 는 그 항목 아래 줄(영향 문장·목적별 미충족 문장). */
export interface ConstraintItem {
  title: string;
  body: string;
  details?: string[];
}

/** 1.4 의 종전 4항목 — 모든 성적서에 찍는다. */
const BASE_CONSTRAINTS: ConstraintItem[] = [
  {
    title: "데이터 기반 평가의 국한성",
    body: "본 시험은 평가 대상 모델 자체가 아닌, 의뢰자가 당사 평가 시스템에 업로드한 추론 결과 데이터셋(Inference Result Dataset)을 기반으로 정량적 지표를 산출하였다. 따라서 본 결과서는 모델의 내부 아키텍처, 소스코드, 원본 학습 데이터의 무결성에 대한 직접적인 검증 결과를 포함하지 않는다.",
  },
  {
    title: "결과서 효력의 한계",
    body: "산출된 평가지표 및 종합 소견은 의뢰자가 제출한 특정 테스트 데이터셋 환경에 국한된 성능을 증명하며, 실제 서비스 배포 이후 발생하는 데이터 분포 변화(Data Drift)나 환경적 요인에 따른 성능 변동을 보장하지 않는다.",
  },
  {
    title: "자동화 진단 소견에 대한 면책",
    body: "종합 분석 소견은 산출된 통계 지표를 바탕으로 한 성능 해석 및 기술적 권고안으로, 모델 개선을 위한 보조적 참고 자료이다. 최종적인 서비스 운영 및 상용화 의사결정의 책임은 전적으로 평가 의뢰자에게 있다.",
  },
  {
    title: "LLM 생성 소견에 대한 면책",
    body: "본 결과서의 서술형 분석 소견(7절 이후)은 산출된 정량 지표를 바탕으로 LLM(Large Language Model) 및 RAG(Retrieval-Augmented Generation) 기술을 활용하여 자동 생성되었다. 해당 소견은 참고용이며, 전문가의 추가 검토를 권장한다.",
  },
];

/** 고정 문구 13(서술 설계 D25) — 1.4, 재료 선택 점검이 있는 성적서부터. */
export const CLIENT_PROVIDED_PREMISE =
  "본 결과서는 의뢰자가 제공한 데이터와 정보를 바탕으로 작성되었다. 제공된 내용이 사실과 다르면 본 결과서의 결과와 해석은 유효하지 않다.";

/**
 * 고정 문구 3(서술 설계 D29) — 1.4, 고정 문구 13 다음 자리. 신뢰구간을 찍은 성적서만.
 * 신뢰구간이 없는 성적서에 넣으면 하지 않은 일을 했다고 적게 된다.
 */
export const CONFIDENCE_INTERVAL_PREMISE =
  "단일 모델 평가라 통계적 유의성 검정은 적용하지 않았고, 대신 주요 지표의 신뢰구간을 제시한다.";

const CONFIDENCE_INTERVAL_ITEM: ConstraintItem = {
  title: "통계적 유의성 검정",
  body: CONFIDENCE_INTERVAL_PREMISE,
};

/**
 * 1.4 제약사항을 한 곳에서 조립한다. 순서: 종전 4항목 → 고정 문구 13 → 고정 문구 3(신뢰구간)
 * → 제공되지 않은 정보 + 항목별 영향 문장 → 목적별 점검 미충족 줄(고정 문구 14 · 2절).
 *
 * 재료 선택 점검 결과가 없는 옛 성적서는 종전 4항목 그대로다 — 문장은 발급 당시 그대로 둔다.
 * 신뢰구간 여부(`hasConfidenceIntervals`)는 점검 결과와 따로 받는다. 성적서의 `confidenceIntervalNote`
 * 키가 그 표시다(6.1·6.2 의 신뢰구간 열과 같은 표시).
 */
export function constraintsFor(
  materialCheck: MaterialCheckResult | undefined,
  hasConfidenceIntervals: boolean,
): ConstraintItem[] {
  const ciItems = hasConfidenceIntervals ? [CONFIDENCE_INTERVAL_ITEM] : [];
  if (!materialCheck) return [...BASE_CONSTRAINTS, ...ciItems];
  const { printed } = materialCheck;
  return [
    ...BASE_CONSTRAINTS,
    { title: "의뢰자 제공 정보에 대한 전제", body: CLIENT_PROVIDED_PREMISE },
    ...ciItems,
    ...(printed.notProvided ? [{ title: "제공되지 않은 정보", body: printed.notProvided, details: printed.impacts }] : []),
    ...(printed.purposeShortfalls.length > 0
      ? [
          {
            title: "목적별 점검 미충족",
            body: "의뢰자가 밝힌 사용 목적에 비추어 다음 재료가 시험에 포함되지 않았다.",
            details: printed.purposeShortfalls,
          },
        ]
      : []),
  ];
}
