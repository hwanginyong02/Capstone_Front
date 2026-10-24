/**
 * 판 4 3절 시험 방법(갈래 b2)의 순수 함수 — 저장값을 **읽기만** 해서 3.1~3.5 의 글·표 칸을 만든다(다시 계산하지 않는다). 숫자 표기는
 * 판 4 함수(`ed4TargetCriteria`·`ed4Given`), 문구는 공용 `edition4Text.ts` 와 갈래 전용 `methodText.ts` 에서 가져온다.
 *
 * 읽는 저장 칸: `metricList`(목표값), `kpiResults[].isCore/higherIsBetter`, `coreMetricsSource`, `materials.declarations/
 * metricRationale/averagingSentence`, `materialCheck.printed.averagingSentence`·`purpose.lines`, `metricFormulas[].formula/description/
 * isCommon`, `meta.derivedPrediction/positiveClass/contractDate/issuedAt/evaluationPeriod/taskTypeLabel`, `confidenceIntervalNote`,
 * `evalEnv.method/environment/engineVersion`.
 */
import { getMetricDisplayId, METRICS, taskTypeLabelsFor } from "../../../../data/evaluationData";
import type { FinalReportData, KpiResult, MaterialRow } from "../../../../types/finalReport.types";
import { perLabelThresholds } from "../../derivationText";
import { josa } from "../../koreanJosa";
import { AVERAGING_BY_PRIORITY, choiceLabel, materialRowText } from "../../reportMaterials";
import { ed4Given, ed4TargetCriteria } from "../edition4Number";
import {
  B5_CRITERIA_REFERENCE,
  B7_AVERAGING_MET,
  B8_UNISSUED,
  ED4_DASH,
  FIXED_10_CORE_CLIENT,
  FIXED_10_CORE_DEFAULT,
  FIXED_10_MARGIN_PARAGRAPH_ED4,
  FIXED_10_RULE_ED4,
  FIXED_23_ROUNDING,
  FIXED_26_CORE_DEFAULT_CELL,
  FIXED_26_SPECIFIED_ALL,
  FIXED_26_SPECIFIED_DEFAULT_CORE,
  derivationStatementEd4,
  fillTemplate,
} from "../edition4Text";
import {
  B5_REFERENCE_METRIC_IDS,
  ED3_EVALUATED_AT_MISSING,
  ED3_M6_NOTE,
  ED3_NO_CORE,
  EX_3_1_CORE_CELL,
  EX_3_2_COMMON_GROUP,
  EX_3_2_SPECIAL_GROUP,
  EX_3_3_POSITIVE_CLASS,
  EX_3_3_SCORE_COLUMNS,
  EX_3_5_PLATFORM_VALUE,
  EX_3_5_ROW_ENGINE,
  EX_3_5_ROW_EVALUATED_AT,
  EX_3_5_ROW_LIBRARIES,
  EX_3_5_ROW_METHOD,
  EX_3_5_ROW_PLATFORM,
  EX_3_5_ROW_STANDARD,
  EX_3_5_SCHEDULE_STEPS,
  EX_3_5_STANDARD_VALUE,
  FIXED_5_METRIC_RATIONALE,
  LIBRARY_DISPLAY_NAME,
} from "./methodText";
import { isIssuedEd4 } from "./issuance";

/** 표의 한 줄(항목 | 내용). */
export interface MethodItemRow {
  label: string;
  value: string;
}

const kpiOf = (data: FinalReportData, metricId: string): KpiResult | undefined =>
  data.kpiResults.find((r) => r.metricId === metricId);

/**
 * 지표의 방향(높을수록 좋음) — 지표 결과가 있으면 그 저장값, 없으면(평가 전 초안) 지표 정의(`METRICS` 의 낮을수록 좋음 표 — 매퍼가
 * `metricList[].passCriteria` 를 만들 때 쓰는 것과 같은 표). 평가 뒤에는 늘 지표 결과 값이라 글이 바뀌지 않는다.
 */
export function higherIsBetterEd4(data: FinalReportData, metricId: string): boolean | undefined {
  const kpi = kpiOf(data, metricId);
  if (kpi) return kpi.higherIsBetter;
  return METRICS.find((m) => getMetricDisplayId(m.id) === metricId)?.higherIsBetter;
}

/* ------------------------------------------------------------------ *
 * 3.1 의뢰자 요구사항
 * ------------------------------------------------------------------ */

