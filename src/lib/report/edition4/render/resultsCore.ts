/**
 * 판 4 4.1~4.3(갈래 b3, 계획 대응표 10·12·13·15·17, 4절 "4.2 종합 판정"·"4.3 지표별 결과 한 표") — 저장값을 **읽기만** 해서
 * 표 칸 글자로 바꾸는 순수 함수. 판정·판정 여유·충족 수는 다시 계산하지 않는다(`edition4Values.verdict`, `kpiResults[].status`·
 * `judgmentMargin`·`ciRaw` 를 그대로 읽는다). 숫자는 판 4 표기 함수(`edition4Number`)와 같은 수 같은 글자(`sameValueEd4`·`classF1Ed4`)만 쓴다.
 */
import type { ClassReportRow, ClassReportTable, FinalReportData, KpiResult, ValidationResult } from "../../../../types/finalReport.types";
import type { ValidationGroup } from "../../../../types/validation.types";
import { isJudged } from "../../computeVerdict";
import type { WeakestClassFact } from "../../narrativeFacts";
import { classF1TextEd4 } from "../classF1Ed4";
import { ed4CiBound, ed4Judged, ed4TargetCriteria } from "../edition4Number";
import {
  B10_NO_ROLE,
  B10_NO_SAMPLE_ID,
  B10_NO_SCORE,
  B11_ALL_BELOW_ONE,
  B11_LATENCY_STATS,
  B11_NON_NUMERIC,
  B11_UNCHECKED,
  B14_UNMEASURABLE,
  B5_VERDICT_REFERENCE,
  B9_COUNT_ERROR,
  B9_COUNT_PASS,
  B9_COUNT_WARNING,
  B9_GROUP_HEAD,
  ED4_DASH,
  fillTemplate,
  JUDGMENT_MARGIN_LABEL,
} from "../edition4Text";
import { sameValueTextEd4 } from "../sameValueEd4";
import {
  A7_NOT_APPLICABLE,
  EX_4_1_COUNT,
  EX_4_1_EXCLUDED,
  EX_4_1_EXCLUDED_NOTE,
  EX_4_1_RESULT,
  EX_4_1_RESULT_NOTE,
  EX_4_1_RESULT_VALUE,
  EX_4_1_TOTAL,
  EX_4_1_TOTAL_NOTE,
  EX_4_1_VALID,
  EX_4_1_VALID_NOTE,
  EX_4_3_CI,
  EX_4_3_CORE_SUFFIX,
  GROUP_META_ED4,
  GROUP_ORDER_ED4,
  V3_SUB_METRIC_HEAD,
  V3_SUB_METRIC_ROWS,
  VALIDATION_STATUS_ED4,
  VERDICT_CELL_FAIL,
  VERDICT_CELL_PASS,
} from "./resultsCoreText";

/* ================================================================== *
 * 4.1 데이터 점검
 * ================================================================== */

/** 건수 칸 — "171건", "1,234건"(판 3 요약 표의 toLocaleString 과 같은 쉼표). */
export function countCellEd4(n: number): string {
  return fillTemplate(EX_4_1_COUNT, { n: n.toLocaleString("en-US") });
}

/** 점수(확률) 역할 이름 — 백엔드 `validation_checks` 가 "N/A (no … mapped)" 에 넣는 이름 중 확률(score) 컬럼인 것. */
const SCORE_ROLES = new Set(["score", "score_positive", "score_per_label"]);

/**
 * 상세 칸 한 줄(대응표 13, 부록 A7·B10·B11) — 저장된 판 3 글(`mapValidationResultToReport` 가 한 번 바꾼 것)을 판 4 글로.
 * - "N/A (no sample_id mapped)" → B10 샘플 ID, "N/A (no score_positive|score_per_label mapped)" → B10 확률(score), 그 밖의 역할 → B10 {역할}
 * - "N/A" → "해당 없음"(A7)
 * - 지연시간 통계 "mean=…, p95=…, max=… (n=…)" → B11, 단위 경고 "All n values < 1 (max=…)" → B11, "Could not verify" → B11,
 *   "Non-numeric values in … column(s)" → B11
 * - 그 밖은 "{n} 건" → "{n}건"(A7)만.
 */
