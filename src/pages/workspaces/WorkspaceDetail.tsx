import { stepIdToPath } from "../../utils/domain/workflowSteps";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { AppShell } from "../../layout/AppShell";
import { ModelRunGroups } from "../../components/workspaces/ModelRunGroups";
import { EmptyRunsState } from "../../components/workspaces/EmptyRunsState";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { nextVersionName } from "../../lib/workspace/nextVersionName";

export function WorkspaceDetail() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { workspaces, evaluationRuns, setActiveWorkspace, deleteEvaluationRun } =
    useWorkspaceStore();
  const loadWorkflowSnapshot = useWorkflowStore((state) => state.loadWorkflowSnapshot);
  const resetWorkflow = useWorkflowStore((state) => state.resetWorkflow);

  const workspace = workspaces.find((item) => item.id === workspaceId);

  if (!workspaceId || !workspace) {
    return <Navigate to="/workspaces" replace />;
  }

  const runs = evaluationRuns
    .filter((run) => run.workspaceId === workspaceId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const handleStartEvaluation = () => {
    // 워크플로우 상태가 이제 저장소에 남으므로(ISSUES.md E-01), 새 평가를 시작할 때
    // 명시적으로 초기화하지 않으면 **이전 평가의 입력이 새 성적서에 섞인다**.
    // 종전에는 새로고침이 사실상 초기화 역할을 해서 resetWorkflow 호출부가 0곳이었다(E-08).
    resetWorkflow();
    setActiveWorkspace(workspaceId);
    // 새 평가는 분류 유형 선택부터 — 그 선택이 이후 모든 단계를 가른다.
    navigate("/app");
  };

  /**
   * 이 run 의 입력을 물려받아 **새 평가**를 시작한다(종전 'Edit').
   *
   * 기존 run 은 건드리지 않는다 — 덮어쓰면 비교할 과거가 사라진다. 새 run 은 평가를
   * 실행하는 시점(DataValidation)에 비로소 만들어진다.
   */
  const handleNewVersion = (run: (typeof runs)[number]) => {
    if (!run.workflowSnapshot) return;

    loadWorkflowSnapshot(run.workflowSnapshot);
    // 버전은 한 칸 올려 제안한다. 같은 번호로 두 번 저장되면 비교표의 두 열이
    // 같은 이름이 돼 어느 쪽이 무엇인지 알 수 없다. 업로드 화면에서 고칠 수 있다.
    useWorkflowStore.getState().setBasicInfo((prev) => ({
      ...prev,
      modelName: run.modelName,
      versionName: nextVersionName(run.versionName),
    }));
    setActiveWorkspace(workspaceId);
    // 유형 선택은 다시 묻지 않는다 — 스냅샷이 이미 갖고 있고, 여기서 다시 고르게 하면
    // `setTaskType` 이 복원한 입력을 전부 날린다.
    // 파일만은 복원할 수 없으므로 업로드 단계에서 시작한다(ISSUES.md E-09).
    navigate(stepIdToPath("upload"));
  };

  const handleDeleteRun = (runId: string) => {
    if (confirm("Delete this evaluation? This cannot be undone.")) {
      deleteEvaluationRun(runId);
    }
  };

  return (
    <AppShell>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/workspaces">
              <ArrowLeft className="h-4 w-4" />
              Workspaces
            </Link>
          </Button>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">{workspace.name}</h1>
            {workspace.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {workspace.description}
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleStartEvaluation}>
          <Plus className="h-4 w-4" />
          Start Evaluation
        </Button>
      </section>

      {/* 평가는 모델별 카드로 묶인다. 같은 모델의 여러 버전이 한 카드 안에 모여야
          "전보다 나아졌나"를 비교하는 입구를 그 자리에 둘 수 있다. */}
      {runs.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <EmptyRunsState />
          </CardContent>
        </Card>
      ) : (
        <ModelRunGroups
          workspaceId={workspaceId}
          runs={runs}
          onNewVersion={handleNewVersion}
          onDelete={handleDeleteRun}
        />
      )}
    </AppShell>
  );
}
