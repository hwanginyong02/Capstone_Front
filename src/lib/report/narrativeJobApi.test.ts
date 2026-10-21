import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createNarrativeJob, fetchNarrativeJob, isRetryable, mapNarrativeResult, toBenchmarkRefs } from "./narrativeJobApi";
import type { NarrativeRequestPayload } from "./buildFactSheet";

/**
 * narrativeJobApi — 서술 작업 경로(서술 라운드 S3b) 응답(snake_case) → 리포트 필드(camelCase) 매핑과 호출.
 *
 * 매핑 단언은 옛 `fetchNarrative` 테스트에서 옮겼다(작업 결과 result 가 옛 응답과 같은 모양이다). 서버가 필드를 더하거나
 * 이름을 바꾸면 화면이 조용히 빈 칸이 되므로 응답 모양 그대로를 넣어 고정한다.
 */

const PAYLOAD = { fact_sheet: {} } as unknown as NarrativeRequestPayload;

const REF = {
  metric: "Accuracy",
  model_value: 0.94,
  ref_low: 0.85,
  ref_high: 0.92,
  position: "above",
  direction: "higher",
  quality: "better",
  source_note: "내부 참조 기준치 v1",
};

const SIX = ["7.1", "7.2", "8.1", "8.2", "8.3", "9"];
const allSources = (v: string) => Object.fromEntries(SIX.map((k) => [k, v]));

const FULL_RESULT = {
  interpretation: { confusion_analysis: "혼동 해석", distribution_analysis: "분포 해석" },
  conclusion: { verdict: "PASS", benchmark: "벤치마크 서술", narrative: "총평", risks: "리스크" },
  recommendation_narrative: { data_quality: "데이터 품질", model_ops: "모델 운영" },
  recommendations: [
    { priority: "HIGH", category: "데이터", action: "라벨 재검토", expected_impact: "오류 감소" },
  ],
  section_sources: allSources("llm"),
};

