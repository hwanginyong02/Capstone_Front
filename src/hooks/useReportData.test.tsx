/**
 * `useReportData` — 성적서 숫자를 만드는 마지막 무테스트 지점 (ISSUES.md H-03).
 *
 * 이 훅은 백엔드 `/api/evaluate` 응답을 성적서 필드로 옮기는 **변환 계층의 심장**이고,
 * 5차 라운드에서 여섯 번 고쳐졌다(A-01·A-04·B-02·C-08·D-16·F-09). 그런데 테스트는 0건이었다.
 * B-01·B-02·C-06·C-08 이 전부 정확히 이 공백에서 나왔다 — 백엔드가 맞는 값을 줘도
 * 여기서 뒤바뀌면 아무 검사도 걸리지 않았다.
 *
 * 하네스는 `useReportData.harness.tsx` 에 있다. 여기서는 **성질**만 서술한다.
 *
 * 검사 방식에 관한 두 가지 규칙:
 *
 * - **타이밍 예산을 쓰지 않는다.** stage1/stage2 경계는 `deferred()` 로 수동 해소해
 *   "narrative 가 아직 대기 중"이라는 결정론적 상태에서 판정한다.
 * - **훅 반환값만 보지 않는다.** 5차 라운드에서 살아남은 변이 5건의 공통 형태가
 *   "순수 함수는 맞는데 화면이 그것을 쓰지 않는다"였다. 그래서 숫자가 실제로
 *   인쇄되는지는 `renderReportPage()` 로 `<Report />` 를 렌더해 확인한다.
 */
import { renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RUN_ID,
  binaryMapping,
  deferred,
  evaluateMultilabelResponse,
  evaluateResponse,
  evaluatedReport,
  flushMicrotasks,
  jsonResponse,
  narrativeResponse,
  renderReportPage,
  resetStores,
  seedStores,
  settlePendingDeferreds,
  stubFetch,
  workflowSnapshot,
} from "./useReportData.harness";
import { useReportData } from "./useReportData";
import { useWorkspaceStore } from "../utils/stores/useWorkspaceStore";
import { useWorkflowStore } from "../utils/stores/useWorkflowStore";
import type { FinalReportData } from "../types/finalReport.types";

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  // 단정이 먼저 실패해 resolve 에 도달하지 못한 deferred 를 끊는다.
  // 그러지 않으면 fetchNarrative 가 그것을 await 하며 파일 전체를 멈춘다.
  settlePendingDeferreds();
  vi.unstubAllGlobals();
  resetStores();
});

/** 훅을 마운트하고 첫 렌더 결과를 준다. */
function mountHook(id: string = RUN_ID) {
  return renderHook(() => useReportData(id));
}

/* ================================================================== *
 * 1. 캐시 히트 · 재진입
 * ================================================================== */

