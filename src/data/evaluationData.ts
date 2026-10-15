export type TaskType = "binary" | "multiclass" | "multilabel";

export type AdditionalInputField = "beta" | "positiveClass";

export interface MetricDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  supportedTaskTypes: TaskType[];
  additionalFields?: AdditionalInputField[];
  probabilityRequiredFor?: TaskType[];
  formula?: string;
  isCommon?: boolean;
  /**
   * 지표 방향성(합·불 판정·기준 표기의 단일 출처). 미지정/true = 높을수록 좋음(값 ≥ 목표 → 합격),
   * false = 낮을수록 좋음(값 ≤ 목표 → 합격). 낮을수록 좋은 지표: M6/8/14/15/18/19/23.
   */
  higherIsBetter?: boolean;
}

export type RequiredColumnCode =
  | "id"
  | "y_true"
  | "y_pred"
  | "score"
  | "prob_class_*"
  | "prob_label_*"
  | "latency";

export interface RequiredColumnDisplay {
  code: RequiredColumnCode;
  label: string;
  description: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  binary: "Binary",
  multiclass: "Multi-class",
  multilabel: "Multi-label",
};

/**
 * 한국어 유형 이름.
 *
 * 표기는 `docs/UI_DESIGN.md` §3·§4 를 따른다 — 그 문서가 유형을 **사용자에게 보여주는 방식**을
 * 정하는 쪽이고, `docs/COMPOSER_DESIGN.md` 의 유형 배지도 거기를 가리킨다.
 *
 * 앱 화면은 모두 이 표를 쓴다(docs/MATERIAL_PICKER.md §8). 위 `TASK_TYPE_LABELS`(영문)는
 * 성적서와 AI 서술에 넘기는 유형 이름이라 그대로 둔다 — 화면 문구를 바꾸면서 출력까지
 * 바꾸지 않는다.
 */
export const TASK_TYPE_LABELS_KO: Record<TaskType, string> = {
  binary: "이진 분류",
  multiclass: "다중 클래스",
  multilabel: "다중 레이블",
};

