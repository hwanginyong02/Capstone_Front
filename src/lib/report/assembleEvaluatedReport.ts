/**
 * `/api/evaluate` 응답으로 stage1 성적서와 AI 사실 시트를 조립한다(서술과 무관한 결정론적 부분).
 *
 * 종전에는 이 조립이 `useReportData` 훅 안에 있어 테스트가 닿지 않았다 — 새 선택 키(신뢰구간·아슬아슬·
 * 경계/확신 오류·문제 목록·고정 문구)를 저장하거나 사실 시트에 싣는 줄 하나가 빠져도 아무 테스트도
 * 실패하지 않았다. 훅은 이 함수를 부르고 결과를 그대로 쓴다(동작 동일).
 *
 * 새 문장은 여기서(생성 때) 만들어 성적서 데이터에 저장한다. 응답에 키가 없으면(옛 응답) 저장하는
 * 선택 키도 두지 않는다.
 */
import type { TaskType } from "../../data/evaluationData";
import { getMetricDisplayId, METRICS, resolveTaskType } from "../../data/evaluationData";
import type { FinalReportData, LatencyStats } from "../../types/finalReport.types";
import type { ConfusionMatrixData } from "../../types/report.types";
import type { MappingRow } from "../../types/mapping.types";
import type { ComposerValueMap } from "../../types/reportComposer.types";
import type { MetricDetailStateMap } from "../../types/workflow.types";
import { resolveBeta, resolveTargetValue } from "../../utils/domain/validation";
import { NO_PROBLEM_SENTENCE } from "./reportConstants";
import { buildDatasetDiagnosis } from "./buildDatasetDiagnosis";
import { buildFactSheet, type FactSheet } from "./buildFactSheet";
import { buildClassReportTable } from "./classReportTable";
import { buildConclusion, coreMetricsSource, resolveCoreMetricIds } from "./computeVerdict";
import { derivationStatement } from "./derivationText";
import { fitFactSheet } from "./factSheetFit";
import { buildNarrativeFacts, type FixedSentenceFact, type SingleConfusion } from "./narrativeFacts";
import {
  attachConfidenceIntervals,
  confidenceIntervalNote,
  parseConfidenceIntervals,
} from "./confidenceIntervals";
import { parseConfusionCounts } from "./confusionCounts";
import { labelCautionSentence, SAME_SOURCE_SENTENCE, sourceRelationSentence } from "./dataCautionPhrases";
import { errorRatioSentence, parseErrorRatios } from "./errorRatios";
import { evaluateStatus } from "./evaluateStatus";
import type { MapWorkflowToReportInput } from "./mapWorkflowToFinalReport";
import { attachNearTarget, nearTargetNote } from "./nearTarget";
import { noBenchmarkSentence } from "./benchmarkBaselines";
import { MULTILABEL_IMBALANCE_DEFINITION } from "./narrativeSectionText";
import { usesSchema3, usesSchema4 } from "./normalizeReportContent";
import { attachJudgmentMargin, parseRawIntervalBounds } from "./edition4/judgmentMargin";
import { buildDistributionEd4 } from "./edition4/distributionEd4";
import { derivationStatementEd4 } from "./edition4/edition4Text";
import { parseEngineVersion, parseImbalanceRawEd4, parseSourceFile } from "./edition4/factSheetEd4";
import { buildThresholdTableEd4, parseF1ThresholdGainEd4 } from "./edition4/thresholdGainEd4";
import { buildCoverResultRows, buildVerdictEd4 } from "./edition4/verdictEd4";
import { imbalanceRatioOf } from "./buildDatasetDiagnosis";
import type { Edition4Values } from "../../types/finalReport.types";
import { buildProblemList, parseF1ThresholdGain, parseImbalanceEffect } from "./problemList";