describe("[H-03] 캐시 히트 조건", () => {
  it("완성본(isEvaluated)이 저장돼 있으면 네트워크를 전혀 타지 않는다", async () => {
    const fetchStub = stubFetch();
    seedStores({ run: { reportData: evaluatedReport() } });

    const { result } = mountHook();

    // 첫 렌더에서 이미 값이 있다 — useState 초기화 함수가 캐시를 읽는다.
    expect(result.current.data).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    expect(fetchStub.calls).toHaveLength(0);
  });

  it("저장본이 미완성(isEvaluated 없음)이고 rawFile 이 있으면 평가를 수행한다", async () => {
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    expect(fetchStub.countOf("/api/evaluate")).toBe(1);
    expect(fetchStub.countOf("/api/generate-narrative")).toBe(1);
  });

  it("완성본 저장 후 이펙트가 다시 돌아도 평가를 두 번 호출하지 않는다", async () => {
    // 훅은 스스로 워크스페이스 store 에 쓰고(run 교체) 그 run 이 자기 deps 에 있어
    // 이펙트가 한 번 더 돈다. 캐시 조건이 그것을 멈춘다 — 멈추지 않으면 무한 평가다.
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    // 이펙트 재실행이 끝날 시간을 준 뒤에도 호출 수가 그대로여야 한다.
    await waitFor(() => expect(fetchStub.countOf("/api/evaluate")).toBe(1));
    expect(fetchStub.countOf("/api/evaluate")).toBe(1);
  });

  it("rawFile 이 없으면(새로고침 후) 저장된 초안을 그대로 내고 평가하지 않는다", async () => {
    // rawFile 은 persist 대상이 아니다(File 은 직렬화 불가) — 새로고침이면 항상 이 경로다.
    const fetchStub = stubFetch();
    seedStores({ workflow: { rawFile: null } });

    const { result } = mountHook();

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.isEvaluated).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it("rawFile 도 run 도 없으면 data 는 null 이고 아무것도 호출하지 않는다", async () => {
    const fetchStub = stubFetch();
    seedStores({ withoutRun: true, workflow: { rawFile: null } });

    const { result } = mountHook("없는-id");

    await waitFor(() => expect(result.current.data).toBeNull());
    expect(fetchStub.calls).toHaveLength(0);
  });

  it("[E-03] 미평가 초안 화면에는 '평가가 끝나지 않았다'는 안내가 실제로 보인다", async () => {
    // 순수 함수가 아니라 **화면**을 본다. 훅이 초안을 내도 화면이 그것을
    // 완성본처럼 렌더하면 사용자는 빈 성적서를 완성본으로 믿는다.
    stubFetch();
    seedStores({ workflow: { rawFile: null } });

    renderReportPage();

    expect(
      await screen.findByText(/아직 평가가 끝나지 않은 성적서입니다/),
    ).toBeVisible();
  });

  it("완성본이면 그 안내가 보이지 않는다", async () => {
    stubFetch();
    seedStores({ workflow: { rawFile: null }, run: { reportData: evaluatedReport() } });

    renderReportPage();

    await waitFor(() =>
      expect(screen.queryByText(/아직 평가가 끝나지 않은 성적서입니다/)).toBeNull(),
    );
  });
});

/* ================================================================== *
 * 2. /api/evaluate 요청 계약
 * ================================================================== */

describe("[H-03] /api/evaluate 요청 계약", () => {
  it("multipart 두 파트(file · data)로 보내고 file 은 업로드한 원본이다", async () => {
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    expect(fetchStub.calls[0].url).toBe("/api/evaluate");
    expect(fetchStub.calls[0].init?.method).toBe("POST");
    expect(fetchStub.evaluateFile()?.name).toBe("data.csv");
  });

  it("컬럼 역할을 백엔드 어휘로 번역해 싣는다 (binary: score → score_positive)", async () => {
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    expect(fetchStub.evaluatePayload().column_mappings).toEqual([
      { column: "row_id", role: "sample_id", sample_values: ["1", "2", "3"] },
      { column: "label", role: "y_true", sample_values: ["0", "1", "0"] },
      { column: "pred", role: "y_pred", sample_values: ["0", "1", "1"] },
      { column: "prob", role: "score_positive", sample_values: ["0.1", "0.9", "0.6"] },
      { column: "note", role: "ignore", sample_values: ["a", "b", "c"] },
    ]);
  });

  it("multilabel 에서는 같은 역할이 다른 이름으로 번역된다 (y_true → true_labels)", async () => {
    const fetchStub = stubFetch({ evaluate: jsonResponse(evaluateMultilabelResponse()) });
    seedStores({
      workflow: {
        taskType: "multilabel",
        selectedMetricIds: ["M2", "M3", "M4", "M15", "M16", "M17", "M21", "M22", "M23"],
        columnMapping: [
          { originalName: "label", sampleValues: ["a|b"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
          { originalName: "pred", sampleValues: ["a"], inferredRole: "y_pred", confirmedRole: "y_pred", modified: false, warnings: [] },
        ],
      },
    });

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    const payload = fetchStub.evaluatePayload();
    expect(payload.task_type).toBe("multilabel");
    expect(payload.column_mappings.map((m: any) => m.role)).toEqual([
      "true_labels",
      "pred_labels",
    ]);
  });

  it("beta 는 M5 의 상세 입력에서 오고, 없으면 1.0 이다", async () => {
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    // 하네스 픽스처의 metricDetails.M5.beta = "2.0"
    expect(fetchStub.evaluatePayload().beta).toBe(2);
  });

  it("[A-01] decision_threshold 는 성적서 목표값(threshold)과 다른 필드로 실려 간다", async () => {
    // 두 개념을 한 이름으로 합치면 확률 파생 기준이 합격 목표값을 덮어쓴다.
    const fetchStub = stubFetch();
    seedStores({ workflow: { decisionThreshold: 0.7 } });

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    const payload = fetchStub.evaluatePayload();
    expect(payload.decision_threshold).toBe(0.7);
    // 페이로드의 키 집합을 고정한다 — `threshold`(합격 목표값)나 `metric_details` 가
    // 여기 섞이면 두 개념이 다시 한 이름으로 합쳐지기 시작한 신호다.
    expect(Object.keys(payload).sort()).toEqual([
      "beta",
      "column_mappings",
      "decision_threshold",
      "metadata",
      "selected_metric_ids",
      "task_type",
    ]);
  });

  it("선택 지표와 metadata(양성 클래스·분포)를 그대로 싣는다", async () => {
    const fetchStub = stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    const payload = fetchStub.evaluatePayload();
    expect(payload.selected_metric_ids).toEqual(["M1", "M2", "M3", "M4", "M9", "M21", "M22", "M23"]);
    expect(payload.metadata).toEqual({
      positive_class: "1",
      negative_class: "0",
      positive_class_ambiguous: false,
      detected_classes: ["0", "1"],
      detected_labels: [],
      class_distribution: { "0": 1, "1": 1 },
    });
  });
});

/* ================================================================== *
 * 3. 2단계 렌더 (D6b) — 이 훅의 핵심 구조
 * ================================================================== */

describe("[H-03·D6b] 2단계 렌더", () => {
  it("서술이 아직 안 왔어도 KPI·차트는 이미 확정 상태로 렌더된다", async () => {
    const narrative = deferred<Response>();
    stubFetch({ narrative: narrative.promise });
    seedStores();

    const { result } = mountHook();

    // stage1 경계: evaluate 는 해소됐고 narrative 는 대기 중이다(시간이 아니라 상태).
    await waitFor(() => expect(result.current.narrativePending).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.kpiResults.length).toBeGreaterThan(0);
    expect(result.current.data!.charts.confusionMatrix).not.toBeNull();
    // 7·8·9절은 아직 비어 있고, 출처 배지도 아직 없다.
    expect(result.current.data!.interpretation.confusionAnalysis).toBe("");
    expect(result.current.data!.narrativeSource).toBeUndefined();

    narrative.resolve(jsonResponse(narrativeResponse()));
    await waitFor(() => expect(result.current.narrativePending).toBe(false));
  });

  it("stage1 은 스토어에 저장되지 않는다 — 반쪽 성적서가 완성본으로 굳지 않게", async () => {
    const narrative = deferred<Response>();
    stubFetch({ narrative: narrative.promise });
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.narrativePending).toBe(true));

    const stored = useWorkspaceStore.getState().evaluationRuns[0].reportData;
    expect(stored.isEvaluated).toBeUndefined();
    expect(stored.kpiResults).toEqual([]);

    narrative.resolve(jsonResponse(narrativeResponse()));
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    // 완성본이 되고 나서야 저장된다.
    expect(useWorkspaceStore.getState().evaluationRuns[0].reportData.isEvaluated).toBe(true);
  });

  it("서술 대기 중 화면에는 '생성하는 중' 안내가 보이고 지표 숫자도 함께 보인다", async () => {
    const narrative = deferred<Response>();
    stubFetch({ narrative: narrative.promise });
    seedStores();

    renderReportPage();

    expect(
      await screen.findByText(/AI 정성 서술\(7·8·9절\)을 생성하는 중입니다/),
    ).toBeVisible();
    // 같은 화면에 stage1 의 숫자가 이미 인쇄돼 있다(M1 Accuracy = 0.505, toFixed(3)).
    expect((await screen.findAllByText("0.505"))[0]).toBeVisible();

    narrative.resolve(jsonResponse(narrativeResponse()));
    await waitFor(() =>
      expect(screen.queryByText(/AI 정성 서술\(7·8·9절\)을 생성하는 중입니다/)).toBeNull(),
    );
  });

  it("서술이 도착하면 7·8·9절만 병합되고 KPI·차트는 그대로다", async () => {
    stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    const data = result.current.data!;
    expect(data.interpretation).toEqual({
      confusionAnalysis: "혼동 행렬 분석 서술입니다.",
      distributionAnalysis: "분포 분석 서술입니다.",
    });
    expect(data.conclusion.benchmark).toBe("내부 참조 기준 대비 우수");
    expect(data.recommendationNarrative).toEqual({
      dataQuality: "데이터 품질 권고입니다.",
      modelOps: "운영 권고입니다.",
    });
    expect(data.recommendations).toHaveLength(1);
    expect(data.narrativeSource).toBe("fallback");
    // KPI 는 stage1 값 그대로.
    expect(data.kpiResults.find((k) => k.metricId === "M1")?.value).toBe(0.505);
  });

  it("판정·점수는 프론트 규칙이 권위다 — LLM 이 보낸 verdict 는 버린다", async () => {
    // 픽스처의 narrative 응답은 conclusion.verdict = "FAIL" 을 담고 있지만,
    // 규칙 산출값(핵심지표 M1 미달 → FAIL, 통과율 4/5 → 80.0)이 성적서에 남아야 한다.
    // LLM 값을 쓰기 시작하면 점수(score)가 아예 사라진다 — 응답에 없는 필드다.
    stubFetch();
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    expect(result.current.data!.conclusion.verdict).toBe("FAIL");
    expect(result.current.data!.conclusion.score).toBe(80);
  });

  it("서술 호출이 실패해도 stage1 성적서가 오류 화면으로 덮이지 않는다", async () => {
    stubFetch({ narrative: jsonResponse({}, { ok: false, status: 500 }) });
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.narrativePending).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data!.kpiResults.length).toBeGreaterThan(0);
    // 서술은 비고 출처는 error 로 남아 추적 가능하다.
    expect(result.current.data!.interpretation.confusionAnalysis).toBe("");
    expect(result.current.data!.narrativeSource).toBe("error");
  });

  it("서술 대기 중 언마운트되면 완성본을 저장하지 않는다 (E-14)", async () => {
    const narrative = deferred<Response>();
    stubFetch({ narrative: narrative.promise });
    seedStores();

    const { result, unmount } = mountHook();
    await waitFor(() => expect(result.current.narrativePending).toBe(true));

    unmount();
    narrative.resolve(jsonResponse(narrativeResponse()));

    // `waitFor` 를 쓰면 안 된다 — "저장되지 않았다"는 첫 시도에서 즉시 통과하고,
    // 그 뒤에 실행될 async 연속이 스토어를 쓰더라도 잡지 못한다. 마이크로태스크를
    // 전부 비운 **뒤에** 판정한다(하네스의 fetch 스텁은 타이머를 쓰지 않는다).
    await flushMicrotasks();

    expect(
      useWorkspaceStore.getState().evaluationRuns[0].reportData.isEvaluated,
    ).toBeUndefined();
  });
});

