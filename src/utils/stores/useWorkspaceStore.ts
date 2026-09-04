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
    }),
    {
      name: "ml-evaluation-workspaces",
      version: 2,
      // v1 → v2: FinalReportData.interpretation 이 string → {confusionAnalysis, distributionAnalysis}
      // 로 바뀌었다. 이전 버전으로 저장된 reportData 가 문자열 interpretation 을 갖고 있으면
      // 리포트 렌더 시 interpretation.confusionAnalysis 가 undefined → .trim() 크래시가 난다.
      // 저장된 각 run.reportData 의 문자열 interpretation 을 구조화 형태로 보정한다.
      migrate: (persisted: any, version: number) => {
        if (!persisted || version >= 2) return persisted;
        const runs = persisted.evaluationRuns;
        if (Array.isArray(runs)) {
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
        return persisted;
      },
    },
  ),
);
