import type { TaskType } from "../config/evaluationConfig";

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
  productName: string;
  versionName: string;
  testStartDate?: Date;
  testEndDate?: Date;
  modelName: string;
  testPurpose: string;
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
  productName: "",
  versionName: "v1.0.0",
  testStartDate: undefined,
  testEndDate: undefined,
  modelName: "",
  testPurpose: "",
  taskType: "",
  envOS: "",
  envCPU: "",
  envGPU: "",
  envMemory: "",
  envSoftware: "",
};