/** 조립에 쓰는 워크플로우 값. 훅은 스토어와 `buildReportInput` 결과에서 그대로 꺼내 넘긴다. */
export interface EvaluatedReportInputs {
  taskType: TaskType | "";
  selectedMetricIds: string[];
  metricDetails: MetricDetailStateMap;
  /** 스토어의 ② 카드 값(핵심 지표 선택). 재료 고르기로 거르기 전 값이다 — 종전 훅과 같다. */
  composerMetrics: ComposerValueMap | undefined;
  columnMapping: MappingRow[];
  metadata:
    | {
        positive_class?: string | null;
        detected_classes?: string[];
        detected_labels?: string[];
        class_distribution?: Record<string, number>;
      }
    | null
    | undefined;
  /** `buildReportInput(...).composer` — 문제 목록·고정 문구 12·11a·11b 의 재료. */
  composer: MapWorkflowToReportInput["composer"];
}

export interface AssembledEvaluatedReport {
  stage1Report: FinalReportData;
  factSheet: FactSheet;
}

/**
 * `/api/evaluate` 응답 본문(`result`)을 성적서로 조립한다. `result` 는 서버 JSON 그대로다
 * (`results.success_metrics`·`failed_metrics`, `class_distribution`, `n_samples`, `dropped_rows`, …).
 */
