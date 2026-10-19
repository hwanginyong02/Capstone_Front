/**
 * 워크스페이스(프로젝트) 및 평가 실행(run) 이력 전역 상태 관리 (Zustand + persist).
 *
 * 워크스페이스 CRUD, 활성 워크스페이스 선택, 평가 실행 결과(reportData·workflowSnapshot 포함)의
 * 영속 저장을 담당한다. WorkspaceList/WorkspaceDetail 페이지에서 목록·상세를 렌더링하고,
 * DataValidation 페이지가 평가 완료 시 실행 이력을 추가하며, useReportData/useIssuance가
 * 저장된 실행 데이터를 조회하는 데 사용된다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Workspace,
  WorkspaceEvaluationRun,
} from "../../types/workspace.types";

export const WORKSPACE_STORAGE_KEY = "ml-evaluation-workspaces";
/** 저장소 판. 1→2 문자열 interpretation, 2→3 서술이 빈 완성본 정리(서술 라운드 S3b). */
export const WORKSPACE_PERSIST_VERSION = 3;

interface WorkspaceState {
  workspaces: Workspace[];
  evaluationRuns: WorkspaceEvaluationRun[];
  activeWorkspaceId: string | null;
  createWorkspace: (input: { name: string; description?: string }) => Workspace;
  setActiveWorkspace: (workspaceId: string | null) => void;
  addEvaluationRun: (
    input: Omit<WorkspaceEvaluationRun, "id" | "createdAt">,
  ) => WorkspaceEvaluationRun;
  deleteWorkspace: (id: string) => void;
  deleteEvaluationRun: (id: string) => void;
  /**
   * run 하나를 고친다(없는 id 면 아무것도 하지 않는다). 저장 공간이 차서 저장에 실패하면 예외를 던진다 —
   * 메모리 상태는 이미 바뀐 뒤다(zustand persist 는 메모리를 먼저 바꾸고 저장한다). 화면 쪽은 `saveRun` 을 쓴다.
   */
  updateRun: (id: string, patch: (run: WorkspaceEvaluationRun) => WorkspaceEvaluationRun) => void;
}

/** 저장 공간 초과 예외인가(브라우저마다 이름이 다르다). */
export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/** 저장 실패를 사람이 읽을 문장으로. 메모리에는 남아 있어 지금 화면에는 보이지만 새로고침하면 사라진다는 점을 알린다. */
export function describeSaveError(err: unknown): string {
  if (isQuotaError(err)) {
    return (
      "브라우저 저장 공간이 가득 차 결과를 저장하지 못했습니다. 지금 화면에는 보이지만 새로고침하거나 인쇄 화면을 " +
      "열면 사라집니다. 워크스페이스 화면에서 오래된 평가를 지운 뒤 다시 시도하세요."
    );
  }
  return `결과를 저장하지 못했습니다: ${err instanceof Error ? err.message : String(err)}`;
}

/**
 * run 을 고치고 저장한다. 성공하면 null, 실패하면 사람이 읽을 오류 문장(예외를 던지지 않는다).
 * 성적서 화면의 저장(서술 상태·완성본·발급 반영)은 모두 이 함수를 지난다 — 실패를 알리는 곳을 하나로 모은다.
 */
export function saveRun(
  id: string,
  patch: (run: WorkspaceEvaluationRun) => WorkspaceEvaluationRun,
): string | null {
  try {
    useWorkspaceStore.getState().updateRun(id, patch);
    return null;
  } catch (err) {
    console.error("워크스페이스 저장 실패:", err);
    return describeSaveError(err);
  }
}

/** 서술 칸이 모두 비었는가 — 옛 판에서 서술 호출이 실패해 빈 서술이 완성본으로 저장된 run 을 찾는다. */
export function isEmptyNarrative(report: any): boolean {
  if (!report) return true;
  if (report.narrativeSource === "error") return true;
  const texts = [
    report.interpretation?.confusionAnalysis,
    report.interpretation?.distributionAnalysis,
    report.conclusion?.benchmark,
    report.conclusion?.narrative,
    report.conclusion?.risks,
    report.recommendationNarrative?.dataQuality,
    report.recommendationNarrative?.modelOps,
  ];
  return texts.every((t) => typeof t !== "string" || t.trim() === "");
}