/** 핵심 지표가 분류 유형의 기본값인가 — 저장된 출처(`coreMetricsSource`)가 default 이고 핵심 지표가 하나라도 있을 때(정해진 것 6). */
export function usesDefaultCore(data: FinalReportData): boolean {
  return data.coreMetricsSource === "default" && data.kpiResults.some((r) => r.isCore);
}

/** 3.1 표 위 안내(고정 문구 26) — 핵심 지표가 기본값이면 둘째 글(정해진 것 6). */
export function requirementsHeadEd4(data: FinalReportData): string {
  return usesDefaultCore(data) ? FIXED_26_SPECIFIED_DEFAULT_CORE : FIXED_26_SPECIFIED_ALL;
}

/** 3.1 의뢰자 선언 표(위험 방향·사용 방식·클래스 중요도) — 값은 `materialRowText`("… (의뢰자 제공: …)", 대응표 2). */
export function declarationRowsEd4(data: FinalReportData): MethodItemRow[] {
  const rows: MaterialRow[] = data.materials?.declarations ?? [];
  return rows.map((row) => ({ label: row.label, value: materialRowText(row) }));
}

/** 3.1 고정 문구 5(멀티레이블만) — "지표 선택 기준: …". 멀티레이블이 아니거나 이유 칸이 저장되지 않았으면 null. */
export function metricRationaleEd4(data: FinalReportData): string | null {
  const materials = data.materials;
  if (data.meta.taskType !== "multilabel" || !materials || materials.metricRationale === undefined) return null;
  return fillTemplate(FIXED_5_METRIC_RATIONALE, {
    "지표 선택 이유": materialRowText({ value: materials.metricRationale, note: materials.metricRationaleNote }),
  });
}

/**
 * 3.1 선택 지표와 합격 기준 표의 행 — [Metric ID, 시험항목, 합격 기준, 핵심 지표]. 합격 기준은 판 4 표기(`ed4TargetCriteria`, D1 —
 * 표지·4.3 과 같은 함수, 방향은 `higherIsBetterEd4`), 목표가 없거나 M21·M22 면 "없음(참고 지표)"(대응표 10, B5). 핵심 지표 열은
 * "핵심" / 기본값이면 "핵심(기본값)" / "—".
 */
export function criteriaRowsEd4(data: FinalReportData): string[][] {
  const defaultCore = data.coreMetricsSource === "default";
  return data.metricList.map((metric) => {
    const kpi = kpiOf(data, metric.metricId);
    const criteria =
      metric.threshold === null || B5_REFERENCE_METRIC_IDS.has(metric.metricId)
        ? B5_CRITERIA_REFERENCE
        : ed4TargetCriteria(metric.threshold, higherIsBetterEd4(data, metric.metricId));
    const core = kpi?.isCore ? (defaultCore ? FIXED_26_CORE_DEFAULT_CELL : EX_3_1_CORE_CELL) : ED4_DASH;
    return [metric.metricId, metric.name, criteria, core];
  });
}

/* ------------------------------------------------------------------ *
 * 3.2 시험항목과 산정식
 * ------------------------------------------------------------------ */

export interface FormulaGroupEd4 {
  title: string;
  /** [Metric ID, 시험항목, 시험목표, 시험방법 및 산정식] — 산정식은 저장된 판 4 글(`metricFormulas[].formula`). */
  rows: string[][];
}

/**
 * 3.2 묶음 — 공통 지표(공통 표시 `isCommon`)와 유형 전용 지표, 각각 3.1 과 같은 지표 순서. 전용 지표가 없으면 그 묶음은 없다(판 3
 * `MetricListSection` 과 같은 규칙). 묶음 이름은 예시본 글자(유형 이름은 판 3 `taskTypeLabelsFor`).
 */
export function formulaGroupsEd4(data: FinalReportData): FormulaGroupEd4[] {
  const formulas = new Map(data.metricFormulas.map((f) => [f.metricId, f]));
  const row = (metricId: string, name: string) => {
    const f = formulas.get(metricId);
    return [metricId, name, f?.description ?? ED4_DASH, f?.formula ?? ED4_DASH];
  };
  const names = taskTypeLabelsFor(data.meta.taskTypeLabel);
  const common = data.metricList.filter((m) => formulas.get(m.metricId)?.isCommon);
  const special = data.metricList.filter((m) => !formulas.get(m.metricId)?.isCommon);
  const groups: FormulaGroupEd4[] = [
    { title: fillTemplate(EX_3_2_COMMON_GROUP, names), rows: common.map((m) => row(m.metricId, m.name)) },
  ];
  if (special.length > 0) {
    groups.push({
      title: fillTemplate(EX_3_2_SPECIAL_GROUP, { 유형: data.meta.taskTypeLabel }),
      rows: special.map((m) => row(m.metricId, m.name)),
    });
  }
  return groups;
}

