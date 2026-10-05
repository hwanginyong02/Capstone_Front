import { Link } from "react-router";
import { FileText, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
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
 * 워크스페이스의 평가 실행(run) 이력 테이블. WorkspaceDetail 페이지에서 사용한다.
 *
 * **발급 여부를 구분해 보여준다.** run 은 검증에서 만들어지고 발급은 성적서 화면에서
 * 하므로, 입력 도중 멈춘 run 이나 아직 발급하지 않은 run 이 목록에 남는다. 둘이 같아 보이면
 * 사용자는 무엇을 마무리해야 하는지 알 수 없다. 판별 기준은 `reportId` 다 — 발급 시
 * `useIssuance` 가 채운다(useIssuance.ts 의 `persist`). 비어 있으면 초안이다.
 */
interface EvaluationRunsTableProps {
  runs: WorkspaceEvaluationRun[];
  onDelete: (runId: string) => void;
}

export function EvaluationRunsTable({ runs, onDelete }: EvaluationRunsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model Name</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Report No.</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => {
          const issued = Boolean(run.reportId);

          return (
            <TableRow key={run.id}>
              <TableCell className="font-medium">{run.modelName}</TableCell>
              <TableCell>{run.versionName}</TableCell>
              <TableCell>
                {issued ? (
                  <Badge variant="secondary">Report issued</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Draft
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {run.reportId || "—"}
              </TableCell>
              <TableCell>{formatCreatedAt(run.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* 초안도 성적서로 보낸다 — 평가 결과 화면이 폐지돼(§11) 성적서가 유일한 결과 화면이다.
                      아직 평가 전이면 성적서가 그 사실을 알린다(UnevaluatedDraftNotice). */}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/report/${run.id}`}>
                      <FileText className="h-4 w-4" />
                      Report
                    </Link>
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
          );
        })}
      </TableBody>
    </Table>
  );
}
