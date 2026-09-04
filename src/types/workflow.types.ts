import type { TaskType } from "../data/evaluationData";

export interface BasicInfoFormData {
  companyName: string;
  representative: string;
  businessNumber: string;
  website: string;
  phone: string;
  fax: string;
  address: string;
  contractDate?: Date;
  reportPurpose: string;
  projectName: string;
  projectAgency: string;
  projectNumber: string;
  versionName: string;
  modelName: string;
  modelPurpose: string;
  modelCategory: string;
  taskType: TaskType | "";
  envOS: string;
  envCPU: string;
  envGPU: string;
  envMemory: string;
  envSoftware: string;
}

export interface MetricDetailState {
  id: string;
  name: string;
  description: string;
  targetValue: string;
  beta: string;
  positiveClass: string;
  completed: boolean;
}

export type MetricDetailStateMap = Record<string, MetricDetailState>;

export interface UploadedFileInfo {
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

export interface DatasetInfoFormData {
  trainingSampleCount: string;
  validationSampleCount: string;
  trainingDatasetName: string;
  trainingDataFormat: string;
  trainingClassDistribution: string;
  trainingDataDescription: string;
}

export const DEFAULT_BASIC_INFO: BasicInfoFormData = {
  companyName: "",
  representative: "",
  businessNumber: "",
  website: "",
  phone: "",
  fax: "",
  address: "",
  contractDate: new Date(),
  reportPurpose: "",
  projectName: "",
  projectAgency: "",
  projectNumber: "",
  versionName: "v1.0.0",
  modelName: "",
  modelPurpose: "",
  modelCategory: "",
  taskType: "",
  envOS: "",
  envCPU: "",
  envGPU: "",
  envMemory: "",
  envSoftware: "",
};

export const DEFAULT_DATASET_INFO: DatasetInfoFormData = {
  trainingSampleCount: "",
  validationSampleCount: "",
  trainingDatasetName: "",
  trainingDataFormat: "",
  trainingClassDistribution: "",
  trainingDataDescription: "",
};