describe("결과 매핑(mapNarrativeResult)", () => {
  it("결과 전체를 리포트 필드로 옮긴다", () => {
    const n = mapNarrativeResult(FULL_RESULT);
    // 7.3·칸별 모델 키가 없는 응답(세션 B 전 서버) — 7.3 은 빈 글, 모델 기록은 없음.
    expect(n.interpretation).toEqual({ confusionAnalysis: "혼동 해석", distributionAnalysis: "분포 해석", additionalObservations: "" });
    expect(n.sectionModels).toBeUndefined();
    expect(n.conclusionText).toEqual({ benchmark: "벤치마크 서술", narrative: "총평", risks: "리스크" });
    expect(n.recommendationNarrative).toEqual({ dataQuality: "데이터 품질", modelOps: "모델 운영" });
    expect(n.recommendations).toEqual([
      { priority: "HIGH", category: "데이터", action: "라벨 재검토", expectedImpact: "오류 감소" },
    ]);
    expect(n.sectionSources).toEqual(allSources("llm"));
    expect(n.source).toBe("llm");
  });

  it("빠진 필드는 빈 값으로 채우고, 칸 출처가 없으면 전체 출처는 fallback", () => {
    const n = mapNarrativeResult({});
    expect(n.interpretation).toEqual({ confusionAnalysis: "", distributionAnalysis: "", additionalObservations: "" });
    expect(n.sectionModels).toBeUndefined();
    expect(n.conclusionText).toEqual({ benchmark: "", narrative: "", risks: "" });
    expect(n.recommendationNarrative).toEqual({ dataQuality: "", modelOps: "" });
    expect(n.recommendations).toEqual([]);
    expect(n.sectionSources).toEqual({});
    expect(n.source).toBe("fallback");
  });

  it("7.3 추가 관찰과 칸별 모델(section_models)을 옮긴다 — llm 칸만 이름, 나머지 null", () => {
    const n = mapNarrativeResult({
      ...FULL_RESULT,
      interpretation: { ...FULL_RESULT.interpretation, additional_observations: "추가 관찰" },
      section_sources: { ...allSources("llm"), "7.3": "llm", "8.1": "fallback", "9": "fixed" },
      section_models: { "7.1": "claude-x", "7.3": " claude-y ", "8.1": null, "9": null },
    });
    expect(n.interpretation.additionalObservations).toBe("추가 관찰");
    expect(n.sectionModels).toEqual({ "7.1": "claude-x", "7.3": "claude-y", "8.1": null, "9": null });
  });

  it("칸별 모델의 모양이 틀리면 — 빈 글·문자열이 아닌 값은 null, 객체가 아니면 기록 없음", () => {
    expect(mapNarrativeResult({ section_models: { "7.1": "", "7.2": 3 } }).sectionModels).toEqual({ "7.1": null, "7.2": null });
    expect(mapNarrativeResult({ section_models: ["claude-x"] }).sectionModels).toBeUndefined();
    expect(mapNarrativeResult({ section_models: "claude-x" }).sectionModels).toBeUndefined();
    expect(mapNarrativeResult({ section_models: null }).sectionModels).toBeUndefined();
  });

  it("고정 문구 칸(fixed)은 전체 출처를 정할 때 빼고 본다", () => {
    expect(mapNarrativeResult({ section_sources: { ...allSources("llm"), "9": "fixed" } }).source).toBe("llm");
    expect(mapNarrativeResult({ section_sources: { "9": "fixed" } }).source).toBe("fallback");
  });

  it("rejected 만 다시 만들기로 풀리지 않는다", () => {
    expect(isRetryable("rejected")).toBe(false);
    for (const f of ["timeout", "lost", "error", "expired", "unreachable", "gave_up", "create_failed"] as const) {
      expect(isRetryable(f)).toBe(true);
    }
  });

  it("칸 하나라도 llm 이 아니면 전체 출처는 fallback, 모르는 출처 값은 fallback 으로 읽는다", () => {
    const mixed = mapNarrativeResult({ section_sources: { ...allSources("llm"), "9": "fallback" } });
    expect(mixed.source).toBe("fallback");
    const fixed = mapNarrativeResult({ section_sources: { "7.1": "fixed", "7.2": "AI" } });
    expect(fixed.sectionSources).toEqual({ "7.1": "fixed", "7.2": "fallback" });
  });

  it("권고 항목의 빠진 칸은 빈 문자열, 우선순위는 MEDIUM 으로 둔다", () => {
    expect(mapNarrativeResult({ recommendations: [{}] }).recommendations).toEqual([
      { priority: "MEDIUM", category: "", action: "", expectedImpact: "" },
    ]);
  });

  it.each([
    ["high", "HIGH"],
    ["Low", "LOW"],
    ["MEDIUM", "MEDIUM"],
    ["urgent", "MEDIUM"],
    [null, "MEDIUM"],
  ])("우선순위 %s → %s", (raw, expected) => {
    expect(mapNarrativeResult({ recommendations: [{ priority: raw }] }).recommendations[0].priority).toBe(expected);
  });

  it("problem_id 를 problemId 로 옮기고, 비었거나 문자열이 아니면 필드를 두지 않는다", () => {
    const [rec] = mapNarrativeResult({
      recommendations: [
        { priority: "HIGH", category: "모델", action: "임계값 조정", expected_impact: "재현율 개선", problem_id: "P2" },
      ],
    }).recommendations;
    expect(rec).toEqual({ priority: "HIGH", category: "모델", action: "임계값 조정", expectedImpact: "재현율 개선", problemId: "P2" });
    const recs = mapNarrativeResult({
      recommendations: [{}, { problem_id: "" }, { problem_id: 3 }, { problem_id: null }],
    }).recommendations;
    expect(recs.every((r) => !("problemId" in r))).toBe(true);
  });
});

/**
 * 8.1 목표값·목표값 수준(설계 D31). 키가 없는 응답(이 필드가 생기기 전 서버)에는 필드를 두지 않는다 —
 * 8.1 표가 키 유무로 열을 그릴지 정하므로, null 로 채우면 옛 응답에도 빈 열이 생긴다.
 */