/* ================================================================== *
 * 4. 평가 응답 → 성적서 필드 변환 (B-01·B-02·C-06·C-08 이 나온 공백)
 * ================================================================== */

describe("[H-03] 평가 응답 → 성적서 변환", () => {
  async function evaluated(response: unknown, seed: Parameters<typeof seedStores>[0] = {}) {
    stubFetch({ evaluate: jsonResponse(response) });
    seedStores(seed);
    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    return result.current.data as FinalReportData;
  }

  it("[B-01] 계산 실패 지표는 값 0 이 아니라 '측정 불가'로 표기된다", async () => {
    const data = await evaluated(
      evaluateResponse({
        results: {
          success_metrics: { ...evaluateResponse().results.success_metrics },
          failed_metrics: { M9: "score 컬럼이 없어 AUROC 를 계산할 수 없습니다" },
        },
      }),
    );

    const m9 = data.kpiResults.find((k) => k.metricId === "M9")!;
    expect(m9.status).toBe("unavailable");
    expect(m9.errorMessage).toContain("AUROC");
    // 판정에서도 빠진다 — 0 점으로 세면 통과율이 조용히 내려간다.
    expect(data.conclusion.score).toBe(75);
  });

  it("측정 불가가 화면에 '측정 불가'로 인쇄된다", async () => {
    stubFetch({
      evaluate: jsonResponse(
        evaluateResponse({
          results: {
            success_metrics: evaluateResponse().results.success_metrics,
            failed_metrics: { M9: "계산 불가" },
          },
        }),
      ),
    });
    seedStores();

    renderReportPage();

    expect((await screen.findAllByText(/측정 불가/)).length).toBeGreaterThan(0);
  });

  it("[C-06] dict 를 돌려주는 지표는 대표값 f1 과 세부 P/R 을 함께 싣는다", async () => {
    const base = evaluateResponse();
    const data = await evaluated(
      {
        ...base,
        results: {
          failed_metrics: {},
          success_metrics: {
            ...base.results.success_metrics,
            M11: { precision: 0.51, recall: 0.52, f1_score: 0.515 },
          },
        },
      },
      {
        workflow: {
          taskType: "multiclass",
          selectedMetricIds: ["M11"],
          metricDetails: { M11: { targetValue: "0.5" } } as any,
        },
      },
    );

    const m11 = data.kpiResults.find((k) => k.metricId === "M11")!;
    expect(m11.value).toBe(0.515);
    expect(m11.subMetrics).toEqual({ precision: 0.51, recall: 0.52, f1Score: 0.515 });
  });

  it("[A-04] 그 task 가 노출하지 않는 지표는 KPI 표에 숫자로 찍히지 않는다", async () => {
    // 옛 브라우저 상태에 남은 지표가 평가로 전송되면 백엔드가 값을 돌려줄 수 있다.
    // 4·5절은 task 필터로 걸러지므로, 6절만 걸러내지 않으면 그 한 절에만 숫자가 남는다.
    const base = evaluateMultilabelResponse();
    const data = await evaluated(
      {
        ...base,
        results: {
          failed_metrics: {},
          success_metrics: { ...base.results.success_metrics, M1: 0.42 },
        },
      },
      {
        workflow: {
          taskType: "multilabel",
          selectedMetricIds: ["M1", "M17", "M21"],
          metricDetails: { M1: { targetValue: "0.3" }, M17: { targetValue: "0.3" } } as any,
          columnMapping: binaryMapping(),
        },
      },
    );

    expect(data.kpiResults.map((k) => k.metricId)).not.toContain("M1");
    expect(data.kpiResults.map((k) => k.metricId)).toContain("M17");
  });

  it("[C-08] 멀티레이블 혼동행렬은 레이블 전수가 실린다", async () => {
    const data = await evaluated(evaluateMultilabelResponse(), {
      workflow: {
        taskType: "multilabel",
        selectedMetricIds: ["M2", "M3", "M4", "M15", "M16", "M17", "M21", "M22", "M23"],
        columnMapping: binaryMapping(),
      },
    });

    const cm = data.charts.confusionMatrix!;
    expect(cm.multilabelMatrices).toHaveLength(4);
    expect(cm.multilabelMatrices!.map((m) => m.label)).toEqual([
      "finance",
      "news",
      "sports",
      "tech",
    ]);
    // 레이블별 표본 수는 각 2x2 의 합이다(43+50+62+45 = 200).
    expect(cm.multilabelMatrices![0].totalSamples).toBe(200);
  });

  it("[B-02] 표본 수는 서버가 확정한 n_samples 를 쓴다 — 4단계 손입력값이 아니다", async () => {
    // 하네스 픽스처의 validationSampleCount 는 "999" 다. 그것이 인쇄되면 안 된다.
    const fetchStub = stubFetch();
    seedStores();
    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    expect(fetchStub.narrativePayload().fact_sheet.n_samples).toBe(200);
    expect(result.current.data!.datasetDiagnosis).toContain("200");
    expect(result.current.data!.datasetDiagnosis).not.toContain("999");
  });

  it("[B-02] 멀티레이블에서도 fact_sheet 표본 수는 n_samples 다 — 행렬 합이 아니다", async () => {
    // B-02 의 본체가 여기다. 멀티레이블 혼동행렬은 **레이블별 2x2** 라
    // `buildFactSheet` 가 전부 합치면 200행 데이터가 800(=200x4)이 된다.
    // binary 픽스처로는 두 값이 우연히 같아(둘 다 200) 이 성질을 판별할 수 없다 —
    // 변이 검사에서 실제로 그 변이가 살아남았다.
    const fetchStub = stubFetch({ evaluate: jsonResponse(evaluateMultilabelResponse()) });
    seedStores({
      workflow: {
        taskType: "multilabel",
        selectedMetricIds: ["M2", "M3", "M4", "M15", "M16", "M17", "M21", "M22", "M23"],
        columnMapping: binaryMapping(),
      },
    });

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    const factSheet = fetchStub.narrativePayload().fact_sheet;
    expect(factSheet.n_samples).toBe(200);
    // 전제 확인: 행렬 합은 실제로 다른 수다(같으면 이 테스트가 아무것도 판별하지 않는다).
    const matrixTotal = factSheet.confusion.matrix
      .flat()
      .reduce((a: number, b: number) => a + b, 0);
    expect(matrixTotal).toBe(800);
  });

  it("[B-02] M21 을 고르지 않아도 fact_sheet 표본 수는 n_samples 다", async () => {
    // B-02 의 정확한 재현 조건이다. M21 을 고르지 않으면 혼동행렬이 null 이 되어
    // `confusionMatrix?.totalSamples` 폴백이 사라진다 — 그때 `result.n_samples` 를
    // 읽지 않으면 표본 수가 0(또는 분포 합계)으로 바뀌고, 7·8절 서술이 그 수를 인쇄한다.
    // M21 을 고른 픽스처로는 두 값이 우연히 같아 이 성질을 판별할 수 없다.
    const base = evaluateMultilabelResponse();
    const withoutM21 = { ...(base.results.success_metrics as Record<string, unknown>) };
    delete withoutM21.M21;

    const fetchStub = stubFetch({
      evaluate: jsonResponse({
        ...base,
        results: { failed_metrics: {}, success_metrics: withoutM21 },
      }),
    });
    seedStores({
      workflow: {
        taskType: "multilabel",
        selectedMetricIds: ["M2", "M3", "M4", "M15", "M16", "M17", "M22", "M23"],
        columnMapping: binaryMapping(),
      },
    });

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    // 전제 확인: 혼동행렬이 없다(있으면 폴백이 살아 있어 판별력이 없다).
    expect(result.current.data!.charts.confusionMatrix).toBeNull();
    expect(fetchStub.narrativePayload().fact_sheet.n_samples).toBe(200);
    // 분포 합계(107+102+97+102 = 408)가 아니라는 것이 B-02 의 핵심이다.
    expect(fetchStub.narrativePayload().fact_sheet.n_samples).not.toBe(408);
  });

  it("[D-16] 전처리 경고를 버리지 않고 화면에 도달시킨다", async () => {
    stubFetch({
      evaluate: jsonResponse(
        evaluateResponse({ warnings: ["결측치가 있는 3행을 평가에서 제외했습니다."] }),
      ),
    });
    seedStores();

    renderReportPage();

    expect(
      await screen.findByText(/결측치가 있는 3행을 평가에서 제외했습니다/),
    ).toBeVisible();
  });

  it("[F-09] 평가 환경은 서버 실측값이 실린다", async () => {
    const data = await evaluated(evaluateResponse());

    expect(data.evalEnv.environment).toEqual({
      evaluated_at: "2026-09-07T03:00:00+00:00",
      libraries: { "scikit-learn": "1.9.0", pandas: "2.2.3", numpy: "2.5.1" },
    });
  });

  it("[A-01] 확률에서 예측을 파생했다는 사실이 성적서 메타로 옮겨진다", async () => {
    const base = evaluateResponse();
    const derived = {
      method: "threshold",
      threshold: 0.7,
      source_columns: ["prob"],
      target_role: "y_pred",
      positive_class: "1",
      negative_class: "0",
    };
    const data = await evaluated({
      ...base,
      results: {
        failed_metrics: {},
        success_metrics: { ...base.results.success_metrics, derived_prediction: derived },
      },
    });

    expect(data.meta.derivedPrediction).toEqual(derived);
  });

  it("불균형비(M23)와 서버 분포로 데이터셋 진단문을 만든다", async () => {
    const data = await evaluated(evaluateResponse());

    expect(data.datasetDiagnosis).toContain("1.11"); // toFixed(2)
    // 서버 class_distribution(105/95)이 store metadata(1/1)를 이긴다.
    expect(data.datasetDiagnosis).toContain("105");
  });

  it("ROC·PR 곡선과 스칼라 AUROC 가 함께 실린다", async () => {
    const data = await evaluated(evaluateResponse());

    expect(data.charts.rocCurve).toEqual({
      fpr: [0.0, 0.5, 1.0],
      tpr: [0.0, 0.6, 1.0],
      auroc: 0.5111779448621554,
    });
    expect(data.charts.prCurve?.auprc).toBeUndefined(); // M10 미선택 → 스칼라 없음
  });

  it("지연시간 통계는 latency_stats 가 있을 때만 실리고 단위를 정규화한다", async () => {
    const base = evaluateResponse();
    const withLatency = await evaluated({
      ...base,
      results: {
        failed_metrics: {},
        success_metrics: {
          ...base.results.success_metrics,
          latency_stats: { mean: 12, min: 5, p50: 11, p95: 20, p99: 25, max: 30, unit: "s" },
        },
      },
    });
    expect(withLatency.latency).toEqual({
      mean: 12, min: 5, p50: 11, p95: 20, p99: 25, max: 30, unit: "s",
    });

    const noLatency = await evaluated(evaluateResponse());
    expect(noLatency.latency).toBeNull();
  });

  it("M2·M3·M4 의 클래스별 값은 M22 에서 오고 집계 행(macro/weighted)은 섞이지 않는다", async () => {
    const data = await evaluated(evaluateResponse());

    const m3 = data.kpiResults.find((k) => k.metricId === "M3")!;
    expect(m3.perClass).toEqual([
      { label: "0", value: 0.4666666666666667, status: "pass" },
      { label: "1", value: 0.5473684210526316, status: "pass" },
    ]);
  });

  it("M21·M22 는 정보성 지표라 목표값·판정을 갖지 않는다", async () => {
    const data = await evaluated(evaluateResponse(), {
      workflow: {
        metricDetails: {
          ...workflowSnapshot().metricDetails,
          M21: { targetValue: "0.9" },
          M22: { targetValue: "0.9" },
        } as any,
      },
    });

    for (const id of ["M21", "M22"]) {
      const kpi = data.kpiResults.find((k) => k.metricId === id)!;
      expect(kpi.threshold).toBe(0);
      expect(kpi.status).toBe("pass");
    }
  });
});

