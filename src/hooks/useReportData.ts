/**
 * 최종 성적서 데이터 페칭 훅.
 *
 * 워크스페이스에 저장된 run(`/report/:id`)의 성적서를 만든다. 캐시된 완성본이 있으면
 * 그대로 쓰고, 없으면 워크플로우 store 의 입력으로 `/api/evaluate` → `/api/generate-narrative`
 * 를 호출해 조립한다.
 *
 * 종전에는 `id === "preview"` 라는 임시 경로가 있어 워크스페이스 없이도 성적서가
 * 렌더됐다 — 그 성적서는 어디에도 저장되지 않아 발급·재조회가 불가능했다(ISSUES.md E-02·E-06).
 */
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/apiBase";
import { buildReportInput, mapWorkflowToFinalReport } from "../lib/report/mapWorkflowToFinalReport";
import type { FinalReportData, LatencyStats } from "../types/finalReport.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { getMetricDisplayId, METRICS } from "../data/evaluationData";
import { buildConclusion, resolveCoreMetricIds } from "../lib/report/computeVerdict";
import { buildClientInputs } from "../lib/report/reportMaterials";
import { buildDatasetDiagnosis } from "../lib/report/buildDatasetDiagnosis";
import { buildFactSheet } from "../lib/report/buildFactSheet";
import { buildClassReportTable } from "../lib/report/classReportTable";
import { parseConfusionCounts } from "../lib/report/confusionCounts";
import { errorRatioSentence, parseErrorRatios } from "../lib/report/errorRatios";
import {
  attachConfidenceIntervals,
  confidenceIntervalNote,
  parseConfidenceIntervals,
} from "../lib/report/confidenceIntervals";
import { attachNearTarget, nearTargetNote } from "../lib/report/nearTarget";
import {
  buildProblemList,
  parseF1ThresholdGain,
  parseImbalanceEffect,
} from "../lib/report/problemList";
import { normalizeReportContent } from "../lib/report/normalizeReportContent";
import { evaluateStatus } from "../lib/report/evaluateStatus";
import { fetchNarrative } from "../lib/report/fetchNarrative";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import { resolveBeta, resolveTargetValue } from "../utils/domain/validation";

interface UseReportDataResult {
  data: FinalReportData | null;
  isLoading: boolean;
  /** KPI·차트는 렌더됐으나 LLM 서술(7·8·9절)이 아직 병합 중인 상태(D6b). */
  narrativePending: boolean;
  error?: string | null;
}

