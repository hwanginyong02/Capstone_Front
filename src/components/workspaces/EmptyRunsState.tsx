import { ClipboardList } from "lucide-react";

/**
 * 워크스페이스에 평가 실행 결과가 없을 때 표시하는 빈 상태. WorkspaceDetail 페이지에서 사용한다.
 */
export function EmptyRunsState() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ClipboardList className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">아직 평가 결과가 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          평가를 시작하면 결과가 여기에 나옵니다.
        </p>
      </div>
    </div>
  );
}
