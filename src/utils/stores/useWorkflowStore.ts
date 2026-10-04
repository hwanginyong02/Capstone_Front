/**
 * 워크플로우 전역 상태 관리 (Zustand + persist)
 *
 * 이 스토어는 전체 평가 워크플로우의 상태(각 스텝의 입력 데이터, 현재 단계, 완료 여부 등)를
 * 관리하며, 최종 평가 리포트 데이터를 생성하는 로직을 포함합니다.
 *
 * ISSUES.md E-01 — 종전에는 persist 가 없어 **새로고침 한 번으로 1~5단계 입력이 전부
 * 사라졌다.** 수십 분간 입력한 기업정보·모델정보·지표·매핑이 날아가고, 그것을 알리는
 * 신호는 6단계의 "업로드된 파일이 없습니다" 문구뿐이었다.
 *
 * `rawFile` 은 File 객체라 JSON 직렬화가 원리적으로 불가능하므로 persist 대상에서 뺀다.
 * 대신 `uploadedFile`(파일 메타)은 저장해, 재수화 후 **"파일이 있었는데 지금은 없다"** 를
 * 감지해 재업로드를 유도할 수 있게 한다.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAvailableMetrics, type TaskType } from "../../data/evaluationData";
import type { ColumnNote, MappingWarning } from "../../lib/report/backendNotices";
import type { MappingRow } from "../../types/mapping.types";
import type { ValidateDataResponseData } from "../../types/validation.types";
import type { MapWorkflowToReportInput } from "../../lib/report/mapWorkflowToFinalReport";
import {
  DEFAULT_BASIC_INFO,
  DEFAULT_DATASET_INFO,
  type BasicInfoFormData,
  type DatasetInfoFormData,
  type MetricDetailStateMap,
  type StepId,
  type UploadedFileInfo,
} from "../../types/workflow.types";
import {
  DEFAULT_COMPOSER_SELECTION,
  type ComposerPreset,
  type ComposerSelection,
  type ComposerValueMap,
  type OptionalCardId,
} from "../../types/reportComposer.types";
import { presetSelection } from "../../data/reportComposer";

/**
 * 단계 번호·경로 상수는 이 파일을 떠났다.
 *
 * 단계 목록이 성적서 구성 화면의 카드 선택에서 **계산되므로**, 고정 번호(`STEP`)와 고정
 * 경로 배열(`STEP_PATHS`)이 성립하지 않는다. 카탈로그는 `data/workflowSteps.ts`, 목록 계산과
 * 이동은 `utils/domain/workflowSteps.ts` 에 있다.
 *
 * 이 스토어가 드는 것은 **지금 어디에 있고 무엇을 마쳤는지**(`currentStepId`
 * ·`completedStepIds`)뿐이다.
 */

/** persist 스키마 버전. 저장된 상태의 의미가 바뀔 때만 올린다. */
export const WORKFLOW_PERSIST_VERSION = 6;

/**
 * 구 번호 체계(v4 까지)의 1~6 이 가리켰던 단계.
 *
 * v4→v5 마이그레이션 **전용**이다. 새 코드에서 번호로 단계를 가리키는 곳은 없다.
 */
const LEGACY_STEP_IDS: StepId[] = [
  "upload", // 1
  "metrics", // 2
  "mapping", // 3
  "validation", // 4
  "summary", // 5
  "report", // 6
];

/** v3 → v4 에서 생긴 성적서 구성 상태의 기본값. 마이그레이션과 초기 상태가 함께 쓴다. */
const INITIAL_COMPOSER_STATE = {
  composerCards: DEFAULT_COMPOSER_SELECTION,
  composerPerspective: {} as ComposerValueMap,
  composerTrainingData: {} as ComposerValueMap,
  composerTestData: {} as ComposerValueMap,
  composerGroundTruth: {} as ComposerValueMap,
  composerModelEnv: {} as ComposerValueMap,
};