/* ================================================================== *
 * 5. 오류 경로
 * ================================================================== */

describe("[H-03] 오류 경로", () => {
  it("평가가 비 200 이면 백엔드 detail 이 그대로 오류로 올라온다", async () => {
    stubFetch({
      evaluate: jsonResponse({ detail: "선택 지표가 비어 있습니다." }, { ok: false, status: 422 }),
    });
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.error).toBe("선택 지표가 비어 있습니다."));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("detail 이 없으면 상태 코드를 말한다", async () => {
    stubFetch({ evaluate: jsonResponse({}, { ok: false, status: 503 }) });
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.error).toBe("Server error: 503"));
  });

  it("오류 화면이 실제로 렌더되고 메시지가 보인다", async () => {
    stubFetch({
      evaluate: jsonResponse({ detail: "평가 대상 행이 없습니다." }, { ok: false, status: 400 }),
    });
    seedStores();

    renderReportPage();

    expect(await screen.findByText(/평가 대상 행이 없습니다/)).toBeVisible();
  });

  it("서술 출처가 llm 이면 '규칙 기반' 배지를 붙이지 않는다", async () => {
    // 배지는 추적성 장치다 — 규칙 폴백으로 만든 서술을 LLM 서술처럼 보이게 하거나
    // 그 반대가 되면, 독자가 성적서의 서술을 잘못된 근거로 신뢰한다.
    stubFetch({
      narrative: jsonResponse(narrativeResponse({ meta: { source: "llm", model: "gpt-4.1-nano" } })),
    });
    seedStores();

    const { result } = mountHook();
    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));

    expect(result.current.data!.narrativeSource).toBe("llm");
  });

  it("서술 출처 배지는 규칙 폴백일 때만 화면에 보인다", async () => {
    stubFetch({
      narrative: jsonResponse(narrativeResponse({ meta: { source: "llm", model: "gpt-4.1-nano" } })),
    });
    seedStores();

    const llmRender = renderReportPage();
    await waitFor(() => expect(screen.queryAllByText("규칙 기반 자동 생성")).toHaveLength(0));
    llmRender.unmount();

    // 같은 화면, 폴백 응답 — 이번에는 배지가 보여야 한다.
    vi.unstubAllGlobals();
    resetStores();
    stubFetch();
    seedStores();

    renderReportPage();
    expect((await screen.findAllByText("규칙 기반 자동 생성"))[0]).toBeVisible();
  });

  it("LLM 예산 초과는 오류가 아니다 — 200 + 규칙 폴백이라 성적서가 완성된다", async () => {
    // 백엔드는 예산 초과 시 429 가 아니라 200 에 fallback 서술을 담아 내려보낸다.
    // 프론트가 이것을 오류로 다루면 정상 사용자의 성적서가 오류 화면이 된다.
    stubFetch({
      narrative: jsonResponse(
        narrativeResponse({ meta: { source: "fallback", reason: "budget_exceeded" } }),
      ),
    });
    seedStores();

    const { result } = mountHook();

    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    expect(result.current.error).toBeNull();
    expect(result.current.data!.narrativeSource).toBe("fallback");
    expect(result.current.data!.conclusion.narrative).toBe("종합 판정 서술입니다.");
  });
});

