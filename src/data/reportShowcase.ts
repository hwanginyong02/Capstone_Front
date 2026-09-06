/**
 * 랜딩의 성적서 미리보기에 쓰는 **고정 예시 데이터** (ISSUES.md E-06).
 *
 * 종전 랜딩은 `/report/preview` 를 iframe 으로 띄웠는데, 그 URL 에는 `?showcase=1` 이
 * 없어서 persist 우회가 발동하지 않았다. 결과적으로 iframe 이 방문자의 localStorage 를
 * 정상 재수화해 **방문자의 실제 회사명·사업자등록번호·주소·모델명이 공개 랜딩 페이지에
 * 렌더**됐다(실측 추적으로 확인). 임시 성적서 경로를 폐지하면서 미리보기도 이 상수로
 * 대체한다.
 *
 * **실제 매퍼를 그대로 통과시킨다.** 손으로 쓴 `FinalReportData` 상수를 두면 성적서
 * 구조가 바뀔 때 조용히 낡는다. 고정 *입력*만 두고 `mapWorkflowToFinalReport` 로
 * 만들면 구조 변경이 컴파일 시점에 드러나고, 인쇄되는 파생 규칙(합격 기준 표기·판정
 * 등)도 실제와 같아진다. (`MetricSelectionPreview` 가 iframe 을 정적 컴포넌트로 바꾼
 * 것과 같은 선례이며, 그쪽은 계약 테스트로 드리프트를 막는다.)
 */
import { mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "../lib/report/mapWorkflowToFinalReport";
import type { FinalReportData } from "../types/finalReport.types";
import {
  DEFAULT_BASIC_INFO,
  DEFAULT_DATASET_INFO,
  type MetricDetailState,
} from "../types/workflow.types";
import { METRICS } from "./evaluationData";

/** 지표 상세는 실제 지표 정의에서 만든다 — 이름·설명이 성적서와 어긋나지 않도록. */
function detail(id: string, targetValue: string): MetricDetailState {
  const metric = METRICS.find((m) => m.id === id);
  return {
    id,
    name: metric?.name ?? id,
    description: metric?.description ?? "",
    targetValue,
    beta: "1.0",
    positiveClass: "spam",
    completed: true,
  };
}

const SHOWCASE_INPUT: MapWorkflowToReportInput = {
  basicInfo: {
    ...DEFAULT_BASIC_INFO,
    companyName: "(주)예시테크",
    representative: "홍길동",
    businessNumber: "123-45-67890",
    address: "서울특별시 노원구 공릉로 232",
    modelName: "스팸 메일 분류기",
    versionName: "v1.2.0",
    contractDate: "2026-01-15",
  },
  datasetInfo: {
    ...DEFAULT_DATASET_INFO,
    validationSampleCount: "1200",
  },
  taskType: "binary",
  selectedMetricIds: ["M1", "M2", "M3", "M4"],
  metricDetails: {
    M1: detail("M1", "0.90"),
    M2: detail("M2", "0.85"),
    M3: detail("M3", "0.85"),
    M4: detail("M4", "0.85"),
  },
  uploadedFile: { name: "mail_eval_2026q1.csv", size: "180 KB", type: "text/csv" },
  trainingExampleFiles: [],
  trainingUnsuitableExampleFiles: [],
  columnMapping: [],
  classLabelDescriptions: { spam: "광고·피싱 등 수신 거부 대상", ham: "정상 수신 메일" },
  metadata: { positive_class: "spam" },
};

/** 랜딩 미리보기용 성적서. 방문자 입력이 섞이지 않는 고정 예시다. */
export const REPORT_SHOWCASE: FinalReportData = mapWorkflowToFinalReport(SHOWCASE_INPUT);