/** 분류 유형이 바뀌면 비우는 입력 그룹(카드 선택은 남긴다 — 아래 `setTaskType` 참고). */
const EMPTY_COMPOSER_INPUTS = {
  composerPerspective: {} as ComposerValueMap,
  composerTrainingData: {} as ComposerValueMap,
  composerTestData: {} as ComposerValueMap,
  composerGroundTruth: {} as ComposerValueMap,
  composerModelEnv: {} as ComposerValueMap,
};

/**
 * 저장된 워크플로우 상태를 현재 규칙으로 옮긴다(순수 함수 — 테스트가 직접 호출한다).
 *
 * **v1 → v2**: multilabel 에서 M1·M11·M12·M13 이 제거됐다(ISSUES.md A-04, 결정 2).
 * 저장된 `selectedMetricIds` 에서 현재 task_type 이 노출하지 않는 지표를 걸러낸다.
 * 지표 ID 를 하드코딩하지 않고 METRICS 에서 유도하므로 노출 목록이 또 바뀌어도 그대로 둔다.
 *
 * **v2 → v3**: 단계 순서가 통째로 바뀌었다.
 *   구: 기본정보 → 지표 → 지표상세 → 업로드 → 매핑 → 검증 → 성적서
 *   신: 업로드 → 매핑 → 지표 → 검증 → 평가결과  (기관정보·목표값은 성적서 구간으로)
 *
 * 저장된 `completedSteps`·`currentStep` 은 **구 번호 체계의 숫자**다. 새 번호로 1:1
 * 대응시킬 방법이 없다 — 구 1(기본정보)·3(지표상세)은 평가 구간에서 사라졌고, 남은 것도
 * 순서가 뒤집혀 대응표가 구멍 난 집합(예: `[1, 3]`)을 만든다. 그 상태로 진입 가드
 * (`canEnterStep`)를 통과시키면 빈 화면에 갇힌다.
 *
 * 그래서 **진행 표시만 초기화하고 입력 데이터는 전부 보존한다.** 어차피 원본 파일은
 * persist 대상이 아니라 재수화 후 재업로드가 필요하므로(`onRehydrateStorage`),
 * 1단계부터 다시 밟는 것이 실제 상태와도 맞다.
 *
 * **v3 → v4**: 성적서 구성 화면이 생겼다(docs/COMPOSER_COMPONENTS.md). 선택 카드의
 * 켜짐/꺼짐(`composerCards`)과 새 입력 그룹 다섯 개가 상태에 추가됐다. 여기서는 **버릴 것이
 * 없다** — 기존 키의 뜻이 하나도 바뀌지 않았고 새 키만 생겼으므로, 기본값으로 채우기만 한다.
 * 채우지 않으면 얕은 merge 때문에 `undefined` 로 남는다(아래 주석 참고).
 *
 * **v4 → v5**: 단계 목록이 카드 선택에서 계산되기 시작했다. 진행 표시를 번호
 * (`completedSteps`·`currentStep`)에서 이름(`completedStepIds`·`currentStepId`)으로 옮긴다.
 * v2 → v3 과 달리 **1:1 대응이 성립해 진행을 버리지 않는다** — 구 1~6 이 가리켰던 단계가
 * 새 체계에 그대로 있고 순서도 같다(`LEGACY_STEP_IDS`).
 *
 * **v5 → v6**: 평가 관점이 단계에서 빠져 지표 선택 화면 안으로 들어갔다. 저장된 진행
 * 표시에 남은 `"perspective"` 는 이제 아무 단계도 가리키지 않는다 — 그대로 두면 진입
 * 가드가 목록에 없는 id 를 만나고, 현재 위치라면 갈 곳이 없다. 완료 목록에서는 지우고,
 * 현재 위치면 흡수한 단계(`metrics`)로 옮긴다. 입력값(`composerPerspective`)은 그대로
 * 살아 있다 — 받는 질문이 같고 화면만 바뀌었기 때문이다.
 */
