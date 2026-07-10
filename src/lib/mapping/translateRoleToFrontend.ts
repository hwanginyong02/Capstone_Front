/**
 * 백엔드 ColumnRole 문자열 → 프론트 컬럼 역할(inferredRole/confirmedRole) 변환.
 *
 * translateRoleToBackend 의 역함수로, /api/analyze-columns 응답의 백엔드 역할을
 * 매핑 UI가 사용하는 프론트 역할로 되돌린다. DataUpload 스텝(자동 컬럼 분석 결과 적재)에서
 * 사용한다. 정방향(translateRoleToBackend)과 단일 출처로 관리해 latency 같은 역할이
 * 한쪽에만 반영되는 drift 버그를 방지한다.
 */
export function translateRoleToFrontend(role: string): string {
  if (role === "sample_id") return "id";
  if (role === "ignore") return "ignore";
  if (role === "latency") return "latency"; // 정방향과 동일하게 모든 task_type 공통
  if (role === "y_true" || role === "true_labels") return "y_true";
  if (role === "y_pred" || role === "pred_labels") return "y_pred";
  if (role === "score_positive") return "score";
  if (role === "prob_per_class") return "prob_class_*";
  if (role === "score_per_label") return "prob_label_*";
  return "ignore";
}
