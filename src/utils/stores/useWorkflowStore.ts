/**
 * 워크플로우 전역 상태 관리 (Zustand)
 *
 * 이 스토어는 전체 평가 워크플로우의 상태(각 스텝의 입력 데이터, 현재 단계, 완료 여부 등)를
 * 관리하며, 최종 평가 리포트 데이터를 생성하는 로직을 포함합니다.
 */
import { create } from "zustand";
import type { TaskType } from "../../data/evaluationData";
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
  if (step === 7) return "/report/preview";
  return `/app/${STEP_PATHS[step - 1] ?? STEP_PATHS[0]}`;
}

/** Convert a route path segment to a 1-based step number */
export function pathToStep(path: string): number {
  // 워크플로우 페이지는 항상 정식 /app/* 경로로 렌더된다(레거시 /step/* 는 routes.ts 에서 리다이렉트).
  const segment = path.replace("/app/", "");
  const index = STEP_PATHS.indexOf(segment as StepPath);
  return index >= 0 ? index + 1 : 1;
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

  // Step 5 — Column mapping
  columnMapping: MappingRow[];
  // Step 5 — Class label descriptions (class value -> description)
  classLabelDescriptions: Record<string, string>;

  // Step 6 — Data validation result (백엔드 /api/validate-data 응답, 리포트에서 재사용)
  validationResult: ValidateDataResponseData | null;

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
  columnMapping: [] as MappingRow[],
  classLabelDescriptions: {} as Record<string, string>,
  validationResult: null as ValidateDataResponseData | null,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
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
      columnMapping: [],
      classLabelDescriptions: {},
      validationResult: null,
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
  setUploadedFile: (file, rawFile) => set({ uploadedFile: file, rawFile: rawFile || null }),
  setRawFile: (file) => set({ rawFile: file }),
  setMetadata: (metadata) => set({ metadata: metadata }),

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
      columnMapping: snapshot.columnMapping,
      classLabelDescriptions: snapshot.classLabelDescriptions,
      validationResult: null,
      currentStep: 1,
      completedSteps: [1, 2, 3, 4, 5, 6],
    }),
}));
