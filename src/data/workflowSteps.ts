/**
 * 단계 카탈로그 — 어떤 단계가 있고, 언제 나타나고, 어디로 가는지.
 *
 * 종전에는 이 사실이 세 군데에 흩어져 있었다: `STEP` 상수(번호), `STEP_PATHS`(경로),
 * `StepTabs` 의 지역 배열(라벨·아이콘). 셋을 묶는 것은 **배열 위치**뿐이어서 순서가 바뀌면
 * 조용히 어긋났다(docs/WORKFLOW_REDESIGN.md §3.2 가 명명 상수로 한 번 줄인 문제다).
 *
 * 이제 한 배열이 셋을 함께 들고, 번호 대신 `StepId` 로 가리킨다. 배열 순서가 정본 순서이고,
 * 실제로 걷는 목록은 `utils/domain/workflowSteps.ts` 의 `buildStepList` 가 카드 선택에서
 * 계산한다(docs/COMPOSER_COMPONENTS.md "카드별 입력 단계").
 */
import {
  Building2,
  Columns3,
  Database,
  FileBarChart,
  ListChecks,
  Server,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { OptionalCardId } from "../types/reportComposer.types";
import type { StepId } from "../types/workflow.types";

export interface StepDefinition {
  id: StepId;
  /**
   * 단계 탭에 보이는 이름. 그 단계가 받는 카드의 이름을 따른다(docs/MATERIAL_PICKER.md §8).
   */
  label: string;
  Icon: LucideIcon;
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
  /** 이 선택 카드 중 **하나라도** 켜져 있을 때만 나타난다. 없으면 항상 나타난다. */
  requiresCards?: OptionalCardId[];
}

/**
 * 정본 순서. 최소 구성이면 6개, 전체면 8개가 된다.
 *
 * 검증 뒤는 **구성 화면의 카드 순서**를 따른다 — ③ 의뢰자 정보 → ⑥ ⑦ ⑧ 데이터 → ⑨ 모델 설정.
 * 검증 앞은 카드 순서를 그대로 따를 수 없다. 매핑이 고른 지표에 기대고(백엔드도 지표 없이는
 * 검증을 받지 않는다), ⑤ 평가 관점은 지표를 권하는 근거라 지표 화면에 붙어 있어야 한다
 * (docs/WORKFLOW_REDESIGN.md §11). 이 규칙은 `workflowSteps.test.ts` 의 카드 순서 테스트가 지킨다.
 */
export const STEP_CATALOG: StepDefinition[] = [
  // ─── 평가 입력 — 파일·지표·매핑을 받고 검증에서 run 을 만든다 ────────────────
  { id: "upload", label: "평가 데이터", Icon: Upload, path: "/app/data-upload" },
  // ⑤ 평가 관점은 지표를 고르는 근거라 Metrics 화면 맨 위에 있다 — 단계를 따로 두지 않는다.
  { id: "metrics", label: "지표와 합격 기준", Icon: ListChecks, path: "/app/metrics" },
  { id: "mapping", label: "컬럼 매핑", Icon: Columns3, path: "/app/column-mapping" },
  { id: "validation", label: "검증", Icon: ShieldCheck, path: "/app/data-validation" },

  // ─── 성적서 입력 — 카드 순서대로. run 이 생긴 뒤라 경로가 run 에 매인다 ────────
  {
    id: "clientInfo",
    label: "의뢰자 정보",
    Icon: Building2,
    runScoped: true,
    runSegment: "issue-info",
  },
  {
    id: "dataInfo",
    label: "데이터 정보",
    Icon: Database,
    runScoped: true,
    runSegment: "data-info",
    requiresCards: ["trainingData", "testData", "groundTruth"],
  },
  {
    id: "modelEnv",
    label: "모델 설정과 실행 환경",
    Icon: Server,
    runScoped: true,
    runSegment: "model-env",
    requiresCards: ["modelEnv"],
  },
  // 성적서는 `/report/<runId>` 자체다 — 뒤에 붙는 조각이 없다. 평가 API 도 여기서 처음 불린다.
  { id: "report", label: "확인과 생성", Icon: FileBarChart, runScoped: true },
];

/** 카탈로그에서 단계 하나를 찾는다. */
export function getStepDefinition(id: StepId): StepDefinition {
  const step = STEP_CATALOG.find((item) => item.id === id);
  if (!step) throw new Error("Unknown workflow step: " + id);
  return step;
}
