/**
 * 워크스페이스 저장소 판 이행 v1 → v2 → v3 (서술 라운드 S3b) 과 저장 실패 처리.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WORKSPACE_PERSIST_VERSION,
  WORKSPACE_STORAGE_KEY,
  describeSaveError,
  isEmptyNarrative,
  migrateWorkspaceState,
  saveRun,
  useWorkspaceStore,
} from "./useWorkspaceStore";

const FILLED = {
  interpretation: { confusionAnalysis: "혼동 해석", distributionAnalysis: "" },
  conclusion: { benchmark: "", narrative: "총평", risks: "" },
  recommendationNarrative: { dataQuality: "", modelOps: "" },
};
const EMPTY = {
  interpretation: { confusionAnalysis: "", distributionAnalysis: "" },
  conclusion: { benchmark: "", narrative: "", risks: "" },
  recommendationNarrative: { dataQuality: "", modelOps: "" },
};

function run(id: string, reportData: any, extra: any = {}) {
  return { id, workspaceId: "ws", modelName: "m", versionName: "v", reportId: "", workflowSnapshot: {}, reportData, createdAt: "", ...extra };
}

beforeEach(() => {
  localStorage.clear();
  useWorkspaceStore.setState({ workspaces: [], evaluationRuns: [], activeWorkspaceId: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isEmptyNarrative", () => {
  it("서술 칸이 모두 비었거나 출처가 error 면 빈 서술", () => {
    expect(isEmptyNarrative(EMPTY)).toBe(true);
    expect(isEmptyNarrative({ ...FILLED, narrativeSource: "error" })).toBe(true);
    expect(isEmptyNarrative(FILLED)).toBe(false);
    expect(isEmptyNarrative({ ...EMPTY, recommendationNarrative: { dataQuality: "권고", modelOps: "" } })).toBe(false);
  });
});

describe("migrateWorkspaceState", () => {
  it("판은 3 이다", () => {
    expect(WORKSPACE_PERSIST_VERSION).toBe(3);
  });

  it("v2 → v3: 빈 서술 완성본 중 발급 안 된 것만 다시 평가, 발급된 것은 그대로 두고 표시만", () => {
    const state = {
      evaluationRuns: [
        run("empty-unissued", { ...EMPTY, isEvaluated: true, meta: { reportId: "" } }),
        run("empty-issued", { ...EMPTY, isEvaluated: true, meta: { reportId: "RPT-2026-0001" } }, { reportId: "RPT-2026-0001" }),
        run("error-unissued", { ...FILLED, narrativeSource: "error", isEvaluated: true, meta: { reportId: "" } }),
        run("filled", { ...FILLED, isEvaluated: true, meta: { reportId: "" } }),
        run("draft", { ...EMPTY, meta: { reportId: "" } }),
      ],
    };
    const out = migrateWorkspaceState(state, 2);
    const byId = Object.fromEntries(out.evaluationRuns.map((r: any) => [r.id, r]));
    expect(byId["empty-unissued"]).toMatchObject({ migrationNote: "needs_reevaluation", reportData: { isEvaluated: false } });
    expect(byId["error-unissued"]).toMatchObject({ migrationNote: "needs_reevaluation", reportData: { isEvaluated: false } });
    expect(byId["empty-issued"]).toMatchObject({ migrationNote: "issued_empty_narrative", reportData: { isEvaluated: true } });
    expect(byId["filled"].migrationNote).toBeUndefined();
    expect(byId["filled"].reportData.isEvaluated).toBe(true);
    expect(byId["draft"].migrationNote).toBeUndefined();
  });

  it("발급 여부는 run 의 번호나 성적서 메타 번호로 본다", () => {
    const out = migrateWorkspaceState(
      { evaluationRuns: [run("meta-only", { ...EMPTY, isEvaluated: true, meta: { reportId: "RPT-1" } })] },
      2,
    );
    expect(out.evaluationRuns[0].migrationNote).toBe("issued_empty_narrative");
  });

  it("v1 → v2 → v3 를 차례로 지난다 — 문자열 interpretation 을 고친 뒤 빈 서술도 판정한다", () => {
    const out = migrateWorkspaceState(
      {
        evaluationRuns: [
          run("v1-text", { interpretation: "혼동\n\n분포", conclusion: EMPTY.conclusion, recommendationNarrative: EMPTY.recommendationNarrative, isEvaluated: true, meta: { reportId: "" } }),
          run("v1-empty", { interpretation: "", conclusion: EMPTY.conclusion, recommendationNarrative: EMPTY.recommendationNarrative, isEvaluated: true, meta: { reportId: "" } }),
        ],
      },
      1,
    );
    expect(out.evaluationRuns[0].reportData.interpretation).toEqual({ confusionAnalysis: "혼동", distributionAnalysis: "분포" });
    expect(out.evaluationRuns[0].migrationNote).toBeUndefined();
    expect(out.evaluationRuns[1].reportData.interpretation).toEqual({ confusionAnalysis: "", distributionAnalysis: "" });
    expect(out.evaluationRuns[1].migrationNote).toBe("needs_reevaluation");
  });

  it("v3 저장분은 건드리지 않는다", () => {
    const state = { evaluationRuns: [run("x", { ...EMPTY, isEvaluated: true, meta: { reportId: "" } })] };
    expect(migrateWorkspaceState(state, 3).evaluationRuns[0].migrationNote).toBeUndefined();
  });

  it("저장분 다시 읽기(rehydrate)가 이행을 거친다", async () => {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 2, state: { workspaces: [], activeWorkspaceId: null, evaluationRuns: [run("r", { ...EMPTY, isEvaluated: true, meta: { reportId: "" } })] } }),
    );
    await useWorkspaceStore.persist.rehydrate();
    const r = useWorkspaceStore.getState().evaluationRuns[0];
    expect(r.migrationNote).toBe("needs_reevaluation");
    expect(r.reportData.isEvaluated).toBe(false);
  });
});

describe("saveRun", () => {
  it("run 을 고치고 저장한다", () => {
    useWorkspaceStore.setState({ evaluationRuns: [run("r", FILLED) as any] });
    expect(saveRun("r", (x) => ({ ...x, modelName: "새 이름" }))).toBeNull();
    expect(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY)!).state.evaluationRuns[0].modelName).toBe("새 이름");
  });

  it("저장 공간이 차면 던지지 않고 안내 문장을 돌려준다", () => {
    useWorkspaceStore.setState({ evaluationRuns: [run("r", FILLED) as any] });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const err = saveRun("r", (x) => ({ ...x, modelName: "새 이름" }));
    expect(err).toBe(describeSaveError(new DOMException("quota", "QuotaExceededError")));
    expect(err).toMatch(/저장 공간이 가득 차/);
  });

  it("다른 오류도 문장으로", () => {
    expect(describeSaveError(new Error("x"))).toBe("결과를 저장하지 못했습니다: x");
  });
});