/** 발급된 run 인가 — 번호가 run 이나 성적서 메타에 있다. */
function isIssuedRun(run: any): boolean {
  return Boolean(run?.reportId || run?.reportData?.meta?.reportId);
}

/**
 * 저장분 이행. 판마다 차례로 지난다(v1 → v2 → v3) — 옛 판의 첫 줄 `version >= 2 이면 그대로`는 v3 단계를 건너뛰게
 * 하므로 단계별 조건으로 바꿨다. 저장분을 그 자리에서 고친다.
 */
export function migrateWorkspaceState(persisted: any, version: number): any {
  if (!persisted) return persisted;
  const runs: any[] = Array.isArray(persisted.evaluationRuns) ? persisted.evaluationRuns : [];

  // v1 → v2: FinalReportData.interpretation 이 string → {confusionAnalysis, distributionAnalysis} 로 바뀌었다. 이전 판으로
  // 저장된 reportData 가 문자열 interpretation 을 갖고 있으면 렌더 시 interpretation.confusionAnalysis 가 undefined →
  // .trim() 크래시가 난다.
  if (version < 2) {
    for (const run of runs) {
      const interp = run?.reportData?.interpretation;
      if (typeof interp === "string") {
        // 기존 문자열은 "\n\n" 로 두 문단(혼동행렬/분포)을 구분했었다 — 그 의미를 보존한다.
        const [first = "", ...rest] = interp.split("\n\n");
        run.reportData.interpretation = {
          confusionAnalysis: first,
          distributionAnalysis: rest.join("\n\n"),
        };
      }
    }
  }

  // v2 → v3: 옛 판은 서술 호출이 실패해도 빈 서술을 완성본(isEvaluated)으로 저장했다(점검 유-1). 그런 run 중
  // 발급되지 않은 것은 완성본 표시를 거둬 다시 평가하게 하고, 발급된 것은 보관본과 같아야 하므로 그대로 두고
  // "정정 발급으로만 고칠 수 있음"을 알린다. 서술이 있는 완성본·미평가 초안은 건드리지 않는다.
  if (version < 3) {
    for (const run of runs) {
      const report = run?.reportData;
      if (!report?.isEvaluated || !isEmptyNarrative(report)) continue;
      if (isIssuedRun(run)) {
        run.migrationNote = "issued_empty_narrative";
      } else {
        report.isEvaluated = false;
        run.migrationNote = "needs_reevaluation";
      }
    }
  }
  return persisted;
}

function createId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${randomId}`;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      evaluationRuns: [],
      activeWorkspaceId: null,

      createWorkspace: ({ name, description = "" }) => {
        const workspace: Workspace = {
          id: createId("workspace"),
          name: name.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          workspaces: [workspace, ...state.workspaces],
          activeWorkspaceId: workspace.id,
        }));

        return workspace;
      },

      setActiveWorkspace: (workspaceId) =>
        set({ activeWorkspaceId: workspaceId }),

      addEvaluationRun: (input) => {
        const run: WorkspaceEvaluationRun = {
          ...input,
          id: createId("run"),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          evaluationRuns: [run, ...state.evaluationRuns],
        }));

        return run;
      },

      deleteWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          evaluationRuns: state.evaluationRuns.filter((r) => r.workspaceId !== id),
          activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
        })),

      deleteEvaluationRun: (id) =>
        set((state) => ({
          evaluationRuns: state.evaluationRuns.filter((r) => r.id !== id),
        })),

      updateRun: (id, patch) =>
        set((state) => ({
          evaluationRuns: state.evaluationRuns.map((r) => (r.id === id ? patch(r) : r)),
        })),
    }),
    {
      name: WORKSPACE_STORAGE_KEY,
      version: WORKSPACE_PERSIST_VERSION,
      migrate: (persisted: any, version: number) => migrateWorkspaceState(persisted, version),
    },
  ),
);