/* ------------------------------------------------------------------ *
 * 3.3 산출 기준
 * ------------------------------------------------------------------ */

/** 3.3 첫 항목(고정 문구 9 판 4 + 한 임계값이면 " (점수 컬럼: …)")과 레이블별 임계값 표. 파생 예측이 아니면 null. */
export interface DerivationEd4 {
  statement: string;
  /** [점수 컬럼, 결정 임계값] — 레이블마다 임계값이 저장된 멀티레이블만(판 3 `perLabelThresholds`). 그 밖은 빈 배열. */
  perLabelRows: string[][];
}

export function derivationEd4(data: FinalReportData): DerivationEd4 | null {
  const fact = data.meta.derivedPrediction;
  if (!fact) return null;
  const perLabel = perLabelThresholds(fact);
  const columns = fact.source_columns.length > 0 && perLabel.length === 0
    ? fillTemplate(EX_3_3_SCORE_COLUMNS, { columns: fact.source_columns.join(", ") })
    : "";
  return {
    statement: `${derivationStatementEd4(fact)}${columns}`,
    perLabelRows: perLabel.map(([column, threshold]) => [column, ed4Given(threshold)]),
  };
}

/** 3.3 양성 클래스 문장(예시본, 이진만). 양성 클래스가 저장되지 않았으면 null(판 3 의 "Target" 대체 글은 쓰지 않는다). */
export function positiveClassSentenceEd4(data: FinalReportData): string | null {
  if (data.meta.taskType !== "binary" || !data.meta.positiveClass) return null;
  return fillTemplate(EX_3_3_POSITIVE_CLASS, { positive: data.meta.positiveClass });
}

/** B7 충족 글의 재료(평균 방식·선언 값) — 저장된 목적별 점검 줄(`purpose.lines` 의 averaging)에서 읽는다. 없으면 null. */
export function averagingMetMaterialsEd4(data: FinalReportData): { averaging: string; declared: string } | null {
  const line = data.materialCheck?.purpose.lines.find((l) => l.id === "averaging");
  if (!line || !line.met) return null;
  // 선언 값(선택지의 성적서 이름) → 클래스 중요도 저장값 → 평균 방식. 재료 점검과 판 3 문장이 쓰는 표(AVERAGING_BY_PRIORITY) 그대로.
  const key = Object.keys(AVERAGING_BY_PRIORITY).find((k) => choiceLabel("perspective", "classPriority", k) === line.declared);
  return key ? { averaging: AVERAGING_BY_PRIORITY[key], declared: line.declared } : null;
}

/**
 * 3.3 고정 문구 4(다중 클래스, 부록 B7) — 미충족이면 저장된 `materialCheck.printed.averagingSentence`(판 4 글), 충족이면 B7 충족 틀을
 * 저장 재료로 채운다(`"{선언 값}"(으)로` 의 조사는 선언 값 끝소리로). 다중 클래스가 아니거나 클래스 중요도 문장이 저장되지 않았거나
 * 재료가 없으면 null.
 */
export function averagingSentenceEd4(data: FinalReportData): string | null {
  const unmet = data.materialCheck?.printed.averagingSentence;
  if (unmet) return unmet;
  if (data.meta.taskType !== "multiclass" || !data.materials?.averagingSentence) return null;
  const materials = averagingMetMaterialsEd4(data);
  if (!materials) return null;
  // 한 번에 함수로 바꾼다 — 끼운 글자 속 `$&`·`{…}` 가 치환 패턴·다음 자리로 읽히지 않게.
  const declared = `"${materials.declared}"${josa(materials.declared, "으로/로")}`;
  return B7_AVERAGING_MET.replace(/\{평균 방식\}|"\{선언 값\}"\(으\)로/g, (whole) =>
    whole === "{평균 방식}" ? materials.averaging : declared,
  );
}

/**
 * 3.3 목록(첫 항목 뒤 레이블별 표는 `derivationEd4().perLabelRows` 로 따로 그린다) — 대응표 14 순서: 9번(+점수 컬럼) → (레이블별 표) →
 * 양성 클래스 → 4번(B7) → 23번 → M6 줄 → 신뢰구간 방식(저장된 `confidenceIntervalNote`, 예시본 글).
 */
