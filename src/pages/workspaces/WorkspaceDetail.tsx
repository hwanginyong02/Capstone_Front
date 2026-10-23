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

  const handleDeleteRun = (runId: string) => {
    if (confirm("이 평가를 지울까요? 되돌릴 수 없습니다.")) {
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
              워크스페이스
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
          평가 시작
        </Button>
      </section>

      {/* 모델별 카드와 버전 비교는 걷어냈다 — 고객(시험 기관)은 성적서를 내려고 평가하지,
          같은 모델의 버전끼리 견주지 않는다(docs/MATERIAL_PICKER.md §1). */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>평가 결과</CardTitle>
          <CardDescription>모델 이름, 버전, 만든 날을 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyRunsState />
          ) : (
            <EvaluationRunsTable runs={runs} onDelete={handleDeleteRun} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
