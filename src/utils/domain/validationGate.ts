/**
 * Step 6 진행 게이트 — 데이터 검증 결과로 '평가 실행'을 허용할지 판정한다.
 *
 * ISSUES.md E-04 — 종전 판정은 `(validationData?.error_count ?? 0) > 0` 하나였다.
 * 검증이 **실패했거나 아예 수행되지 않은** 경우(validationData === null)가 `?? 0` 에
 * 흡수되어 '오류 0건'으로 해석됐고, 훅이 반환한 error 상태는 게이트에 쓰이지 않았다.
 *
 * 그 결과 검증 절이 통째로 비어 있는 성적서가 만들어졌다 — 6절에 "오류 0건 / 경고 0건"이
 * 인쇄되고 KS X ISO/IEC TS 4213 성적서의 데이터 검증 절이 사실과 다른 내용을 담는다.
 * 검증 단계가 사실상 선택 사항이 된다.
 */

export interface ValidationGateInput {
  /** /api/validate-data 응답. 미수행·실패면 null. */
  validationData: { error_count?: number } | null;
  /** 검증 요청 진행 중 */
  isLoading: boolean;
  /** 검증 요청이 실패한 사유(없으면 null) */
  error: string | null;
}

export type ValidationGateReason =
  | "ok"
  | "loading"
  | "failed"
  | "not_run"
  | "blocking_errors";

/**
 * 진행 차단 사유를 판정한다. "ok" 이외의 값은 전부 '다음' 버튼을 막는다.
 *
 * 순서가 의미를 갖는다 — 로딩 중이면 아직 판단할 수 없고, 실패했다면 error_count 를
 * 읽는 것 자체가 무의미하다.
 */
export function getValidationGateReason(input: ValidationGateInput): ValidationGateReason {
  if (input.isLoading) return "loading";
  if (input.error) return "failed";
  if (input.validationData === null) return "not_run";
  if ((input.validationData.error_count ?? 0) > 0) return "blocking_errors";
  return "ok";
}

/** 평가 실행을 허용할지 여부. */
export function canRunEvaluation(input: ValidationGateInput): boolean {
  return getValidationGateReason(input) === "ok";
}

/** 차단 사유를 사용자에게 보여줄 문장으로 바꾼다. null 이면 표시할 안내가 없다. */
export function describeValidationGate(reason: ValidationGateReason): string | null {
  switch (reason) {
    case "failed":
      return "데이터 검증에 실패해 평가를 실행할 수 없습니다. 원인을 확인한 뒤 다시 시도해 주세요.";
    case "not_run":
      return "데이터 검증이 아직 수행되지 않아 평가를 실행할 수 없습니다. 4단계에서 파일을 다시 업로드해 주세요.";
    case "blocking_errors":
      return "데이터 검증에서 오류가 발견되어 평가를 실행할 수 없습니다. 아래 상세 내역을 확인해 주세요.";
    case "loading":
    case "ok":
      return null;
  }
}
