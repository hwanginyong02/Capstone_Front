/**
 * 판 4 2절 시험 대상(2.1 대상 모델, 2.2 평가 데이터, 2.3 학습 데이터)에 찍을 글을 저장값에서 고른다(대응표 1·6·8·20, 부록 B30).
 * - 2.1 은 의뢰자가 준 값만(모델·하이퍼파라미터·의뢰자 환경과 가속). 평가 시스템 값(라이브러리·수행 일시·엔진 버전)은 3.5 몫이라
 *   여기 넣지 않는다(대응표 8).
 * - 2.2 출처 열(대응표 6, 재료 목록 기준): 업로드 파일에서 읽은 값 = 시스템 확인, 평가 유형과 평가 데이터 재료 줄(출처·학습
 *   데이터와의 관계·수집 기간) = 의뢰자 제공. 해시·크기는 판 4 저장 칸 `datasetInfo.sourceFile`(없으면 "—"), 크기는 "3,727바이트".
 * - 재료 줄 값은 `materialRowText`(없으면 "제공되지 않음", 덧붙인 글은 "(의뢰자 제공: 글)").
 */
import type { FinalReportData, MaterialRow, UploadedFileInfo } from "../../../../types/finalReport.types";
import { materialRowText } from "../../reportMaterials";
import { ED4_DASH, FIXED_26_SOURCE_CLIENT, FIXED_26_SOURCE_SYSTEM } from "../edition4Text";
import type { CoverRow } from "./cover";
import {
  CLASS_DESCRIPTION_EMPTY,
  CLASSES_TEXT,
  FILE_SIZE_TEXT,
  SAMPLE_COUNT_TEXT,
  TARGET_ENVIRONMENT_LABEL,
  TARGET_EVAL_LABEL,
  TARGET_MODEL_LABEL,
} from "./targetText";

/** 천 단위 쉼표(예시본 "3,727바이트" — 실행 환경 로캘과 무관하게). */
const grouped = (n: number) => n.toLocaleString("en-US");

/** 빈 글은 "제공되지 않음"으로(`materialRowText` 의 null 규칙). */
const providedText = (value: string | null | undefined) => materialRowText({ value: value ? value : null });

const toRows = (rows: ReadonlyArray<MaterialRow>): CoverRow[] => rows.map((row) => ({ label: row.label, value: materialRowText(row) }));

/** 2.1 대상 모델 표 — 모델명·버전·모델 분류·모델 용도(대응표 1)·알고리즘(재료 ⑨). */
export function modelRows(data: FinalReportData): CoverRow[] {
  const { evalScope, materials } = data;
  const L = TARGET_MODEL_LABEL;
  return [
    { label: L.modelName, value: providedText(evalScope.targetModel) },
    { label: L.version, value: providedText(evalScope.version) },
    { label: L.category, value: providedText(evalScope.modelCategory) },
    { label: L.purpose, value: providedText(evalScope.modelPurpose) },
    { label: L.algorithm, value: materialRowText({ value: materials?.hyperparameters.algorithm ?? null }) },
  ];
}

/** 2.1 하이퍼파라미터 "이름 | 값" 줄. 제공되지 않았으면(재료 rows null·재료 없음) null — 그리는 쪽이 부록 B30. */
export function hyperparameterRows(data: FinalReportData): Array<[string, string]> | null {
  const rows = data.materials?.hyperparameters.rows;
  return rows ? rows.map((row) => [row.name, row.value]) : null;
}

/** 2.1 학습·추론 환경 표 — 의뢰자 환경 다섯 칸(`evalEnv.systemSpec`) + 가속 두 칸(재료 `environment`). */
export function environmentRows(data: FinalReportData): CoverRow[] {
  const spec = data.evalEnv.systemSpec;
  const L = TARGET_ENVIRONMENT_LABEL;
  return [
    { label: L.os, value: providedText(spec.os) },
    { label: L.cpu, value: providedText(spec.cpu) },
    { label: L.gpu, value: providedText(spec.gpu) },
    { label: L.memory, value: providedText(spec.memory) },
    { label: L.software, value: providedText(spec.software) },
    ...toRows(data.materials?.environment ?? []),
  ];
}

/** 2.2 파일 해시 칸 — 저장된 소문자 64자 그대로, 없으면 "—". */
export function fileHashText(data: FinalReportData): string {
  return data.datasetInfo.sourceFile?.sha256 ?? ED4_DASH;
}

/** 2.2 파일 크기 칸 — "3,727바이트", 없으면 "—". */
export function fileSizeText(data: FinalReportData): string {
  const file = data.datasetInfo.sourceFile;
  return file ? FILE_SIZE_TEXT.replace("{n}", grouped(file.sizeBytes)) : ED4_DASH;
}

/** 2.2 평가 데이터 3열 표의 줄 — [항목, 내용, 출처]. */
export function evaluationDataRows(data: FinalReportData): Array<[string, string, string]> {
  const info = data.datasetInfo;
  const L = TARGET_EVAL_LABEL;
  const S = FIXED_26_SOURCE_SYSTEM;
  const C = FIXED_26_SOURCE_CLIENT;
  return [
    [L.fileName, info.fileName, S],
    [L.hash, fileHashText(data), S],
    [L.size, fileSizeText(data), S],
    [L.format, info.format, S],
    [L.inputColumns, info.inputColumns.join(", "), S],
    [L.sampleCount, SAMPLE_COUNT_TEXT.replace("{n}", grouped(info.sampleCount)), S],
    [L.taskType, info.taskTypeLabel, C],
    [L.classes, CLASSES_TEXT.replace("{n}", String(info.classCount)).replace("{목록}", info.classLabels.join(", ")), S],
    ...(data.materials?.test ?? []).map((row): [string, string, string] => [row.label, materialRowText(row), C]),
  ];
}

/** 2.2 정답 라벨 표(재료 ⑧ — 원래 필요 없는 칸 "해당 없음" 도 찍는다). 재료가 없으면 빈 배열(표 없음). */
export function groundTruthRows(data: FinalReportData): CoverRow[] {
  return toRows(data.materials?.groundTruth ?? []);
}

/** 2.2 클래스 레이블 설명 표 — 의뢰자가 설명을 단 클래스만 저장돼 있다. 빈 설명은 "설명 미입력"(판 3 표와 같은 글). */
export function classDescriptionRows(data: FinalReportData): CoverRow[] {
  return (data.datasetInfo.classLabelDescriptions ?? []).map((item) => ({
    label: item.label,
    value: item.description ? item.description : CLASS_DESCRIPTION_EMPTY,
  }));
}

/** 2.3 학습 데이터 표(재료 ⑥). 재료가 없으면 빈 배열(표 없음). */
export function trainingRows(data: FinalReportData): CoverRow[] {
  return toRows(data.materials?.training ?? []);
}

/** 2.3 학습 데이터 예시 — 적합·부적합 예시 파일이 하나라도 있을 때만(판 3 과 같은 조건). 없으면 null. */
export function trainingExamples(data: FinalReportData): { valid: UploadedFileInfo[]; edge: UploadedFileInfo[] } | null {
  const info = data.trainingDatasetInfo;
  if (!info || (info.validExamples.length === 0 && info.edgeExamples.length === 0)) return null;
  return { valid: info.validExamples, edge: info.edgeExamples };
}

/** 예시 파일 한 줄 글 "파일명 · 크기"(판 3 `exampleFileCaption` 과 같은 꼴 — 크기가 없으면 파일명만). */
export function exampleFileCaption(file: UploadedFileInfo): string {
  return file.size ? `${file.name} · ${file.size}` : file.name;
}
