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
  BarChart3,
  Building2,
  Columns3,
  Compass,
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
   * 단계 탭에 보이는 이름.
   *
   * 새로 만드는 화면만 한국어다. 기존 화면의 라벨은 영어 그대로 둔다 — 문구 한국어화는
   * 기존 테스트가 영문 문자열을 찾고 있어 단독 작업으로 미뤄둔 항목이다
   * (docs/WORKFLOW_REDESIGN.md §6.3).
   */
  label: string;
  Icon: LucideIcon;
  /** `/app/*` 고정 경로. run 에 매인 단계는 없다. */
  path?: string;
  /**
   * run id 가 있어야 열 수 있는 단계 — 경로가 `/report/<runId>/...` 다.
   * 평가를 실행해야 생기는 화면이라 단계 이름만으로는 목적지를 만들 수 없다.
   */
  runScoped?: boolean;
  /**
   * 이 선택 카드 중 **하나라도** 켜져 있을 때만 나타난다. 없으면 항상 나타난다.
   * 평가만 하는 사용자는 6단계에서 끝나고 7~10단계는 성적서를 발급할 때 걷는다.
   */
  requiresCards?: OptionalCardId[];
}

/** 정본 순서. 최소 구성이면 8개, 전체면 10개가 된다. */
export const STEP_CATALOG: StepDefinition[] = [
  // ─── 평가 구간 ──────────────────────────────────────────────────────────
  { id: "upload", label: "Data upload", Icon: Upload, path: "/app/data-upload" },
  { id: "perspective", label: "평가 관점", Icon: Compass, path: "/app/perspective" },
  { id: "metrics", label: "Metrics", Icon: ListChecks, path: "/app/metrics" },
  { id: "mapping", label: "Column mapping", Icon: Columns3, path: "/app/column-mapping" },
  { id: "validation", label: "Validation", Icon: ShieldCheck, path: "/app/data-validation" },
  { id: "summary", label: "Evaluation", Icon: BarChart3, runScoped: true },

  // ─── 발급 구간 — 평가와 무관한 정보가 평가를 막지 않도록 뒤에 둔다 ──────────
  {
    id: "dataInfo",
    label: "데이터 정보",
    Icon: Database,
    runScoped: true,
    requiresCards: ["trainingData", "testData", "groundTruth"],
  },
  {
    id: "modelEnv",
    label: "모델과 환경",
    Icon: Server,
    runScoped: true,
    requiresCards: ["modelEnv"],
  },
  { id: "clientInfo", label: "Report details", Icon: Building2, runScoped: true },
  { id: "report", label: "Result", Icon: FileBarChart, runScoped: true },
];

/** 카탈로그에서 단계 하나를 찾는다. */
export function getStepDefinition(id: StepId): StepDefinition {
  const step = STEP_CATALOG.find((item) => item.id === id);
  if (!step) throw new Error("Unknown workflow step: " + id);
  return step;
}