export function migrateWorkflowState(persisted: any, version: number): any {
  if (!persisted || version >= WORKFLOW_PERSIST_VERSION) return persisted;

  let next = persisted;

  // v1 → v2
  if (version < 2) {
    const taskType = next.taskType;
    const selected = next.selectedMetricIds;
    if (taskType && Array.isArray(selected)) {
      const exposed = new Set(getAvailableMetrics(taskType).map((m) => m.id));
      next = { ...next, selectedMetricIds: selected.filter((id: string) => exposed.has(id)) };
    }
  }

  // v2 → v3 — 단계 번호 체계 교체. 진행 표시만 버리고 입력은 남긴다.
  // 숫자 1 은 **구 번호 체계의 업로드**다. 아래 v4 → v5 가 이것을 id 로 옮긴다.
  if (version < 3) {
    next = { ...next, completedSteps: [], currentStep: 1 };
  }

  // v3 → v4 — 성적서 구성 화면이 생겼다. 카드 선택과 새 입력 그룹 여섯 키를 채운다.
  //
  // 기본값을 **여기서** 넣는 이유: zustand 의 merge 는 얕아서, 옛 저장분에 없는 키는
  // 초기 상태의 값으로 채워지지 않고 `undefined` 로 남는다. 그 상태로 화면이 열리면
  // 체크박스가 `undefined` 를 읽어 선택 카드가 하나도 안 켜진 것처럼 보인다.
  // v1 → v2 와 같은 방식으로 저장분을 직접 패치한다.
  if (version < 4) {
    next = { ...next, ...INITIAL_COMPOSER_STATE };
  }

  // v4 → v5 — 진행 표시를 번호에서 이름으로 옮긴다.
  //
  // v2 → v3 과 달리 **1:1 대응이 성립한다.** 구 1~6 이 가리켰던 단계가 새 체계에도 그대로
  // 있고 순서도 같다(사이에 평가 관점이 끼어들었을 뿐이다). 그래서 진행을 버리지 않고
  // 옮긴다 — 다 걸어온 사용자를 다시 1단계로 돌려보낼 이유가 없다.
  //
  // 새로 생긴 단계(평가 관점·데이터 정보·모델과 환경·의뢰자 정보)는 미완료로 남는다.
  // 가드가 사용자를 처음 미완료 단계로 보내는데, 그 입력을 실제로 받아야 하므로 **옳은
  // 동작**이다.
  if (version < 5) {
    const legacyCompleted: unknown = next.completedSteps;
    const completedStepIds = (Array.isArray(legacyCompleted) ? legacyCompleted : [])
      .map((step: unknown) => LEGACY_STEP_IDS[Number(step) - 1])
      .filter((id): id is StepId => Boolean(id));

    const currentStepId = LEGACY_STEP_IDS[Number(next.currentStep) - 1] ?? "upload";

    const { completedSteps, currentStep, ...rest } = next;
    void completedSteps;
    void currentStep;
    next = { ...rest, completedStepIds, currentStepId };
  }

  // v5 → v6 — 평가 관점이 단계에서 빠지고 지표 선택 화면 안으로 들어갔다.
  if (version < 6) {
    const completed: unknown = next.completedStepIds;
    next = {
      ...next,
      completedStepIds: (Array.isArray(completed) ? completed : []).filter(
        (id: unknown) => id !== "perspective",
      ),
      currentStepId: next.currentStepId === "perspective" ? "metrics" : next.currentStepId,
    };
  }

  return next;
}

