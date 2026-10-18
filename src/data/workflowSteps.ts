/**
 * 단계 카탈로그 — 어떤 단계가 있고, 어디로 가는지.
 *
 * 종전에는 이 사실이 세 군데에 흩어져 있었다: `STEP` 상수(번호), `STEP_PATHS`(경로),
 * `StepTabs` 의 지역 배열(라벨·아이콘). 셋을 묶는 것은 **배열 위치**뿐이어서 순서가 바뀌면
 * 조용히 어긋났다(docs/WORKFLOW_REDESIGN.md §3.2 가 명명 상수로 한 번 줄인 문제다).
 *
 * 이제 한 배열이 라벨과 경로를 함께 들고, 번호 대신 `StepId` 로 가리킨다. **이 배열의 순서는
 * 걸을 순서가 아니다** — 사용자가 재료 고르기 다이어그램에서 정한 카드 순서를 카드의 `steps` 로
 * 펼친 것이 걸을 순서다(`utils/domain/workflowSteps.ts` 의 `buildStepList`,
 * docs/MATERIAL_PICKER.md §11). 어느 단계가 나타나는지도 카드가 정한다 — 넣은 카드의 단계만
 * 나타난다.
 */
import type { StepId } from "../types/workflow.types";

export interface StepDefinition {
  id: StepId;
  /**
   * 단계 표시줄에 보이는 이름. 그 단계가 받는 카드의 이름을 따른다(docs/MATERIAL_PICKER.md §8).
   * 아이콘은 없다 — 세로 표시줄은 이름과 완료 표시만 둔다(§9).
   */
  label: string;
  /** `/app/*` 고정 경로. run 에 매인 단계에는 없다. */
  path?: string;
  /**
   * run id 가 있어야 열 수 있는 단계 — 경로가 `/report/<runId>/...` 다.
   * 평가를 실행해야 생기는 화면이라 단계 이름만으로는 목적지를 만들 수 없다.
   */
  runScoped?: boolean;
  /**
   * run 경로의 마지막 조각. `runScoped` 이면서 이 값이 없으면 `/report/<runId>` 자체다.
   * 경로↔단계를 양방향으로 옮기는 근거이기도 하다(`stepIdToPath`·`pathToStepId`).
   */
  runSegment?: string;
}

/**
 * 단계 정의. 카드가 받는 단계(①~⑨)와, 카드 순서와 무관하게 늘 맨 끝에 오는 두 단계(검증,
 * 확인과 생성)다.
 *
 * ⑥ ⑦ ⑧ 은 종전에 "데이터 정보" 한 단계로 묶여 있었다. 사용자가 순서를 정하면서 셋이 떨어질 수
 * 있게 됐으므로(예: 테스트 데이터 → 평가 데이터 → 학습 데이터) 카드마다 단계를 둔다.
 *
 * run 은 검증에서 만들어지므로 그 앞의 화면은 모두 `/app/*` 다. 성적서만 run 에 매인다.
 */
export const STEP_CATALOG: StepDefinition[] = [
  { id: "clientInfo", label: "의뢰자 정보", path: "/app/client-info" },
  { id: "model", label: "평가 대상 모델", path: "/app/model" },
  { id: "modelEnv", label: "모델 설정과 실행 환경", path: "/app/model-env" },
  // ① 평가 데이터는 업로드와 컬럼 매핑 두 화면에서 받는다.
  { id: "upload", label: "평가 데이터", path: "/app/data-upload" },
  { id: "mapping", label: "컬럼 매핑", path: "/app/column-mapping" },
  { id: "trainingData", label: "학습 데이터", path: "/app/training-data" },
  { id: "testData", label: "테스트 데이터", path: "/app/test-data" },
  { id: "groundTruth", label: "정답 라벨", path: "/app/ground-truth" },
  // 평가 관점은 지표 화면의 목적별 점검·추천 지표가 읽는 답이다. 순서는 사용자가 정하지만 지표보다
  // 앞에 두기를 권한다(`utils/domain/cardOrder.ts` 의 ORDER_HINTS).
  { id: "perspective", label: "평가 관점", path: "/app/perspective" },
  { id: "metrics", label: "지표와 합격 기준", path: "/app/metrics" },
  // 아래 둘은 카드가 아니다. 카드 순서와 무관하게 늘 맨 끝이다 — 백엔드는 지표 목록 없이 검증을
  // 받지 않고, 성적서는 검증이 만든 run 에 매인다.
  { id: "validation", label: "검증", path: "/app/data-validation" },
  // 성적서는 `/report/<runId>` 자체다 — 뒤에 붙는 조각이 없다. 평가 API 도 여기서 처음 불린다.
  { id: "report", label: "확인과 생성", runScoped: true },
];

/** 카드 순서와 무관하게 맨 끝에 붙는 단계. */
export const TRAILING_STEP_IDS: StepId[] = ["validation", "report"];

/** 카탈로그에서 단계 하나를 찾는다. */
export function getStepDefinition(id: StepId): StepDefinition {
  const step = STEP_CATALOG.find((item) => item.id === id);
  if (!step) throw new Error("Unknown workflow step: " + id);
  return step;
}
