import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchNarrative } from "./fetchNarrative";
import type { NarrativeRequestPayload } from "./buildFactSheet";

/**
 * fetchNarrative — /api/generate-narrative 응답(snake_case) → 리포트 필드(camelCase) 매핑.
 *
 * 종전에는 응답 파서 테스트가 없었다. 서버가 필드를 더하거나 이름을 바꾸면 화면이 조용히
 * 빈 칸이 되므로, 응답 모양 그대로를 넣어 매핑을 고정한다.
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

const FULL_RESPONSE = {
  interpretation: { confusion_analysis: "혼동 해석", distribution_analysis: "분포 해석" },
  conclusion: { benchmark: "벤치마크 서술", narrative: "총평", risks: "리스크" },
  recommendation_narrative: { data_quality: "데이터 품질", model_ops: "모델 운영" },
  recommendations: [
    { priority: "HIGH", category: "데이터", action: "라벨 재검토", expected_impact: "오류 감소" },
  ],
  benchmark_refs: [{ ...REF, target_value: 0.9, target_position: "within" }],
  meta: { source: "llm" },
};

let fetchMock: ReturnType<typeof vi.fn>;

function respondWith(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, json: async () => body });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("응답 매핑", () => {
  it("응답 전체를 리포트 필드로 옮긴다", async () => {
    respondWith(FULL_RESPONSE);
    const n = await fetchNarrative(PAYLOAD);

    expect(n.interpretation).toEqual({
      confusionAnalysis: "혼동 해석",
      distributionAnalysis: "분포 해석",
    });
    expect(n.conclusionText).toEqual({ benchmark: "벤치마크 서술", narrative: "총평", risks: "리스크" });
    expect(n.recommendationNarrative).toEqual({ dataQuality: "데이터 품질", modelOps: "모델 운영" });
    expect(n.recommendations).toEqual([
      { priority: "HIGH", category: "데이터", action: "라벨 재검토", expectedImpact: "오류 감소" },
    ]);
    expect(n.benchmarkRefs).toEqual([
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
    expect(n.source).toBe("llm");
  });

  it("요청 본문을 그대로 POST 한다", async () => {
    respondWith(FULL_RESPONSE);
    await fetchNarrative(PAYLOAD);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/generate-narrative$/);
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(PAYLOAD);
  });

  it("빠진 필드는 빈 값으로 채우고, llm 이 아니면 fallback 으로 적는다", async () => {
    respondWith({});
    const n = await fetchNarrative(PAYLOAD);
    expect(n.interpretation).toEqual({ confusionAnalysis: "", distributionAnalysis: "" });
    expect(n.conclusionText).toEqual({ benchmark: "", narrative: "", risks: "" });
    expect(n.recommendationNarrative).toEqual({ dataQuality: "", modelOps: "" });
    expect(n.recommendations).toEqual([]);
    expect(n.benchmarkRefs).toEqual([]);
    expect(n.source).toBe("fallback");
  });

  it("권고 항목의 빠진 칸은 빈 문자열, 우선순위는 MEDIUM 으로 둔다", async () => {
    respondWith({ recommendations: [{}] });
    const n = await fetchNarrative(PAYLOAD);
    expect(n.recommendations).toEqual([
      { priority: "MEDIUM", category: "", action: "", expectedImpact: "" },
    ]);
  });

  it("벤치마크 항목의 숫자가 아닌 값은 버리고, 빠진 방향은 higher 로 둔다", async () => {
    respondWith({
      benchmark_refs: [
        { metric: "Recall", model_value: "x", ref_low: 0.1, ref_high: 0.2 },
        { model_value: 0.5, ref_low: 0.1, ref_high: 0.2 },
        { metric: "F1 Score", model_value: 0.5, ref_low: 0.4, ref_high: 0.6 },
      ],
    });
    const n = await fetchNarrative(PAYLOAD);
    expect(n.benchmarkRefs).toHaveLength(1);
    expect(n.benchmarkRefs[0]).toMatchObject({ metric: "F1 Score", direction: "higher", quality: "" });
  });
});

describe("호출 실패 — 빈 서술(EMPTY)", () => {
  it("비정상 응답이면 빈 서술과 source=error", async () => {
    respondWith(FULL_RESPONSE, false);
    const n = await fetchNarrative(PAYLOAD);
    expect(n.source).toBe("error");
    expect(n.recommendations).toEqual([]);
    expect(n.benchmarkRefs).toEqual([]);
    expect(n.conclusionText).toEqual({ benchmark: "", narrative: "", risks: "" });
  });

  it("네트워크 오류도 빈 서술", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const n = await fetchNarrative(PAYLOAD);
    expect(n.source).toBe("error");
  });
});

describe("우선순위 정규화", () => {
  it.each([
    ["high", "HIGH"],
    ["Low", "LOW"],
    ["MEDIUM", "MEDIUM"],
    ["urgent", "MEDIUM"],
    [null, "MEDIUM"],
  ])("%s → %s", async (raw, expected) => {
    respondWith({ recommendations: [{ priority: raw }] });
    const n = await fetchNarrative(PAYLOAD);
    expect(n.recommendations[0].priority).toBe(expected);
  });
});

/**
 * 8.1 목표값·목표값 수준(설계 D31). 키가 없는 응답(이 필드가 생기기 전 서버)에는 필드를 두지 않는다 —
 * 8.1 표가 키 유무로 열을 그릴지 정하므로, null 로 채우면 옛 응답에도 빈 열이 생긴다.
 */
describe("벤치마크 목표값 필드", () => {
  it("목표값과 위치를 옮긴다", async () => {
    respondWith({
      benchmark_refs: [
        { ...REF, target_value: 0.8, target_position: "below" },
        { ...REF, metric: "Recall", target_value: 0.95, target_position: "above" },
      ],
    });
    const n = await fetchNarrative(PAYLOAD);
    expect(n.benchmarkRefs.map((r) => [r.targetValue, r.targetPosition])).toEqual([
      [0.8, "below"],
      [0.95, "above"],
    ]);
  });

  it("목표값이 없는 지표는 둘 다 null(키는 있음)", async () => {
    respondWith({ benchmark_refs: [{ ...REF, target_value: null, target_position: null }] });
    const [r] = (await fetchNarrative(PAYLOAD)).benchmarkRefs;
    expect(r).toHaveProperty("targetValue", null);
    expect(r).toHaveProperty("targetPosition", null);
  });

  it("모르는 위치 값은 null 로 둔다", async () => {
    respondWith({ benchmark_refs: [{ ...REF, target_value: 0.8, target_position: "inside" }] });
    const [r] = (await fetchNarrative(PAYLOAD)).benchmarkRefs;
    expect(r.targetValue).toBe(0.8);
    expect(r.targetPosition).toBeNull();
  });

  it("옛 응답(키 없음)에는 필드를 두지 않는다", async () => {
    respondWith({ benchmark_refs: [REF] });
    const [r] = (await fetchNarrative(PAYLOAD)).benchmarkRefs;
    expect("targetValue" in r).toBe(false);
    expect("targetPosition" in r).toBe(false);
  });
});
