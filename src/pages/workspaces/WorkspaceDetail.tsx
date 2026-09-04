import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AppShell } from "../../layout/AppShell";
import { EvaluationRunsTable } from "../../components/workspaces/EvaluationRunsTable";
import { EmptyRunsState } from "../../components/workspaces/EmptyRunsState";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";

export function WorkspaceDetail() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { workspaces, evaluationRuns, setActiveWorkspace, deleteEvaluationRun } =
    useWorkspaceStore();
  const loadWorkflowSnapshot = useWorkflowStore((state) => state.loadWorkflowSnapshot);

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
    setActiveWorkspace(workspaceId);
    navigate("/app/basic-info");
  };

  const handleEditRun = (run: (typeof runs)[number]) => {
    if (run.workflowSnapshot) {
      loadWorkflowSnapshot(run.workflowSnapshot);
      setActiveWorkspace(workspaceId);
      navigate("/app/basic-info");
    }
  };

  const handleDeleteRun = (runId: string) => {
    if (confirm("정말 이 평가 결과를 삭제하시겠습니까?")) {
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

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
          <CardDescription>
            Review the model name, version, and created date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyRunsState />
          ) : (
            <EvaluationRunsTable
              runs={runs}
              onEdit={handleEditRun}
              onDelete={handleDeleteRun}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
