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
  type UploadedFileInfo,
} from "../../types/workflow.types";

/** Step path segments used in routing */
export const STEP_PATHS = [
  "basic-info",
  "metrics",
  "metric-detail",
  "data-upload",
  "column-mapping",
  "data-validation",
  "report",
] as const;

export type StepPath = (typeof STEP_PATHS)[number];

/** Convert a 1-based step number to a route path */
export function stepToPath(step: number): string {
  // 7단계(성적서)는 실제 run id 로만 열 수 있다. 여기서는 목적지가 정해지지 않으므로
  // 항상 유효한 워크스페이스 목록으로 보낸다 — 종전의 "/report/preview" 는 저장되지
  // 않는 임시 성적서를 만들어 발급·재조회를 불가능하게 했다(ISSUES.md E-02·E-06).
  if (step === 7) return "/workspaces";
  return `/app/${STEP_PATHS[step - 1] ?? STEP_PATHS[0]}`;
}

/** Convert a route path segment to a 1-based step number */
export function pathToStep(path: string): number {
  // 워크플로우 페이지는 항상 정식 /app/* 경로로 렌더된다(레거시 /step/* 는 routes.ts 에서 리다이렉트).
  const segment = path.replace("/app/", "");
  const index = STEP_PATHS.indexOf(segment as StepPath);
  return index >= 0 ? index + 1 : 1;
}

/** persist 스키마 버전. 저장된 상태의 의미가 바뀔 때만 올린다. */
export const WORKFLOW_PERSIST_VERSION = 2;

/**
 * 저장된 워크플로우 상태를 현재 규칙으로 옮긴다(순수 함수 — 테스트가 직접 호출한다).
 *
 * 지금 하는 일은 하나다: 저장된 `selectedMetricIds` 에서 **현재 task_type 이 노출하지
 * 않는 지표**를 걸러낸다. 지표 ID 를 하드코딩하지 않고 METRICS 에서 유도하므로,
 * 앞으로 노출 목록이 또 바뀌어도 이 함수는 그대로 둔다.
 */
export function migrateWorkflowState(persisted: any, version: number): any {
  if (!persisted || version >= WORKFLOW_PERSIST_VERSION) return persisted;

  const taskType = persisted.taskType;
  const selected = persisted.selectedMetricIds;
  if (!taskType || !Array.isArray(selected)) return persisted;

  const exposed = new Set(getAvailableMetrics(taskType).map((m) => m.id));
  return { ...persisted, selectedMetricIds: selected.filter((id: string) => exposed.has(id)) };
}

interface WorkflowState {
  // Navigation
  currentStep: number;
  completedSteps: number[];

  // Step 1 — Basic info
  basicInfo: BasicInfoFormData;
  taskType: TaskType | "";

  // Step 2 — Metric selection
  selectedMetricIds: string[];

  // Step 3 — Metric details
  metricDetails: MetricDetailStateMap;

  // Step 4 — Data upload
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

  // Actions — Navigation
  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;

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

  // Reset
  resetWorkflow: () => void;
  loadWorkflowSnapshot: (snapshot: MapWorkflowToReportInput) => void;
}

const INITIAL_STATE = {
  currentStep: 1,
  completedSteps: [] as number[],
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
      setCurrentStep: (step) => set({ currentStep: step }),

      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: [...new Set([...state.completedSteps, step])],
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
          completedSteps: [],
          datasetInfo: DEFAULT_DATASET_INFO,
          needsFileReupload: false,
          // basicInfo 는 유지한다 — 작업 유형만 바꿨는데 1단계 입력까지 날아가면 안 된다.
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
          currentStep: 1,
          // 원본 파일은 복원할 수 없다(File 객체). 파일이 있어야 성립하는 4~6단계를 '완료'로
          // 표시하면 거짓말이고, 사용자는 빈 상태로 뒤 단계에 진입해 막다른 길에 갇힌다
          // (ISSUES.md E-09). 파일 이전 단계까지만 완료로 둔다.
          completedSteps: [1, 2, 3],
          needsFileReupload: true,
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