export function assembleEvaluatedReport(
  baseReport: FinalReportData,
  result: any,
  inputs: EvaluatedReportInputs,
): AssembledEvaluatedReport {
  // 판은 run 에 찍힌 값 하나만 읽는다(맨 위에서 한 번 — 판 4 라운드 계획 2.2). 아래 판 4 갈래는 모두 이 값을 받는다.
  const edition4 = usesSchema4(baseReport);
  const success_metrics = result.results.success_metrics || {};
  // 계산 실패 지표({metricId: 에러문자열}). value 0/fail 위장 대신 'unavailable' 처리(D4).
  const failed_metrics = result.results.failed_metrics || {};

  // 1. KPI 지표 계산값 치환
  const taskTypeForMetrics = resolveTaskType(inputs.taskType);
  // 핵심 지표 — 지표와 합격 기준 화면의 합격 기준 표에서 고른 값, 고르지 않았으면 유형별 기본값이다.
  // 판정(아래 buildConclusion)과 성적서의 "핵심" 표시가 같은 목록을 본다.
  const coreDisplayIds = new Set(
    resolveCoreMetricIds(
      taskTypeForMetrics,
      inputs.selectedMetricIds,
      inputs.composerMetrics,
    ).map(getMetricDisplayId),
  );
  const kpiResultsWithoutCi = inputs.selectedMetricIds
    .map((metricId) => {
      // **task 필터를 함께 본다.** 4절(metricList)·5절(metricFormulas)은
      // supportedTaskTypes 로 거르는데 여기만 걸러내지 않아, 그 task 가 노출하지
      // 않는 지표가 6절 KPI 표에만 숫자로 찍혔다(A-04 의 인쇄 결과).
      const metric = METRICS.find(
        (m) => m.id === metricId && m.supportedTaskTypes.includes(taskTypeForMetrics),
      );
      if (!metric) return null;

      // 방향성(높을수록/낮을수록 좋음) — 판정·기준 표기의 단일 출처(evaluationData.ts)
      const higherIsBetter = metric.higherIsBetter !== false;
      const detail = inputs.metricDetails[metricId];
      // 목표값이 없으면 null. 정보성 지표(M21/M22)는 과거 세션에 저장된 값이 남아 있어도
      // null 이다. 0·음수도 그 지표의 허용 범위 안이면 목표값이다(MCC 등).
      const target = resolveTargetValue(metricId, detail?.targetValue);
      const displayId = getMetricDisplayId(metricId);

      // 계산 실패 지표: 판정/집계에서 제외되도록 'unavailable' 로 표기(value 0/fail 위장 금지)
      const failReason = failed_metrics[metricId];
      if (failReason !== undefined) {
        return {
          metricId: displayId,
          name: metric.name,
          value: 0,
          threshold: target,
          status: "unavailable" as const,
          higherIsBetter,
          errorMessage: typeof failReason === "string" ? failReason : String(failReason),
          perClass: undefined,
          subMetrics: undefined,
          isCore: coreDisplayIds.has(displayId),
        };
      }

      const val = success_metrics[metricId];

      // dict 반환 메트릭 (M11/M12/M13): f1_score를 대표값으로, 세부값은 subMetrics로
      let resolvedValue = 0;
      let subMetrics: { precision: number; recall: number; f1Score: number } | undefined;

      if (typeof val === "number") {
        resolvedValue = val;
      } else if (val && typeof val === "object" && "f1_score" in val) {
        resolvedValue = val.f1_score;
        subMetrics = { precision: val.precision, recall: val.recall, f1Score: val.f1_score };
      }

      let status: "pass" | "fail" | "warning" | "unavailable" = "pass";
      if (target !== null) {
        status = evaluateStatus(resolvedValue, target, higherIsBetter);
      }

      const isVisualOnly = metricId === "M21" || metricId === "M22";

      return {
        metricId: displayId,
        name: metric.name,
        value: resolvedValue,
        threshold: isVisualOnly ? null : target,
        status: isVisualOnly ? "pass" : status,
        higherIsBetter,
        subMetrics,
        isCore: coreDisplayIds.has(displayId),
      };
    })
    .filter((item): item is any => item !== null);

  // 95% 신뢰구간(설계 D29) — 엔진은 고른 지표 전부를 계산하고, 판정 대상 지표에만 붙인다(`isJudged`).
  // 6.0 방식 한 줄은 지금 만들어 저장한다. 판정 대상에 붙은 구간이 없으면 키를 두지 않는다.
  const confidenceIntervals = parseConfidenceIntervals(success_metrics.confidence_intervals);
  // 아슬아슬(설계 D12) — 판정 대상 지표에 margin·nearTarget 을 붙인다(`computeVerdict.ts` 한 곳의 식).
  // 8.3 한 줄은 지금 만들어 저장한다. 아슬아슬 지표가 없으면 키를 두지 않는다.
  const withNearTarget = attachNearTarget(
    attachConfidenceIntervals(kpiResultsWithoutCi, confidenceIntervals),
  );
  // 판 4 판정 여유(대응표 24) — 반올림 전 신뢰구간이 목표를 포함하는지(구간이 없으면 3%). 판 3 의 nearTarget 은 그대로 둔다.
  const updatedKpiResults = edition4
    ? attachJudgmentMargin(withNearTarget, parseRawIntervalBounds(success_metrics.confidence_intervals))
    : withNearTarget;
  const ciNote = confidenceIntervalNote(updatedKpiResults, confidenceIntervals);
  // 고정 문구 18(3% 근소 문장)은 판 3 글이다 — 판 4 는 4.3 판정 여유 열이 대신하므로 만들지도 싣지도 않는다(D49 ④).
  const nearNote = edition4 ? null : nearTargetNote(updatedKpiResults);

  // 2. 오차 행렬(Confusion Matrix) 치환
  let confusionMatrix = null;
  if (success_metrics.M21) {
    const cm = success_metrics.M21;
    if (cm.type === "multilabel") {
      const classLabels = cm.labels || inputs.metadata?.detected_labels || [];
      const multilabelMatrices = cm.matrix.map((mat: number[][], idx: number) => {
        const labelName = classLabels[idx] || `Label ${idx}`;
        const total = mat.reduce((acc: number, row: number[]) => acc + row.reduce((a, b) => a + b, 0), 0);
        return { label: labelName, matrix: mat, totalSamples: total };
      });
      const defaultMat = multilabelMatrices[0] || { label: "Label 0", matrix: [[0, 0], [0, 0]], totalSamples: 0 };
      confusionMatrix = {
        labels: [`Negative (${defaultMat.label})`, `Positive (${defaultMat.label})`],
        matrix: defaultMat.matrix,
        totalSamples: defaultMat.totalSamples,
        multilabelMatrices,
      };
    } else {
      const total = cm.matrix.reduce((acc: number, row: number[]) => acc + row.reduce((a, b) => a + b, 0), 0);
      confusionMatrix = {
        labels: cm.labels || cm.matrix.map((_: any, idx: number) => `Class ${idx}`),
        matrix: cm.matrix,
        totalSamples: total,
      };
    }
  }

  // 2-1. ROC / PR 곡선 좌표 + 스칼라 AUC (binary, 백엔드 success_metrics)
  const rocCurve = success_metrics.roc_curve
    ? {
        fpr: success_metrics.roc_curve.fpr,
        tpr: success_metrics.roc_curve.tpr,
        auroc: typeof success_metrics.M9 === "number" ? success_metrics.M9 : undefined,
      }
    : null;
  const prCurve = success_metrics.pr_curve
    ? {
        recall: success_metrics.pr_curve.recall,
        precision: success_metrics.pr_curve.precision,
        auprc: typeof success_metrics.M10 === "number" ? success_metrics.M10 : undefined,
      }
    : null;

  // 2-2. 지연시간 통계 — latency 컬럼이 매핑된 경우만 백엔드가 latency_stats 반환
  const ls = success_metrics.latency_stats;
  const latencyStats: LatencyStats | null = ls
    ? {
        mean: ls.mean,
        min: ls.min,
        p50: ls.p50,
        p95: ls.p95,
        p99: ls.p99,
        max: ls.max,
        unit: ls.unit === "s" ? "s" : "ms",
      }
    : null;

  // 3. 데이터셋 진단 문구 — 실제 클래스 분포 + 불균형비(M23) + 제외 행수로 구성
  const imbalanceRatio =
    typeof success_metrics.M23 === "number" ? success_metrics.M23 : undefined;
  // 불균형 영향(서술 설계 D20) — 엔진의 판정. 3절 문장·9절 문제 목록·AI 사실 시트가 이 하나를 읽는다.
  const imbalanceEffect = parseImbalanceEffect(success_metrics.imbalance_effect);

  // 백엔드 EvaluateResponse 에서 최신 class_distribution 이 오면 우선 사용, 없으면 metadata 폴백
  const resolvedClassDistribution = result.class_distribution && Object.keys(result.class_distribution).length > 0
    ? result.class_distribution
    : inputs.metadata?.class_distribution || {};

  const taskTypeResolved = resolveTaskType(inputs.taskType);
  // 혼동행렬의 totalSamples가 가장 정확한 평가 데이터의 row 수 (멀티레이블의 경우 200)
  // 서버가 확정한 표본 수를 최우선으로 쓴다. 종전에는 마지막 폴백으로 학습 데이터 폼의
  // 검증 샘플 수를 썼다 — 모델 학습용 검증 세트 크기라 평가 행 수와 무관하다
  // (B-02·E-17). 그 폼은 ⑥ 카드로 합쳐지며 없어졌다.
  const datasetSize: number | undefined =
    result.n_samples || confusionMatrix?.totalSamples || undefined;

  const datasetDiagnosis = buildDatasetDiagnosis(
    { class_distribution: resolvedClassDistribution },
    imbalanceRatio,
    result.dropped_rows,
    datasetSize,
    taskTypeResolved,
    imbalanceEffect,
    // 다수·소수 클래스를 '이름(설명)' 으로 부른다(D37) — 3절 클래스 레이블 설명 표와 같은 값.
    Object.fromEntries((baseReport.datasetInfo.classLabelDescriptions ?? []).map((c) => [c.label, c.description])),
  );

  // 4. verdict/score 규칙 산출 (서술의 권위 값 — 백엔드도 fact_sheet.verdict 로 강제)
  const ruleConclusion = buildConclusion(updatedKpiResults, taskTypeResolved, [
    ...coreDisplayIds,
  ]);

  // 5. LLM 서술 생성용 fact_sheet 조립 — 실패/무키 시 빈 서술 반환(섹션이 "생성 예정" 안내).
  //    KPI·차트는 영향받지 않음.
  const yTrueRow = inputs.columnMapping.find(
    (r) => r.confirmedRole === "y_true",
  );
  const classLabels: string[] =
    inputs.metadata?.detected_classes?.length
      ? inputs.metadata.detected_classes
      : inputs.metadata?.detected_labels?.length
        ? inputs.metadata.detected_labels
        : yTrueRow
          ? [...new Set(yTrueRow.sampleValues)]
          : [];

  // TP·TN·FP·FN 건수 — M21 선택과 무관하게 백엔드가 늘 내린다(재료 목록 9절).
  const confusionCounts = parseConfusionCounts(success_metrics.confusion_counts);
  // 파생 예측 사실(SPEC §0 기재 의무) — 7.1 앞 고정 문구와 AI 사실 시트에 쓴다. 백엔드는 실제로
  // 파생이 일어났을 때만 이 키를 내려보낸다(A-01).
  const derivedPrediction = success_metrics.derived_prediction ?? undefined;
  // 경계·확신 오류 비율(설계 D30) — 확률이 있는 평가에만 백엔드가 싣는다. 7.1 문장은 지금 만들어
  // 저장한다(발급본은 나중에 문안이 바뀌어도 그대로).
  const errorRatios = parseErrorRatios(success_metrics.error_ratios);
  // 9절 문제 목록(설계 D22) — 판정 사유·아슬아슬·임계값 조정 여지(D40)·불균형 영향(D20)·M22 표·
  // 학습 분포·정답 라벨로 9종을 고른다. 지금 만들어 저장하고, 같은 목록을 AI 사실 시트에 싣는다.
  const thresholdGain = parseF1ThresholdGain(success_metrics.f1_threshold_gain);
  // 6.2 클래스별 표 인쇄는 M22 를 골랐을 때만(지표 선택을 따른다).
  const classReport = buildClassReportTable(
    success_metrics.M22,
    classLabels,
    inputs.taskType || undefined,
  );
  // 서술·문제 목록·D6 표가 읽는 표는 지표 선택과 무관하게 엔진이 늘 계산하는 새 칸에서(S2 응답, S4a).
  // 새 칸이 없는 옛 응답이면 M21·M22 로 대신한다. 클래스 순서는 엔진 순서(혼동행렬 labels) 하나.
  const engineMatrix = parseEngineConfusion(success_metrics.confusion_matrix ?? success_metrics.M21);
  const engineLabels = engineMatrix?.labels ?? classLabels;
  const engineClassTable = buildClassReportTable(
    success_metrics.class_report ?? success_metrics.M22,
    engineLabels,
    taskTypeResolved,
  );
  const positiveClass =
    (taskTypeResolved === "binary" && confusionCounts?.kind === "binary" ? confusionCounts.rows[0].label : null) ||
    inputs.metadata?.positive_class ||
    null;
  const nSamples = result.n_samples ?? confusionMatrix?.totalSamples ?? 0;
  const factsWithoutSentences = buildNarrativeFacts({
    taskType: taskTypeResolved,
    kpiResults: updatedKpiResults,
    coreMetricIds: [...coreDisplayIds],
    coreMetricsSource: coreMetricsSource(inputs.composerMetrics),
    classTable: engineClassTable,
    confusion: engineMatrix?.single ?? null,
    confusionCounts,
    positiveClass,
    reportPurpose: baseReport.evalScope?.reportPurposeKey,
    composer: inputs.composer,
    evaluationDistribution: resolvedClassDistribution,
    confidenceIntervals,
    fixedSentences: [],
    nSamples,
    edition4,
  });
  const problems = buildProblemList({
    kpiResults: updatedKpiResults,
    taskType: taskTypeResolved,
    coreMetricIds: [...coreDisplayIds],
    thresholdGain,
    imbalanceEffect,
    facts: factsWithoutSentences,
    composer: inputs.composer,
    edition: edition4 ? 4 : 3,
  });

  // 7.2 고정 문구 12(9절 "정답 라벨 주의"와 같은 판정)와 8.2 고정 문구 11a·11b. 의뢰자 답은
  // client_inputs 로 이미 AI 에 가므로 사실 시트에 따로 싣지 않는다.
  const labelSentence = labelCautionSentence(inputs.composer);
  const sourceSentence = sourceRelationSentence(inputs.composer);
  const errorRatioText = errorRatios ? errorRatioSentence(errorRatios, taskTypeResolved) : null;
  // 8.1 표 아래 고정 문구 16 — 고른 서술 지표 중 내부 참조 기준치가 없는 것(사용자 결정 5). 8.1 표는 작업 생성
  // 응답으로 오므로 기준표 이름 사본으로 지금 계산해 저장하고 사실 시트에도 싣는다(백엔드는 되풀이하지 않는다).
  // 판 3 전용 고정 문장(16·7)은 판 3 바탕일 때만 — 판 1·2 화면은 이 문장을 찍지 않으므로, 실으면 AI 가 "성적서가
  // 따로 찍는다"고 믿고 빼 버려 그 판 성적서에서 말이 빠진다. 고정 문구 9 도 그 판 화면과 같은 조사로 싣는다.
  const schema3 = usesSchema3(baseReport);
  const noBenchmarkText = schema3 ? noBenchmarkSentence(updatedKpiResults, taskTypeResolved) : null;

  // 7~9절에 코드가 찍을 고정 문장 — AI·템플릿은 같은 숫자를 되풀이하지 않고 해석만 쓴다(생-12).
  const fixedSentences: FixedSentenceFact[] = [
    // 판 4 는 9번을 판 4 합니다체 글로(3.3 첫 항목과 같은 글). 칸 이름(7.1)은 그대로다.
    ...(derivedPrediction
      ? [{
          id: "9",
          section: "7.1",
          text: edition4 ? derivationStatementEd4(derivedPrediction) : derivationStatement(derivedPrediction, { legacyParticle: !schema3 }),
        }]
      : []),
    ...(errorRatioText ? [{ id: "17", section: "7.1", text: errorRatioText }] : []),
    // 7.2 고정 문구 7 — 멀티레이블 불균형 비율 정의(화면 InterpretSection 이 판 3 멀티레이블에 늘 찍는다).
    ...(schema3 && taskTypeResolved === "multilabel" ? [{ id: "7", section: "7.2", text: MULTILABEL_IMBALANCE_DEFINITION }] : []),
    ...(labelSentence ? [{ id: "12", section: "7.2", text: labelSentence }] : []),
    ...(noBenchmarkText ? [{ id: "16", section: "8.1", text: noBenchmarkText }] : []),
    ...(sourceSentence
      ? [{ id: sourceSentence === SAME_SOURCE_SENTENCE ? "11a" : "11b", section: "8.2", text: sourceSentence }]
      : []),
    ...(nearNote ? [{ id: "18", section: "8.3", text: nearNote }] : []),
    ...(problems.length === 0 ? [{ id: "6", section: "9", text: NO_PROBLEM_SENTENCE }] : []),
  ];

  const betas: Record<string, number> = {};
  for (const r of updatedKpiResults) {
    const metric = METRICS.find((m) => getMetricDisplayId(m.id) === r.metricId);
    if (metric?.additionalFields?.includes("beta")) betas[r.metricId] = resolveBeta(inputs.metricDetails);
  }

  // 판 4 전용 파서 — 평가 응답의 반올림 전 값(S1). 판 3 파서(`parseF1ThresholdGain`·`parseImbalanceEffect`)는 그대로다.
  const thresholdGainRaw = edition4 ? parseF1ThresholdGainEd4(success_metrics.f1_threshold_gain, thresholdGain) : null;
  const imbalanceRaw = edition4 ? parseImbalanceRawEd4(success_metrics.imbalance_effect, imbalanceEffect) : null;

  const factSheet = fitFactSheet(
    buildFactSheet({
      kpiResults: updatedKpiResults,
      confusionMatrix: engineMatrix?.chart ?? null,
      classDistribution: resolvedClassDistribution,
      // 표본 수는 서버가 확정한 값을 그대로 쓴다. 분포 합계로 추측하면 멀티레이블에서
      // 200행이 408 이 된다(B-02).
      nSamples,
      imbalanceRatio,
      droppedRows: result.dropped_rows,
      verdict: ruleConclusion.verdict,
      score: ruleConclusion.score,
      classTable: engineClassTable,
      latencyStats,
      positiveClass,
      confusionCounts,
      derivedPrediction,
      errorRatios,
      confidenceIntervalNote: ciNote,
      thresholdGain,
      imbalanceEffect,
      problems,
      betas,
      facts: { ...factsWithoutSentences, fixed_sentences: fixedSentences },
      ...(edition4 ? { edition4: { thresholdGainRaw, imbalanceRaw } } : {}),
    }),
  );

  // 판 4 생성값(S3 ⑥) — 판 4 run 에만. 판정·판정 여유·분포 차는 위에서 정한 값을 읽기만 한다. 4.5 표는 자르기 전 사실에서.
  const edition4Values: Edition4Values | null = edition4
    ? (() => {
        const verdict = buildVerdictEd4(factsWithoutSentences.verdict_detail, updatedKpiResults);
        // 4.5 불균형 비율은 M23 원값(고르지 않았으면 엔진 불균형 영향의 원값, 그것도 없으면 분포로 계산).
        const imbalanceRaw45 =
          imbalanceRatio ?? imbalanceRaw?.imbalance_ratio ?? imbalanceRatioOf(resolvedClassDistribution);
        return {
          coverResultRows: buildCoverResultRows(verdict, updatedKpiResults),
          verdict,
          thresholdTable:
            thresholdGain && thresholdGainRaw
              ? buildThresholdTableEd4(thresholdGainRaw, thresholdGain, updatedKpiResults, derivedPrediction)
              : null,
          distribution: buildDistributionEd4({
            taskType: taskTypeResolved,
            classDistribution: resolvedClassDistribution,
            nSamples: datasetSize,
            imbalanceRatio: imbalanceRaw45 ?? null,
            imbalanceEffect,
            facts: factsWithoutSentences,
            composer: inputs.composer,
          }),
        };
      })()
    : null;

  // ── Stage 1: 서술과 무관한 결정론적 결과(KPI·차트·규칙 verdict).
  //    interpretation/recommendation* 은 baseReport 의 빈 기본값 유지, narrativeSource 미설정.
  const stage1Report: FinalReportData = {
    ...baseReport,
    // 평가 데이터 표본 수는 평가에 실제로 쓴 행 수로 덮는다. 검증 응답이 없던 경로에서는
    // baseReport 의 값이 0 이다.
    datasetInfo: {
      ...baseReport.datasetInfo,
      sampleCount: datasetSize ?? baseReport.datasetInfo.sampleCount,
      // 판 4 2.2 파일 해시·크기 — 판 4 run 에만 키(응답에 없으면 null → 그릴 때 "—").
      ...(edition4 ? { sourceFile: parseSourceFile(result.source_file) } : {}),
    },
    meta: { ...baseReport.meta, derivedPrediction },
    // 평가를 실제로 수행한 환경(라이브러리 버전·수행 시각). 종전에는 프론트
    // 상수를 인쇄해 실제와 무관한 값이 성적서에 남았다(F-09). 판 4 run 은 평가 엔진 버전도(없으면 null).
    evalEnv: {
      ...baseReport.evalEnv,
      environment: result.environment ?? undefined,
      ...(edition4 ? { engineVersion: parseEngineVersion(result.engine_version) } : {}),
    },
    // 전처리 경고를 버리지 않는다(D-16). 결측 제외·확률합 이상·파생 예측
    // 같은 사실이 여기에만 실려 온다.
    evaluationWarnings: Array.isArray(result.warnings) ? result.warnings : [],
    kpiResults: updatedKpiResults,
    // 핵심 지표를 누가 정했나(W8) — 위 핵심 지표 목록과 같은 값(스토어의 ② 카드 값)으로 판정한다.
    coreMetricsSource: coreMetricsSource(inputs.composerMetrics),
    // 클래스별 표(M22) — 평균 줄까지. M22 만 골라도 보인다.
    classReport,
    confusionCounts,
    ...(errorRatios && errorRatioText ? { errorRatios, errorRatioSentence: errorRatioText } : {}),
    ...(ciNote ? { confidenceIntervalNote: ciNote } : {}),
    ...(nearNote ? { nearTargetNote: nearNote } : {}),
    ...(noBenchmarkText ? { noBenchmarkSentence: noBenchmarkText } : {}),
    ...(labelSentence ? { labelCautionSentence: labelSentence } : {}),
    ...(sourceSentence ? { sourceRelationSentence: sourceSentence } : {}),
    problems,
    // AI 에 보낸 서술용 파생값(자른 뒤 — 보낸 것과 같은 값). S7 D6 표와 /report/:id 가 같은 값을 그린다.
    ...(factSheet.facts ? { narrativeFacts: factSheet.facts } : {}),
    conclusion: ruleConclusion, // full ConclusionData (verdict/score + 빈 서술)
    datasetDiagnosis,
    charts: { confusionMatrix, rocCurve, prCurve },
    latency: latencyStats,
    ...(edition4Values ? { edition4Values } : {}),
  };

  return { stage1Report, factSheet };
}

