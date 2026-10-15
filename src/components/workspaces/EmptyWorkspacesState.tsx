import { FolderKanban } from "lucide-react";

/**
 * 워크스페이스가 하나도 없을 때 표시하는 빈 상태. WorkspaceList 페이지에서 사용한다.
 */
export function EmptyWorkspacesState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FolderKanban className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">아직 워크스페이스가 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          첫 워크스페이스를 만들어 평가 결과를 정리하세요.
        </p>
      </div>
    </div>
  );
}
