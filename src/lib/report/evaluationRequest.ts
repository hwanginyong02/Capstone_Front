/**
 * 평가 요청 스냅샷 — `/report/:id` 가 무엇으로 평가하는가(서술 라운드 S3b, 점검 유-8).
 *
 * 종전 성적서 훅은 **지금의** 워크플로우 입력과 메모리의 파일로 평가했다. 그래서 워크스페이스에서 덜 끝난 옛 평가를
 * 열면 다른 모델·다른 파일로 평가해 옛 평가에 덮어썼고, 그대로 발급까지 됐다. 이제 run 을 만들 때(검증 화면 "다음")
 * 평가 요청에 쓰는 값을 모두 run 에 얼려 두고, 성적서 화면은 그것으로만 평가한다. 파일은 저장할 수 없으므로
 * 지문(이름·바이트·마지막 수정 시각)을 남겨 지금 가진 파일이 같은 파일인지 확인한다 — 다르면 다시 올려 달라고 한다.
 */
import type { ComposerValueMap } from "../../types/reportComposer.types";
import type { MappingRow } from "../../types/mapping.types";
import type { MetricDetailStateMap } from "../../types/workflow.types";
import type { TaskType } from "../../data/evaluationData";
import { requestDecisionThreshold } from "../../components/column-mapping/DecisionThresholdCard";
import { translateRoleToBackend } from "../mapping/translateRoleToBackend";
import { resolveBeta } from "../../utils/domain/validation";
import { resolveTaskType } from "../../data/evaluationData";

/** 파일 지문 — 같은 파일인지 확인하는 데만 쓴다(내용을 남기지 않는다). */
export interface FileFingerprint {
  name: string;
  bytes: number;
  lastModified: number;
}

export function fingerprintOf(file: File): FileFingerprint {
  return { name: file.name, bytes: file.size, lastModified: file.lastModified };
}

/** 지문이 같은가. 셋 중 하나라도 다르면 다른 파일로 본다. */
export function sameFile(fp: FileFingerprint | null | undefined, file: File | null | undefined): boolean {
  if (!fp || !file) return false;
  return fp.name === file.name && fp.bytes === file.size && fp.lastModified === file.lastModified;
}

/** `POST /api/evaluate` 의 `data` 폼 칸(JSON). */
export interface EvaluatePayload {
  task_type: string;
  column_mappings: { column: string; role: string | null; sample_values: unknown[] }[];
  selected_metric_ids: string[];
  metadata: Record<string, unknown>;
  beta: number;
  decision_threshold: number | Record<string, number> | null;
}

/**
 * run 에 얼려 두는 평가 입력. `version` 은 이 모양의 판이다(칸이 바뀌면 올린다).
 * - payload: 평가 요청 그대로.
 * - assemble: 평가 응답으로 성적서·사실 시트를 조립하는 입력(`assembleEvaluatedReport`) 중 run 스냅샷에 없는 것.
 * - model: AI 고객 입력의 모델 정보 칸(지금 워크플로우의 원래 값 — 성적서 스냅샷은 고른 칸만 남겨 다를 수 있다).
 * - file: 평가할 파일의 지문.
 */
export interface EvaluationRequestSnapshot {
  version: 1;
  payload: EvaluatePayload;
  assemble: {
    taskType: TaskType | "";
    selectedMetricIds: string[];
    metricDetails: MetricDetailStateMap;
    composerMetrics: ComposerValueMap | undefined;
    columnMapping: MappingRow[];
    metadata: any;
  };
  model: { name: string; purpose: string; category: string; reportPurposeNote: string };
  file: FileFingerprint | null;
}

/** 스냅샷을 만드는 데 읽는 워크플로우 상태(스토어를 그대로 넘겨도 된다). */
export interface EvaluationRequestSource {
  taskType: TaskType | "";
  columnMapping: MappingRow[];
  selectedMetricIds: string[];
  metricDetails: MetricDetailStateMap;
  composerMetrics?: ComposerValueMap;
  metadata: any;
  decisionThreshold: number | Record<string, number> | null;
  basicInfo: { modelName?: string; modelPurpose?: string; modelCategory?: string; reportPurposeNote?: string };
  rawFile: File | null;
}

/** 평가 요청 본문 — 종전 성적서 훅이 그 자리에서 조립하던 것과 같은 값이다. */
export function buildEvaluatePayload(state: EvaluationRequestSource): EvaluatePayload {
  const taskType = resolveTaskType(state.taskType);
  return {
    task_type: taskType,
    column_mappings: state.columnMapping.map((row) => ({
      column: row.originalName,
      role: translateRoleToBackend(row.confirmedRole, taskType),
      sample_values: row.sampleValues,
    })),
    selected_metric_ids: state.selectedMetricIds,
    metadata: {
      positive_class: state.metadata?.positive_class || null,
      negative_class: state.metadata?.negative_class || null,
      positive_class_ambiguous: state.metadata?.positive_class_ambiguous || false,
      detected_classes: state.metadata?.detected_classes || [],
      detected_labels: state.metadata?.detected_labels || [],
      class_distribution: state.metadata?.class_distribution || {},
    },
    beta: resolveBeta(state.metricDetails),
    // 하드 예측이 없을 때 확률에서 예측을 파생하는 기준(A-01). 성적서 합격 목표값과 다른 개념이다.
    // 지금 매핑에서 쓰이는 값만(S2 P1) — 검증 요청과 같은 함수.
    decision_threshold: requestDecisionThreshold(taskType, state.columnMapping, state.decisionThreshold),
  };
}

export function buildEvaluationRequestSnapshot(state: EvaluationRequestSource): EvaluationRequestSnapshot {
  return {
    version: 1,
    payload: buildEvaluatePayload(state),
    assemble: {
      taskType: state.taskType,
      selectedMetricIds: state.selectedMetricIds,
      metricDetails: state.metricDetails,
      composerMetrics: state.composerMetrics,
      columnMapping: state.columnMapping,
      metadata: state.metadata,
    },
    model: {
      name: state.basicInfo.modelName ?? "",
      purpose: state.basicInfo.modelPurpose ?? "",
      category: state.basicInfo.modelCategory ?? "",
      reportPurposeNote: state.basicInfo.reportPurposeNote ?? "",
    },
    file: state.rawFile ? fingerprintOf(state.rawFile) : null,
  };
}