interface WorkflowState {
  /**
   * 지금 있는 단계와 마친 단계. **번호가 아니라 이름이다.**
   *
   * 걸을 단계 목록은 `composerCards` 에서 계산되므로 번호의 뜻이 선택에 따라 달라진다.
   * 저장소를 왕복하는 값이 그런 번호면 카드를 토글할 때마다 진행 표시가 조용히 어긋난다
   * (docs/WORKFLOW_REDESIGN.md §3.3 이 경고한 상황). 화면에 보일 번호는 목록 위치에서
   * 그때그때 만든다(`stepNumberOf`).
   */
  currentStepId: StepId;
  completedStepIds: StepId[];

  // Step 1 — Basic info
  basicInfo: BasicInfoFormData;
  taskType: TaskType | "";

  // Step 2 — Metric selection
  selectedMetricIds: string[];

  // Step 3 — Metric details
  metricDetails: MetricDetailStateMap;

  // Step 4 — Evaluation file
  uploadedFile: UploadedFileInfo | null;
  rawFile: File | null;
  metadata: any | null;
  trainingExampleFiles: UploadedFileInfo[];
  trainingUnsuitableExampleFiles: UploadedFileInfo[];
  datasetInfo: DatasetInfoFormData;

  /**
   * 결정 임계값 — 하드 예측이 없을 때 확률에서 예측을 파생하는 기준(ISSUES.md A-01).
   *
   * **성적서 합격 목표값(`metricDetails[id].targetValue`)과 다른 개념이다.**
   * 백엔드 계약 필드명도 `decision_threshold` 로 분리돼 있다.
   * 스칼라면 전 확률 컬럼 공통, 객체면 컬럼명별 값(multilabel 레이블별 임계값).
   * null 이면 백엔드가 SPEC §6 의 기본값 0.5 를 쓴다.
   */
  decisionThreshold: number | Record<string, number> | null;

  /**
   * 백엔드가 '사용자 안내용'으로 내려보낸 값들(ISSUES.md B-03·B-04·D-16·A-12).
   * 각각 4단계·5단계에서 도착하지만 **6단계 상단에 합쳐서** 보여준다 —
   * 5단계는 안내가 도착하는 순간 이미 다음 화면으로 넘어가 있다.
   */
  columnNotes: ColumnNote[];
  mappingWarnings: MappingWarning[];
  /** confirm-mapping 이 계산 가능하다고 답한 지표 ID(‘N/M’ 표시용, A-12). */
  availableMetricIds: string[] | null;

  // Step 5 — Column mapping
  columnMapping: MappingRow[];
  // Step 5 — Class label descriptions (class value -> description)
  classLabelDescriptions: Record<string, string>;

  // Step 6 — Data validation result (백엔드 /api/validate-data 응답, 리포트에서 재사용)
  validationResult: ValidateDataResponseData | null;

  /**
   * 과거 평가 스냅샷을 복원했거나 저장소에서 재수화해, 입력은 있는데 원본 파일이 없는 상태.
   * 파일은 어떤 경우에도 복원할 수 없으므로 재업로드를 유도해야 한다(ISSUES.md E-01·E-09).
   */
  needsFileReupload: boolean;

  /** 가장 최근에 만든 평가 run 의 id. 성적서로 되돌아가는 경로에 쓴다(ISSUES.md E-16). */
  lastRunId: string | null;

  /**
   * 성적서 구성 — 선택 카드(⑥~⑨)의 켜짐/꺼짐.
   *
   * 필수 카드(①~⑤)는 끌 수 없어 상태로 들지 않는다. 이 값이 **걸을 단계 목록을 정한다**
   * (`utils/domain/workflowSteps.ts` 의 `buildStepList`).
   */
  composerCards: ComposerSelection;

  /**
   * 카드별 입력값. 키는 재료 레지스트리의 `field.id` 다(`data/reportComposer.ts`).
   *
   * **이번 범위에서는 저장까지만 한다** — 백엔드로 보내거나 성적서에 인쇄하지 않는다.
   * 기존 `datasetInfo`·`basicInfo.env*` 와 내용이 겹치는 부분이 있는데, 그쪽은 지금도
   * 성적서를 그리는 데 쓰이므로 건드리지 않았다. 중복 정리는 별도 작업이다.
   */
  composerPerspective: ComposerValueMap;
  composerTrainingData: ComposerValueMap;
  composerTestData: ComposerValueMap;
  composerGroundTruth: ComposerValueMap;
  composerModelEnv: ComposerValueMap;