export function useReportData(id: string): UseReportDataResult {
  const workflowState = useWorkflowStore();
  const run = useWorkspaceStore((state) =>
    state.evaluationRuns.find((item) => item.id === id),
  );

  const [data, setData] = useState<FinalReportData | null>(() => {
    // 캐시된 성적서는 옛 판일 수 있다 — 지금 뜻으로 옮겨 읽는다(저장값은 그대로).
    if (run?.reportData && (run.reportData as any).isEvaluated) {
      return normalizeReportContent(run.reportData);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [narrativePending, setNarrativePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 만약 워크스페이스에 기 저장된 run 정보가 있고, 이미 계산이 완료된 상태라면 바로 캐시 반환
    if (run?.reportData && (run.reportData as any).isEvaluated) {
      setData(normalizeReportContent(run.reportData));
      return;
    }

    if (!workflowState.rawFile) {
      setData(run?.reportData ? normalizeReportContent(run.reportData) : null);
      return;
    }

    // rawFile이 없다면 (쇼케이스 모드 등) 바로 매핑한 기본 리포트 반환
    if (!workflowState.rawFile) {
      const baseReport = mapWorkflowToFinalReport(
        buildReportInput(workflowState),
        workflowState.validationResult,
      );
      setData({
        ...baseReport,
        datasetDiagnosis: buildDatasetDiagnosis(workflowState.metadata),
      });
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const runEvaluate = async () => {
      // stage1(KPI·차트) 렌더 이후 발생한 오류는 에러 화면으로 덮지 않기 위한 플래그(D6b).
      let narrativeStarted = false;
      try {
        const backendMappings = workflowState.columnMapping.map((row) => ({
          column: row.originalName,
          role: translateRoleToBackend(row.confirmedRole, workflowState.taskType || "multiclass"),
          sample_values: row.sampleValues,
        }));

        const metadata = {
          positive_class: workflowState.metadata?.positive_class || null,
          negative_class: workflowState.metadata?.negative_class || null,
          positive_class_ambiguous: workflowState.metadata?.positive_class_ambiguous || false,
          detected_classes: workflowState.metadata?.detected_classes || [],
          detected_labels: workflowState.metadata?.detected_labels || [],
          class_distribution: workflowState.metadata?.class_distribution || {},
        };

        const beta = resolveBeta(workflowState.metricDetails);

        const payload = {
          task_type: workflowState.taskType || "multiclass",
          column_mappings: backendMappings,
          selected_metric_ids: workflowState.selectedMetricIds,
          metadata: metadata,
          beta: beta,
          // 하드 예측이 없을 때 확률에서 예측을 파생하는 기준(ISSUES.md A-01).
          // 성적서 합격 목표값(threshold)과는 다른 개념이라 필드명이 분리돼 있다.
          decision_threshold: workflowState.decisionThreshold,
        };

        const formData = new FormData();
        formData.append("file", workflowState.rawFile!);
        formData.append("data", JSON.stringify(payload));

        const response = await fetch(apiUrl("/api/evaluate"), {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || `서버 오류: ${response.status}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!active) return;

        // 성적서 입력 스냅샷 — 매퍼·문제 목록·AI 고객 입력이 같은 값을 본다.
        const reportInput = buildReportInput(workflowState);
        const baseReport = mapWorkflowToFinalReport(reportInput, workflowState.validationResult);

        const success_metrics = result.results.success_metrics || {};
        // 계산 실패 지표({metricId: 에러문자열}). value 0/fail 위장 대신 'unavailable' 처리(D4).
        const failed_metrics = result.results.failed_metrics || {};

        // 1. KPI 지표 계산값 치환
        const taskTypeForMetrics = workflowState.taskType || "multiclass";
        // 핵심 지표 — 지표와 합격 기준 화면의 합격 기준 표에서 고른 값, 고르지 않았으면 유형별 기본값이다.
        // 판정(아래 buildConclusion)과 성적서의 "핵심" 표시가 같은 목록을 본다.
        const coreDisplayIds = new Set(
          resolveCoreMetricIds(
            taskTypeForMetrics,
            workflowState.selectedMetricIds,
            workflowState.composerMetrics,
          ).map(getMetricDisplayId),
        );
        const kpiResultsWithoutCi = workflowState.selectedMetricIds
          .map((metricId) => {
            // **task 필터를 함께 본다.** 4절(metricList)·5절(metricFormulas)은
            // supportedTaskTypes 로 거르는데 여기만 걸러내지 않아, 그 task 가 노출하지
            // 않는 지표가 6절 KPI 표에만 숫자로 찍혔다(ISSUES.md A-04 의 인쇄 결과).
            const metric = METRICS.find(
              (m) => m.id === metricId && m.supportedTaskTypes.includes(taskTypeForMetrics),
            );
            if (!metric) return null;

            // 방향성(높을수록/낮을수록 좋음) — 판정·기준 표기의 단일 출처(evaluationData.ts)
            const higherIsBetter = metric.higherIsBetter !== false;
            const detail = workflowState.metricDetails[metricId];
            // 목표값이 없으면 null. 정보성 지표(M21/M22)는 과거 세션에 저장된 값이 남아 있어도
            // null 이다. 0·음수도 그 지표의 허용 범위 안이면 목표값이다(MCC 등).
            const target = resolveTargetValue(metricId, detail?.targetValue);
            const hasThreshold = target !== null;
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
        const updatedKpiResults = attachNearTarget(
          attachConfidenceIntervals(kpiResultsWithoutCi, confidenceIntervals),
        );
        const ciNote = confidenceIntervalNote(updatedKpiResults, confidenceIntervals);
        const nearNote = nearTargetNote(updatedKpiResults);

        // 2. 오차 행렬(Confusion Matrix) 치환
        let confusionMatrix = null;
        if (success_metrics.M21) {
          const cm = success_metrics.M21;
          if (cm.type === "multilabel") {
            const classLabels = cm.labels || workflowState.metadata?.detected_labels || [];
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
        
        // 백엔드 EvaluateResponse 에서 최신 class_distribution 이 오면 우선 사용, 없으면 metadata 폴백
        const resolvedClassDistribution = result.class_distribution && Object.keys(result.class_distribution).length > 0 
          ? result.class_distribution 
          : workflowState.metadata?.class_distribution || {};

        const taskTypeResolved = workflowState.taskType || "binary";
        // 혼동행렬의 totalSamples가 가장 정확한 평가 데이터의 row 수 (멀티레이블의 경우 200)
        // 서버가 확정한 표본 수를 최우선으로 쓴다. 종전에는 마지막 폴백으로 학습 데이터 폼의
        // 검증 샘플 수를 썼다 — 모델 학습용 검증 세트 크기라 평가 행 수와 무관하다
        // (ISSUES.md B-02·E-17). 그 폼은 ⑥ 카드로 합쳐지며 없어졌다.
        const datasetSize: number | undefined =
          result.n_samples || confusionMatrix?.totalSamples || undefined;

        const datasetDiagnosis = buildDatasetDiagnosis(
          { class_distribution: resolvedClassDistribution },
          imbalanceRatio,
          result.dropped_rows,
          datasetSize,
          taskTypeResolved
        );

        // 4. verdict/score 규칙 산출 (서술의 권위 값 — 백엔드도 fact_sheet.verdict 로 강제)
        const ruleConclusion = buildConclusion(updatedKpiResults, taskTypeResolved, [
          ...coreDisplayIds,
        ]);

        // 5. LLM 서술 생성 — 평가 결과로 fact_sheet 조립 후 /api/generate-narrative 호출.
        //    실패/무키 시 빈 서술 반환(섹션이 "생성 예정" 안내). KPI·차트는 영향받지 않음.
        const yTrueRow = workflowState.columnMapping.find(
          (r) => r.confirmedRole === "y_true",
        );
        const classLabels: string[] =
          workflowState.metadata?.detected_classes?.length
            ? workflowState.metadata.detected_classes
            : workflowState.metadata?.detected_labels?.length
              ? workflowState.metadata.detected_labels
              : yTrueRow
                ? [...new Set(yTrueRow.sampleValues)]
                : [];

        // TP·TN·FP·FN 건수 — M21 선택과 무관하게 백엔드가 늘 내린다(재료 목록 9절).
        const confusionCounts = parseConfusionCounts(success_metrics.confusion_counts);
        // 파생 예측 사실(SPEC §0 기재 의무) — 7.1 앞 고정 문구와 AI 사실 시트에 쓴다. 백엔드는 실제로
        // 파생이 일어났을 때만 이 키를 내려보낸다(ISSUES.md A-01).
        const derivedPrediction = success_metrics.derived_prediction ?? undefined;
        // 경계·확신 오류 비율(설계 D30) — 확률이 있는 평가에만 백엔드가 싣는다. 7.1 문장은 지금 만들어
        // 저장한다(발급본은 나중에 문안이 바뀌어도 그대로).
        const errorRatios = parseErrorRatios(success_metrics.error_ratios);
        // 9절 문제 목록(설계 D22) — 판정 사유·아슬아슬·임계값 조정 여지(D40)·불균형 영향(D20)·M22 표·
        // 학습 분포·정답 라벨로 9종을 고른다. 지금 만들어 저장하고, 같은 목록을 AI 사실 시트에 싣는다.
        const thresholdGain = parseF1ThresholdGain(success_metrics.f1_threshold_gain);
        const imbalanceEffect = parseImbalanceEffect(success_metrics.imbalance_effect);
        const classReport = buildClassReportTable(
          success_metrics.M22,
          classLabels,
          workflowState.taskType || undefined,
        );
        const problems = buildProblemList({
          kpiResults: updatedKpiResults,
          taskType: taskTypeResolved,
          coreMetricIds: [...coreDisplayIds],
          thresholdGain,
          imbalanceEffect,
          classReport,
          evaluationDistribution: resolvedClassDistribution,
          composer: reportInput.composer,
        });

        const factSheet = buildFactSheet({
          kpiResults: updatedKpiResults,
          confusionMatrix,
          classDistribution: resolvedClassDistribution,
          // 표본 수는 서버가 확정한 값을 그대로 쓴다. 분포 합계로 추측하면 멀티레이블에서
          // 200행이 408 이 된다(ISSUES.md B-02).
          nSamples: result.n_samples ?? confusionMatrix?.totalSamples ?? 0,
          imbalanceRatio,
          droppedRows: result.dropped_rows,
          verdict: ruleConclusion.verdict,
          score: ruleConclusion.score,
          classReport: success_metrics.M22 ?? null,
          classLabels,
          latencyStats,
          positiveClass: workflowState.metadata?.positive_class ?? null,
          confusionCounts,
          derivedPrediction,
          errorRatios,
          confidenceIntervalNote: ciNote,
          thresholdGain,
          imbalanceEffect,
          problems,
        });

        // ── Stage 1: 서술과 무관한 결정론적 결과(KPI·차트·규칙 verdict)를 즉시 렌더한다.
        //    느리거나 실패하는 LLM 서술이 성적서 전체 표시를 인질로 잡지 않도록 분리(D6b).
        //    interpretation/recommendation* 은 baseReport 의 빈 기본값 유지, narrativeSource 미설정.

        const stage1Report: FinalReportData = {
          ...baseReport,
          // 평가 데이터 표본 수는 평가에 실제로 쓴 행 수로 덮는다. 검증 응답이 없던 경로에서는
          // baseReport 의 값이 0 이다.
          datasetInfo: {
            ...baseReport.datasetInfo,
            sampleCount: datasetSize ?? baseReport.datasetInfo.sampleCount,
          },
          meta: { ...baseReport.meta, derivedPrediction },
          // 평가를 실제로 수행한 환경(라이브러리 버전·수행 시각). 종전에는 프론트
          // 상수를 인쇄해 실제와 무관한 값이 성적서에 남았다(ISSUES.md F-09).
          evalEnv: { ...baseReport.evalEnv, environment: result.environment ?? undefined },
          // 전처리 경고를 버리지 않는다(ISSUES.md D-16). 결측 제외·확률합 이상·파생 예측
          // 같은 사실이 여기에만 실려 온다.
          evaluationWarnings: Array.isArray(result.warnings) ? result.warnings : [],
          kpiResults: updatedKpiResults,
          // 클래스별 표(M22) — 평균 줄까지. M22 만 골라도 보인다.
          classReport,
          confusionCounts,
          ...(errorRatios
            ? { errorRatios, errorRatioSentence: errorRatioSentence(errorRatios, taskTypeResolved) }
            : {}),
          ...(ciNote ? { confidenceIntervalNote: ciNote } : {}),
          ...(nearNote ? { nearTargetNote: nearNote } : {}),
          problems,
          conclusion: ruleConclusion,  // full ConclusionData (verdict/score + 빈 서술)
          datasetDiagnosis,
          charts: { confusionMatrix, rocCurve, prCurve },
          latency: latencyStats,
        };
        // stage1(서술 없음)은 스토어에 저장하지 않는다(캐시 오염 방지) — 로컬 렌더만.
        setData(stage1Report);
        setIsLoading(false);
        setNarrativePending(true);
        narrativeStarted = true;

        // ── Stage 2: LLM 서술을 받아 7·8·9절만 병합한다(KPI·차트는 이미 화면에 있음).
        // 고객이 제공한 입력도 함께 넘긴다(서술 설계 D25). 종전에는 성적서 구성 카드의 값이
        // 저장만 되고 AI 에 가지 않았다. 회사·과제 정보는 넣지 않는다(D34).
        const clientInputs =
          reportInput.composer && baseReport.materials
            ? buildClientInputs({
                composer: reportInput.composer,
                materials: baseReport.materials,
                model: {
                  name: workflowState.basicInfo.modelName ?? "",
                  // 성적서에 찍는 버전과 같은 값(기본값 판정은 매퍼 한 곳).
                  version: baseReport.evalScope.version,
                  purpose: workflowState.basicInfo.modelPurpose ?? "",
                  category: workflowState.basicInfo.modelCategory ?? "",
                },
                reportPurposeNote: workflowState.basicInfo.reportPurposeNote ?? "",
                coreMetrics: updatedKpiResults
                  .filter((r) => r.isCore)
                  .map((r) => `${r.name}(${r.metricId})`),
                classLabelDescriptions: workflowState.classLabelDescriptions,
                // 성적서 4절과 같은 출처 — ⑨ 실행 환경을 넣었으면 그 값이다(`buildReportInput`).
                runtime: {
                  운영체제: reportInput.basicInfo.envOS ?? "",
                  CPU: reportInput.basicInfo.envCPU ?? "",
                  GPU: reportInput.basicInfo.envGPU ?? "",
                  메모리: reportInput.basicInfo.envMemory ?? "",
                  소프트웨어: reportInput.basicInfo.envSoftware ?? "",
                },
              })
            : undefined;

        const narrative = await fetchNarrative({
          task_type: taskTypeResolved,
          report_purpose: baseReport.evalScope.reportPurposeKey,
          fact_sheet: factSheet,
          ...(clientInputs ? { client_inputs: clientInputs } : {}),
        });
        if (!active) return;

        const mergedReport: FinalReportData = {
          ...stage1Report,
          // verdict/score 는 규칙 산출값, 서술(benchmark/narrative/risks)은 LLM 결과로 병합
          conclusion: {
            ...ruleConclusion,
            ...narrative.conclusionText,
            benchmarkRefs: narrative.benchmarkRefs,
          },
          interpretation: narrative.interpretation,
          recommendationNarrative: narrative.recommendationNarrative,
          recommendations: narrative.recommendations,
          // 추적성: 규칙 폴백으로 생성된 경우 7·8·9절에 배지 표시
          narrativeSource: narrative.source,
          // dataValidation 은 baseReport(= /api/validate-data 실측)에서 그대로 사용한다.
        };

        // 완성본(서술 포함)만 isEvaluated=true 로 스토어에 저장한다(캐시 히트 시 완성본 서빙).
        if (id) {
          const evaluatedReport = { ...mergedReport, isEvaluated: true };
          useWorkspaceStore.setState((state) => ({
            evaluationRuns: state.evaluationRuns.map((r) =>
              r.id === id ? { ...r, reportData: evaluatedReport } : r
            ),
          }));
          setData(evaluatedReport);
        } else {
          setData(mergedReport);
        }
        setNarrativePending(false);
      } catch (err: any) {
        console.error("Evaluation run failed:", err);
        // stage1 이 이미 렌더된 뒤의 오류가 성적서를 에러 화면으로 덮지 않도록 가드.
        // (fetchNarrative 는 내부에서 흡수하므로 여기 도달은 드묾)
        if (active && !narrativeStarted) {
          setError(err.message || String(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setNarrativePending(false);
        }
      }
    };

    runEvaluate();

    return () => {
      active = false;
    };
  }, [id, run, workflowState.rawFile, workflowState.columnMapping, workflowState.selectedMetricIds]);

  return { data, isLoading, narrativePending, error };
}
