import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { AppShell } from "../../layout/AppShell";
import { WorkspaceCreateForm } from "../../components/workspaces/WorkspaceCreateForm";
import { WorkspaceCard } from "../../components/workspaces/WorkspaceCard";
import { EmptyWorkspacesState } from "../../components/workspaces/EmptyWorkspacesState";
import { useWorkspaceStore } from "../../utils/stores/useWorkspaceStore";

export function WorkspaceList() {
  const navigate = useNavigate();
  const { workspaces, createWorkspace, deleteWorkspace } = useWorkspaceStore();

  const handleDeleteWorkspace = (id: string) => {
    if (confirm("이 워크스페이스와 하위 평가 결과를 모두 삭제하시겠습니까?")) {
      deleteWorkspace(id);
    }
  };

  const handleCreateWorkspace = (input: { name: string; description: string }) => {
    const workspace = createWorkspace(input);
    navigate(`/workspaces/${workspace.id}`);
  };

  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [workspaces],
  );

  return (
    <AppShell>
      <section className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </Button>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Evaluation Workspaces</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Save model evaluation results by workspace and compare them.
          </p>
        </div>
      </section>

      <WorkspaceCreateForm onCreate={handleCreateWorkspace} />

      <section className="grid gap-4">
        {sortedWorkspaces.length === 0 ? (
          <EmptyWorkspacesState />
        ) : (
          sortedWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onDelete={handleDeleteWorkspace}
            />
          ))
        )}
      </section>
    </AppShell>
  );
}
