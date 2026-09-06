/**
 * 최종 성적서 데이터 페칭 훅.
 *
 * - id === "preview": 워크플로우 store에서 입력값을 읽어 백엔드 /api/evaluate를 호출하여 데이터 계산 및 병합
 * - 그 외 id: 향후 백엔드 API 호출로 교체 (현재는 MOCK_FINAL_REPORT fallback)
 */
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/apiBase";
import { mapWorkflowToFinalReport } from "../lib/report/mapWorkflowToFinalReport";
import type { FinalReportData, LatencyStats } from "../types/finalReport.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { getMetricDisplayId, METRICS } from "../data/evaluationData";
import { buildConclusion } from "../lib/report/computeVerdict";
import { buildDatasetDiagnosis } from "../lib/report/buildDatasetDiagnosis";
import { buildFactSheet } from "../lib/report/buildFactSheet";
import { evaluateStatus } from "../lib/report/evaluateStatus";
import { fetchNarrative } from "../lib/report/fetchNarrative";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import { metricNeedsTargetValue } from "../utils/domain/validation";

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
    if (run?.reportData && (run.reportData as any).isEvaluated) {
      return run.reportData;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [narrativePending, setNarrativePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 만약 워크스페이스에 기 저장된 run 정보가 있고, 이미 계산이 완료된 상태라면 바로 캐시 반환
    if (run?.reportData && (run.reportData as any).isEvaluated) {
      setData(run.reportData);
      return;
    }

    if (id !== "preview" && !workflowState.rawFile) {
      setData(run?.reportData || null);
      return;
    }

    // rawFile이 없다면 (쇼케이스 모드 등) 바로 매핑한 기본 리포트 반환
    if (!workflowState.rawFile) {
      const baseReport = mapWorkflowToFinalReport({
        basicInfo: workflowState.basicInfo,
        datasetInfo: workflowState.datasetInfo,
        taskType: workflowState.taskType,
        selectedMetricIds: workflowState.selectedMetricIds,
        metricDetails: workflowState.metricDetails,
        uploadedFile: workflowState.uploadedFile,
        trainingExampleFiles: workflowState.trainingExampleFiles,
        trainingUnsuitableExampleFiles: workflowState.trainingUnsuitableExampleFiles,
        columnMapping: workflowState.columnMapping,
        classLabelDescriptions: workflowState.classLabelDescriptions,
        metadata: workflowState.metadata,
      }, workflowState.validationResult);
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

        const beta = parseFloat(workflowState.metricDetails["M5"]?.beta || "1.0");

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
          const errorMessage = errorData.detail || `Server error: ${response.status}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!active) return;

        const baseReport = mapWorkflowToFinalReport({
          basicInfo: workflowState.basicInfo,
          datasetInfo: workflowState.datasetInfo,
          taskType: workflowState.taskType,
          selectedMetricIds: workflowState.selectedMetricIds,
          metricDetails: workflowState.metricDetails,
          uploadedFile: workflowState.uploadedFile,
          trainingExampleFiles: workflowState.trainingExampleFiles,
          trainingUnsuitableExampleFiles: workflowState.trainingUnsuitableExampleFiles,
          columnMapping: workflowState.columnMapping,
          classLabelDescriptions: workflowState.classLabelDescriptions,
          metadata: workflowState.metadata,
        }, workflowState.validationResult);

        const success_metrics = result.results.success_metrics || {};
        // 계산 실패 지표({metricId: 에러문자열}). value 0/fail 위장 대신 'unavailable' 처리(D4).
        const failed_metrics = result.results.failed_metrics || {};

        // 1. KPI 지표 계산값 치환
        const taskTypeForMetrics = workflowState.taskType || "multiclass";
        const updatedKpiResults = workflowState.selectedMetricIds
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
            const target = parseFloat(detail?.targetValue ?? "");
            // 정보성 지표(M21/M22)는 타겟값을 받지 않는다. 과거 세션에 저장된 값이
            // 남아 있어도 판정 대상이 되지 않도록 여기서도 같은 규칙을 적용한다.
            const hasThreshold =
              metricNeedsTargetValue(metricId) && Number.isFinite(target) && target > 0;
            const displayId = getMetricDisplayId(metricId);

            // 계산 실패 지표: 판정/집계에서 제외되도록 'unavailable' 로 표기(value 0/fail 위장 금지)
            const failReason = failed_metrics[metricId];
            if (failReason !== undefined) {
              return {
                metricId: displayId,
                name: metric.name,
                value: 0,
                threshold: hasThreshold ? target : 0,
                status: "unavailable" as const,
                higherIsBetter,
                errorMessage: typeof failReason === "string" ? failReason : String(failReason),
                perClass: undefined,
                subMetrics: undefined,
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
            if (hasThreshold) {
              status = evaluateStatus(resolvedValue, target, higherIsBetter);
            }

            let perClass: Array<{ label: string; value: number; status: string }> | undefined;
            if (["M2", "M3", "M4"].includes(metricId) && success_metrics["M22"]) {
              const classReport = success_metrics["M22"];
              const excludeKeys = ["accuracy", "macro avg", "weighted avg", "micro avg", "samples avg"];
              const classValues = Object.keys(classReport).filter(k => !excludeKeys.includes(k));

              const metricKeyMap: Record<string, string> = {
                "M2": "precision",
                "M3": "recall",
                "M4": "f1-score",
              };
              const key = metricKeyMap[metricId];

              if (classValues.length > 0 && key) {
                perClass = classValues.map((val) => {
                  const classVal = classReport[val];
                  const score = classVal ? classVal[key] : 0;
                  const classStatus = hasThreshold
                    ? evaluateStatus(score, target, higherIsBetter)
                    : "pass";
                  return {
                    label: val,
                    value: score,
                    status: classStatus,
                  };
                });
              }
            }

            const isVisualOnly = metricId === "M21" || metricId === "M22";

            return {
              metricId: displayId,
              name: metric.name,
              value: resolvedValue,
              threshold: (hasThreshold && !isVisualOnly) ? target : 0,
              status: isVisualOnly ? "pass" : status,
              higherIsBetter,
              perClass,
              subMetrics,
            };
          })
          .filter((item): item is any => item !== null);

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
        // 서버가 확정한 표본 수를 최우선으로 쓴다. validationSampleCount 는 4단계에서
        // 사용자가 손으로 적은 값이라 실제 평가 행 수와 무관할 수 있다(ISSUES.md B-02·E-17).
        const datasetSize =
          result.n_samples ||
          confusionMatrix?.totalSamples ||
          Number(workflowState.datasetInfo?.validationSampleCount) ||
          undefined;

        const datasetDiagnosis = buildDatasetDiagnosis(
          { class_distribution: resolvedClassDistribution },
          imbalanceRatio,
          result.dropped_rows,
          datasetSize,
          taskTypeResolved
        );

        // 4. verdict/score 규칙 산출 (서술의 권위 값 — 백엔드도 fact_sheet.verdict 로 강제)
        const ruleConclusion = buildConclusion(updatedKpiResults, taskTypeResolved);

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
        });

        // ── Stage 1: 서술과 무관한 결정론적 결과(KPI·차트·규칙 verdict)를 즉시 렌더한다.
        //    느리거나 실패하는 LLM 서술이 성적서 전체 표시를 인질로 잡지 않도록 분리(D6b).
        //    interpretation/recommendation* 은 baseReport 의 빈 기본값 유지, narrativeSource 미설정.
        // 파생 예측 사실(SPEC §0 기재 의무)을 성적서 메타로 나른다. 백엔드는 실제로
        // 파생이 일어났을 때만 이 키를 내려보낸다(ISSUES.md A-01).
        const derivedPrediction = success_metrics.derived_prediction ?? undefined;

        const stage1Report: FinalReportData = {
          ...baseReport,
          meta: { ...baseReport.meta, derivedPrediction },
          kpiResults: updatedKpiResults,
          conclusion: ruleConclusion,  // full ConclusionData (verdict/score + 빈 서술)
          datasetDiagnosis,
          charts: { confusionMatrix, rocCurve, prCurve },
          latency: latencyStats,
        };
        // id!=='preview' 라도 stage1(서술 없음)은 스토어에 저장하지 않는다(캐시 오염 방지) — 로컬 렌더만.
        setData(stage1Report);
        setIsLoading(false);
        setNarrativePending(true);
        narrativeStarted = true;

        // ── Stage 2: LLM 서술을 받아 7·8·9절만 병합한다(KPI·차트는 이미 화면에 있음).
        const narrative = await fetchNarrative({
          task_type: taskTypeResolved,
          report_purpose: baseReport.evalScope.reportPurposeKey,
          fact_sheet: factSheet,
        });
        if (!active) return;

        const mergedReport: FinalReportData = {
          ...stage1Report,
          // verdict/score 는 규칙 산출값, 서술(benchmark/narrative/risks)은 LLM 결과로 병합
          conclusion: { ...ruleConclusion, ...narrative.conclusionText },
          interpretation: narrative.interpretation,
          recommendationNarrative: narrative.recommendationNarrative,
          recommendations: narrative.recommendations,
          // 추적성: 규칙 폴백으로 생성된 경우 7·8·9절에 배지 표시
          narrativeSource: narrative.source,
          // dataValidation 은 baseReport(= /api/validate-data 실측)에서 그대로 사용한다.
        };

        // 완성본(서술 포함)만 isEvaluated=true 로 스토어에 저장한다(캐시 히트 시 완성본 서빙).
        if (id !== "preview") {
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