  // Actions — Navigation
  setCurrentStepId: (id: StepId) => void;
  markStepIdCompleted: (id: StepId) => void;

  // Actions — Step 1
  setBasicInfo: (
    value: BasicInfoFormData | ((prev: BasicInfoFormData) => BasicInfoFormData),
  ) => void;
  setTaskType: (type: TaskType | "") => void;

  // Actions — Step 2
  setSelectedMetricIds: (ids: string[]) => void;

  // Actions — Step 3
  setMetricDetails: (
    value: MetricDetailStateMap | ((prev: MetricDetailStateMap) => MetricDetailStateMap),
  ) => void;

  // Actions — Step 4
  setUploadedFile: (file: UploadedFileInfo | null, rawFile?: File) => void;
  setRawFile: (file: File | null) => void;
  setMetadata: (metadata: any | null) => void;
  setDecisionThreshold: (value: number | Record<string, number> | null) => void;
  setColumnNotes: (notes: ColumnNote[]) => void;
  setMappingFeedback: (input: { warnings: MappingWarning[]; availableMetricIds: string[] | null }) => void;
  setTrainingExampleFiles: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  setTrainingUnsuitableExampleFiles: (
    value: UploadedFileInfo[] | ((prev: UploadedFileInfo[]) => UploadedFileInfo[]),
  ) => void;
  setDatasetInfo: (
    value:
      | DatasetInfoFormData
      | ((prev: DatasetInfoFormData) => DatasetInfoFormData),
  ) => void;

  // Actions — Step 5
  setColumnMapping: (
    value: MappingRow[] | ((prev: MappingRow[]) => MappingRow[]),
  ) => void;
  setClassLabelDescriptions: (
    value:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;

  // Actions — Step 6
  setValidationResult: (result: ValidateDataResponseData | null) => void;
  setLastRunId: (runId: string | null) => void;

  // Actions — 성적서 구성
  setComposerCard: (id: OptionalCardId, on: boolean) => void;
  applyComposerPreset: (preset: ComposerPreset) => void;
  setComposerPerspective: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerTrainingData: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerTestData: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerGroundTruth: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;
  setComposerModelEnv: (
    value: ComposerValueMap | ((prev: ComposerValueMap) => ComposerValueMap),
  ) => void;

  // Reset
  resetWorkflow: () => void;
  loadWorkflowSnapshot: (snapshot: MapWorkflowToReportInput) => void;
}

const INITIAL_STATE = {
  currentStepId: "upload" as StepId,
  completedStepIds: [] as StepId[],
  basicInfo: DEFAULT_BASIC_INFO,
  taskType: "" as TaskType | "",
  selectedMetricIds: [] as string[],
  metricDetails: {} as MetricDetailStateMap,
  uploadedFile: null as UploadedFileInfo | null,
  rawFile: null as File | null,
  metadata: null as any | null,
  trainingExampleFiles: [] as UploadedFileInfo[],
  trainingUnsuitableExampleFiles: [] as UploadedFileInfo[],
  datasetInfo: DEFAULT_DATASET_INFO,
  columnNotes: [] as ColumnNote[],
  mappingWarnings: [] as MappingWarning[],
  availableMetricIds: null as string[] | null,
  decisionThreshold: null as number | Record<string, number> | null,
  columnMapping: [] as MappingRow[],
  classLabelDescriptions: {} as Record<string, string>,
  validationResult: null as ValidateDataResponseData | null,
  needsFileReupload: false,
  lastRunId: null as string | null,
  ...INITIAL_COMPOSER_STATE,
};

/** persist 저장소 키. 테스트와 운영이 같은 값을 보도록 export 한다. */
export const WORKFLOW_STORAGE_KEY = "ml-evaluation-workflow";

/**
 * 시연 모드(?showcase=1) 여부.
 *
 * showcase 는 `seedShowcaseData` 로 **실제 store 에 가짜 기업정보·사업자등록번호를 주입**하고,
 * WorkflowShell 이 라우팅마다 그것을 다시 실행한다(ISSUES.md E-05). persist 를 그대로 붙이면
 * 그 가짜 데이터가 사용자의 실제 작업 위에 영속된다.
 * 그래서 시연 중에는 저장소를 **읽지도 쓰지도 않는다** — 시연이 실제 작업을 덮지 않고,
 * 실제 작업이 시연 화면에 새어 나오지도 않는다.
 */
function isShowcaseMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("showcase") === "1";
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // Navigation
      setCurrentStepId: (id) => set({ currentStepId: id }),

