import { Link } from "react-router";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { Workspace } from "../../types/workspace.types";

/**
 * 워크스페이스 목록의 개별 카드(열기/삭제). WorkspaceList 페이지에서 사용한다.
 */
interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete: (id: string) => void;
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{workspace.name}</CardTitle>
        {workspace.description && (
          <CardDescription>{workspace.description}</CardDescription>
        )}
        <CardAction>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/workspaces/${workspace.id}`}>
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => onDelete(workspace.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
