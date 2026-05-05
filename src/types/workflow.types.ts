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

export interface TcDetailState {
  id: string;
  name: string;
  description: string;
  targetValue: string;
  targetCondition: "above" | "below" | "within";
  beta: string;
  positiveClass: string;
  completed: boolean;
}

export type TcDetailStateMap = Record<string, TcDetailState>;

export interface UploadedFileInfo {
  name: string;
  size: string;
  type: string;
}

export interface DatasetInfoFormData {
  datasetFormat: string;
  trainingSampleCount: string;
  evaluationSampleCount: string;
}

export const DEFAULT_BASIC_INFO: BasicInfoFormData = {
  companyName: "",
  representative: "",
  businessNumber: "",
  website: "",
  phone: "",
  fax: "",
  address: "",
  contractDate: undefined,
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
  datasetFormat: "",
  trainingSampleCount: "",
  evaluationSampleCount: "",
};