      markStepIdCompleted: (id) =>
        set((state) => ({
          completedStepIds: [...new Set([...state.completedStepIds, id])],
        })),

      // Step 1
      setBasicInfo: (value) =>
        set((state) => ({
          basicInfo:
            typeof value === "function" ? value(state.basicInfo) : value,
        })),

      setTaskType: (type) =>
        set({
          taskType: type,
          selectedMetricIds: [],
          metricDetails: {},
          uploadedFile: null,
          rawFile: null,
          metadata: null,
          trainingExampleFiles: [],
          trainingUnsuitableExampleFiles: [],
          decisionThreshold: null,
          columnNotes: [],
          mappingWarnings: [],
          availableMetricIds: null,
          columnMapping: [],
          classLabelDescriptions: {},
          validationResult: null,
          // 작업 유형이 바뀌면 뒤 단계의 근거가 전부 사라진다. 완료 표시와 데이터셋 정보를
          // 남겨두면 (a) 빈 상태로 뒤 단계에 점프할 수 있고 (b) 이전 평가의 표본 수가 새
          // 성적서에 인쇄된다(ISSUES.md E-08). persist 도입 전에는 새로고침이 사실상
          // 초기화 역할을 해서 세션 안에 갇혀 있던 오염이다.
          completedStepIds: [],
          datasetInfo: DEFAULT_DATASET_INFO,
          needsFileReupload: false,
          // basicInfo 는 유지한다 — 작업 유형만 바꿨는데 1단계 입력까지 날아가면 안 된다.
          /**
           * 성적서 구성의 **입력값은 비우고 카드 선택은 남긴다.**
           *
           * 입력값을 비우는 이유: ⑤ 평가 관점은 유형마다 묻는 질문이 다르고(이진은 중요 오류
           * 유형, 그 외는 클래스 중요도), ⑥ 클래스별 데이터 양은 업로드한 클래스 목록에
           * 매여 있다. 유형이 바뀌면 둘 다 근거가 사라진다.
           *
           * 카드 선택을 남기는 이유: "어떤 정보를 성적서에 넣을지"는 분류 유형과 무관한
           * 결정이고, 9개 카드 모두 전 유형에 적용된다. 어차피 유형을 바꾸면 구성 화면을
           * 다시 지나가므로 거기서 고칠 수 있다.
           */
          ...EMPTY_COMPOSER_INPUTS,
        }),

      // Step 2
      setSelectedMetricIds: (ids) => set({ selectedMetricIds: ids }),

      // Step 3
      setMetricDetails: (value) =>
        set((state) => ({
          metricDetails:
            typeof value === "function" ? value(state.metricDetails) : value,
        })),

