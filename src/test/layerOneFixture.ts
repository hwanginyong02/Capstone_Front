/** 1층(필수) 입력을 모두 채운 상태 — 1층 재확인과 검증 화면 "다음" 테스트가 함께 쓴다. */
import { DEFAULT_BASIC_INFO } from "../types/workflow.types";
import type { LayerOneSource } from "../utils/domain/layerOne";

export const FILLED_LAYER_ONE: LayerOneSource = {
  taskType: "binary",
  basicInfo: {
    ...DEFAULT_BASIC_INFO,
    companyName: "테스트 주식회사",
    representative: "홍길동",
    businessNumber: "123-45-67890",
    phone: "02-1234-5678",
    address: "서울",
    contractDate: "2026-10-01",
    reportPurpose: "internal",
    modelName: "MyModel",
    versionName: "v1",
    modelPurpose: "이탈 예측",
    modelCategory: "표 데이터",
  },
  selectedMetricIds: ["M1"],
  metricDetails: { M1: { targetValue: "0.8" } as LayerOneSource["metricDetails"][string] },
  composerMetrics: {},
  composerPerspective: { criticalErrorType: { text: "Similar" }, usageMode: { text: "Batch" } },
};
