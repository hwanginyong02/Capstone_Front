import { Link } from "react-router";
import { Edit, FileText, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { formatCreatedAt } from "../../utils/format/format";
import type { WorkspaceEvaluationRun } from "../../types/workspace.types";

/**
 * 워크스페이스의 평가 실행(run) 이력 테이블(보기/편집/삭제). WorkspaceDetail 페이지에서 사용한다.
 */
interface EvaluationRunsTableProps {
  runs: WorkspaceEvaluationRun[];
  onEdit: (run: WorkspaceEvaluationRun) => void;
  onDelete: (runId: string) => void;
}

export function EvaluationRunsTable({ runs, onEdit, onDelete }: EvaluationRunsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model Name</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Report</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="font-medium">{run.modelName}</TableCell>
            <TableCell>{run.versionName}</TableCell>
            <TableCell>{run.reportId || "-"}</TableCell>
            <TableCell>{formatCreatedAt(run.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/report/${run.id}`}>
                    <FileText className="h-4 w-4" />
                    View
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(run)}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(run.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