/* ================================================================== *
 * 6. 이미 발급·평가된 성적서는 이후 워크플로우 편집에 흔들리지 않는다
 * ================================================================== */

describe("[H-03] 완성본의 불변성", () => {
  it("평가 후 1단계 정보를 바꿔도 저장된 성적서의 회사명은 바뀌지 않는다", async () => {
    stubFetch();
    seedStores();

    const first = mountHook();
    await waitFor(() => expect(first.result.current.data?.isEvaluated).toBe(true));
    expect(first.result.current.data!.applicant.companyName).toBe("테스트 주식회사");
    first.unmount();

    // 사용자가 1단계로 되돌아가 회사명을 고친다.
    useWorkflowStore.setState({
      basicInfo: { ...useWorkflowStore.getState().basicInfo, companyName: "다른 회사" },
    });

    const second = mountHook();
    await waitFor(() => expect(second.result.current.data?.isEvaluated).toBe(true));
    // 완성본 캐시가 이긴다 — 발급된 성적서가 사후 편집으로 바뀌면 안 된다.
    expect(second.result.current.data!.applicant.companyName).toBe("테스트 주식회사");
  });
});

/* ================================================================== *
 * 7. RED — 남의 워크플로우로 이 run 의 성적서를 다시 만들지 않는다
 * ================================================================== */

