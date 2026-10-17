/**
 * 보고서 생성 시 사용자 입력으로 채울 수 없는 영역의 상수.
 * 백엔드 API 도입 시 일부는 응답으로 대체됨.
 */
import type {
  EvalEnvironment,
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