describe("벤치마크(toBenchmarkRefs)", () => {
  it("snake_case 를 옮긴다", () => {
    expect(toBenchmarkRefs([{ ...REF, target_value: 0.9, target_position: "within" }])).toEqual([
      {
        metric: "Accuracy",
        modelValue: 0.94,
        refLow: 0.85,
        refHigh: 0.92,
        quality: "better",
        direction: "higher",
        sourceNote: "내부 참조 기준치 v1",
        targetValue: 0.9,
        targetPosition: "within",
      },
    ]);
  });

  it("숫자가 아닌 값은 버리고, 빠진 방향은 higher 로 둔다", () => {
    const refs = toBenchmarkRefs([
      { metric: "Recall", model_value: "x", ref_low: 0.1, ref_high: 0.2 },
      { model_value: 0.5, ref_low: 0.1, ref_high: 0.2 },
      { metric: "F1 Score", model_value: 0.5, ref_low: 0.4, ref_high: 0.6 },
    ]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ metric: "F1 Score", direction: "higher", quality: "" });
  });

  it("목표값이 없는 지표는 둘 다 null(키는 있음), 모르는 위치 값은 null", () => {
    const [none] = toBenchmarkRefs([{ ...REF, target_value: null, target_position: null }]);
    expect(none).toHaveProperty("targetValue", null);
    expect(none).toHaveProperty("targetPosition", null);
    const [odd] = toBenchmarkRefs([{ ...REF, target_value: 0.8, target_position: "inside" }]);
    expect(odd.targetValue).toBe(0.8);
    expect(odd.targetPosition).toBeNull();
  });

  it("옛 응답(키 없음)에는 필드를 두지 않는다", () => {
    const [r] = toBenchmarkRefs([REF]);
    expect("targetValue" in r).toBe(false);
    expect("targetPosition" in r).toBe(false);
  });

  it("배열이 아니면 빈 목록", () => {
    expect(toBenchmarkRefs(undefined)).toEqual([]);
    expect(toBenchmarkRefs({})).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 호출 — fetch 가짜(상태 코드 포함)
 * ------------------------------------------------------------------ */

let fetchMock: ReturnType<typeof vi.fn>;

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("작업 만들기(createNarrativeJob)", () => {
  it("요청 본문을 그대로 POST 하고 작업 번호와 8.1 표를 받는다", async () => {
    respond({ job_id: "job-1", status: "running", stage: "queued", benchmark_refs: [REF], result: null });
    const created = await createNarrativeJob(PAYLOAD);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/narrative\/jobs$/);
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(PAYLOAD);
    expect(created).toEqual({ kind: "started", jobId: "job-1", benchmarkRefs: toBenchmarkRefs([REF]) });
  });

  it("서버가 행 없이 결과를 바로 주면(작업 행 상한) 조회 없이 끝난 결과다", async () => {
    respond({ job_id: null, status: "done", stage: "done", benchmark_refs: [REF], result: { ...FULL_RESULT, section_sources: allSources("fallback") } });
    const created = await createNarrativeJob(PAYLOAD);
    expect(created.kind).toBe("finished");
    if (created.kind !== "finished") return;
    expect(created.fields.source).toBe("fallback");
    expect(created.benchmarkRefs).toHaveLength(1);
  });

  it.each([
    ["422", () => respond({ detail: [] }, 422)],
    ["413", () => respond({ detail: "too big" }, 413)],
  ])("서버가 요청을 받지 않으면(%s) rejected — 같은 요청으로는 다시 만들 수 없다", async (_name, arrange) => {
    arrange();
    expect(await createNarrativeJob(PAYLOAD)).toEqual({ kind: "failed", failure: "rejected" });
  });

  it.each([
    ["500", () => respond({}, 500)],
    ["번호 없음", () => respond({ status: "running" })],
    ["네트워크", () => fetchMock.mockRejectedValueOnce(new Error("network"))],
  ])("만들지 못하면(%s) 실패로 돌려준다 — 빈 서술로 흡수하지 않는다", async (_name, arrange) => {
    arrange();
    expect(await createNarrativeJob(PAYLOAD)).toEqual({ kind: "failed", failure: "create_failed" });
  });
});

describe("작업 조회(fetchNarrativeJob)", () => {
  it("진행 중이면 단계를 돌려준다", async () => {
    respond({ job_id: "j", status: "running", stage: "generating", failure: null, result: null });
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "running", stage: "generating" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/narrative\/jobs\/j$/);
  });

  it("모르는 단계는 대기로 읽는다", async () => {
    respond({ status: "running", stage: "thinking" });
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "running", stage: "queued" });
  });

  it("끝났으면 결과와 8.1 표를 옮긴다", async () => {
    respond({ status: "done", stage: "done", result: FULL_RESULT, benchmark_refs: [REF] });
    const view = await fetchNarrativeJob("j");
    expect(view.kind).toBe("done");
    if (view.kind !== "done") return;
    expect(view.fields.conclusionText.narrative).toBe("총평");
    expect(view.benchmarkRefs).toHaveLength(1);
  });

  it.each(["timeout", "lost", "error", "expired"])("실패(%s)는 그 종류로", async (failure) => {
    respond({ status: "failed", stage: "failed", failure, result: null });
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "failed", failure });
  });

  it("모르는 실패 종류·결과 없는 완료는 error 로", async () => {
    respond({ status: "failed", failure: "boom" });
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "failed", failure: "error" });
    respond({ status: "done", result: null });
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "failed", failure: "error" });
  });

  it("없는 번호(404)는 유실", async () => {
    respond({ detail: "없음" }, 404);
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "failed", failure: "lost" });
  });

  it("네트워크·5xx 는 닿지 않음(호출부가 다시 해 본다)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "unreachable" });
    respond({}, 502);
    expect(await fetchNarrativeJob("j")).toEqual({ kind: "unreachable" });
  });
});
