/**
 * 판 4 2절 시험 대상의 글자(판 4 라운드 S4 ④ — 렌더러 갈래 b1 전용). 표 소제목·칸 이름은 예시본 글자 그대로, 학습 데이터 예시
 * 표(계획 4절 P1)의 칸 이름·빈 칸 글은 판 3 `DatasetSection` 의 비공개 부품 글 그대로다(치환할 말 없음). 고정 문구 26·부록 B30 은
 * 공용 상수(`FIXED_26_*`, `B30_NOT_PROVIDED`)를 쓴다.
 */

/** 2.1 표 위 소제목(예시본). */
export const TARGET_HYPERPARAMETER_TITLE = "하이퍼파라미터";
export const TARGET_ENVIRONMENT_TITLE = "학습·추론 환경";
export const TARGET_HYPERPARAMETER_HEADERS = ["이름", "값"] as const;

/** 2.1 대상 모델 표 칸 이름(예시본 순서). */
export const TARGET_MODEL_LABEL = {
  modelName: "모델명",
  version: "버전",
  category: "모델 분류",
  purpose: "모델 용도",
  algorithm: "알고리즘",
} as const;

/** 2.1 학습·추론 환경 표 칸 이름(예시본 순서 — 의뢰자 환경 다섯 칸, 그 뒤 가속 두 칸은 재료 줄 이름 그대로). */
export const TARGET_ENVIRONMENT_LABEL = {
  os: "운영체제",
  cpu: "CPU",
  gpu: "GPU",
  memory: "메모리",
  software: "소프트웨어",
} as const;

/** 2.2 평가 데이터 표 머리 행과 칸 이름(예시본). */
export const TARGET_EVAL_HEADERS = ["항목", "내용", "출처"] as const;
export const TARGET_EVAL_LABEL = {
  fileName: "업로드 파일명",
  hash: "파일 해시(SHA-256)",
  size: "파일 크기",
  format: "데이터셋 형식",
  inputColumns: "입력 컬럼",
  sampleCount: "평가 데이터셋 샘플 수",
  taskType: "평가 유형",
  classes: "감지된 클래스 수",
} as const;

/** 2.2 칸 값의 틀(예시본 — "171개", "2개 — 클래스 목록: benign, malignant", 정해진 것 4 "3,727바이트"). */
export const SAMPLE_COUNT_TEXT = "{n}개";
export const CLASSES_TEXT = "{n}개 — 클래스 목록: {목록}";
export const FILE_SIZE_TEXT = "{n}바이트";

/** 2.2 아래 표 소제목(예시본)과 클래스 레이블 설명 표 머리 행. */
export const TARGET_GROUND_TRUTH_TITLE = "정답 라벨";
export const TARGET_CLASS_DESCRIPTION_TITLE = "클래스 레이블 설명";
export const TARGET_CLASS_DESCRIPTION_HEADERS = ["클래스", "설명"] as const;
/** 설명이 빈 클래스 칸(판 3 클래스 레이블 설명 표 글 그대로). */
export const CLASS_DESCRIPTION_EMPTY = "설명 미입력";

/** 2.3 학습 데이터 예시 표(판 3 `TrainingDatasetExampleTable` 글 그대로). */
export const TRAINING_EXAMPLE_TITLE = "학습 데이터 예시";
export const TRAINING_EXAMPLE_HEADERS = ["적합 예시", "부적합 예시"] as const;
export const TRAINING_EXAMPLE_EMPTY = "등록된 {이름} 없음";