      // Step 4
      setUploadedFile: (file, rawFile) =>
        // 원본 파일이 함께 들어오면 '재업로드 필요' 상태가 해소된다.
        set({ uploadedFile: file, rawFile: rawFile || null, needsFileReupload: false }),
      setRawFile: (file) => set({ rawFile: file }),
      setMetadata: (metadata) => set({ metadata: metadata }),
      setDecisionThreshold: (value) => set({ decisionThreshold: value }),
      setColumnNotes: (notes) => set({ columnNotes: notes }),
      setMappingFeedback: ({ warnings, availableMetricIds }) =>
        set({ mappingWarnings: warnings, availableMetricIds }),

      setTrainingExampleFiles: (value) =>
        set((state) => ({
          trainingExampleFiles:
            typeof value === "function" ? value(state.trainingExampleFiles) : value,
        })),

      setTrainingUnsuitableExampleFiles: (value) =>
        set((state) => ({
          trainingUnsuitableExampleFiles:
            typeof value === "function" ? value(state.trainingUnsuitableExampleFiles) : value,
        })),

      setDatasetInfo: (value) =>
        set((state) => ({
          datasetInfo:
            typeof value === "function" ? value(state.datasetInfo) : value,
        })),

      // Step 5
      setColumnMapping: (value) =>
        set((state) => ({
          columnMapping:
            typeof value === "function" ? value(state.columnMapping) : value,
        })),

      setClassLabelDescriptions: (value) =>
        set((state) => ({
          classLabelDescriptions:
            typeof value === "function"
              ? value(state.classLabelDescriptions)
              : value,
        })),

      // Step 6
      setValidationResult: (result) => set({ validationResult: result }),

      setLastRunId: (runId) => set({ lastRunId: runId }),

      // 성적서 구성
      setComposerCard: (id, on) =>
        set((state) => ({ composerCards: { ...state.composerCards, [id]: on } })),

      applyComposerPreset: (preset) => set({ composerCards: presetSelection(preset) }),

      setComposerPerspective: (value) =>
        set((state) => ({
          composerPerspective:
            typeof value === "function" ? value(state.composerPerspective) : value,
        })),

      setComposerTrainingData: (value) =>
        set((state) => ({
          composerTrainingData:
            typeof value === "function" ? value(state.composerTrainingData) : value,
        })),

      setComposerTestData: (value) =>
        set((state) => ({
          composerTestData:
            typeof value === "function" ? value(state.composerTestData) : value,
        })),

      setComposerGroundTruth: (value) =>
        set((state) => ({
          composerGroundTruth:
            typeof value === "function" ? value(state.composerGroundTruth) : value,
        })),

      setComposerModelEnv: (value) =>
        set((state) => ({
          composerModelEnv:
            typeof value === "function" ? value(state.composerModelEnv) : value,
        })),

      // Reset
      resetWorkflow: () => set(INITIAL_STATE),