export function validationDetailEd4(detail: string): string {
  const text = detail.trim();
  const noRole = /^N\/A \(no (.+) mapped\)$/.exec(text);
  if (noRole) {
    const role = noRole[1];
    if (role === "sample_id") return B10_NO_SAMPLE_ID;
    if (SCORE_ROLES.has(role)) return B10_NO_SCORE;
    return fillTemplate(B10_NO_ROLE, { 역할: role });
  }
  if (text === "N/A") return A7_NOT_APPLICABLE;
  const stats = /^mean=([^,]+), p95=([^,]+), max=([^ ]+) \(n=(\d+)\)$/.exec(text);
  if (stats) return fillTemplate(B11_LATENCY_STATS, { m: stats[1], p: stats[2], x: stats[3], n: stats[4] });
  const below = /^All (\d+) values < 1 \(max=(.+)\)$/.exec(text);
  if (below) return fillTemplate(B11_ALL_BELOW_ONE, { n: below[1], x: below[2] });
  if (text === "Could not verify") return B11_UNCHECKED;
  const nonNumeric = /^Non-numeric values in (.+?) columns?$/.exec(text);
  if (nonNumeric) return fillTemplate(B11_NON_NUMERIC, { 목록: nonNumeric[1] });
  return text.replace(/(\d) 건/g, "$1건");
}

/** 요약 표 네 줄([항목, 값, 비고]) — 판 3 6.0 과 같은 재료(`validationSummary`, 없으면 `datasetInfo.sampleCount`). */
export function validationSummaryRowsEd4(data: Pick<FinalReportData, "dataValidation" | "validationSummary" | "datasetInfo">): string[][] {
  const total = data.validationSummary?.totalRows ?? data.datasetInfo.sampleCount;
  const valid = data.validationSummary?.validRows ?? data.datasetInfo.sampleCount;
  const excluded = data.validationSummary?.excludedRows ?? 0;
  const fail = data.dataValidation.filter((r) => r.status === "fail").length;
  const warning = data.dataValidation.filter((r) => r.status === "warning").length;
  return [
    [EX_4_1_TOTAL, countCellEd4(total), EX_4_1_TOTAL_NOTE],
    [EX_4_1_VALID, countCellEd4(valid), EX_4_1_VALID_NOTE],
    [EX_4_1_EXCLUDED, countCellEd4(excluded), EX_4_1_EXCLUDED_NOTE],
    [EX_4_1_RESULT, fillTemplate(EX_4_1_RESULT_VALUE, { fail: String(fail), warning: String(warning) }), EX_4_1_RESULT_NOTE],
  ];
}

/** 묶음 머리(예시본 "공통 검증 항목 — 모든 분류 유형에 공통 적용 (7건 통과)", 경고·오류가 있으면 B9 — 0건인 것은 뺀다). */
export function validationGroupHeadEd4(group: ValidationGroup, items: ReadonlyArray<Pick<ValidationResult, "status">>): string {
  const meta = GROUP_META_ED4[group];
  const count = (status: ValidationResult["status"]) => items.filter((i) => i.status === status).length;
  const parts: string[] = [];
  const fail = count("fail");
  const warning = count("warning");
  const pass = count("pass");
  if (fail > 0) parts.push(fillTemplate(B9_COUNT_ERROR, { n: String(fail) }));
  if (warning > 0) parts.push(fillTemplate(B9_COUNT_WARNING, { n: String(warning) }));
  if (pass > 0) parts.push(fillTemplate(B9_COUNT_PASS, { n: String(pass) }));
  return fillTemplate(B9_GROUP_HEAD, { "묶음 이름": meta.label, "적용 설명": meta.description, counts: parts.join(", ") });
}