export function basisItemsEd4(data: FinalReportData): { first: string | null; rest: string[] } {
  const derivation = derivationEd4(data);
  const rest = [
    positiveClassSentenceEd4(data),
    averagingSentenceEd4(data),
    FIXED_23_ROUNDING,
    data.kpiResults.some((r) => r.metricId === "M6") ? ED3_M6_NOTE : null,
    data.confidenceIntervalNote ?? null,
  ].filter((t): t is string => typeof t === "string" && t !== "");
  return { first: derivation?.statement ?? null, rest };
}

/* ------------------------------------------------------------------ *
 * 3.4 판정 규칙
 * ------------------------------------------------------------------ */

/** 3.4 의 {core_metrics} — 핵심 지표 "이름(ID)" 를 쉼표로(판 3 `verdictRuleText` 와 같은 꼴), 없으면 "지정 없음". */
export function coreMetricsTextEd4(data: FinalReportData): string {
  const core = data.kpiResults.filter((r) => r.isCore).map((r) => `${r.name}(${r.metricId})`);
  return core.length > 0 ? core.join(", ") : ED3_NO_CORE;
}

/** 3.4 두 문단(고정 문구 10 판 4) — 핵심 지표 출처가 default 면 핵심 지표 문장을 10_core_default 로. */
export function verdictRuleParagraphsEd4(data: FinalReportData): [string, string] {
  const rule =
    data.coreMetricsSource === "default" ? FIXED_10_RULE_ED4.replace(FIXED_10_CORE_CLIENT, () => FIXED_10_CORE_DEFAULT) : FIXED_10_RULE_ED4;
  return [fillTemplate(rule, { core_metrics: coreMetricsTextEd4(data) }), FIXED_10_MARGIN_PARAGRAPH_ED4];
}

/* ------------------------------------------------------------------ *
 * 3.5 시험 절차와 평가 환경
 * ------------------------------------------------------------------ */

/**
 * 3.5 단계별 수행 일시 표(부록 B8) — 1행 평가 의뢰일(`contractDate`, 없으면 시험 기간 시작), 2행 평가 수행 일시의 날짜(없으면 시험 기간
 * 끝), 3행 발급 일시(미발급이면 "(미발급)" — 발급 판정은 `issuance.ts` 한 곳, 표지와 같은 기준).
 */
export function scheduleRowsEd4(data: FinalReportData): string[][] {
  const { meta } = data;
  const evaluatedAt = data.evalEnv.environment?.evaluated_at;
  const dates = [
    meta.contractDate || meta.evaluationPeriod.from,
    evaluatedAt ? evaluatedAt.slice(0, 10) : meta.evaluationPeriod.to,
    isIssuedEd4(data) && meta.issuedAt ? meta.issuedAt : B8_UNISSUED,
  ];
  return EX_3_5_SCHEDULE_STEPS.map(([step, work], i) => [step, work, dates[i]]);
}

/**
 * 3.5 주요 라이브러리 — 응답 키(소문자)를 코드포인트 순으로 정렬한 뒤 표시 이름으로(계획 9절: numpy, pandas, Python, scikit-learn).
 * 라이브러리가 없으면 "—".
 */
export function librariesTextEd4(libraries: Record<string, string> | undefined): string {
  const entries = Object.entries(libraries ?? {}).map(([name, version]) => [name.toLowerCase(), version] as const);
  if (entries.length === 0) return ED4_DASH;
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([name, version]) => `${LIBRARY_DISPLAY_NAME[name] ?? name} ${version}`).join(", ");
}

/** 3.5 평가 시스템 환경 표 — 평가 엔진 버전은 `evalEnv.engineVersion`(모델 버전 아님), 없으면 "—". */
export function systemRowsEd4(data: FinalReportData): MethodItemRow[] {
  const env = data.evalEnv;
  const evaluatedAt = env.environment?.evaluated_at;
  return [
    { label: EX_3_5_ROW_PLATFORM, value: EX_3_5_PLATFORM_VALUE },
    { label: EX_3_5_ROW_METHOD, value: env.method },
    { label: EX_3_5_ROW_STANDARD, value: EX_3_5_STANDARD_VALUE },
    { label: EX_3_5_ROW_LIBRARIES, value: librariesTextEd4(env.environment?.libraries) },
    {
      label: EX_3_5_ROW_EVALUATED_AT,
      value: evaluatedAt || fillTemplate(ED3_EVALUATED_AT_MISSING, { date: data.meta.evaluationPeriod.to }),
    },
    { label: EX_3_5_ROW_ENGINE, value: env.engineVersion || ED4_DASH },
  ];
}
