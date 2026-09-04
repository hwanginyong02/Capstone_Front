import type { ReactNode } from "react";
import { AppHeader } from "./components/AppHeader";

/**
 * 비-워크플로우 페이지(워크스페이스 목록/상세 등)용 경량 공개 레이아웃 셸.
 *
 * 스텝 워크플로우가 아니므로 StepTabs/ActionBar 없이 AppHeader + 메인 컨테이너만 제공한다.
 * WorkflowShell 과 동급의 공개 셸로, 페이지가 layout/components 내부 부품(AppHeader)을 직접
 * import 하지 않도록 레이아웃 경계를 유지한다(Rule 2/Rule 5).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