export interface ValidationGroupEd4 {
  group: ValidationGroup;
  head: string;
  /** [검증 항목, 결과, 상세 내역] */
  rows: string[][];
}

/** 묶음별 표 — 판 3 순서(공통·다중·이진·멀티·응답시간), 항목이 없는 묶음은 뺀다. */
export function validationGroupsEd4(dataValidation: ReadonlyArray<ValidationResult>): ValidationGroupEd4[] {
  return GROUP_ORDER_ED4.map((group) => ({ group, items: dataValidation.filter((i) => i.group === group) }))
    .filter(({ items }) => items.length > 0)
    .map(({ group, items }) => ({
      group,
      head: validationGroupHeadEd4(group, items),
      rows: items.map((i) => [i.checkName, VALIDATION_STATUS_ED4[i.status], validationDetailEd4(i.detail)]),
    }));
}

/* ================================================================== *
 * 4.2 종합 판정 — 저장된 `edition4Values.verdict` 그대로
 * ================================================================== */

/** 4.2 표 한 줄 [종합 판정, 판정 대상 지표 중 충족](B12 이면 "판정 불가 | —" — 저장 글자). 판 4 생성값이 없으면 null. */
export function verdictRowEd4(data: Pick<FinalReportData, "edition4Values">): string[] | null {
  const v = data.edition4Values?.verdict;
  return v ? [v.label, v.countText] : null;
}

/** 4.2 근거 문장(저장된 `verdict.basis`). 없으면 null. */
export function verdictBasisEd4(data: Pick<FinalReportData, "edition4Values">): string | null {
  return data.edition4Values?.verdict.basis ?? null;
}

/* ================================================================== *
 * 4.3 지표별 결과
 * ================================================================== */

/** M21(혼동행렬)·M22(클래스별 표) — 값이 없는 표 지표(부록 B5). */
const isTableMetric = (r: KpiResult) => r.metricId === "M21" || r.metricId === "M22";

/** 신뢰구간 칸 — 반올림 전 경계(없으면 넷째 자리 `ci`)를 판 4 경계 표기로. 판정 대상이고 구간이 있을 때만, 아니면 "—". */
export function ciCellEd4(r: KpiResult): string {
  if (!isJudged(r) || r.threshold === null || !r.ci) return ED4_DASH;
  const low = ed4CiBound(r.ciRaw?.low ?? r.ci.low, r.threshold);
  const high = ed4CiBound(r.ciRaw?.high ?? r.ci.high, r.threshold);
  return fillTemplate(EX_4_3_CI, { low, high });
}

/**
 * 4.3 표 한 줄(7칸: Metric ID | 시험항목 | 산출 결과 | 95% 신뢰구간 | 합격 기준 | 판정 | 판정 여유).
 * - M21·M22(B5): 값·신뢰구간·합격 기준·판정 여유 "—", 판정 "참고 지표"
 * - 측정 불가(B14): 판정 "측정 불가", 산출 결과·신뢰구간·판정 여유 "—", 합격 기준은 목표가 있으면 그 글자
 * - 목표 없음(대응표 10): 값은 같은 수 같은 글자(D2, 아니면 셋째 자리), 판정 "참고 지표", 나머지 "—"
 * - 판정 대상: 값 `ed4Judged`, 경계 `ed4CiBound`, 합격 기준 `ed4TargetCriteria`, 판정 합격/미달(저장 status), 판정 여유 저장 칸
 * `kpiResults` 는 같은 수 같은 글자(D2)를 찾을 같은 성적서의 지표 결과다.
 */