export const METRICS: MetricDefinition[] = [
  { id: "M1", name: "Accuracy", subtitle: "전체 정확도", description: "모델이 맞게 예측한 비율입니다.", supportedTaskTypes: ["binary", "multiclass"], formula: "(TP + TN) / Total", isCommon: true },
  { id: "M2", name: "Precision", subtitle: "양성 예측의 정밀도", description: "양성으로 예측한 것 중 실제 양성인 비율입니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "binary: TP/(TP+FP) · 그 외: 클래스별 TP/(TP+FP) 의 macro 평균", isCommon: true },
  { id: "M3", name: "Recall", subtitle: "재현율", description: "실제 양성 중 모델이 찾아낸 비율입니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "binary: TP/(TP+FN) · 그 외: 클래스별 TP/(TP+FN) 의 macro 평균", isCommon: true },
  { id: "M4", name: "F1 Score", subtitle: "조화 평균", description: "정밀도와 재현율을 하나로 묶어 균형을 봅니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "binary: 2PR/(P+R) · 그 외: 클래스별 F1 의 macro 평균(macro-P·macro-R 의 조화평균이 아님)", isCommon: true },
  { id: "M5", name: "F-beta Score", subtitle: "가중 F 점수", description: "β로 정밀도와 재현율의 비중을 조정합니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["beta", "positiveClass"], formula: "binary: (1+β²)PR/(β²P+R) · 그 외: 클래스별 Fβ 의 macro 평균", isCommon: true },
  { id: "M6", higherIsBetter: false, name: "KL Divergence", subtitle: "분포 차이", description: "정답 레이블의 분포와 모델이 예측한 클래스 레이블의 분포 간의 차이(Target Drift)를 계산합니다.", supportedTaskTypes: ["binary", "multiclass"], formula: "∑ P(x) * log(P(x) / Q(x))", isCommon: true },
  { id: "M7", name: "Specificity", subtitle: "특이도", description: "실제 음성 중 음성으로 맞게 예측한 비율입니다.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], formula: "TN / (TN + FP)" },
  { id: "M8", higherIsBetter: false, name: "FPR", subtitle: "위양성률", description: "실제 음성을 양성으로 잘못 예측한 비율입니다.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], formula: "FP / (FP + TN)" },
  { id: "M9", name: "AUROC", subtitle: "ROC 곡선 아래 면적", description: "모든 임계값에서 양성과 음성을 얼마나 잘 가르는지 봅니다.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"], formula: "Area under ROC Curve" },
  { id: "M10", name: "AUPRC", subtitle: "PR 곡선 아래 면적", description: "모든 임계값에서 정밀도와 재현율이 맞바뀌는 정도를 봅니다.", supportedTaskTypes: ["binary"], additionalFields: ["positiveClass"], probabilityRequiredFor: ["binary"], formula: "Area under PR Curve" },
  { id: "M11", name: "Macro Average", subtitle: "클래스 단순 평균", description: "클래스별 지표를 같은 비중으로 평균합니다.", supportedTaskTypes: ["multiclass"], formula: "클래스별 P·R·F1 의 macro 평균 — (Class1 + … + ClassN) / N" },
  { id: "M12", name: "Micro Average", subtitle: "전체 표본 평균", description: "모든 표본을 한데 모아 지표를 계산합니다.", supportedTaskTypes: ["multiclass"], formula: "micro 평균 — 전 클래스의 TP·FP·FN 을 합산해 P·R·F1 을 계산" },
  { id: "M13", name: "Weighted Average", subtitle: "표본 수 가중 평균", description: "클래스별 지표를 클래스 표본 수로 가중 평균합니다.", supportedTaskTypes: ["multiclass"], formula: "weighted 평균 — 클래스별 지표를 support 로 가중 평균" },
  { id: "M14", higherIsBetter: false, name: "Distribution Diff (MC)", subtitle: "클래스 분포 차이", description: "실제 클래스 분포와 예측 클래스 분포를 비교합니다.", supportedTaskTypes: ["multiclass"], formula: "0.5 * ∑ |P(x) - Q(x)|" },
  { id: "M15", higherIsBetter: false, name: "Hamming Loss", subtitle: "레이블 불일치 비율", description: "멀티레이블에서 레이블 단위로 틀린 비율입니다.", supportedTaskTypes: ["multilabel"], formula: "∑ (y_true ≠ y_pred) / (Samples * Labels)" },
  { id: "M16", name: "Exact Match Ratio", subtitle: "완전 일치 비율", description: "모든 레이블이 정확히 맞은 표본의 비율입니다.", supportedTaskTypes: ["multilabel"], formula: "∑ (All_labels_match) / Samples" },
  { id: "M17", name: "Jaccard Index", subtitle: "집합 겹침 정도", description: "예측 레이블과 실제 레이블의 교집합을 합집합으로 나눈 값입니다.", supportedTaskTypes: ["multilabel"], formula: "|y_true ∩ y_pred| / |y_true ∪ y_pred|" },
  { id: "M18", higherIsBetter: false, name: "Distribution Diff (ML)", subtitle: "레이블 분포 차이", description: "실제 레이블 분포와 예측 레이블 분포를 비교합니다.", supportedTaskTypes: ["multilabel"], formula: "1 - cos(freq(y_true), freq(y_pred))" },
  { id: "M19", higherIsBetter: false, name: "Log Loss", subtitle: "확률 오차", description: "확신했지만 틀린 확률 예측에 큰 벌점을 줍니다.", supportedTaskTypes: ["binary"], probabilityRequiredFor: ["binary"], formula: "- (y * log(p) + (1-y) * log(1-p))" },
  { id: "M20", name: "MCC", subtitle: "균형 상관계수", description: "혼동행렬의 네 칸을 모두 반영하는 이진 분류 지표입니다.", supportedTaskTypes: ["binary"], formula: "(TP*TN - FP*FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))" },
  { id: "M21", name: "Confusion Matrix", subtitle: "예측 행렬", description: "클래스·레이블별로 실제와 예측의 개수를 교차해 보입니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], formula: "실제/예측 클래스의 교차 분포를 행렬로 산출", isCommon: true },
  { id: "M22", name: "Class-wise Metric", subtitle: "클래스별 상세", description: "지표를 클래스·레이블마다 나눠 보입니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], additionalFields: ["positiveClass"], formula: "개별 클래스별 P/R/F1 산출", isCommon: true },
  { id: "M23", higherIsBetter: false, name: "Imbalance Ratio", subtitle: "클래스 균형 점검", description: "평가 데이터 자체의 클래스 균형을 봅니다.", supportedTaskTypes: ["binary", "multiclass", "multilabel"], formula: "max(class count) / min(class count)", isCommon: true },
];

const RECOMMENDED_METRICS: Record<TaskType, string[]> = {
  binary: ["M1", "M2", "M3", "M4", "M9", "M21", "M22", "M23"],
  multiclass: ["M1", "M2", "M3", "M4", "M11", "M21", "M22", "M23"],
  // M1 은 multilabel 에서 M16 과 값이 같아 제거됐다(결정 2). 같은 측정을 정확한
  // 이름으로 추천한다 — 그냥 빼면 추천 세트에서 '전 라벨 일치' 계열이 사라진다.
  multilabel: ["M16", "M2", "M3", "M4", "M15", "M21", "M22", "M23"],
};

/**
 * 지표별 요구 컬럼 — 백엔드 `METRIC_REQUIREMENTS`(app/core/schemas.py)와 대응한다.
 *
 * **`id`(sample_id)는 여기 들어가지 않는다.** SPEC §0 이 '선택(권장)'으로 규정하고
 * 백엔드 요구표에도 sample_id 가 한 번도 없는데, 종전에는 43개 항목이 전부 "id" 로
 * 시작해 매핑 화면이 '다음'을 하드 차단했다 — id 컬럼이 없는 데이터셋은 백엔드까지
 * 가보지도 못했다(ISSUES.md A-13). id 는 여전히 매핑 **가능**하고 중복 검사에 쓰인다.
 */
const REQUIRED_COLUMNS_BY_METRIC: Record<TaskType, Partial<Record<string, RequiredColumnCode[]>>> = {
  binary: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M7: ["y_true", "y_pred"],
    M8: ["y_true", "y_pred"],
    M9: ["y_true", "score"],
    M10: ["y_true", "score"],
    M19: ["y_true", "score"],
    M20: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multiclass: {
    M1: ["y_true", "y_pred"],
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M6: ["y_true", "y_pred"],
    M11: ["y_true", "y_pred"],
    M12: ["y_true", "y_pred"],
    M13: ["y_true", "y_pred"],
    M14: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
  multilabel: {
    M2: ["y_true", "y_pred"],
    M3: ["y_true", "y_pred"],
    M4: ["y_true", "y_pred"],
    M5: ["y_true", "y_pred"],
    M15: ["y_true", "y_pred"],
    M16: ["y_true", "y_pred"],
    M17: ["y_true", "y_pred"],
    M18: ["y_true", "y_pred"],
    M21: ["y_true", "y_pred"],
    M22: ["y_true", "y_pred"],
    M23: ["y_true"],
  },
};

/**
 * task_type 별로 매핑 가능한 역할 (백엔드 app/core/schemas.py 의 VALID_ROLES_BY_TASK 와 대응).
 *
 * 매핑 화면 드롭다운의 선택지가 여기서 나온다. 여기에 없는 역할을 고르면
 * translateRoleToBackend 가 조용히 "ignore" 로 강등해버려서, 사용자는 매핑했다고 믿는데
 * 그 컬럼이 평가에서 통째로 빠진다. 그래서 애초에 선택지로 노출하지 않는다.
 * ("ignore" 는 모든 task 공통이라 여기 넣지 않고 드롭다운에서 따로 붙인다.)
 */
export const MAPPABLE_ROLES_BY_TASK: Record<TaskType, RequiredColumnCode[]> = {
  binary: ["id", "y_true", "y_pred", "score", "latency"],
  // 확률 컬럼은 세 task 모두에서 정식 입력이다(2026-09-07 결정 1). 하드 예측이 없으면
  // 백엔드가 확률에서 예측을 파생한다 — binary 는 임계값, multiclass 는 argmax,
  // multilabel 은 레이블별 임계값. PREDICTION_ROLE_ALTERNATIVES 참조.
  multiclass: ["id", "y_true", "y_pred", "prob_class_*", "latency"],
  multilabel: ["id", "y_true", "y_pred", "prob_label_*", "latency"],
};

/**
 * 예측 역할을 대신할 수 있는 확률 역할 — 백엔드 `PREDICTION_ROLES_BY_TASK`
 * (Capstone_Back/app/core/schemas.py)의 거울이다. 두 표가 어긋나면 화면이 허용한
 * 매핑을 백엔드가 거절하거나 그 반대가 된다(metricColumnContract.test.ts 가 고정).
 *
 * **왜 별도 표인가.** `REQUIRED_COLUMNS_BY_METRIC` 의 값은 배열(AND 의미)이라
 * SPEC §1~§3 이 규정한 "y_pred **또는** 확률"이라는 택일을 담을 수 없다. 택일을
 * 이 표 하나로 분리해 요구표는 그대로 두고, 누락 판정만 이 규칙을 통과시킨다.
 */
export const PREDICTION_ROLE_ALTERNATIVES: Record<
  TaskType,
  { primary: RequiredColumnCode; alternatives: RequiredColumnCode[] }
> = {
  binary: { primary: "y_pred", alternatives: ["score"] },
  multiclass: { primary: "y_pred", alternatives: ["prob_class_*"] },
  multilabel: { primary: "y_pred", alternatives: ["prob_label_*"] },
};

/**
 * 요구 역할 중 실제로 배정되지 않은 것.
 *
 * 예측 역할은 확률 역할이 배정돼 있으면 충족된 것으로 본다 — 백엔드가 확률에서
 * 예측을 파생하기 때문이다(ISSUES.md A-01·A-02). 종전에는 단순히 개수 0 만 봐서,
 * 확률만 가진 사용자가 '다음' 버튼이 눌리지 않아 백엔드까지 가보지도 못했다.
 */
export function resolveMissingRoleCodes(
  taskType: TaskType,
  requiredCodes: readonly RequiredColumnCode[] | readonly string[],
  roleCounts: Record<string, number>,
): string[] {
  const { primary, alternatives } = PREDICTION_ROLE_ALTERNATIVES[taskType];
  const has = (code: string) => (roleCounts[code] ?? 0) > 0;

  return requiredCodes.filter((code) => {
    if (has(code)) return false;
    if (code === primary && alternatives.some(has)) return false;
    return true;
  }) as string[];
}

const COLUMN_ORDER: RequiredColumnCode[] = [
  "id",
  "y_true",
  "y_pred",
  "score",
  "prob_class_*",
  "prob_label_*",
  "latency",
];

const COLUMN_DISPLAY: Record<RequiredColumnCode, RequiredColumnDisplay> = {
  id: {
    code: "id",
    label: "샘플 ID",
    description: "샘플마다 붙는 고유 식별자입니다.",
  },
  y_true: {
    code: "y_true",
    label: "정답 레이블",
    description: "실제 정답 값입니다. 멀티레이블이면 정답 레이블 묶음을 한 가지 형식으로 적습니다.",
  },
  y_pred: {
    code: "y_pred",
    label: "예측 레이블",
    description: "모델이 예측한 값입니다. 멀티레이블이면 y_true 와 같은 형식으로 예측 레이블 묶음을 적습니다.",
  },
  score: {
    code: "score",
    label: "양성 클래스 점수",
    description: "0과 1 사이의 모델 확신 점수입니다.",
  },
  "prob_class_*": {
    code: "prob_class_*",
    label: "클래스별 확률",
    description: "클래스마다 확률 컬럼이 하나씩 있습니다. 예: prob_cat, prob_dog",
  },
  "prob_label_*": {
    code: "prob_label_*",
    label: "레이블별 확률",
    description: "레이블마다 확률 컬럼이 하나씩 있습니다.",
  },
  latency: {
    code: "latency",
    label: "추론 응답시간(ms)",
    description: "선택. 샘플마다 걸린 추론 시간(밀리초)이며, 응답시간 통계(평균·p50·p95·p99)에 씁니다.",
  },
};

export function getAvailableMetrics(taskType?: string): MetricDefinition[] {
  if (!taskType || !isTaskType(taskType)) {
    return METRICS;
  }

  return METRICS.filter((m) => m.supportedTaskTypes.includes(taskType));
}

export function getMetricDisplayId(metricId: string): string {
  return metricId;
}

export function getRecommendedMetricIds(taskType?: string): string[] {
  if (!taskType || !isTaskType(taskType)) {
    return [];
  }

  return RECOMMENDED_METRICS[taskType];
}

export function getSelectedMetrics(taskType: TaskType, selectedIds: string[]): MetricDefinition[] {
  const selectedSet = new Set(selectedIds);
  return getAvailableMetrics(taskType).filter((m) => selectedSet.has(m.id));
}

export function getRequiredColumnsForSelection(taskType: TaskType, selectedIds: string[]): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>();
  const mapping = REQUIRED_COLUMNS_BY_METRIC[taskType];

  for (const id of selectedIds) {
    for (const column of mapping[id] ?? []) {
      columns.add(column);
    }
  }

  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

export function getRequiredColumnsForMetric(taskType: TaskType, metricId: string): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>(REQUIRED_COLUMNS_BY_METRIC[taskType][metricId] ?? []);
  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

/**
 * 지표를 고르기 전에 매핑에 꼭 필요한 역할 — 정답과 예측. 예측은 확률 컬럼이 있으면 충족된 것으로
 * 본다(`resolveMissingRoleCodes`). 백엔드 `/api/confirm-mapping` 도 지표 목록이 비면 같은 기준으로
 * 판정한다(정답은 늘 필수, 예측 또는 확률 중 하나).
 *
 * 컬럼 매핑이 지표 선택보다 앞이라(docs/MATERIAL_PICKER.md §3) 매핑 화면은 처음에 이 기준을 쓴다.
 */
export function getBaseRequiredColumns(taskType: TaskType): RequiredColumnDisplay[] {
  void taskType;
  return [COLUMN_DISPLAY.y_true, COLUMN_DISPLAY.y_pred];
}

export function getRequiredColumnsForTaskType(taskType: TaskType): RequiredColumnDisplay[] {
  const columns = new Set<RequiredColumnCode>();
  const mapping = REQUIRED_COLUMNS_BY_METRIC[taskType];

  for (const metricColumns of Object.values(mapping)) {
    for (const column of metricColumns ?? []) {
      columns.add(column);
    }
  }

  return COLUMN_ORDER.filter((code) => columns.has(code)).map((code) => COLUMN_DISPLAY[code]);
}

function isTaskType(value: string): value is TaskType {
  return value === "binary" || value === "multiclass" || value === "multilabel";
}
