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
import type { FinalReportData } from "../types/finalReport.types";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { buildClientInputs } from "../lib/report/reportMaterials";
import { buildDatasetDiagnosis } from "../lib/report/buildDatasetDiagnosis";
import { assembleEvaluatedReport } from "../lib/report/assembleEvaluatedReport";
import { normalizeReportContent } from "../lib/report/normalizeReportContent";
import { fetchNarrative } from "../lib/report/fetchNarrative";
import { translateRoleToBackend } from "../lib/mapping/translateRoleToBackend";
import { resolveBeta } from "../utils/domain/validation";
import { resolveTaskType } from "../data/evaluationData";
import { requestDecisionThreshold } from "../components/column-mapping/DecisionThresholdCard";

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
          role: translateRoleToBackend(row.confirmedRole, resolveTaskType(workflowState.taskType)),
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
          task_type: resolveTaskType(workflowState.taskType),
          column_mappings: backendMappings,
          selected_metric_ids: workflowState.selectedMetricIds,
          metadata: metadata,
          beta: beta,
          // 하드 예측이 없을 때 확률에서 예측을 파생하는 기준(ISSUES.md A-01).
          // 성적서 합격 목표값(threshold)과는 다른 개념이라 필드명이 분리돼 있다.
          // 지금 매핑에서 쓰이는 값만(S2 P1) — 검증 요청과 같은 함수.
          decision_threshold: requestDecisionThreshold(
            resolveTaskType(workflowState.taskType), workflowState.columnMapping, workflowState.decisionThreshold,
          ),
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

        // 평가 응답 → stage1 성적서·AI 사실 시트(서술과 무관한 결정론적 조립, `assembleEvaluatedReport`).
        // ── Stage 1: 서술과 무관한 결정론적 결과(KPI·차트·규칙 verdict)를 즉시 렌더한다.
        //    느리거나 실패하는 LLM 서술이 성적서 전체 표시를 인질로 잡지 않도록 분리(D6b).
        const { stage1Report, factSheet } = assembleEvaluatedReport(baseReport, result, {
          taskType: workflowState.taskType,
          selectedMetricIds: workflowState.selectedMetricIds,
          metricDetails: workflowState.metricDetails,
          composerMetrics: workflowState.composerMetrics,
          columnMapping: workflowState.columnMapping,
          metadata: workflowState.metadata,
          composer: reportInput.composer,
        });
        const ruleConclusion = stage1Report.conclusion;
        const updatedKpiResults = stage1Report.kpiResults;
        const taskTypeResolved = resolveTaskType(workflowState.taskType);
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
                // 성적서 3절과 같은 출처 — 놓지 않은 설명은 `buildReportInput` 이 이미 비웠다.
                classLabelDescriptions: reportInput.classLabelDescriptions,
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