export function metricRowEd4(r: KpiResult, kpiResults: KpiResult[]): string[] {
  const name = r.isCore ? `${r.name}${EX_4_3_CORE_SUFFIX}` : r.name;
  const criteria = r.threshold !== null ? ed4TargetCriteria(r.threshold, r.higherIsBetter) : ED4_DASH;
  if (isTableMetric(r)) return [r.metricId, name, ED4_DASH, ED4_DASH, ED4_DASH, B5_VERDICT_REFERENCE, ED4_DASH];
  if (r.status === "unavailable") return [r.metricId, name, ED4_DASH, ED4_DASH, criteria, B14_UNMEASURABLE, ED4_DASH];
  if (r.threshold === null) {
    return [r.metricId, name, sameValueTextEd4(kpiResults, r.value), ED4_DASH, ED4_DASH, B5_VERDICT_REFERENCE, ED4_DASH];
  }
  const meets = r.status === "pass";
  return [
    r.metricId,
    name,
    ed4Judged(r.value, r.threshold, r.higherIsBetter !== false, meets),
    ciCellEd4(r),
    criteria,
    meets ? VERDICT_CELL_PASS : VERDICT_CELL_FAIL,
    r.judgmentMargin ? JUDGMENT_MARGIN_LABEL[r.judgmentMargin] : ED4_DASH,
  ];
}

/** 4.3 표 전체 — 지표 결과 순서 그대로. */
export function metricRowsEd4(kpiResults: KpiResult[]): string[][] {
  return kpiResults.map((r) => metricRowEd4(r, kpiResults));
}

/** M22 클래스별 표를 그리는가 — 판 3 6.2 와 같이 `classReport` 가 저장됐을 때(M22 를 골랐을 때만 저장된다). */
export function showsClassReportEd4(data: Pick<FinalReportData, "classReport">): boolean {
  return Boolean(data.classReport && (data.classReport.rows.length > 0 || data.classReport.averages.length > 0));
}

const cellOr = (text: string | null) => text ?? ED4_DASH;
const supportCell = (row: ClassReportRow) => (row.support === null ? ED4_DASH : String(row.support));

/**
 * M22 클래스별 표 줄([클래스, Precision, Recall, F1, 표본 수]) — 클래스 줄 다음 평균 줄. 백엔드 판 4 사실 보기 클래스별 표와
 * 같은 규칙: Precision·Recall·평균 줄은 같은 수 같은 글자(D2, 아니면 셋째 자리), 클래스 F1 은 `classF1TextEd4`(최약 클래스는
 * 사실 시트 `weakest_class.f1_text`). 값이 없으면 "—".
 */
export function classReportRowsEd4(
  table: ClassReportTable,
  kpiResults: KpiResult[],
  weakest: Pick<WeakestClassFact, "label" | "f1" | "f1_text"> | null,
): string[][] {
  const same = (v: number | null) => (v === null ? ED4_DASH : sameValueTextEd4(kpiResults, v));
  const classRows = table.rows.map((row) => [
    row.label,
    same(row.precision),
    same(row.recall),
    cellOr(classF1TextEd4(row.label, row.f1, { weakest, kpiResults, classRows: table.rows })),
    supportCell(row),
  ]);
  const averageRows = table.averages.map((row) => [row.label, same(row.precision), same(row.recall), same(row.f1), supportCell(row)]);
  return [...classRows, ...averageRows];
}

export interface SubMetricTableEd4 {
  metricId: string;
  head: string;
  /** [Metric, 값] 세 줄(Precision·Recall·F1 Score). */
  rows: string[][];
}

/** M11~M13 세부 표(판 3 6.2 "Average 지표 세부 결과") — 값은 같은 수 같은 글자(D2, 아니면 셋째 자리). */
export function subMetricTablesEd4(kpiResults: KpiResult[]): SubMetricTableEd4[] {
  return kpiResults
    .filter((r) => r.subMetrics)
    .map((r) => {
      const s = r.subMetrics!;
      const values = [s.precision, s.recall, s.f1Score];
      return {
        metricId: r.metricId,
        head: fillTemplate(V3_SUB_METRIC_HEAD, { id: r.metricId, name: r.name }),
        rows: V3_SUB_METRIC_ROWS.map((label, i) => [label, sameValueTextEd4(kpiResults, values[i])]),
      };
    });
}
