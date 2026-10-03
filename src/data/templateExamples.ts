import type { TaskType } from "./evaluationData";

/**
 * CSV template examples per task type.
 */
export function getCsvExample(taskType: TaskType, requiresProb: boolean): string {
  if (taskType === "binary") {
    return requiresProb
      ? "id,y_true,y_pred,score,inference_time_ms\nS001,1,1,0.92,12.4\nS002,0,1,0.67,11.8\nS003,1,1,0.88,9.3"
      : "id,y_true,y_pred,inference_time_ms\nS001,1,1,12.4\nS002,0,1,11.8\nS003,1,1,9.3";
  }

  if (taskType === "multilabel") {
    return requiresProb
      ? "id,y_true,y_pred,prob_label_sports,prob_label_news,inference_time_ms\nS001,sports|news,sports,0.92,0.08,12.4\nS002,news,news,0.14,0.86,11.8"
      : "id,y_true,y_pred,inference_time_ms\nS001,sports|news,sports,12.4\nS002,news,news,11.8";
  }

  return requiresProb
    ? "id,y_true,y_pred,prob_class_cat,prob_class_dog,prob_class_bird,inference_time_ms\nS001,cat,cat,0.92,0.05,0.03,12.4\nS002,bird,dog,0.10,0.62,0.28,11.8"
    : "id,y_true,y_pred,inference_time_ms\nS001,cat,cat,12.4\nS002,bird,dog,11.8";
}

/**
 * JSON template examples per task type.
 */
export function getJsonExample(taskType: TaskType, requiresProb: boolean): string {
  if (taskType === "binary") {
    return requiresProb
      ? '{\n  "samples": [\n    { "id": "S001", "y_true": 1, "y_pred": 1, "score": 0.92, "inference_time_ms": 12.4 }\n  ]\n}'
      : '{\n  "samples": [\n    { "id": "S001", "y_true": 1, "y_pred": 1, "inference_time_ms": 12.4 }\n  ]\n}';
  }

  if (taskType === "multilabel") {
    return requiresProb
      ? '{\n  "samples": [\n    { "id": "S001", "y_true": "sports|news", "y_pred": "sports", "prob_label_sports": 0.92, "inference_time_ms": 12.4 }\n  ]\n}'
      : '{\n  "samples": [\n    { "id": "S001", "y_true": "sports|news", "y_pred": "sports", "inference_time_ms": 12.4 }\n  ]\n}';
  }

  return requiresProb
    ? '{\n  "samples": [\n    { "id": "S001", "y_true": "cat", "y_pred": "cat", "prob_class_cat": 0.92, "inference_time_ms": 12.4 }\n  ]\n}'
    : '{\n  "samples": [\n    { "id": "S001", "y_true": "cat", "y_pred": "cat", "inference_time_ms": 12.4 }\n  ]\n}';
}

/**
 * 성적서 구성 화면 ① 의 "예시 파일 보기" 가 쓰는 예시.
 *
 * **위 `getCsvExample` 과 컬럼명이 다르다.** 여기는 `docs/COMPOSER_COMPONENTS.md` ① 의 예시를
 * 그대로 옮긴 것이고, 위쪽은 업로드 화면이 종전부터 쓰던 것이다. 차이는 셋이다.
 *
 * | | 업로드 화면 | 구성 화면(문서) |
 * |---|---|---|
 * | 응답시간 | `inference_time_ms` | `latency_ms` |
 * | 다중 클래스 확률 | `prob_class_cat` | `prob_cat` |
 * | 멀티레이블 정답·예측 | `y_true` / `y_pred` | `true_labels` / `pred_labels` |
 *
 * 셋 다 SPEC.md 가 허용하는 표기다 — 확률 컬럼의 허용 접두어에 `prob_`·`score_` 가 모두
 * 있고(§0), 정답 역할의 이름으로 `true_labels` 도 쓰인다(§4-1). 어느 쪽이든 사용자가 컬럼
 * 매핑 단계에서 역할을 확정하므로 평가 결과는 달라지지 않는다.
 *
 * 업로드 화면 쪽을 함께 바꾸지 않은 이유: 기존 화면은 그대로 동작해야 하는 범위였다.
 * 두 예시를 한 파일에 둔 것은 **차이를 다음 사람이 보게** 하려는 것이다.
 */
export function getComposerCsvExample(taskType: TaskType): string {
  if (taskType === "binary") {
    return [
      "id,y_true,y_pred,score,latency_ms",
      "S001,1,1,0.91,12",
      "S002,0,1,0.62,9",
      "S003,0,0,0.08,11",
    ].join("\n");
  }

  if (taskType === "multilabel") {
    // S003 의 빈 정답 칸은 "레이블 없음" 을 보여주려고 일부러 둔 것이다.
    return [
      "id,true_labels,pred_labels,score_sports,score_news",
      "S001,sports|news,sports,0.92,0.41",
      "S002,news,news,0.08,0.88",
      "S003,,news,0.12,0.57",
    ].join("\n");
  }

  return [
    "id,y_true,y_pred,prob_cat,prob_dog,prob_bird",
    "S001,cat,cat,0.81,0.12,0.07",
    "S002,dog,bird,0.10,0.35,0.55",
    "S003,bird,bird,0.05,0.15,0.80",
  ].join("\n");
}

/** ① 예시 표 아래 한 줄 안내. 유형마다 필수 컬럼 규칙이 다르다. */
export function getComposerColumnNote(taskType: TaskType): string {
  if (taskType === "binary") {
    return "정답은 필수, 예측과 양성 확률(score) 중 하나는 필수입니다. 확률이 있어야 AUROC 같은 곡선 지표를 쓸 수 있고, latency_ms 는 선택입니다.";
  }

  if (taskType === "multilabel") {
    return "레이블은 | 로 구분하고 빈칸은 레이블 없음입니다. 정답은 필수, 예측과 레이블별 점수(score_레이블명) 중 하나는 필수입니다.";
  }

  return "정답은 필수, 예측과 클래스별 확률(prob_클래스명) 중 하나는 필수입니다. 확률만 있으면 가장 높은 클래스를 예측으로 씁니다.";
}