/**
 * 엔진 혼동행렬(새 칸 `confusion_matrix`, 옛 응답은 M21)을 읽는다. 이진·다중은 행렬 하나(`single`), 멀티레이블은
 * 레이블별 2×2 를 사실 시트 모양(`chart` — 레이블 합계는 `buildFactSheet` 가 만든다)으로. 모양이 틀리면 null.
 */
function parseEngineConfusion(
  raw: unknown,
): { labels: string[]; single: SingleConfusion | null; chart: ConfusionMatrixData } | null {
  if (!raw || typeof raw !== "object") return null;
  const cm = raw as { type?: string; labels?: unknown; matrix?: unknown };
  if (!Array.isArray(cm.labels) || !Array.isArray(cm.matrix)) return null;
  const labels = cm.labels.map(String);
  if (cm.type === "multilabel") {
    const multilabelMatrices = (cm.matrix as number[][][]).map((mat, idx) => ({
      label: labels[idx] ?? `Label ${idx}`,
      matrix: mat,
      totalSamples: mat.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0),
    }));
    const first = multilabelMatrices[0] ?? { label: "Label 0", matrix: [[0, 0], [0, 0]], totalSamples: 0 };
    return {
      labels,
      single: null,
      chart: {
        labels: [`Negative (${first.label})`, `Positive (${first.label})`],
        matrix: first.matrix,
        totalSamples: first.totalSamples,
        multilabelMatrices,
      } as ConfusionMatrixData,
    };
  }
  const matrix = cm.matrix as number[][];
  const total = matrix.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
  return { labels, single: { labels, matrix }, chart: { labels, matrix, totalSamples: total } as ConfusionMatrixData };
}
