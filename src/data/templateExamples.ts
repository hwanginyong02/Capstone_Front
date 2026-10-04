/**
 * 분류 유형별 평가 파일 예시.
 *
 * 예시는 `docs/COMPOSER_COMPONENTS.md` ① 평가 데이터의 것을 그대로 옮긴 것이고, 성적서 구성
 * 화면의 "예시 파일 보기"와 업로드 화면의 "Data template" 이 **같은 것을 쓴다.**
 *
 * 종전에는 두 벌이었다 — 업로드 화면은 `inference_time_ms`·`prob_class_*`·`y_true` 를,
 * 문서는 `latency_ms`·`prob_*`·`true_labels` 를 썼다. 둘 다 SPEC.md 가 허용하는 표기라
 * (확률 컬럼 접두어 §0, 정답 역할 이름 §4-1) 어느 쪽이든 매핑 단계에서 역할을 확정하면
 * 결과는 같지만, **사용자가 두 화면에서 다른 예시를 보는 것** 자체가 혼란이었다.
 */
import type { TaskType } from "./evaluationData";

/** 유형별 예시 CSV. 첫 줄이 머리글이다. */
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

/** 같은 내용의 JSON 형태. 컬럼명은 CSV 와 반드시 같아야 한다. */
export function getComposerJsonExample(taskType: TaskType): string {
  const sample =
    taskType === "binary"
      ? '{ "id": "S001", "y_true": 1, "y_pred": 1, "score": 0.91, "latency_ms": 12 }'
      : taskType === "multilabel"
        ? '{ "id": "S001", "true_labels": "sports|news", "pred_labels": "sports", "score_sports": 0.92, "score_news": 0.41 }'
        : '{ "id": "S001", "y_true": "cat", "y_pred": "cat", "prob_cat": 0.81, "prob_dog": 0.12, "prob_bird": 0.07 }';

  return ['{', '  "samples": [', "    " + sample, "  ]", "}"].join("\n");
}

/** 예시 아래 한 줄 안내. 유형마다 필수 컬럼 규칙이 다르다. */
export function getComposerColumnNote(taskType: TaskType): string {
  if (taskType === "binary") {
    return "The answer (y_true) is required, and you need either the prediction (y_pred) or the positive probability (score). Curve metrics such as AUROC need the probability. Latency (latency_ms) is optional.";
  }

  if (taskType === "multilabel") {
    return "Separate labels with |, and leave the cell empty for no label. The answer (true_labels) is required, and you need either the prediction (pred_labels) or a per-label score (score_<label>).";
  }

  return "The answer (y_true) is required, and you need either the prediction (y_pred) or per-class probabilities (prob_<class>). With probabilities alone, the highest class is used as the prediction.";
}