      loadWorkflowSnapshot: (snapshot) =>
        set({
          basicInfo: snapshot.basicInfo,
          taskType: snapshot.taskType,
          selectedMetricIds: snapshot.selectedMetricIds,
          metricDetails: snapshot.metricDetails,
          uploadedFile: snapshot.uploadedFile,
          rawFile: null,
          metadata: null,
          trainingExampleFiles: snapshot.trainingExampleFiles,
          trainingUnsuitableExampleFiles: snapshot.trainingUnsuitableExampleFiles,
          datasetInfo: snapshot.datasetInfo,
          decisionThreshold: null,
          columnNotes: [],
          mappingWarnings: [],
          availableMetricIds: null,
          columnMapping: snapshot.columnMapping,
          classLabelDescriptions: snapshot.classLabelDescriptions,
          validationResult: null,
          currentStepId: "upload",
          /**
           * 원본 파일은 복원할 수 없다(File 객체).
           *
           * 2026-09-19 재배치로 **업로드가 1단계**가 됐다. 파일이 없으면 1단계부터 성립하지
           * 않으므로 완료로 표시할 단계가 하나도 없다 — 종전의 `[1, 2, 3]` 은 구 번호 체계
           * (기본정보·지표·지표상세)를 가리키던 값이라, 그대로 두면 새 체계에서
           * 업로드·지표·매핑이 '완료'로 둔갑해 사용자가 빈 상태로 뒤 단계에 진입한다
           * (ISSUES.md E-09 가 막으려던 바로 그 상태).
           *
           * 지표 선택·매핑 **입력 자체는 위에서 복원**했으므로, 파일만 다시 올리면
           * 그대로 이어서 진행할 수 있다.
           */
          completedStepIds: [],
          needsFileReupload: true,
          /**
           * 성적서 구성 입력값도 비운다. 스냅샷(`MapWorkflowToReportInput`)은 아직 이 값들을
           * 싣지 않으므로, 비우지 않으면 **직전 세션에 남아 있던 값**이 새 run 으로 흘러든다 —
           * 물려받은 것이 아니라 치우지 않은 것이다. 카드 선택은 `setTaskType` 과 같은 이유로
           * 남긴다.
           */
          ...EMPTY_COMPOSER_INPUTS,
        }),
    }),
    {
      name: WORKFLOW_STORAGE_KEY,
      version: WORKFLOW_PERSIST_VERSION,
      /**
       * 저장된 상태를 현재 규칙으로 옮긴다.
       *
       * v1 → v2: multilabel 에서 M1·M11·M12·M13 이 제거됐다(ISSUES.md A-04, 결정 2).
       * 걸러내지 않으면 기존 브라우저에 남은 선택 목록이 그대로 평가로 전송되고,
       * 백엔드가 `failed_metrics` 로 돌려준 것을 성적서 6절이 '측정 불가'로 인쇄한다.
       * (결정 4 '앞으로 것만 정정'은 **발급된 성적서**에 대한 결정이지 브라우저에
       *  남은 작성 중 상태에 대한 결정이 아니다 — 여기서는 정리하는 쪽이 옳다.)
       */
      migrate: (persisted, version) => migrateWorkflowState(persisted as any, version),
      // 시연 모드에서는 저장소를 읽지도 쓰지도 않는다(위 isShowcaseMode 주석 참조).
      storage: createJSONStorage(() => ({
        getItem: (name) => (isShowcaseMode() ? null : window.localStorage.getItem(name)),
        setItem: (name, value) => {
          if (isShowcaseMode()) return;
          try {
            window.localStorage.setItem(name, value);
          } catch {
            // 용량 초과 등으로 저장에 실패해도 진행 중인 입력을 잃게 하지 않는다.
            // (저장소가 가득 찬 상황의 안내는 6단계 저장 경로가 담당한다 — ISSUES.md E-11)
          }
        },
        removeItem: (name) => window.localStorage.removeItem(name),
      })),
      /**
       * 저장 대상 선별.
       * - `rawFile` 제외: File 객체는 JSON 직렬화가 원리적으로 불가능하다. 대신
       *   `uploadedFile`(메타)은 저장해 "파일이 있었는데 지금은 없다"를 감지한다.
       * - `validationResult` 제외: 응답 전문이라 용량 기여가 크고 6단계 재진입 시
       *   다시 받으면 된다(ISSUES.md E-11).
       * - `metadata` 포함: 5단계의 양성 클래스·감지 클래스·컬럼 고유값이 여기 있어,
       *   빼면 새로고침 후 매핑 화면이 무너져 persist 의 효용이 절반이 된다.
       *   백엔드가 컬럼당 고유값을 200개로 상한하므로 용량은 감당 가능하다.
       */
      partialize: (state) => {
        const { rawFile, validationResult, ...persisted } = state;
        void rawFile;
        void validationResult;
        return persisted;
      },
      /** 재수화 시점에 파일이 없으면 재업로드가 필요한 상태다. */
      onRehydrateStorage: () => (state) => {
        if (state && state.uploadedFile && !state.rawFile) {
          state.needsFileReupload = true;
        }
      },
    },
  ),
);