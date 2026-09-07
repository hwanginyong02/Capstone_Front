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

export const REPORT_PURPOSE_LABEL: Record<ReportPurposeKey, string> = {
  internal: "내부 검증용",
  external: "외부 제출용",
  project: "프로젝트 산출물",
};

export const REPORT_PURPOSE_OVERVIEW: Record<ReportPurposeKey, string> = {
  internal: "조직 내부 QA 및 모델 모니터링 목적으로 활용",
  external: "외부 제출 및 인증/심사기관 검토 목적으로 활용",
  project: "정부 또는 기관 과제의 산출물 증빙 목적으로 활용",
};