describe("[H-03 파생] run 과 무관한 워크플로우로 재평가하지 않는다", () => {
  it("초안 run 을 목록에서 열 때, 지금 진행 중인 다른 모델의 파일로 평가하지 않는다", async () => {
    // 도달 경로: 워크스페이스 목록의 'View' 버튼이 어떤 run 이든 /report/:id 로 보낸다
    // (EvaluationRunsTable.tsx). run A 가 초안(서술 미완)으로 남은 상태에서 사용자가
    // 모델 B 작업을 진행하면, 훅은 **살아 있는 워크플로우 store** 를 입력으로 쓰기 때문에
    // B 의 파일·매핑으로 평가해 그 결과를 run A 의 성적서로 저장하고 isEvaluated 까지 세운다.
    // 목록은 여전히 "Model A" 로 표시되는데 안의 내용은 B 다 — 그대로 발급될 수 있다.
    const fetchStub = stubFetch();
    seedStores();

    // run A 는 이 워크플로우가 만든 초안이다.
    useWorkflowStore.setState({ lastRunId: RUN_ID });

    // 이제 사용자가 모델 B 작업으로 옮겨간다: 새 파일을 올리고 6단계를 끝내 run B 가 생겼다.
    useWorkspaceStore.setState((state) => ({
      evaluationRuns: [
        {
          ...state.evaluationRuns[0],
          id: "run-b",
          modelName: "ModelB",
        },
        ...state.evaluationRuns,
      ],
    }));
    useWorkflowStore.setState({
      lastRunId: "run-b",
      rawFile: new File(["label,pred,prob\n1,1,0.9\n"], "model-b.csv", { type: "text/csv" }),
    });

    // 목록에서 초안 run A 를 연다.
    const { result } = mountHook(RUN_ID);

    await waitFor(() => expect(result.current.data).not.toBeNull());
    // 평가를 시도하지 않아야 한다.
    expect(fetchStub.countOf("/api/evaluate")).toBe(0);
    // run A 의 저장본이 남의 결과로 덮이지 않아야 한다.
    const stored = useWorkspaceStore
      .getState()
      .evaluationRuns.find((r) => r.id === RUN_ID)!.reportData;
    expect(stored.isEvaluated).toBeUndefined();
    expect(stored.kpiResults).toEqual([]);
  });

  it("lastRunId 는 같지만 그 뒤 다른 파일을 올렸으면 평가하지 않는다", async () => {
    // `lastRunId` 만으로는 부족하다 — 6단계로 run 을 만든 뒤 4단계로 돌아가 **다른 파일**
    // 을 올려도 이 값은 그대로다. 그 상태에서 7번 탭을 누르면 StepTabs 가 `/report/:lastRunId`
    // 로 보내므로(StepTabs.tsx), 남의 파일로 이 run 을 평가하는 경로가 그대로 열린다.
    const fetchStub = stubFetch();
    seedStores();
    useWorkflowStore.setState({
      lastRunId: RUN_ID,
      uploadedFile: { name: "다른-파일.csv", size: "9.9 KB", type: "text/csv" },
      rawFile: new File(["label,pred\n1,1\n"], "다른-파일.csv", { type: "text/csv" }),
    });

    const { result } = mountHook(RUN_ID);

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(fetchStub.countOf("/api/evaluate")).toBe(0);
  });

  it("같은 파일을 다시 올려 같은 run 을 재평가하는 정상 동선은 막히지 않는다", async () => {
    const fetchStub = stubFetch();
    seedStores();
    // 새로고침 후 재업로드 — 파일 메타가 run 스냅샷과 동일하다.
    useWorkflowStore.setState({
      lastRunId: RUN_ID,
      uploadedFile: { name: "data.csv", size: "1.2 KB", type: "text/csv" },
      rawFile: new File(["label,pred,prob\n0,0,0.1\n"], "data.csv", { type: "text/csv" }),
    });

    const { result } = mountHook(RUN_ID);

    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    expect(fetchStub.countOf("/api/evaluate")).toBe(1);
  });

  it("자기 워크플로우가 만든 run 이면 평가한다 (위 가드가 정상 경로를 막지 않는다)", async () => {
    const fetchStub = stubFetch();
    seedStores();
    useWorkflowStore.setState({ lastRunId: RUN_ID });

    const { result } = mountHook(RUN_ID);

    await waitFor(() => expect(result.current.data?.isEvaluated).toBe(true));
    expect(fetchStub.countOf("/api/evaluate")).toBe(1);
  });
});
